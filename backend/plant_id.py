"""
BioAgent AI — plant_id.py
Local, open-source plant species identification from a photo — no external API.

Two-stage pipeline (this is the important part for "only focus on the plant"):

  Stage 1 — DETECT: a pretrained object detector (torchvision Faster R-CNN,
            COCO weights) finds the "potted plant" bounding box in the frame
            and we crop tightly to it, with a small margin. This throws away
            background clutter, hands, tables, other objects — the classifier
            in Stage 2 only ever sees the plant itself, not the whole scene.

  Stage 2 — CLASSIFY: a pretrained MobileNetV3 image classifier runs on the
            cropped plant region only, and its top-5 predictions are matched
            against a small care-profile table.

If Stage 1 finds nothing confident enough, we fall back to classifying the
full frame (with a note in the result saying detection didn't fire), rather
than failing outright.

Both models download their weights once from PyTorch's public hub (needs
internet the first time only) and are cached locally afterwards — fully
offline after that.

Usage from main.py:
    from plant_id import identify_plant_from_bytes
    result = identify_plant_from_bytes(image_bytes)
    # result = {"species": ..., "confidence": 0.83, "profile": {...},
    #           "detection": {"plant_found": true, "box": [...], "detector_confidence": 0.91}}
"""

import io
import json

_detector = None
_detector_categories = None

_classifier = None
_classifier_weights = None
_classifier_categories = None

# Minimum detector confidence to trust a "potted plant" box.
# Lower this if the demo plant keeps getting missed; raise it if it's
# grabbing background objects too eagerly.
DETECTION_CONFIDENCE_THRESHOLD = 0.40

# Extra margin (fraction of box size) added around the detected plant box,
# so leaf tips/edges right at the box border aren't clipped out.
CROP_MARGIN_FRACTION = 0.15


# ------------------------------------------------------------------
# Care profiles for common houseplants/crops. Extend this table as needed —
# it's the "knowledge" layer on top of the raw classifier output.
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


# ============================================================
# STAGE 1 — DETECTION: find the plant, crop everything else out
# ============================================================
def _load_detector():
    """Lazy-load a pretrained COCO object detector. We only care about its
    'potted plant' class — this lets us crop straight to the plant and
    ignore background, hands, furniture, etc. in the frame.
    """
    global _detector, _detector_categories
    if _detector is not None:
        return

    from torchvision.models.detection import (
        fasterrcnn_mobilenet_v3_large_320_fpn,
        FasterRCNN_MobileNet_V3_Large_320_FPN_Weights,
    )

    weights = FasterRCNN_MobileNet_V3_Large_320_FPN_Weights.DEFAULT
    _detector = fasterrcnn_mobilenet_v3_large_320_fpn(weights=weights)
    _detector.eval()
    _detector_categories = weights.meta["categories"]


def _detect_plant_box(img):
    """Run the detector, return the highest-confidence 'potted plant' box
    (in pixel coords: x1, y1, x2, y2) plus its confidence, or (None, 0.0)
    if nothing confident enough was found.
    """
    import torch
    import torchvision.transforms.functional as F

    _load_detector()
    tensor = F.to_tensor(img)

    with torch.no_grad():
        predictions = _detector([tensor])[0]

    boxes = predictions["boxes"]
    labels = predictions["labels"]
    scores = predictions["scores"]

    best_box, best_score = None, 0.0
    for box, label_idx, score in zip(boxes, labels, scores):
        label = _detector_categories[label_idx]
        if label == "potted plant" and score.item() > best_score:
            best_box = box.tolist()
            best_score = score.item()

    if best_box is not None and best_score >= DETECTION_CONFIDENCE_THRESHOLD:
        return best_box, best_score
    return None, 0.0


def _crop_with_margin(img, box):
    """Crop img to box, expanded by CROP_MARGIN_FRACTION on each side,
    clamped to image bounds.
    """
    w, h = img.size
    x1, y1, x2, y2 = box
    box_w, box_h = x2 - x1, y2 - y1
    mx, my = box_w * CROP_MARGIN_FRACTION, box_h * CROP_MARGIN_FRACTION

    x1 = max(0, x1 - mx)
    y1 = max(0, y1 - my)
    x2 = min(w, x2 + mx)
    y2 = min(h, y2 + my)

    return img.crop((x1, y1, x2, y2))


# ============================================================
# STAGE 2 — CLASSIFICATION: species guess on the cropped plant only
# ============================================================
def _load_classifier():
    global _classifier, _classifier_weights, _classifier_categories
    if _classifier is not None:
        return

    from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights

    _classifier_weights = MobileNet_V3_Small_Weights.DEFAULT
    _classifier = mobilenet_v3_small(weights=_classifier_weights)
    _classifier.eval()
    _classifier_categories = _classifier_weights.meta["categories"]


def _match_profile(label: str):
    label_lower = label.lower()
    for keyword, profile_key in _LABEL_KEYWORDS.items():
        if keyword in label_lower:
            if profile_key is None:
                continue
            return CARE_PROFILES[profile_key]
    return None


def _classify(img) -> dict:
    """Run the classifier on a (possibly cropped) PIL image, return the
    best matched profile from the top-5 predictions, or a generic one.
    """
    import torch

    _load_classifier()
    preprocess = _classifier_weights.transforms()
    batch = preprocess(img).unsqueeze(0)

    with torch.no_grad():
        logits = _classifier(batch)
        probs = torch.nn.functional.softmax(logits[0], dim=0)

    top5_prob, top5_idx = torch.topk(probs, 5)

    for prob, idx in zip(top5_prob.tolist(), top5_idx.tolist()):
        label = _classifier_categories[idx]
        profile = _match_profile(label)
        if profile:
            return {
                "species": profile["species"],
                "confidence": round(prob, 3),
                "raw_label": label,
                "profile": profile,
            }

    top1_label = _classifier_categories[top5_idx[0].item()]
    return {
        "species": GENERIC_PROFILE["species"],
        "confidence": round(top5_prob[0].item(), 3),
        "raw_label": top1_label,
        "profile": GENERIC_PROFILE,
    }


# ============================================================
# PUBLIC ENTRY POINT
# ============================================================
def identify_plant_from_bytes(image_bytes: bytes) -> dict:
    """Detect the plant in the frame, crop to it, classify the crop.
    Never raises — returns a generic-profile result on any failure so the
    calling endpoint always gets a usable response.
    """
    try:
        from PIL import Image

        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        box, det_confidence = _detect_plant_box(img)
        if box is not None:
            crop = _crop_with_margin(img, box)
            detection_info = {
                "plant_found": True,
                "box": [round(v, 1) for v in box],
                "detector_confidence": round(det_confidence, 3),
                "note": "Classified only the cropped plant region — background ignored.",
            }
            target_img = crop
        else:
            detection_info = {
                "plant_found": False,
                "box": None,
                "detector_confidence": 0.0,
                "note": "No confident 'potted plant' region found — classified the full frame instead.",
            }
            target_img = img

        result = _classify(target_img)
        result["detection"] = detection_info
        return result

    except Exception as e:
        print(f"[plant_id.py] Identification failed, using generic profile: {e}")
        return {
            "species": GENERIC_PROFILE["species"],
            "confidence": 0.0,
            "raw_label": None,
            "profile": GENERIC_PROFILE,
            "detection": {"plant_found": False, "box": None, "detector_confidence": 0.0,
                          "note": "Detection/classification pipeline errored."},
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
