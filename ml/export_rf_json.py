"""
Export ml/models/field_classifier.joblib → functions/models/field_classifier.json
so Cloud Functions (Node) can run your trained RandomForest.

On Windows (after training):
  python -m ml.export_rf_json

Or:
  ml\\export_model_for_functions.bat
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "models" / "field_classifier.joblib"
META_PATH = ROOT / "models" / "field_classifier_meta.json"
OUT_PATH = ROOT.parent / "functions" / "models" / "field_classifier.json"

FEATURE_ORDER = [
    "greenness",
    "veg_fraction",
    "ndvi_proxy",
    "texture",
    "hsv_veg_ratio",
    "cloud_fraction",
    "mean_brightness",
]


def tree_to_dict(tree) -> dict:
    t = tree.tree_
    return {
        "children_left": t.children_left.tolist(),
        "children_right": t.children_right.tolist(),
        "feature": t.feature.tolist(),
        "threshold": t.threshold.tolist(),
        "value": t.value[:, 0, :].tolist(),  # [n_nodes, n_classes]
    }


def main():
    if not MODEL_PATH.exists():
        raise SystemExit(
            f"Missing {MODEL_PATH}\n"
            "Train first: python -m ml.train_field_classifier\n"
            f'Or: ml\\train_eurosat.bat'
        )

    clf = joblib.load(MODEL_PATH)
    if not hasattr(clf, "estimators_"):
        raise SystemExit("Expected a sklearn RandomForestClassifier (estimators_ missing).")

    meta = {}
    if META_PATH.exists():
        meta = json.loads(META_PATH.read_text(encoding="utf-8"))

    payload = {
        "type": "random_forest",
        "version": meta.get("version", "local"),
        "n_features": int(clf.n_features_in_),
        "features": FEATURE_ORDER,
        "classes": [int(c) for c in clf.classes_],
        "n_estimators": int(clf.n_estimators),
        "metrics": meta.get("metrics", {}),
        "source": meta.get("source", "eurosat"),
        "trees": [tree_to_dict(est) for est in clf.estimators_],
    }

    # Sanity: predict a dummy vector both ways
    dummy = np.zeros((1, len(FEATURE_ORDER)), dtype=np.float32)
    dummy[0, 1] = 0.4  # veg_fraction
    dummy[0, 4] = 0.3  # hsv
    sk_proba = float(clf.predict_proba(dummy)[0][list(clf.classes_).index(1)])

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload), encoding="utf-8")
    size_mb = OUT_PATH.stat().st_size / (1024 * 1024)
    print(f"Wrote {OUT_PATH} ({size_mb:.2f} MB)")
    print(f"Trees: {payload['n_estimators']}  features: {payload['features']}")
    print(f"Train metrics: {payload.get('metrics')}")
    print(f"Sanity sklearn P(field|dummy)={sk_proba:.4f}")
    print()
    print("Next: deploy functions so classifyLocation uses this model:")
    print("  npx firebase deploy --only functions:classifyLocation --project prithviscan")


if __name__ == "__main__":
    main()
