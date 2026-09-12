"""
BioAgent AI — plant_id.py
Multimodal Computer Vision plant species identification powered by Groq Vision.

Model: qwen/qwen3.8-27b (multimodal vision-language model)
Role: Botanical identification and plant profile generation ONLY.
      This module NEVER controls the physical water pump or relay.

Flow:
    Image bytes -> Pillow validation & JPEG conversion -> Base64 data URL
    -> Groq Vision (qwen/qwen3.8-27b) with strict botanical prompt & JSON schema
    -> Botanical validation & confidence check (threshold >= 0.50)
    -> Structured species, confidence, visual evidence & watering profile dict.
"""

import io
import os
import json
import base64
from PIL import Image
from openai import OpenAI

# Multimodal vision model on Groq
VISION_MODEL = os.environ.get("VISION_MODEL", "qwen/qwen3.8-27b")

# Safe generic fallback profile
GENERIC_PROFILE = {
    "species": "Unidentified plant (generic defaults applied)",
    "growth_stage": "unknown",
    "ideal_moisture_range_pct": [35, 60],
    "notes": "Vision model could not reliably identify the plant with sufficient confidence. Using safe generic watering range.",
}

CONFIDENCE_THRESHOLD = 0.50


def _get_client() -> OpenAI:
    """Instantiate OpenAI client configured for Groq API."""
    api_key = os.environ.get("GROQ_API_KEY", "")
    return OpenAI(api_key=api_key, base_url="https://api.groq.com/openai/v1")


def _image_bytes_to_base64_jpeg(image_bytes: bytes, max_dim: int = 1024) -> str:
    """Validate image bytes using Pillow, resize if large for network efficiency,
    and return a base64 JPEG data URL.
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    
    # Scale down if larger than max_dim to keep payload small and fast
    w, h = img.size
    if max(w, h) > max_dim:
        scale = max_dim / float(max(w, h))
        img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64}"


def _build_identification_prompt() -> str:
    return """You are an expert botanical vision AI for smart agriculture.
Carefully examine this image to identify the plant species.

Examine diagnostic botanical morphological features:
1. Leaf morphology: Number and arrangement of leaflets (simple vs compound: trifoliate, pinnate, bipinnate, palmate).
2. Leaf shape, apex, base, margins (entire, crenate, serrate), and venation pattern.
3. Stem characteristics, thorns/spines, bark, and petioles.
4. Flowers, buds, or fruits if visible.
5. Overall plant habit and growth structure.

Specific instructions for Bael (Aegle marmelos / Bilva / Wood Apple):
- Aegle marmelos is characterized by alternate, trifoliate compound leaves (three leaflets on a common stalk), where lateral leaflets are ovate/elliptic and smaller than the terminal leaflet, with crenulate or entire margins and aromatic citrus glands.
- CAUTION: Do NOT identify every trifoliate plant as Bael. Differentiate carefully from other trifoliate plants (such as Poncirus/trifoliate orange, poison ivy, clover, Erythrina, or laburnum).

CONSERVATIVE IDENTIFICATION & UNCERTAINTY RULES:
- If the image is NOT a plant (e.g. human, object, car, interior, abstract graphic), set "is_plant": false.
- If the image is blurry, partial, poorly lit, or ambiguous such that you cannot reliably determine the species, set "is_plant": false or set "confidence" < 0.50.
- DO NOT invent or guess a species when uncertain.
- "confidence" must be a realistic calibrated float between 0.0 and 1.0 based strictly on visual clarity of diagnostic features.

