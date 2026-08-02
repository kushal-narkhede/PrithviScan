"""
Train a field vs not-field image classifier from EuroSAT (or prepared folders).

On your Windows PC (dataset already at the default path):
  python -m ml.train_field_classifier

Or double-click:
  ml\\train_eurosat.bat

Default EuroSAT path:
  D:\\Kushal\\EuroSAT_RGB\\EuroSAT_RGB

Optional CNN (after prepare_eurosat):
  python -m ml.train_field_classifier --cnn
"""

from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
)
from sklearn.model_selection import train_test_split

from .preprocess import extract_features, load_rgb

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
MODEL_DIR = ROOT / "models"
FIELD_DIR = DATA / "field"
NOT_FIELD_DIR = DATA / "not_field"

# Your local EuroSAT folder (class subfolders: AnnualCrop, Forest, …)
DEFAULT_EUROSAT = Path(r"D:\Kushal\EuroSAT_RGB\EuroSAT_RGB")

EXTS = {".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp"}

# EuroSAT class → field / not_field
EUROSAT_FIELD = {"AnnualCrop", "PermanentCrop", "Pasture"}
EUROSAT_NOT_FIELD = {
    "Residential",
    "Industrial",
    "Highway",
    "River",
    "SeaLake",
    "Forest",
    "HerbaceousVegetation",
}


def _images_in(folder: Path):
    if not folder.is_dir():
        return []
    return [p for p in folder.rglob("*") if p.is_file() and p.suffix.lower() in EXTS]


def resolve_eurosat_root(eurosat_root: Path) -> Path:
    """Accept either …/EuroSAT_RGB or nested …/EuroSAT_RGB/EuroSAT_RGB."""
    root = eurosat_root
    if not any((root / c).is_dir() for c in EUROSAT_FIELD | EUROSAT_NOT_FIELD):
        nested = root / "EuroSAT_RGB"
        if nested.is_dir():
            root = nested
    return root


def collect_from_eurosat(eurosat_root: Path):
    """Read EuroSAT class folders directly (no copy into the repo)."""
    root = resolve_eurosat_root(eurosat_root)

    field, not_field = [], []
    missing = []
    for cls in sorted(EUROSAT_FIELD):
        paths = _images_in(root / cls)
        if not paths:
            missing.append(cls)
        field.extend(paths)
    for cls in sorted(EUROSAT_NOT_FIELD):
        paths = _images_in(root / cls)
        if not paths:
            missing.append(cls)
        not_field.extend(paths)

    if missing:
        print("Warning — empty/missing classes:", ", ".join(missing))
    print(f"EuroSAT source: {root}")
    print(f"  field (AnnualCrop, PermanentCrop, Pasture): {len(field)}")
    print(
        "  not_field (Residential, Industrial, Highway, River, SeaLake, Forest, HerbaceousVegetation):",
        len(not_field),
    )
    return field, not_field


def collect_from_prepared():
    field = _images_in(FIELD_DIR)
    not_field = _images_in(NOT_FIELD_DIR)
    return field, not_field


def build_feature_matrix(paths, label: int):
    X, y = [], []
    total = len(paths)
    for i, p in enumerate(paths, 1):
        if i % 500 == 0 or i == total:
            print(f"  features {i}/{total} (label={label})")
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


