"use strict";

const sharp = require("sharp");
const { loadRfModel, predictRf, featureVectorFromDict } = require("./rf-model");

/**
 * Feature extraction aligned with ml/preprocess.py (EuroSAT RF features).
 * Extra water/urban ratios used as hard guards (bridges, creeks, cities).
 */

async function bufferToRgb(buffer, size = 224) {
  const { data, info } = await sharp(buffer)
    .resize(size, size, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgb = new Float32Array(info.width * info.height * 3);
  for (let i = 0, j = 0; i < data.length; i += info.channels, j += 3) {
    rgb[j] = data[i] / 255;
    rgb[j + 1] = data[i + 1] / 255;
    rgb[j + 2] = data[i + 2] / 255;
  }
  return { width: info.width, height: info.height, rgb };
}

function textureLaplacianVar(width, height, rgb) {
  const n = width * height;
  const gray = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const r = rgb[i * 3] * 255;
    const g = rgb[i * 3 + 1] * 255;
    const b = rgb[i * 3 + 2] * 255;
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  const at = (x, y) => {
    const xx = x < 0 ? -x : x >= width ? 2 * width - x - 2 : x;
    const yy = y < 0 ? -y : y >= height ? 2 * height - y - 2 : y;
    return gray[yy * width + xx];
  };

  let sum = 0;
  let sumSq = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = at(x, y - 1) + at(x - 1, y) + at(x + 1, y) + at(x, y + 1) - 4 * at(x, y);
      sum += v;
      sumSq += v * v;
    }
  }
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

function extractFeatures(width, height, rgb) {
  const n = width * height;
  let sumExg = 0;
  let vegCount = 0;
  let ndviSum = 0;
  let cloud = 0;
  let brightSum = 0;
  let hsvVeg = 0;
  let water = 0;
  let urban = 0;

  for (let i = 0; i < n; i++) {
    const r = rgb[i * 3];
    const g = rgb[i * 3 + 1];
    const b = rgb[i * 3 + 2];
    const exg = 2 * g - r - b;
    sumExg += exg;
    if (exg > 0.05) vegCount++;
    ndviSum += (g - r) / (g + r + 1e-6);
    const mean = (r + g + b) / 3;
    brightSum += mean;
    if (mean > 0.85) cloud++;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min + 1e-6;
    let h = 0;
    if (max === g) h = (b - r) / d + 2;
    else if (max === b) h = (r - g) / d + 4;
    else h = (g - b) / d;
    if (h < 0) h += 6;
    h /= 6;
    const s = max === 0 ? 0 : d / max;
    const v = max;
    if (h > 0.18 && h < 0.48 && s > 0.15 && v > 0.15) hsvVeg++;

    // Water / creek / sea: blue-dominant, low vegetation
    const blueDom = b > r + 0.04 && b > g + 0.02;
    const darkWater = mean < 0.45 && b >= g && b >= r && exg < 0.02;
    if ((blueDom && exg < 0.05 && s > 0.08) || darkWater) water++;

    // Road / bridge / concrete / roof: gray, low chroma, not green
    const grayish = s < 0.12 && mean > 0.25 && mean < 0.85 && exg < 0.04;
    if (grayish) urban++;
  }

  return {
    greenness: sumExg / n,
    veg_fraction: vegCount / n,
    ndvi_proxy: ndviSum / n,
    texture: textureLaplacianVar(width, height, rgb),
    hsv_veg_ratio: hsvVeg / n,
    cloud_fraction: cloud / n,
    mean_brightness: brightSum / n,
    // Guards (not used by RF vector)
    water_fraction: water / n,
    urban_fraction: urban / n,
  };
}

function hardReject(features) {
  if (features.water_fraction > 0.22) {
    return "Looks like water, creek, or wetland — not a farm field. Move the pin onto cropland.";
  }
  if (features.urban_fraction > 0.35 && features.veg_fraction < 0.18) {
    return "Looks like road, bridge, or built-up land — not a farm field. Move the pin onto cropland.";
  }
  if (features.veg_fraction < 0.1 && features.hsv_veg_ratio < 0.08) {
    return "Very little vegetation here (city, bare ground, or water). Pick green cropland.";
  }
  return null;
}

