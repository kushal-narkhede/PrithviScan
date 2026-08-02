/**
 * Lightweight what-if scenario simulation (feature 3.5).
 * Heuristic crop/water tradeoffs — not a full agronomic model.
 */

/**
 * @param {object} metrics - insight.metrics (rain, ET, temps)
 * @param {object} opts
 * @param {"now"|"later"|"none"} opts.irrigateWhen
 * @param {number} opts.irrigateMm - irrigation depth if irrigating
 * @param {number} opts.fertilizerKgHa - optional N fertilizer proxy
 * @param {number} [opts.fieldHa=1]
 */
export function simulateScenario(metrics = {}, opts = {}) {
  const rain = Number(metrics.totalRain_mm) || 0;
  const et = Number(metrics.totalET_mm) || 0;
  const maxTemp = Number(metrics.maxTemp_c) || 28;
  const irrigateWhen = opts.irrigateWhen || "none";
  const irrigateMm = Math.max(0, Number(opts.irrigateMm) || 0);
  const fertilizerKgHa = Math.max(0, Number(opts.fertilizerKgHa) || 0);
  const fieldHa = Math.max(0.1, Number(opts.fieldHa) || 1);

  const appliedMm = irrigateWhen === "none" ? 0 : irrigateMm;
  // Later irrigation is less efficient under heat (evaporative loss proxy)
  const efficiency = irrigateWhen === "now" ? 0.9 : irrigateWhen === "later" ? 0.7 : 1;
  const effectiveWater = rain + appliedMm * efficiency;
  const deficit = Math.max(0, et - effectiveWater);

  // Stress index 0 (good) → 1 (severe)
  let stress = Math.min(1, deficit / Math.max(et, 1));
  if (maxTemp > 36) stress = Math.min(1, stress + 0.1);
  if (irrigateWhen === "later" && maxTemp > 34) stress = Math.min(1, stress + 0.05);

  // Relative yield index (1.0 = unstressed baseline)
  let yieldIndex = 1 - stress * 0.55;
  // Mild fertilizer bump with diminishing returns / over-application penalty
  if (fertilizerKgHa > 0) {
    const bump = Math.min(0.12, fertilizerKgHa / 1200);
    const over = fertilizerKgHa > 180 ? (fertilizerKgHa - 180) / 800 : 0;
    yieldIndex = Math.min(1.08, yieldIndex + bump - over);
  }
  yieldIndex = Math.max(0.35, yieldIndex);

  const waterCostPerMmHa = 0.35; // illustrative currency units
  const fertCostPerKg = 0.8;
  const waterCost = appliedMm * fieldHa * waterCostPerMmHa;
  const fertCost = fertilizerKgHa * fieldHa * fertCostPerKg;
  const totalCost = waterCost + fertCost;

  const baselineYieldKgHa = 3500; // illustrative cereal proxy
  const expectedYieldKgHa = baselineYieldKgHa * yieldIndex;
  const yieldDeltaPct = (yieldIndex - 1) * 100;

  return {
    effectiveWater_mm: Number(effectiveWater.toFixed(1)),
    deficit_mm: Number(deficit.toFixed(1)),
    stressIndex: Number(stress.toFixed(2)),
    expectedYieldKgHa: Math.round(expectedYieldKgHa),
    yieldDeltaPct: Number(yieldDeltaPct.toFixed(1)),
    waterUse_mm: Number(appliedMm.toFixed(1)),
    estimatedCost: Number(totalCost.toFixed(2)),
    notes: buildNotes({ irrigateWhen, appliedMm, deficit, stress, fertilizerKgHa }),
  };
}

function buildNotes({ irrigateWhen, appliedMm, deficit, stress, fertilizerKgHa }) {
  const parts = [];
  if (irrigateWhen === "now" && appliedMm > 0) {
    parts.push(`Irrigating now applies ~${appliedMm} mm at high efficiency.`);
  } else if (irrigateWhen === "later" && appliedMm > 0) {
    parts.push(`Waiting to irrigate reduces efficiency under heat — more loss to evaporation.`);
  } else {
    parts.push("No irrigation in this scenario — relying on rainfall only.");
  }
  if (deficit > 8) parts.push(`Water deficit remains about ${deficit.toFixed(0)} mm vs ET demand.`);
  if (stress > 0.45) parts.push("Crop stress looks elevated — yield risk rises.");
  if (fertilizerKgHa > 180) parts.push("High fertilizer rate may waste money and add stress.");
  else if (fertilizerKgHa > 0) parts.push("Modest fertilizer can help if water is available.");
  return parts;
}
