'''BioAgent AI — plant_id.py
Replace local classification with PlantNet API + Groq care profile generation.
'''

import base64
import io
import json
import os
from typing import Any, Dict

import requests
from PIL import Image
from dotenv import load_dotenv
load_dotenv()

# -------------------------------------------------------------------
# Configuration – environment variables
# -------------------------------------------------------------------
PLANTNET_API_KEY = os.getenv("PLANTNET_API_KEY", "")  # PlantNet API key
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")        # Groq API key (used for care profile)

# -------------------------------------------------------------------
# Generic fallback profile – used when any step fails.
# -------------------------------------------------------------------
GENERIC_PROFILE = {
    "species": "Unidentified plant (generic defaults applied)",
    "scientific_name": None,
    "growth_stage": "unknown",
    "ideal_moisture_range_pct": [35, 60],
    "notes": "Failed to obtain a specific profile – using safe generic watering range.",
}

# -------------------------------------------------------------------
# Helper: convert raw image bytes to a base64‑encoded JPEG data URL.
# -------------------------------------------------------------------
def _bytes_to_data_url(image_bytes: bytes) -> str:
    """Return a ``data:image/jpeg;base64,…`` URL from raw bytes.
    Raises ``ValueError`` if the image cannot be opened.
    """
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception as e:
        raise ValueError(f"Unable to open image: {e}")
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG")
    b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64}"

# -------------------------------------------------------------------
# PlantNet API wrapper – returns a dict with ``species`` and ``confidence``.
# -------------------------------------------------------------------
def _identify_with_plantnet(image_bytes: bytes) -> Dict[str, Any]:
    """Call PlantNet image‑identification API.
    Returns ``{"species": str, "confidence": float}`` on success.
    On any error returns an empty dict.
    """
    if not PLANTNET_API_KEY:
        return {}
    url = "https://my-api.plantnet.org/v2/identify/all"
    params = {
        "api-key": PLANTNET_API_KEY,
        "lang": "en",
        "nb-results": 5,
    }
    files = {"images": ("image.jpg", image_bytes, "image/jpeg")}
    data = {"organs": "auto"}
    try:
        resp = requests.post(url, params=params, data=data, files=files, timeout=30)
        resp.raise_for_status()
        payload = resp.json()
        results = payload.get("results", [])
        # Return the full results list for caller to decide
        return {"results": results}
    except Exception:
        return {}

