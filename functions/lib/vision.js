"use strict";

const sharp = require("sharp");

/**
 * Lightweight RGB vegetation heuristics for field vs not-field
 * (Node port of ml/preprocess.py heuristic — used until trained model is uploaded).
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

function extractFeatures(width, height, rgb) {
  const n = width * height;
  let sumExg = 0;
  let vegCount = 0;
  let ndviSum = 0;
  let cloud = 0;
  let brightSum = 0;
  let hsvVeg = 0;
  let texAcc = 0;
  let texCount = 0;

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

    const x = i % width;
    const y = (i / width) | 0;
    if (x + 1 < width) {
      const g2 = rgb[(i + 1) * 3 + 1];
      texAcc += (g - g2) ** 2;
      texCount++;
    }
    if (y + 1 < height) {
      const g2 = rgb[(i + width) * 3 + 1];
      texAcc += (g - g2) ** 2;
      texCount++;
    }
  }

  const texture = texCount ? (texAcc / texCount) * 10000 : 0;
  return {
    greenness: sumExg / n,
    veg_fraction: vegCount / n,
    ndvi_proxy: ndviSum / n,
    texture,
    hsv_veg_ratio: hsvVeg / n,
    cloud_fraction: cloud / n,
    mean_brightness: brightSum / n,
  };
}

function heuristicIsField(features) {
  let score = 0;
  const reasons = [];
  if (features.veg_fraction > 0.25) {
    score += 0.35;
    reasons.push("Healthy green cover detected");
  } else if (features.veg_fraction > 0.12) {
    score += 0.18;
    reasons.push("Some vegetation present");
  } else {
    reasons.push("Low vegetation cover");
  }
  if (features.hsv_veg_ratio > 0.2) {
    score += 0.25;
    reasons.push("Green crop-like hues present");
  }
  if (features.texture > 0.5 && features.texture < 80) {
    score += 0.2;
    reasons.push("Texture matches cultivated land");
  } else if (features.texture < 0.15) {
    score -= 0.15;
    reasons.push("Surface looks too smooth (water/road/roof)");
  }
  if (features.cloud_fraction > 0.4) {
    score -= 0.2;
    reasons.push("Heavy cloud / glare — lower confidence");
  }
  if (features.mean_brightness > 0.75 && features.veg_fraction < 0.1) {
    score -= 0.25;
    reasons.push("Bright non-vegetated surface (urban/desert)");
  }
  const confidence = Math.max(0, Math.min(1, score));
  const is_field = confidence >= 0.45;
  return {
    is_field,
    confidence,
    field_probability: is_field ? confidence : 1 - confidence,
    reason: reasons.join("; "),
    features,
    model: "heuristic_v1",
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

async function fetchEsriTile(lat, lon, z = 16) {
  const { x, y } = latLonToTile(lat, lon, z);
  const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Imagery tile fetch failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

async function classifyLatLon(lat, lon) {
  const buf = await fetchEsriTile(lat, lon, 16);
  const { width, height, rgb } = await bufferToRgb(buf, 224);
  const features = extractFeatures(width, height, rgb);
  return heuristicIsField(features);
}

module.exports = { classifyLatLon, heuristicIsField, extractFeatures };