function heuristicIsField(features) {
  const reject = hardReject(features);
  if (reject) {
    return {
      is_field: false,
      confidence: 0.85,
      field_probability: 0.1,
      reason: reject,
      features,
      model: "heuristic_v2",
    };
  }

  let score = 0;
  const reasons = [];

  if (features.veg_fraction > 0.28) {
    score += 0.35;
    reasons.push("Healthy green cover detected");
  } else if (features.veg_fraction > 0.18) {
    score += 0.15;
    reasons.push("Some vegetation present");
  } else {
    score -= 0.2;
    reasons.push("Low vegetation cover");
  }

  if (features.hsv_veg_ratio > 0.22) {
    score += 0.25;
    reasons.push("Green crop-like hues present");
  } else if (features.hsv_veg_ratio < 0.1) {
    score -= 0.15;
  }

  if (features.texture > 50 && features.texture < 2500) {
    score += 0.15;
    reasons.push("Texture matches cultivated land");
  } else if (features.texture < 30) {
    score -= 0.2;
    reasons.push("Surface looks too smooth (water/road/roof)");
  }

  if (features.cloud_fraction > 0.4) {
    score -= 0.2;
    reasons.push("Heavy cloud / glare — lower confidence");
  }
  if (features.mean_brightness > 0.75 && features.veg_fraction < 0.12) {
    score -= 0.3;
    reasons.push("Bright non-vegetated surface (urban/desert)");
  }
  if (features.water_fraction > 0.12) {
    score -= 0.25;
    reasons.push("Noticeable water in the view");
  }
  if (features.urban_fraction > 0.2) {
    score -= 0.2;
    reasons.push("Built-up / gray surfaces nearby");
  }

  const confidence = Math.max(0, Math.min(1, score));
  // Stricter than v1 — bridges/creeks should not pass
  const is_field = confidence >= 0.55 && features.veg_fraction >= 0.16;
  return {
    is_field,
    confidence: is_field ? confidence : Math.max(confidence, 0.55),
    field_probability: is_field ? confidence : Math.min(0.35, 1 - confidence),
    reason: is_field
      ? reasons.join("; ")
      : `Not a field — ${reasons.join("; ") || "does not look like cropland"}. Move the pin to farmland.`,
    features,
    model: "heuristic_v2",
  };
}

function classifyWithRf(features) {
  const model = loadRfModel();
  if (!model) return null;
  const order = model.features || [
    "greenness",
    "veg_fraction",
    "ndvi_proxy",
    "texture",
    "hsv_veg_ratio",
    "cloud_fraction",
    "mean_brightness",
  ];
  const vec = featureVectorFromDict(features, order);
  const pred = predictRf(vec);
  if (!pred) return null;

  // Safety: never accept obvious water/bridge/urban even if RF is unsure
  const reject = hardReject(features);
  if (reject) {
    return {
      is_field: false,
      confidence: 0.9,
      field_probability: Math.min(pred.fieldProbability, 0.2),
      reason: reject,
      features,
      model: model.version ? `random_forest_${model.version}+guards` : "random_forest+guards",
      model_metrics: model.metrics || {},
    };
  }

  const proba = pred.fieldProbability;
  const is_field = proba >= 0.55;
  const metrics = model.metrics || {};
  const acc =
    typeof metrics.accuracy === "number" ? ` (train acc ${(metrics.accuracy * 100).toFixed(1)}%)` : "";
  return {
    is_field,
    confidence: is_field ? proba : 1 - proba,
    field_probability: proba,
    reason: is_field
      ? `Trained EuroSAT RandomForest field classifier${acc}`
      : `Not a field according to the trained classifier${acc}. Move the pin onto cropland.`,
    features,
    model: model.version ? `random_forest_${model.version}` : "random_forest",
    model_metrics: metrics,
  };
}

function latLonToTile(lat, lon, z) {
  const latRad = (lat * Math.PI) / 180;
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y, z };
}

async function fetchEsriTile(lat, lon, z = 17) {
  const { x, y } = latLonToTile(lat, lon, z);
  const urls = [
    `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
    `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
  ];
  let lastErr;
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Imagery tile fetch failed (${res.status})`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("Imagery tile fetch failed");
}

async function classifyLatLon(lat, lon) {
  const buf = await fetchEsriTile(lat, lon, 17);
  const { width, height, rgb } = await bufferToRgb(buf, 224);
  const features = extractFeatures(width, height, rgb);
  const rf = classifyWithRf(features);
  if (rf) return rf;
  return heuristicIsField(features);
}

module.exports = { classifyLatLon, heuristicIsField, extractFeatures, classifyWithRf };
