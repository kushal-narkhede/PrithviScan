#!/usr/bin/env python3
"""
Offline helper (4.2): validate a fields CSV before browser import.

Usage:
  python scripts/migrate_fields_csv.py path/to/fields.csv
"""

from __future__ import annotations

import csv
import sys
from pathlib import Path

LAT_KEYS = {"lat", "latitude", "y"}
LON_KEYS = {"lon", "lng", "long", "longitude", "x"}
NAME_KEYS = {"name", "field", "field_name", "fieldname"}
CROP_KEYS = {"crop", "croptype", "crop_type", "crop type"}


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python scripts/migrate_fields_csv.py fields.csv")
        return 2
    path = Path(sys.argv[1])
    if not path.exists():
        print(f"Not found: {path}")
        return 1

    with path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            print("Empty CSV")
            return 1
        headers = {h.strip().lower(): h for h in reader.fieldnames}
        lat_h = next((headers[k] for k in headers if k in LAT_KEYS), None)
        lon_h = next((headers[k] for k in headers if k in LON_KEYS), None)
        name_h = next((headers[k] for k in headers if k in NAME_KEYS), None)
        crop_h = next((headers[k] for k in headers if k in CROP_KEYS), None)
        if not lat_h or not lon_h:
            print("Need lat/latitude and lon/longitude columns")
            return 1

        ok = 0
        bad = 0
        for i, row in enumerate(reader, start=2):
            try:
                lat = float(row[lat_h])
                lon = float(row[lon_h])
            except (TypeError, ValueError):
                print(f"Row {i}: bad coordinates")
                bad += 1
                continue
            if not (-90 <= lat <= 90 and -180 <= lon <= 180):
                print(f"Row {i}: out of range {lat},{lon}")
                bad += 1
                continue
            name = (row.get(name_h) if name_h else None) or f"Field {i}"
            crop = (row.get(crop_h) if crop_h else "") or ""
            print(f"OK  {name!r}  {lat:.5f},{lon:.5f}  crop={crop or '-'}")
            ok += 1

    print(f"\nValid: {ok}  Invalid: {bad}")
    return 0 if bad == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
