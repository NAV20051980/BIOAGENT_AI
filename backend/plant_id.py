"""
BioAgent AI — plant_id.py
Local, open-source plant species identification from a photo.

No external API call (no PlantNet/Plant.id key needed) — runs a pretrained
image classifier locally via torchvision, then maps the recognized label to a
watering-care profile that feeds into agent.py's reasoning prompt.

Model weights download once from PyTorch's public model hub the first time
you run this (needs internet then only) and are cached locally afterwards —
after that, this runs fully offline.

Usage from main.py:
    from plant_id import identify_plant_from_bytes
    result = identify_plant_from_bytes(image_bytes)
    # result = {"species": ..., "confidence": 0.83, "profile": {...}}
"""

import io
import json
import os

_model = None
_weights = None
_categories = None


# ------------------------------------------------------------------
# Care profiles for common houseplants/crops. ImageNet labels that map
# to a recognized plant get looked up here; anything else falls back to
# a generic profile. Extend this table as needed — it's the "knowledge"
# layer on top of the raw classifier output.
# ------------------------------------------------------------------
CARE_PROFILES = {
    "monstera": {
        "species": "Monstera Deliciosa",
        "growth_stage": "active vegetative growth",
        "ideal_moisture_range_pct": [40, 65],
        "notes": "Prefers evenly moist soil; sensitive to both drought stress and root rot from overwatering.",
    },
    "cactus": {
        "species": "Cactus (generic)",
        "growth_stage": "mature",
        "ideal_moisture_range_pct": [10, 25],
        "notes": "Drought-tolerant; overwatering is far more dangerous than underwatering.",
    },
    "fern": {
        "species": "Fern (generic)",
        "growth_stage": "mature",
        "ideal_moisture_range_pct": [50, 75],
        "notes": "Tropical fern; needs consistently moist soil, dries out and browns quickly if neglected.",
    },
    "succulent": {
        "species": "Succulent (generic)",
        "growth_stage": "mature",
        "ideal_moisture_range_pct": [15, 30],
        "notes": "Stores water in leaves; water sparingly and let soil dry between waterings.",
    },
    "daisy": {
        "species": "Daisy / flowering annual",
        "growth_stage": "flowering",
        "ideal_moisture_range_pct": [40, 60],
        "notes": "Flowering plant; consistent moisture supports blooming, avoid waterlogging.",
    },
    "corn": {
        "species": "Corn / maize",
        "growth_stage": "vegetative",
        "ideal_moisture_range_pct": [45, 65],
        "notes": "Crop plant; moderate consistent watering, sensitive during flowering/tasseling stage.",
    },
}

# Maps raw ImageNet class-name fragments -> a CARE_PROFILES key.
_LABEL_KEYWORDS = {
    "monstera": "monstera",
    "cactus": "cactus",
    "fern": "fern",
    "succulent": "succulent",
    "daisy": "daisy",
    "corn": "corn",
    "cardoon": "fern",  # ImageNet quirk — leafy plant, closest analog
    "pot": None,  # "pot" (flowerpot) label — no plant info, ignore
}

GENERIC_PROFILE = {
    "species": "Unidentified plant (generic defaults applied)",
    "growth_stage": "unknown",
    "ideal_moisture_range_pct": [35, 60],
    "notes": "Local classifier did not confidently match a known species — using safe generic watering range.",
}


def _load_model():
    """Lazy-load torchvision's pretrained MobileNetV3 classifier.
    Downloads weights once (~10MB), then cached under ~/.cache/torch.
    """
    global _model, _weights, _categories
    if _model is not None:
        return

    import ssl
    try:
        import certifi
        ssl._create_default_https_context = lambda: ssl.create_default_context(cafile=certifi.where())
    except Exception:
        try:
            ssl._create_default_https_context = ssl._create_unverified_context
        except Exception:
            pass

    import torch
    from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights

    _weights = MobileNet_V3_Small_Weights.DEFAULT
    _model = mobilenet_v3_small(weights=_weights)
    _model.eval()
    _categories = _weights.meta["categories"]


def _match_profile(label: str) -> dict | None:
    label_lower = label.lower()
    for keyword, profile_key in _LABEL_KEYWORDS.items():
        if keyword in label_lower:
            if profile_key is None:
                continue
            return CARE_PROFILES[profile_key]
    return None


def identify_plant_from_bytes(image_bytes: bytes) -> dict:
    """Run local classification on raw image bytes (e.g. from an uploaded file).
    Never raises — returns a generic-profile result on any failure so the
    calling endpoint always gets a usable response.
    """
    try:
        import torch
        from PIL import Image

        _load_model()
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        preprocess = _weights.transforms()
        batch = preprocess(img).unsqueeze(0)

        with torch.no_grad():
            logits = _model(batch)
            probs = torch.nn.functional.softmax(logits[0], dim=0)

        top5_prob, top5_idx = torch.topk(probs, 5)

        # Walk the top-5 predictions and use the first one that maps to a
        # known plant profile — raw ImageNet top-1 is often a near-miss
        # (e.g. "vase" instead of "cactus") so checking a few candidates
        # meaningfully improves real-world hit rate.
        for prob, idx in zip(top5_prob.tolist(), top5_idx.tolist()):
            label = _categories[idx]
            profile = _match_profile(label)
            if profile:
                return {
                    "species": profile["species"],
                    "confidence": round(prob, 3),
                    "raw_label": label,
                    "profile": profile,
                }

        # Nothing in top-5 matched a known plant keyword.
        top1_label = _categories[top5_idx[0].item()]
        return {
            "species": GENERIC_PROFILE["species"],
            "confidence": round(top5_prob[0].item(), 3),
            "raw_label": top1_label,
            "profile": GENERIC_PROFILE,
        }

    except Exception as e:
        print(f"[plant_id.py] Local classification failed, using generic profile: {e}")
        return {
            "species": GENERIC_PROFILE["species"],
            "confidence": 0.0,
            "raw_label": None,
            "profile": GENERIC_PROFILE,
            "error": str(e),
        }


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python plant_id.py <path_to_image>")
        sys.exit(1)

    with open(sys.argv[1], "rb") as f:
        data = f.read()
    result = identify_plant_from_bytes(data)
    print(json.dumps(result, indent=2))