Respond with ONLY a valid JSON object strictly matching this schema:
{
  "is_plant": <true or false>,
  "species": "<Common Name> (<Scientific Name>)",
  "scientific_name": "<Genus species>",
  "confidence": <float 0.0 to 1.0>,
  "visual_evidence": "<detailed botanical morphological evidence observed in the image>",
  "profile": {
    "species": "<Common Name> (<Scientific Name>)",
    "growth_stage": "<seedling / vegetative / mature / flowering>",
    "ideal_moisture_range_pct": [<min_int>, <max_int>],
    "notes": "<specific soil type, moisture preferences, drought tolerance, and overwatering sensitivity>"
  }
}"""


def _validate_profile(profile: dict | None) -> dict:
    """Ensure the profile dict matches the required shape for agent.py."""
    if not isinstance(profile, dict):
        return dict(GENERIC_PROFILE)
    
    range_pct = profile.get("ideal_moisture_range_pct")
    if (
        not isinstance(range_pct, (list, tuple))
        or len(range_pct) != 2
        or not isinstance(range_pct[0], (int, float))
        or not isinstance(range_pct[1], (int, float))
        or range_pct[0] >= range_pct[1]
    ):
        range_pct = [35, 60]
    else:
        # Clamp to reasonable agronomic bounds
        range_pct = [max(5, int(range_pct[0])), min(95, int(range_pct[1]))]

    return {
        "species": str(profile.get("species", GENERIC_PROFILE["species"])),
        "growth_stage": str(profile.get("growth_stage", "vegetative")),
        "ideal_moisture_range_pct": range_pct,
        "notes": str(profile.get("notes", GENERIC_PROFILE["notes"])),
    }


def identify_plant_from_bytes(image_bytes: bytes) -> dict:
    """Run multimodal plant identification on raw image bytes using Groq Vision.
    Never raises — returns a safe generic profile if classification fails or is uncertain.
    """
    try:
        data_url = _image_bytes_to_base64_jpeg(image_bytes)
    except Exception as e:
        print(f"[plant_id.py] Image decoding/conversion error: {e}")
        return {
            "species": GENERIC_PROFILE["species"],
            "scientific_name": None,
            "confidence": 0.0,
            "visual_evidence": f"Failed to decode image: {e}",
            "profile": dict(GENERIC_PROFILE),
            "fallback_triggered": True,
            "error": "invalid_image_format",
        }

    try:
        client = _get_client()
        prompt = _build_identification_prompt()
        
        response = client.chat.completions.create(
            model=VISION_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                }
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=450,
        )

        raw_content = response.choices[0].message.content or "{}"
        data = json.loads(raw_content)

        is_plant = bool(data.get("is_plant", False))
        confidence = float(data.get("confidence", 0.0))
        scientific_name = data.get("scientific_name", "")
        species = data.get("species", "")
        visual_evidence = data.get("visual_evidence", "")

        # Fallback condition: not a plant, low confidence, or missing species info
        if (
            not is_plant
            or confidence < CONFIDENCE_THRESHOLD
            or not scientific_name
            or "unidentified" in species.lower()
        ):
            reason_fallback = (
                "Not identified as a plant"
                if not is_plant
                else f"Low confidence ({round(confidence, 2)} < {CONFIDENCE_THRESHOLD}) or ambiguous features"
            )
            return {
                "species": GENERIC_PROFILE["species"],
                "scientific_name": None,
                "confidence": round(confidence, 3),
                "visual_evidence": f"{visual_evidence} [Fallback applied: {reason_fallback}]".strip(),
                "profile": dict(GENERIC_PROFILE),
                "fallback_triggered": True,
            }

        # Validated high-confidence plant identification
        validated_profile = _validate_profile(data.get("profile"))
        return {
            "species": species,
            "scientific_name": scientific_name,
            "confidence": round(confidence, 3),
            "visual_evidence": visual_evidence,
            "profile": validated_profile,
            "fallback_triggered": False,
        }

    except Exception as e:
        print(f"[plant_id.py] Vision identification failed: {e}")
        return {
            "species": GENERIC_PROFILE["species"],
            "scientific_name": None,
            "confidence": 0.0,
            "visual_evidence": f"Vision API error: {e}",
            "profile": dict(GENERIC_PROFILE),
            "fallback_triggered": True,
            "error": str(e),
        }


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python plant_id.py <path_to_image>")
        sys.exit(1)

    with open(sys.argv[1], "rb") as f:
        content = f.read()

    res = identify_plant_from_bytes(content)
    print(json.dumps(res, indent=2))
