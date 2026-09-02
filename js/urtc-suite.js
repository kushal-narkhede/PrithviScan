/**
 * Client helper for URTC science suite — Cloud Function + local fallback.
 */

import { callFieldUrtcSuite } from "./api.js?v=urtc1";
import { buildUrtcSuite } from "./urtc-models.js?v=urtc1";
import { cropPricePerKg, getCropPrices } from "./market-prices.js";
import { detectRegion } from "./region.js";

export async function loadUrtcSuite(field, opts = {}) {
  const lat = Number(field.lat);
  const lon = Number(field.lon);
  const region = field.region || detectRegion(lat, lon);
  const cropId = opts.cropId || "wheat";
  const crops = getCropPrices(region);
  const crop = crops.find((c) => c.id === cropId) || crops[0];
  const pricePerKg = cropPricePerKg(crop, region);

  const params = {
    fieldId: field.id,
    lat,
    lon,
    region,
    cropType: field.cropType || "",
    cropId,
    cropStage: opts.cropStage || "vegetative",
    fieldHa: opts.fieldHa || 1,
    fertKgHa: opts.fertKgHa || 0,
    hoursLogged: opts.hoursLogged || 0,
    budget: opts.budget || (region === "US" ? 250 : 50000),
    sownAt: field.sownAt || null,
    ndvi: opts.ndvi ?? null,
    durationTypical: opts.durationTypical || 120,
    pricePerKg,
  };

  try {
    const remote = await callFieldUrtcSuite(params);
    if (remote?.ok && remote.soilMoisture) return { ...remote, source: "cloud" };
  } catch {
    /* fall through */
  }

  const local = buildUrtcSuite({
    metrics: opts.metrics || {},
    series: opts.series || null,
    forecasts: opts.forecasts || null,
    cropType: params.cropType,
    cropId: params.cropId,
    cropStage: params.cropStage,
    region,
    fieldHa: params.fieldHa,
    fertKgHa: params.fertKgHa,
    hoursLogged: params.hoursLogged,
    budget: params.budget,
    sownAt: params.sownAt,
    ndvi: params.ndvi,
    durationTypical: params.durationTypical,
    pricePerKg,
    practices: opts.practices || [],
  });
  return { ...local, fieldId: field.id, lat, lon, source: "local" };
}
