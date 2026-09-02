"""
Analyze NASA-style satellite patches (RGB or multi-band arrays).

When true NIR is available (HLS/MODIS), prefer compute_ndvi().
When only RGB map/satellite preview is available, use rgb proxies.
"""

from __future__ import annotations

import numpy as np

from .preprocess import extract_features, heuristic_is_field


def compute_ndvi(nir: np.ndarray, red: np.ndarray) -> np.ndarray:
    nir = nir.astype(np.float32)
    red = red.astype(np.float32)
    return (nir - red) / (nir + red + 1e-6)


def compute_evi(nir: np.ndarray, red: np.ndarray, blue: np.ndarray) -> np.ndarray:
    nir = nir.astype(np.float32)
    red = red.astype(np.float32)
    blue = blue.astype(np.float32)
    return 2.5 * (nir - red) / (nir + 6 * red - 7.5 * blue + 1.0)


def stress_mask(ndvi: np.ndarray, healthy_min: float = 0.35) -> dict:
    valid = np.isfinite(ndvi)
    if not np.any(valid):
        return {"stressed_fraction": 0.0, "mean_ndvi": None}
    vals = ndvi[valid]
    return {
        "mean_ndvi": float(np.mean(vals)),
        "stressed_fraction": float(np.mean(vals < healthy_min)),
        "healthy_fraction": float(np.mean(vals >= healthy_min)),
    }


def analyze_rgb_patch(rgb: np.ndarray) -> dict:
    feats = extract_features(rgb)
    field = heuristic_is_field(feats)
    return {
        "vegetation": feats,
        "field_check": field,
        "summary": (
            "Vegetation looks active"
            if feats["veg_fraction"] > 0.25
            else "Vegetation looks sparse — possible stress or non-crop land"
        ),
    }
