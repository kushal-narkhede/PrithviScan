"""
Train a field vs not-field image classifier.

Expected layout (you drop images here):
  ml/data/field/       ← agricultural field patches
  ml/data/not_field/   ← city, water, forest, desert, roads, etc.

Usage:
  pip install -r ml/requirements.txt
  python -m ml.train_field_classifier

Optional CNN (needs tensorflow):
  python -m ml.train_field_classifier --cnn
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import train_test_split

from .preprocess import extract_features, load_rgb

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
MODEL_DIR = ROOT / "models"
FIELD_DIR = DATA / "field"
NOT_FIELD_DIR = DATA / "not_field"


def collect_paths():
    field = list(FIELD_DIR.glob("*.*"))
    not_field = list(NOT_FIELD_DIR.glob("*.*"))
    exts = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"}
    field = [p for p in field if p.suffix.lower() in exts]
    not_field = [p for p in not_field if p.suffix.lower() in exts]
    return field, not_field


def build_feature_matrix(paths, label: int):
    X, y = [], []
    for p in paths:
        try:
            rgb = load_rgb(p)
            feats = extract_features(rgb)
            X.append(
                [
                    feats["greenness"],
                    feats["veg_fraction"],
                    feats["ndvi_proxy"],
                    feats["texture"],
                    feats["hsv_veg_ratio"],
                    feats["cloud_fraction"],
                    feats["mean_brightness"],
                ]
            )
            y.append(label)
        except Exception as exc:  # noqa: BLE001
            print(f"skip {p.name}: {exc}")
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.int32)


def train_sklearn():
    field, not_field = collect_paths()
    if len(field) < 20 or len(not_field) < 20:
        raise SystemExit(
            f"Need ≥20 images per class. Found field={len(field)}, not_field={len(not_field)}.\n"
            f"Add images to:\n  {FIELD_DIR}\n  {NOT_FIELD_DIR}\n"
            "See ml/DATASETS.md for 10k+ sources."
        )

    Xf, yf = build_feature_matrix(field, 1)
    Xn, yn = build_feature_matrix(not_field, 0)
    X = np.vstack([Xf, Xn])
    y = np.concatenate([yf, yn])

    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        random_state=42,
        n_jobs=-1,
        class_weight="balanced",
    )
    clf.fit(Xtr, ytr)
    pred = clf.predict(Xte)
    report = classification_report(yte, pred, target_names=["not_field", "field"])
    cm = confusion_matrix(yte, pred).tolist()
    print(report)

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model_path = MODEL_DIR / "field_classifier.joblib"
    joblib.dump(clf, model_path)
    meta = {
        "type": "random_forest",
        "features": [
            "greenness",
            "veg_fraction",
            "ndvi_proxy",
            "texture",
            "hsv_veg_ratio",
            "cloud_fraction",
            "mean_brightness",
        ],
        "n_field": int(len(field)),
        "n_not_field": int(len(not_field)),
        "confusion_matrix": cm,
        "model_path": str(model_path),
    }
    (MODEL_DIR / "field_classifier_meta.json").write_text(json.dumps(meta, indent=2))
    print(f"Saved {model_path}")
    return model_path


def train_cnn():
    try:
        import tensorflow as tf
        from tensorflow.keras import layers, models
        from tensorflow.keras.applications import MobileNetV2
        from tensorflow.keras.preprocessing.image import ImageDataGenerator
    except ImportError as exc:
        raise SystemExit("Install tensorflow to use --cnn: pip install tensorflow") from exc

    if not FIELD_DIR.exists() or not NOT_FIELD_DIR.exists():
        raise SystemExit("Create ml/data/field and ml/data/not_field first.")

    # Keras expects class folders under a parent
    # We already have field/ and not_field/ under data/
    datagen = ImageDataGenerator(
        rescale=1.0 / 255,
        validation_split=0.2,
        rotation_range=20,
        horizontal_flip=True,
        zoom_range=0.15,
    )
    train_gen = datagen.flow_from_directory(
        DATA,
        target_size=(224, 224),
        batch_size=32,
        class_mode="binary",
        subset="training",
        classes=["not_field", "field"],
    )
    val_gen = datagen.flow_from_directory(
        DATA,
        target_size=(224, 224),
        batch_size=32,
        class_mode="binary",
        subset="validation",
        classes=["not_field", "field"],
    )

    base = MobileNetV2(input_shape=(224, 224, 3), include_top=False, weights="imagenet")
    base.trainable = False
    model = models.Sequential(
        [
            base,
            layers.GlobalAveragePooling2D(),
            layers.Dropout(0.3),
            layers.Dense(128, activation="relu"),
            layers.Dense(1, activation="sigmoid"),
        ]
    )
    model.compile(optimizer="adam", loss="binary_crossentropy", metrics=["accuracy"])
    model.fit(train_gen, validation_data=val_gen, epochs=8)
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    out = MODEL_DIR / "field_classifier_cnn.keras"
    model.save(out)
    print(f"Saved {out}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cnn", action="store_true", help="Train MobileNetV2 CNN")
    args = parser.parse_args()
    FIELD_DIR.mkdir(parents=True, exist_ok=True)
    NOT_FIELD_DIR.mkdir(parents=True, exist_ok=True)
    if args.cnn:
        train_cnn()
    else:
        train_sklearn()


if __name__ == "__main__":
    main()
