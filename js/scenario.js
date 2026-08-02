/**
 * What-if scenario simulation with India INR market rates.
 */

import {
  CROP_MSP,
  FERTILIZER_PRICES,
  fertilizerPerKg,
  formatINR,
} from "./market-prices.js";

/**
 * @param {object} metrics - insight.metrics (rain, ET, temps)
 * @param {object} opts
 */
export function simulateScenario(metrics = {}, opts = {}) {
  const rain = Number(metrics.totalRain_mm) || 0;
  const et = Number(metrics.totalET_mm) || 0;
  const maxTemp = Number(metrics.maxTemp_c) || 28;
  const irrigateWhen = opts.irrigateWhen || "none";
  const irrigateMm = Math.max(0, Number(opts.irrigateMm) || 0);
  const fertilizerKgHa = Math.max(0, Number(opts.fertilizerKgHa) || 0);
  const fieldHa = Math.max(0.1, Number(opts.fieldHa) || 1);
  const cropId = opts.cropId || "wheat";
  const fertId = opts.fertId || "urea";

  const appliedMm = irrigateWhen === "none" ? 0 : irrigateMm;
  const efficiency = irrigateWhen === "now" ? 0.9 : irrigateWhen === "later" ? 0.7 : 1;
  const effectiveWater = rain + appliedMm * efficiency;
  const deficit = Math.max(0, et - effectiveWater);

  let stress = Math.min(1, deficit / Math.max(et, 1));
  if (maxTemp > 36) stress = Math.min(1, stress + 0.1);
  if (irrigateWhen === "later" && maxTemp > 34) stress = Math.min(1, stress + 0.05);

  let yieldIndex = 1 - stress * 0.55;
  if (fertilizerKgHa > 0) {
    const bump = Math.min(0.12, fertilizerKgHa / 1200);
    const over = fertilizerKgHa > 180 ? (fertilizerKgHa - 180) / 800 : 0;
    yieldIndex = Math.min(1.08, yieldIndex + bump - over);
  }
  yieldIndex = Math.max(0.35, yieldIndex);

  // INR costs — CHC-style irrigation proxy + notified fertilizer ₹/kg
  const waterCostPerMmHa = 45; // ₹/mm/ha indicative pump/electricity + labour
  const fert = FERTILIZER_PRICES.find((f) => f.id === fertId) || FERTILIZER_PRICES[0];
  const fertCostPerKg = fertilizerPerKg(fert) || 6;
  const waterCost = appliedMm * fieldHa * waterCostPerMmHa;
  const fertCost = fertilizerKgHa * fieldHa * fertCostPerKg;
  const totalCost = waterCost + fertCost;

  const crop = CROP_MSP.find((c) => c.id === cropId) || CROP_MSP[0];
  // MSP is ₹/quintal (100 kg). Convert to ₹/kg.
  const pricePerKg = (crop?.mspPerQuintal || 2500) / 100;
  const baselineYieldKgHa = cropId.includes("paddy") || cropId === "rice" ? 4000 : 3500;
  const expectedYieldKgHa = baselineYieldKgHa * yieldIndex;
  const yieldDeltaPct = (yieldIndex - 1) * 100;

  const uncertainty = Math.min(0.35, 0.08 + stress * 0.2 + (et === 0 ? 0.1 : 0));
  const yieldLow = Math.round(expectedYieldKgHa * (1 - uncertainty));
  const yieldHigh = Math.round(expectedYieldKgHa * (1 + uncertainty * 0.6));

  const expectedRevenue = expectedYieldKgHa * fieldHa * pricePerKg;
  const baselineRevenue = baselineYieldKgHa * fieldHa * pricePerKg;
  const roi = totalCost > 0 ? (expectedRevenue - baselineRevenue - totalCost) / totalCost : null;

  return {
    effectiveWater_mm: Number(effectiveWater.toFixed(1)),
    deficit_mm: Number(deficit.toFixed(1)),
    stressIndex: Number(stress.toFixed(2)),
    expectedYieldKgHa: Math.round(expectedYieldKgHa),
    yieldLowKgHa: yieldLow,
    yieldHighKgHa: yieldHigh,
    uncertaintyPct: Number((uncertainty * 100).toFixed(0)),
    yieldDeltaPct: Number(yieldDeltaPct.toFixed(1)),
    waterUse_mm: Number(appliedMm.toFixed(1)),
    estimatedCost: Math.round(totalCost),
    estimatedCostLabel: formatINR(totalCost),
    expectedRevenue: Math.round(expectedRevenue),
    expectedRevenueLabel: formatINR(expectedRevenue),
    roi: roi == null ? null : Number(roi.toFixed(2)),
    currency: "INR",
    priceBasis: `${crop.name} MSP ₹${crop.mspPerQuintal}/qtl`,
    fertBasis: `${fert.name} ~₹${fertCostPerKg.toFixed(1)}/kg`,
    notes: buildNotes({ irrigateWhen, appliedMm, deficit, stress, fertilizerKgHa, crop, fert }),
  };
}

function buildNotes({ irrigateWhen, appliedMm, deficit, stress, fertilizerKgHa, crop, fert }) {
  const parts = [];
  if (irrigateWhen === "now" && appliedMm > 0) {
    parts.push(`Irrigating now applies ~${appliedMm} mm at high efficiency.`);
  } else if (irrigateWhen === "later" && appliedMm > 0) {
    parts.push("Waiting to irrigate reduces efficiency under heat — more loss to evaporation.");
  } else {
    parts.push("No irrigation in this scenario — relying on rainfall only.");
  }
  if (deficit > 8) parts.push(`Water deficit remains about ${deficit.toFixed(0)} mm vs ET demand.`);
  if (stress > 0.45) parts.push("Crop stress looks elevated — yield risk rises.");
  if (fertilizerKgHa > 180) parts.push("High fertilizer rate may waste money and add stress.");
  else if (fertilizerKgHa > 0) parts.push(`Fertilizer cost uses notified ${fert.name} rates.`);
  parts.push(`Revenue priced at ${crop.name} MSP (₹${crop.mspPerQuintal}/quintal).`);
  return parts;
}