def train_sklearn(field, not_field, source: str):
    if len(field) < 20 or len(not_field) < 20:
        raise SystemExit(
            f"Need ≥20 images per class. Found field={len(field)}, not_field={len(not_field)}.\n"
            f'Pass --eurosat "{DEFAULT_EUROSAT}" or fill ml/data/field and ml/data/not_field.'
        )

    print("Extracting features (this can take a few minutes)…")
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
    print("Training RandomForest…")
    clf.fit(Xtr, ytr)
    pred = clf.predict(Xte)
    report = classification_report(yte, pred, target_names=["not_field", "field"])
    cm = confusion_matrix(yte, pred).tolist()
    acc = float(accuracy_score(yte, pred))
    f1 = float(f1_score(yte, pred, average="weighted"))
    print(report)
    print(f"accuracy={acc:.4f}  weighted_f1={f1:.4f}")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    versions_dir = MODEL_DIR / "versions"
    versions_dir.mkdir(parents=True, exist_ok=True)

    version = datetime.now(timezone.utc).strftime("v%Y%m%dT%H%M%SZ")
    model_path = MODEL_DIR / "field_classifier.joblib"
    versioned_path = versions_dir / f"field_classifier_{version}.joblib"
    joblib.dump(clf, model_path)
    shutil.copy2(model_path, versioned_path)

    meta = {
        "version": version,
        "type": "random_forest",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": source,
        "fallback": "heuristic_v1 (ExG / veg fraction) when model missing",
        "eurosat_classes_field": sorted(EUROSAT_FIELD),
        "eurosat_classes_not_field": sorted(EUROSAT_NOT_FIELD),
        "features": [
            "greenness",
            "veg_fraction",
            "ndvi_proxy",
            "texture",
            "hsv_veg_ratio",
            "cloud_fraction",
            "mean_brightness",
        ],
        "metrics": {
            "accuracy": acc,
            "weighted_f1": f1,
            "n_test": int(len(yte)),
        },
        "n_field": int(len(field)),
        "n_not_field": int(len(not_field)),
        "confusion_matrix": cm,
        "model_path": str(model_path),
        "versioned_path": str(versioned_path),
        "classification_report": report,
    }
    meta_path = MODEL_DIR / "field_classifier_meta.json"
    meta_path.write_text(json.dumps(meta, indent=2))
    (versions_dir / f"field_classifier_{version}_meta.json").write_text(
        json.dumps(meta, indent=2)
    )

    # Append to local model registry (feature 3.1)
    registry_path = MODEL_DIR / "registry.json"
    registry = {"models": []}
    if registry_path.exists():
        try:
            registry = json.loads(registry_path.read_text())
        except json.JSONDecodeError:
            registry = {"models": []}
    registry.setdefault("models", []).append(
        {
            "version": version,
            "type": meta["type"],
            "accuracy": acc,
            "weighted_f1": f1,
            "created_at": meta["created_at"],
            "path": str(versioned_path),
            "active": True,
        }
    )
    # Only the newest is marked active
    for i, row in enumerate(registry["models"]):
        row["active"] = i == len(registry["models"]) - 1
    registry_path.write_text(json.dumps(registry, indent=2))

    print(f"Saved {model_path}")
    print(f"Versioned copy: {versioned_path}")
    print(f"Registry: {registry_path}")
    return model_path


def train_cnn(eurosat_root: Path | None):
    try:
        from tensorflow.keras import layers, models
        from tensorflow.keras.applications import MobileNetV2
        from tensorflow.keras.preprocessing.image import ImageDataGenerator
    except ImportError as exc:
        raise SystemExit("Install tensorflow to use --cnn: pip install tensorflow") from exc

    if eurosat_root:
        raise SystemExit(
            "For --cnn with EuroSAT, first run:\n"
            f'  python -m ml.prepare_eurosat --eurosat "{eurosat_root}"\n'
            "Then: python -m ml.train_field_classifier --cnn"
        )

    if not FIELD_DIR.exists() or not NOT_FIELD_DIR.exists():
        raise SystemExit("Create ml/data/field and ml/data/not_field first.")

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


def pick_eurosat_path(cli_path: str) -> Path | None:
    """Prefer CLI path; else default Kushal path if it exists on this machine."""
    if cli_path:
        p = Path(cli_path)
        if not p.exists():
            raise SystemExit(f"EuroSAT path not found: {p}")
        return p
    if DEFAULT_EUROSAT.exists():
        print(f"Using default EuroSAT path: {DEFAULT_EUROSAT}")
        return DEFAULT_EUROSAT
    # Also try parent if user pointed one level up previously
    parent = DEFAULT_EUROSAT.parent
    if parent.exists() and (parent / "AnnualCrop").is_dir():
        print(f"Using EuroSAT path: {parent}")
        return parent
    return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--eurosat",
        type=str,
        default="",
        help=rf"Path to EuroSAT_RGB (default if present: {DEFAULT_EUROSAT})",
    )
    parser.add_argument("--cnn", action="store_true", help="Train MobileNetV2 CNN")
    parser.add_argument(
        "--max-per-class",
        type=int,
        default=0,
        help="Optional cap per side for faster test runs (0 = use all)",
    )
    args = parser.parse_args()

    FIELD_DIR.mkdir(parents=True, exist_ok=True)
    NOT_FIELD_DIR.mkdir(parents=True, exist_ok=True)

    eurosat = pick_eurosat_path(args.eurosat)
    if args.cnn:
        train_cnn(eurosat)
        return

    source = "prepared"
    if eurosat:
        field, not_field = collect_from_eurosat(eurosat)
        source = str(resolve_eurosat_root(eurosat))
    else:
        field, not_field = collect_from_prepared()
        if len(field) < 20 or len(not_field) < 20:
            raise SystemExit(
                "No EuroSAT folder found and ml/data is empty.\n"
                f"Expected dataset at: {DEFAULT_EUROSAT}\n"
                "Folders should include: AnnualCrop, Forest, HerbaceousVegetation, Highway, "
                "Industrial, Pasture, PermanentCrop, Residential, River, SeaLake\n"
                f'Or pass: --eurosat "{DEFAULT_EUROSAT}"'
            )

    if args.max_per_class and args.max_per_class > 0:
        field = field[: args.max_per_class]
        not_field = not_field[: args.max_per_class]
        print(f"Capped to {args.max_per_class} per class for this run")

    train_sklearn(field, not_field, source=source)


if __name__ == "__main__":
    main()
