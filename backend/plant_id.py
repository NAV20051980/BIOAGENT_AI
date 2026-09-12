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
_env_path = os.path.join(os.path.dirname(__file__), ".env")
if os.path.exists(_env_path):
    load_dotenv(_env_path)

# -------------------------------------------------------------------
# Configuration – environment variables & deterministic safety gates
# -------------------------------------------------------------------
PLANTNET_API_KEY = os.getenv("PLANTNET_API_KEY", "")  # PlantNet API key
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")        # Groq API key (used for care profile)

MIN_CONFIDENCE_THRESHOLD = 0.20
AMBIGUITY_MARGIN = 0.05

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
    api_key = os.getenv("PLANTNET_API_KEY", "") or PLANTNET_API_KEY
    if not api_key:
        return {}
    url = "https://my-api.plantnet.org/v2/identify/all"
    params = {
        "api-key": api_key,
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
    api_key = os.getenv("GROQ_API_KEY", "") or GROQ_API_KEY
    if not api_key:
        return {}
    endpoint = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
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
    """Identify a plant via PlantNet and apply a deterministic safety gate.
    Returns dict with keys: species, scientific_name, confidence, raw_label, profile,
    profile_activated, identification_status.
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
            "profile_activated": False,
            "identification_status": "no_supported_plant",
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
        "Echinocactus grusonii": {
            "species": "Golden Barrel Cactus",
            "scientific_name": "Echinocactus grusonii",
            "ideal_moisture_range_pct": [10, 30],
            "growth_stage": "mature",
            "notes": "Desert succulent; highly drought-tolerant; sensitive to overwatering.",
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
        "Echinocactus": {
            "species": "Golden Barrel Cactus",
            "ideal_moisture_range_pct": [10, 30],
            "growth_stage": "mature",
            "notes": "Desert succulent; highly drought-tolerant; sensitive to overwatering.",
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

    def _match_supported(sci: str) -> dict | None:
        if not sci:
            return None
        if sci in SUPPORTED:
            prof = SUPPORTED[sci].copy()
            prof.setdefault("scientific_name", sci)
            return prof
        for prefix, prof in PREFIX_GROUPS.items():
            if sci.startswith(prefix):
                p = prof.copy()
                p.setdefault("scientific_name", sci)
                return p
        return None

    # Step 2 – Filter candidates to ONLY supported catalog entries
    supported_candidates = []
    for entry in results:
        sci_name = (
            entry.get("species", {}).get("scientificNameWithoutAuthor")
            or entry.get("species", {}).get("scientificName")
        )
        score = float(entry.get("score", 0.0))
        matched_prof = _match_supported(sci_name)
        if matched_prof is not None:
            supported_candidates.append({
                "entry": entry,
                "profile": matched_prof,
                "scientific_name": sci_name,
                "species": matched_prof.get("species", sci_name),
                "score": score,
                "raw_label": sci_name,
            })

    # Sort supported candidates by score descending
    supported_candidates.sort(key=lambda c: c["score"], reverse=True)

    # Step 3 – If no supported plant found, preserve fallback to Groq but DO NOT activate profile
    if not supported_candidates:
        top = results[0]
        raw_label = (
            top.get("species", {}).get("scientificNameWithoutAuthor")
            or top.get("species", {}).get("commonName")
        )
        confidence = float(top.get("score", 0.0))
        profile = _generate_profile_with_groq(raw_label) or GENERIC_PROFILE
        scientific_name = profile.get("scientific_name")
        return {
            "species": profile.get("species", raw_label),
            "scientific_name": scientific_name,
            "confidence": round(confidence, 3),
            "raw_label": raw_label,
            "profile": profile,
            "profile_activated": False,
            "identification_status": "no_supported_plant",
        }

    # Step 4 – Supported candidate evaluation
    top_candidate = supported_candidates[0]
    top_score = top_candidate["score"]
    raw_label = top_candidate["raw_label"]
    profile = top_candidate["profile"].copy()
    profile.setdefault("scientific_name", raw_label)
    profile.setdefault("species", top_candidate.get("species", raw_label))

    # A) Check confidence threshold
    if top_score < MIN_CONFIDENCE_THRESHOLD:
        return {
            "species": profile["species"],
            "scientific_name": profile["scientific_name"],
            "confidence": round(top_score, 3),
            "raw_label": raw_label,
            "profile": profile,
            "profile_activated": False,
            "identification_status": "low_confidence",
        }

    # B) Check ambiguity ONLY among supported candidates
    # Find next competing supported candidate that has a distinct species/profile
    competing_candidate = None
    for cand in supported_candidates[1:]:
        if cand["species"].strip().lower() != top_candidate["species"].strip().lower():
            competing_candidate = cand
            break

    if competing_candidate is not None:
        next_score = competing_candidate["score"]
        margin = top_score - next_score
        if margin < AMBIGUITY_MARGIN:
            return {
                "species": profile["species"],
                "scientific_name": profile["scientific_name"],
                "confidence": round(top_score, 3),
                "raw_label": raw_label,
                "profile": profile,
                "profile_activated": False,
                "identification_status": "ambiguous",
            }

    # C) High-confidence supported identification accepted
    return {
        "species": profile["species"],
        "scientific_name": profile["scientific_name"],
        "confidence": round(top_score, 3),
        "raw_label": raw_label,
        "profile": profile,
        "profile_activated": True,
        "identification_status": "accepted",
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
