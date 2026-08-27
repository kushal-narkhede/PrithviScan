"""
Optional: copy/symlink EuroSAT classes into ml/data/field and ml/data/not_field.

Usually you do NOT need this — train with:
  python -m ml.train_field_classifier --eurosat "D:\\Kushal\\EuroSAT_RGB\\EuroSAT_RGB"

Use this only if you want local copies (e.g. for --cnn).
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

FIELD_CLASSES = ["AnnualCrop", "PermanentCrop", "Pasture"]
NOT_FIELD_CLASSES = [
    "Residential",
    "Industrial",
    "Highway",
    "River",
    "SeaLake",
    "Forest",
    "HerbaceousVegetation",
]

ROOT = Path(__file__).resolve().parent
OUT_FIELD = ROOT / "data" / "field"
OUT_NOT = ROOT / "data" / "not_field"
EXTS = {".jpg", ".jpeg", ".png"}


def resolve_root(path: Path) -> Path:
    if any((path / c).is_dir() for c in FIELD_CLASSES):
        return path
    nested = path / "EuroSAT_RGB"
    if nested.is_dir():
        return nested
    return path


def copy_class(src_dir: Path, dest_dir: Path, limit: int = 0):
    dest_dir.mkdir(parents=True, exist_ok=True)
    files = [p for p in src_dir.iterdir() if p.suffix.lower() in EXTS]
    files.sort()
    if limit:
        files = files[:limit]
    for p in files:
        target = dest_dir / f"{src_dir.name}_{p.name}"
        if not target.exists():
            shutil.copy2(p, target)
    return len(files)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--eurosat", required=True, help=r"D:\Kushal\EuroSAT_RGB\EuroSAT_RGB")
    parser.add_argument("--limit-per-class", type=int, default=0, help="0 = all images")
    args = parser.parse_args()

    root = resolve_root(Path(args.eurosat))
    if not root.exists():
        raise SystemExit(f"Not found: {root}")

    n_field = 0
    for cls in FIELD_CLASSES:
        n_field += copy_class(root / cls, OUT_FIELD, args.limit_per_class)
    n_not = 0
    for cls in NOT_FIELD_CLASSES:
        n_not += copy_class(root / cls, OUT_NOT, args.limit_per_class)

    print(f"Done. field={n_field}, not_field={n_not}")
    print(f"  {OUT_FIELD}")
    print(f"  {OUT_NOT}")


if __name__ == "__main__":
    main()
