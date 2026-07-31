"use strict";

function powerDictToSeries(dict) {
  const items = [];
  for (const [k, v] of Object.entries(dict || {})) {
    const val = Number(v);
    if (!Number.isFinite(val) || val <= -900) continue;
    const ks = String(k);
    if (ks.length < 8) continue;
    items.push({
      date: `${ks.slice(0, 4)}-${ks.slice(4, 6)}-${ks.slice(6, 8)}`,
      value: val,
    });
  }
  items.sort((a, b) => a.date.localeCompare(b.date));
  return items;
}

function linearTrend(values) {
  const n = values.length;
  if (n < 3) return { slope: 0, direction: "stable", r2: 0 };
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX || 1;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const mean = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * i;
    ssRes += (values[i] - pred) ** 2;
    ssTot += (values[i] - mean) ** 2;
  }
  const r2 = Math.max(0, Math.min(1, 1 - ssRes / (ssTot + 1e-9)));
  const rel = slope / (Math.abs(mean) + 1e-6);
  let direction = "stable";
  if (rel > 0.03) direction = "rising";
  else if (rel < -0.03) direction = "falling";
  return { slope, direction, r2 };
}

function forecastNext(values, horizon = 7) {
  if (!values.length) return Array(horizon).fill(0);
  if (values.length === 1) return Array(horizon).fill(values[0]);
  const n = values.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i; sumY += values[i]; sumXY += i * values[i]; sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX || 1;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  let level = values[0];
  const alpha = 0.4;
  for (let i = 1; i < n; i++) level = alpha * values[i] + (1 - alpha) * level;
  const out = [];
  for (let i = 1; i <= horizon; i++) {
    const lin = intercept + slope * (n - 1 + i);
    out.push(0.55 * lin + 0.45 * level);
  }
  return out;
}

function explain(name, trend, unit) {
  const u = unit ? ` (${unit})` : "";
  if (trend.direction === "rising") return `${name} is trending up${u} — conditions are intensifying.`;
  if (trend.direction === "falling") return `${name} is trending down${u} — values are easing.`;
  return `${name} is relatively stable${u} over the recent window.`;
}

function analyzePowerBundle(power, horizon = 7) {
  const cfg = [
    ["rainfall", "Rainfall", "mm"],
    ["temp", "Temperature", "°C"],
    ["et", "Evapotranspiration", "mm"],
    ["humidity", "Humidity", "%"],
    ["solar", "Solar radiation", "kWh/m²"],
  ];
  const series = {};
  const trends = {};
  const forecasts = {};
  const explanations = [];

  for (const [key, label, unit] of cfg) {
    const pts = powerDictToSeries(power[key] || {});
    const vals = pts.map((p) => p.value);
    series[key] = pts;
    trends[key] = linearTrend(vals);
    forecasts[key] = forecastNext(vals, horizon);
    explanations.push(explain(label, trends[key], unit));
  }

  const rainDir = trends.rainfall?.direction;
  const etDir = trends.et?.direction;
  const tempDir = trends.temp?.direction;

  let outlook = {
    code: "stable",
    title: "Conditions look steady",
    message: "No strong shift detected over the next week based on recent trends.",
  };
  if (rainDir === "falling" && etDir === "rising") {
    outlook = {
      code: "drying",
      title: "Heading toward drier conditions",
      message:
        "Rainfall is easing while crop water demand (ET) is rising. Plan irrigation readiness over the next several days.",
    };
  } else if (rainDir === "rising") {
    outlook = {
      code: "wetting",
      title: "Heading toward wetter conditions",
      message: "Rainfall is increasing. Watch drainage and disease risk if humidity stays high.",
    };
  } else if (tempDir === "rising") {
    outlook = {
      code: "warming",
      title: "Heading toward warmer stress",
      message: "Temperatures are climbing. Heat stress risk may increase — consider cooling irrigation.",
    };
  }

  const predictedRain = (forecasts.rainfall || []).reduce((a, b) => a + b, 0);
  const predictedET = (forecasts.et || []).reduce((a, b) => a + b, 0);

  return {
    series,
    trends,
    forecasts,
    explanations,
    outlook: {
      ...outlook,
      predictedRain_mm: Math.round(predictedRain * 10) / 10,
      predictedET_mm: Math.round(predictedET * 10) / 10,
      horizonDays: horizon,
    },
  };
}

module.exports = { analyzePowerBundle, powerDictToSeries };