# -------------------------------------------------------------------
# Groq care‑profile generation – given a species name, ask the model for a JSON profile.
# -------------------------------------------------------------------
def _generate_profile_with_groq(species_name: str) -> Dict[str, Any]:
    """Ask Groq to produce a deterministic care profile for *species_name*.
    Returns the full JSON object produced by the model, or an empty dict on failure.
    """
    if not GROQ_API_KEY:
        return {}
    endpoint = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    system_prompt = (
        "You are a plant‑care expert. Given the species name, respond ONLY with a JSON object containing the keys:"
        " 'species' (common name), 'scientific_name', 'growth_stage', 'ideal_moisture_range_pct' (list of two ints), and 'notes'."
        " Do NOT add any additional text or explanations."
    )
    user_prompt = f"Provide the care profile for the plant species: {species_name}."
    payload = {
        "model": "qwen/qwen3.8-27b",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.0,
        "max_tokens": 500,
    }
    try:
        resp = requests.post(endpoint, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        # Strip possible markdown fences
        content = content.strip()
        if content.startswith("```json"):
            content = content[len("```json"):]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
        profile = json.loads(content)
        return profile
    except Exception:
        return {}

# -------------------------------------------------------------------
# Public API used by FastAPI – preserves the original return shape.
# -------------------------------------------------------------------
def identify_plant_from_bytes(image_bytes: bytes) -> dict:
    """Identify a plant via PlantNet and return a deterministic care profile.
    Returns dict with keys: species, scientific_name, confidence, raw_label, profile.
    """
    # Step 1 – PlantNet identification (retrieve ranked results)
    plantnet_result = _identify_with_plantnet(image_bytes)
    results = plantnet_result.get("results", [])
    if not results:
        return {
            "species": GENERIC_PROFILE["species"],
            "scientific_name": GENERIC_PROFILE["scientific_name"],
            "confidence": 0.0,
            "raw_label": None,
            "profile": GENERIC_PROFILE,
            "error": "PlantNet identification failed",
        }

    # Supported scientific names (exact match) and genus prefixes for broader categories
    SUPPORTED = {
        "Aegle marmelos": {
            "species": "Bael",
            "scientific_name": "Aegle marmelos",
            "ideal_moisture_range_pct": [40, 60],
            "growth_stage": "active vegetative growth",
            "notes": "Prefer evenly moist soil; avoid drought and waterlogging.",
        },
        "Monstera deliciosa": {
            "species": "Monstera",
            "scientific_name": "Monstera deliciosa",
            "ideal_moisture_range_pct": [40, 65],
            "growth_stage": "active vegetative growth",
            "notes": "Prefers high humidity and indirect light.",
        },
    }
    # Prefixes for broader groups
    PREFIX_GROUPS = {
        "Cereus": {
            "species": "Cereus cactus",
            "ideal_moisture_range_pct": [10, 30],
            "growth_stage": "slow",
            "notes": "Drought‑tolerant succulent.",
        },
        "Nephrolepis": {
            "species": "Fern",
            "ideal_moisture_range_pct": [60, 80],
            "growth_stage": "active",
            "notes": "Keeps soil consistently moist.",
        },
        "Zea mays": {
            "species": "Corn",
            "ideal_moisture_range_pct": [45, 70],
            "growth_stage": "vegetative",
            "notes": "Requires regular irrigation.",
        },
    }

    selected = None
    confidence = 0.0
    raw_label = None
    for entry in results:
        sci_name = entry.get("species", {}).get("scientificNameWithoutAuthor") or entry.get("species", {}).get("scientificName")
        common = entry.get("species", {}).get("commonName")
        score = entry.get("score")
        if not sci_name:
            continue
        # Exact match
        if sci_name in SUPPORTED:
            selected = SUPPORTED[sci_name]
            confidence = float(score) if score is not None else 0.0
            raw_label = sci_name
            break
        # Prefix groups
        for prefix, profile in PREFIX_GROUPS.items():
            if sci_name.startswith(prefix):
                selected = profile.copy()
                selected["scientific_name"] = sci_name
                confidence = float(score) if score is not None else 0.0
                raw_label = sci_name
                break
        if selected:
            break

    if not selected:
        # No supported plant found – fallback to Groq for care profile
        top = results[0]
        raw_label = top.get("species", {}).get("scientificNameWithoutAuthor") or top.get("species", {}).get("commonName")
        confidence = float(top.get("score", 0.0))
        # Use Groq to generate profile
        profile = _generate_profile_with_groq(raw_label) or GENERIC_PROFILE
        scientific_name = profile.get("scientific_name")
        return {
            "species": profile.get("species", raw_label),
            "scientific_name": scientific_name,
            "confidence": round(confidence, 3),
            "raw_label": raw_label,
            "profile": profile,
        }

    # For supported plant, build deterministic profile
    profile = selected.copy()
    # Ensure required keys exist
    profile.setdefault("scientific_name", raw_label)
    profile.setdefault("species", selected.get("species", raw_label))
    return {
        "species": profile["species"],
        "scientific_name": profile["scientific_name"],
        "confidence": round(confidence, 3),
        "raw_label": raw_label,
        "profile": profile,
    }

# -------------------------------------------------------------------
# Simple script‑mode sanity check.
# -------------------------------------------------------------------
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python plant_id.py <path_to_image>")
        sys.exit(1)
    with open(sys.argv[1], "rb") as f:
        img_bytes = f.read()
    result = identify_plant_from_bytes(img_bytes)
    print(json.dumps(result, indent=2))
