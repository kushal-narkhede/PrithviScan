"""
Satellite / map image preprocessing for PrithviScan.

Uses OpenCV + Pillow + scikit-image for:
- resize / normalize
- vegetation greenness indices (RGB proxy for NDVI when only RGB available)
- simple cloud / bright-pixel masking
- patch extraction around a lat/lon from a map tile image
"""

from __future__ import annotations

from pathlib import Path
from typing import Tuple

import cv2
import numpy as np
from PIL import Image
from skimage.color import rgb2hsv


def load_rgb(path: str | Path, size: Tuple[int, int] = (224, 224)) -> np.ndarray:
    """Load an image as float RGB in [0, 1], resized."""
    img = Image.open(path).convert("RGB")
    img = img.resize(size, Image.Resampling.BILINEAR)
    arr = np.asarray(img, dtype=np.float32) / 255.0
    return arr


def array_from_bytes(data: bytes, size: Tuple[int, int] = (224, 224)) -> np.ndarray:
    buf = np.frombuffer(data, dtype=np.uint8)
    bgr = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    if bgr is None:
        raise ValueError("Could not decode image bytes")
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    rgb = cv2.resize(rgb, size, interpolation=cv2.INTER_LINEAR)
    return rgb.astype(np.float32) / 255.0


def greenness_index(rgb: np.ndarray) -> float:
    """
    Excess Green Index (ExG) mean — high for vegetation / crops.
    ExG = 2G - R - B
    """
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    exg = 2.0 * g - r - b
    return float(np.mean(exg))


def vegetation_fraction(rgb: np.ndarray, threshold: float = 0.05) -> float:
    """Fraction of pixels with ExG above threshold."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    exg = 2.0 * g - r - b
    return float(np.mean(exg > threshold))


def ndvi_proxy_rgb(rgb: np.ndarray) -> float:
    """
    Rough NDVI-like proxy from RGB (not true NIR NDVI).
    Useful when NASA HLS/MODIS bands are not yet fused into the pipeline.
    """
    r, g = rgb[..., 0], rgb[..., 1]
    # Treat green as "NIR-ish" proxy for demo classification
    num = g - r
    den = g + r + 1e-6
    return float(np.mean(num / den))


def bright_cloud_mask(rgb: np.ndarray, bright: float = 0.85) -> np.ndarray:
    """Boolean mask of very bright pixels (cloud / glare heuristic)."""
    return np.mean(rgb, axis=-1) > bright


def texture_score(rgb: np.ndarray) -> float:
    """Laplacian variance — fields often have moderate texture vs water/urban."""
    gray = cv2.cvtColor((rgb * 255).astype(np.uint8), cv2.COLOR_RGB2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def hsv_vegetation_ratio(rgb: np.ndarray) -> float:
    hsv = rgb2hsv(rgb)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    # green hues roughly 0.2–0.45 in skimage HSV
    veg = (h > 0.18) & (h < 0.48) & (s > 0.15) & (v > 0.15)
    return float(np.mean(veg))


def extract_features(rgb: np.ndarray) -> dict:
    cloud = bright_cloud_mask(rgb)
    clear = ~cloud
    clear_rgb = rgb.copy()
    if np.any(clear):
        # zero-out cloudy pixels for vegetation stats
        clear_rgb[~clear] = 0

    return {
        "greenness": greenness_index(rgb),
        "veg_fraction": vegetation_fraction(rgb),
        "ndvi_proxy": ndvi_proxy_rgb(rgb),
        "texture": texture_score(rgb),
        "hsv_veg_ratio": hsv_vegetation_ratio(rgb),
        "cloud_fraction": float(np.mean(cloud)),
        "mean_brightness": float(np.mean(rgb)),
    }


def heuristic_is_field(features: dict, min_confidence: float = 0.45) -> dict:
    """
    Rule-based field vs not-field before a trained model is available.
    Returns {is_field, confidence, reason, features}.
    """
    score = 0.0
    reasons = []

    if features["veg_fraction"] > 0.25:
        score += 0.35
        reasons.append("Healthy green cover detected")
    elif features["veg_fraction"] > 0.12:
        score += 0.18
        reasons.append("Some vegetation present")
    else:
        reasons.append("Low vegetation cover")

    if features["hsv_veg_ratio"] > 0.2:
        score += 0.25
        reasons.append("Green crop-like hues present")

    if 50 < features["texture"] < 2500:
        score += 0.2
        reasons.append("Texture matches cultivated land")
    elif features["texture"] < 30:
        score -= 0.15
        reasons.append("Surface looks too smooth (water/road/roof)")

    if features["cloud_fraction"] > 0.4:
        score -= 0.2
        reasons.append("Heavy cloud / glare — lower confidence")

    if features["mean_brightness"] > 0.75 and features["veg_fraction"] < 0.1:
        score -= 0.25
        reasons.append("Bright non-vegetated surface (urban/desert)")

    confidence = float(max(0.0, min(1.0, score)))
    is_field = confidence >= min_confidence
    return {
        "is_field": is_field,
        "confidence": confidence,
        "reason": "; ".join(reasons),
        "features": features,
        "model": "heuristic_v1",
    }
