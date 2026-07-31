"""
Infer field vs not-field for an image path or RGB array.

Falls back to heuristic_v1 if no trained model is present.
"""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np

from .preprocess import extract_features, heuristic_is_field, load_rgb, array_from_bytes

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "models" / "field_classifier.joblib"


FEATURE_ORDER = [
    "greenness",
    "veg_fraction",
    "ndvi_proxy",
    "texture",
    "hsv_veg_ratio",
    "cloud_fraction",
    "mean_brightness",
]


def _vector(features: dict) -> np.ndarray:
    return np.array([[features[k] for k in FEATURE_ORDER]], dtype=np.float32)


def classify_rgb(rgb: np.ndarray) -> dict:
    features = extract_features(rgb)
    if MODEL_PATH.exists():
        clf = joblib.load(MODEL_PATH)
        proba = float(clf.predict_proba(_vector(features))[0][1])
        is_field = proba >= 0.5
        return {
            "is_field": is_field,
            "confidence": proba if is_field else 1.0 - proba,
            "field_probability": proba,
            "reason": "Trained RandomForest field classifier",
            "features": features,
            "model": "random_forest",
        }
    result = heuristic_is_field(features)
    result["field_probability"] = result["confidence"] if result["is_field"] else 1.0 - result["confidence"]
    return result


def classify_path(path: str | Path) -> dict:
    return classify_rgb(load_rgb(path))


def classify_bytes(data: bytes) -> dict:
    return classify_rgb(array_from_bytes(data))


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python -m ml.infer_field <image>")
        raise SystemExit(1)
    print(classify_path(sys.argv[1]))
