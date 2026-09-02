"""
Trend analysis + short-horizon forecast for field time series.

Works on NASA POWER daily series (rainfall, temp, ET, NDVI proxy, etc.).
"""

from __future__ import annotations

from typing import Dict, List, Optional

import numpy as np


def _series_from_power_dict(d: dict) -> List[dict]:
    """Convert POWER {YYYYMMDD: value} dict into sorted [{date, value}]."""
    items = []
    for k, v in (d or {}).items():
        try:
            val = float(v)
        except (TypeError, ValueError):
            continue
        if not np.isfinite(val) or val <= -900:  # POWER fill
            continue
        date = f"{str(k)[0:4]}-{str(k)[4:6]}-{str(k)[6:8]}"
        items.append({"date": date, "value": val})
    items.sort(key=lambda x: x["date"])
    return items


def linear_trend(values: List[float]) -> dict:
    y = np.asarray(values, dtype=np.float64)
    n = len(y)
    if n < 3:
        return {"slope": 0.0, "direction": "flat", "r2": 0.0}
    x = np.arange(n, dtype=np.float64)
    coef = np.polyfit(x, y, 1)
    slope = float(coef[0])
    pred = np.polyval(coef, x)
    ss_res = float(np.sum((y - pred) ** 2))
    ss_tot = float(np.sum((y - np.mean(y)) ** 2)) + 1e-9
    r2 = 1.0 - ss_res / ss_tot
    # normalize slope by mean magnitude
    scale = abs(float(np.mean(y))) + 1e-6
    rel = slope / scale
    if rel > 0.03:
        direction = "rising"
    elif rel < -0.03:
        direction = "falling"
    else:
        direction = "stable"
    return {"slope": slope, "direction": direction, "r2": float(max(0.0, min(1.0, r2)))}


def forecast_next(values: List[float], horizon: int = 7) -> List[float]:
    """Simple linear + exponential-smoothing hybrid forecast."""
    y = np.asarray(values, dtype=np.float64)
    if len(y) == 0:
        return [0.0] * horizon
    if len(y) == 1:
        return [float(y[0])] * horizon
    # linear
    x = np.arange(len(y), dtype=np.float64)
    slope, intercept = np.polyfit(x, y, 1)
    # exp smoothing level
    alpha = 0.4
    level = float(y[0])
    for v in y[1:]:
        level = alpha * float(v) + (1 - alpha) * level
    out = []
    for i in range(1, horizon + 1):
        lin = intercept + slope * (len(y) - 1 + i)
        # blend
        out.append(float(0.55 * lin + 0.45 * level))
    return out


def explain_trend(name: str, trend: dict, unit: str = "") -> str:
    d = trend["direction"]
    if d == "rising":
        return f"{name} is trending up{(' ('+unit+')') if unit else ''} — conditions are intensifying."
    if d == "falling":
        return f"{name} is trending down{(' ('+unit+')') if unit else ''} — values are easing."
    return f"{name} is relatively stable{(' ('+unit+')') if unit else ''} over the recent window."


def analyze_power_bundle(power: dict, horizon: int = 7) -> dict:
    """
    power: normalized POWER object with temp/rainfall/et/humidity/solar dicts.
    """
    metrics_cfg = [
        ("rainfall", "Rainfall", "mm"),
        ("temp", "Temperature", "°C"),
        ("et", "Evapotranspiration", "mm"),
        ("humidity", "Humidity", "%"),
        ("solar", "Solar radiation", "kWh/m²"),
    ]
    series = {}
    trends = {}
    forecasts = {}
    explanations = []

    for key, label, unit in metrics_cfg:
        pts = _series_from_power_dict(power.get(key) or {})
        vals = [p["value"] for p in pts]
        series[key] = pts
        tr = linear_trend(vals)
        trends[key] = tr
        forecasts[key] = forecast_next(vals, horizon=horizon)
        explanations.append(explain_trend(label, tr, unit))

    # Narrative "where it's leading"
    rain_dir = trends.get("rainfall", {}).get("direction")
    et_dir = trends.get("et", {}).get("direction")
    temp_dir = trends.get("temp", {}).get("direction")

    outlook = "stable"
    outlook_title = "Conditions look steady"
    outlook_message = "No strong shift detected over the next week based on recent trends."

    if rain_dir == "falling" and et_dir == "rising":
        outlook = "drying"
        outlook_title = "Heading toward drier conditions"
        outlook_message = (
            "Rainfall is easing while crop water demand (ET) is rising. "
            "Plan irrigation readiness over the next several days."
        )
    elif rain_dir == "rising" and (et_dir == "falling" or et_dir == "stable"):
        outlook = "wetting"
        outlook_title = "Heading toward wetter conditions"
        outlook_message = (
            "Rainfall is increasing. Watch drainage and disease risk if humidity stays high."
        )
    elif temp_dir == "rising":
        outlook = "warming"
        outlook_title = "Heading toward warmer stress"
        outlook_message = (
            "Temperatures are climbing. Heat stress risk may increase — consider cooling irrigation."
        )

    # Predicted 7-day totals
    pred_rain = float(np.sum(forecasts.get("rainfall") or [0]))
    pred_et = float(np.sum(forecasts.get("et") or [0]))

    return {
        "series": series,
        "trends": trends,
        "forecasts": forecasts,
        "explanations": explanations,
        "outlook": {
            "code": outlook,
            "title": outlook_title,
            "message": outlook_message,
            "predictedRain_mm": round(pred_rain, 1),
            "predictedET_mm": round(pred_et, 1),
            "horizonDays": horizon,
        },
    }
