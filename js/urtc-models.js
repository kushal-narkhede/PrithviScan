/**
 * URTC science models (browser). Mirror of functions/lib/urtc-models.js
 */

function avg(nums) {
  const xs = nums.filter((n) => Number.isFinite(n));
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function seriesValues(series, key, lastN = 14) {
  const arr = series?.[key] || [];
  return arr.slice(-lastN).map((p) => Number(p.value)).filter(Number.isFinite);
}

function tomorrowIso(offsetDays) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

/** A1 — 7-day soil moisture / deficit forecast */
function soilMoistureForecast({ series, forecasts, metrics } = {}) {
  const rainPast = seriesValues(series, "rainfall", 7);
  const etPast = seriesValues(series, "et", 7);
  const rainF = (forecasts?.rainfall || []).slice(0, 7).map(Number);
  const etF = (forecasts?.et || []).slice(0, 7).map(Number);
  const rainBase = avg(rainPast) ?? ((Number(metrics?.totalRain_mm) / 7) || 2);
  const etBase = avg(etPast) ?? ((Number(metrics?.totalET_mm) / 7) || 4);

  let deficit = Math.max(0, (etBase - rainBase) * 3);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const rain = Number.isFinite(rainF[i]) ? rainF[i] : rainBase;
    const et = Number.isFinite(etF[i]) ? etF[i] : etBase;
    deficit = clamp(deficit + et - rain, 0, 80);
    const moistureIndex = clamp(1 - deficit / 40, 0, 1);
    days.push({
      date: tomorrowIso(i + 1),
      rain_mm: Number(rain.toFixed(1)),
      et_mm: Number(et.toFixed(1)),
      deficit_mm: Number(deficit.toFixed(1)),
      moistureIndex: Number(moistureIndex.toFixed(2)),
      status: moistureIndex > 0.55 ? "ok" : moistureIndex > 0.35 ? "watch" : "dry",
    });
  }
  const irrigateDay = days.find((d) => d.status === "dry") || days.find((d) => d.status === "watch");
  return {
    modelVersion: "soil_moisture_v1",
    confidence: 0.62,
    days,
    irrigateBy: irrigateDay?.date || null,
    summary: irrigateDay
      ? `Soil moisture outlook suggests planning irrigation around ${irrigateDay.date}.`
      : "Soil moisture outlook looks adequate for the next week.",
    provenance: { sources: ["NASA POWER precip/ET", "deficit water balance"], generatedAt: new Date().toISOString() },
  };
}

/** A2 — pest / disease / heat / water risk suite */
function riskSuite({ metrics = {}, series, cropType = "", ndvi = null } = {}) {
  const rain = Number(metrics.totalRain_mm);
  const et = Number(metrics.totalET_mm);
  const maxTemp = Number(metrics.maxTemp_c);
  const humidity = Number(metrics.avgHumidity_pct);
  const avgTemp = Number(metrics.avgTemp_c);
  const crop = String(cropType || "").toLowerCase();

  const waterStress = clamp(
    ((et || 0) - (rain || 0)) / Math.max(et || 1, 8) + (ndvi != null && ndvi < 0.35 ? 0.25 : 0),
    0,
    1
  );
  const heatStress = clamp(((maxTemp || avgTemp || 28) - 32) / 12, 0, 1);
  const disease = clamp(
    ((humidity || 60) - 70) / 25 + ((avgTemp || 26) - 24) / 20 + (crop.includes("paddy") || crop.includes("rice") ? 0.1 : 0),
    0,
    1
  );
  const pest = clamp(
    heatStress * 0.45 + ((avgTemp || 26) - 22) / 30 + (rain > 40 ? 0.15 : 0) + (crop.includes("cotton") ? 0.1 : 0),
    0,
    1
  );

  function pack(id, label, score, actions) {
    const severity = Math.round(score * 100);
    const level = severity >= 65 ? "action" : severity >= 40 ? "watch" : "info";
    return { id, label, severity, level, score: Number(score.toFixed(2)), actions };
  }

  const risks = [
    pack("water", "Water stress", waterStress, [
      "Check soil 10–15 cm deep",
      "Schedule light irrigation if dry",
      "Mulch to reduce evaporation",
    ]),
    pack("heat", "Heat stress", heatStress, [
      "Irrigate early morning / evening",
      "Avoid midday sprays",
      "Monitor wilting at peak heat",
    ]),
    pack("disease", "Disease risk", disease, [
      "Scout lower leaves for lesions",
      "Improve airflow if canopy dense",
      "Consider preventive spray if wet + warm",
    ]),
    pack("pest", "Pest outbreak risk", pest, [
      "Scout for eggs / larvae on new growth",
      "Check undersides of leaves",
      "Use pheromone traps if available",
    ]),
  ];

  return {
    modelVersion: "risk_suite_v1",
    confidence: 0.58,
    risks,
    overall: Math.round(avg(risks.map((r) => r.severity)) || 0),
    provenance: {
      sources: ["NASA POWER", "crop type", ndvi != null ? "NDVI proxy" : "no NDVI"],
      inputs: { rain, et, maxTemp, humidity, avgTemp, cropType: cropType || null, ndvi },
      generatedAt: new Date().toISOString(),
    },
  };
}

/** A3 — smart irrigation planner */
function irrigationPlan({ soil, metrics = {}, cropStage = "vegetative", region = "IN", fieldHa = 1 } = {}) {
  const dry = (soil?.days || []).find((d) => d.status === "dry");
  const watch = (soil?.days || []).find((d) => d.status === "watch");
  const target = dry || watch;
  const stageFactor = cropStage === "flowering" || cropStage === "grain" ? 1.2 : cropStage === "emergence" ? 0.7 : 1;
  const deficit = target?.deficit_mm || Math.max(0, (Number(metrics.totalET_mm) || 0) - (Number(metrics.totalRain_mm) || 0));
  const applyMm = Number(clamp(deficit * stageFactor * 0.85, 0, 45).toFixed(1));
  const when = target?.date || tomorrowIso(1);
  const waterCostPerMmHa = region === "US" ? 0.55 : 45;
  const cost = Math.round(applyMm * fieldHa * waterCostPerMmHa);
  const yieldImpactPct = applyMm > 0 ? Number(clamp(4 + applyMm / 6, 2, 14).toFixed(1)) : 0;

  return {
    modelVersion: "irrigation_plan_v1",
    confidence: 0.6,
    when,
    applyMm,
    fieldHa,
    estimatedCost: cost,
    currency: region === "US" ? "USD" : "INR",
    yieldImpactPct,
    cropStage,
    urgency: dry ? "high" : watch ? "medium" : "low",
    summary:
      applyMm > 0
        ? `Irrigate ~${applyMm} mm around ${when} (${yieldImpactPct}% yield protection vs dry stress).`
        : "No irrigation recommended this week based on moisture outlook.",
    taskSuggestion: applyMm > 0 ? { type: "irrigate", title: `Irrigate ~${applyMm} mm`, dueAt: when } : null,
    provenance: { sources: ["soil_moisture_v1", "NASA POWER ET"], generatedAt: new Date().toISOString() },
  };
}

/** A4 — yield / harvest / profit prediction */
function yieldPrediction({
  metrics = {},
  soil,
  ndvi = null,
  cropId = "wheat",
  region = "IN",
  fieldHa = 1,
  fertKgHa = 0,
  pricePerKg = null,
  sownAt = null,
  durationTypical = 120,
} = {}) {
  const rain = Number(metrics.totalRain_mm) || 0;
  const et = Number(metrics.totalET_mm) || 1;
  const waterIndex = clamp(1 - Math.abs(et - rain) / Math.max(et, 10), 0.35, 1.05);
  const ndviIndex = ndvi != null ? clamp(0.4 + ndvi * 0.9, 0.35, 1.1) : 0.85;
  const moist = avg((soil?.days || []).map((d) => d.moistureIndex)) ?? 0.7;
  const fertIndex = clamp(0.9 + Math.min(fertKgHa, 120) / 800 - Math.max(0, fertKgHa - 180) / 900, 0.75, 1.08);
  const yieldIndex = clamp(waterIndex * 0.35 + ndviIndex * 0.35 + moist * 0.2 + fertIndex * 0.1, 0.35, 1.12);

  const baselineKgHa = cropId.includes("paddy") || cropId === "rice" ? 4000 : cropId === "maize" ? 4500 : 3500;
  const expectedKgHa = Math.round(baselineKgHa * yieldIndex);
  const uncertainty = 0.12 + (ndvi == null ? 0.06 : 0);
  const low = Math.round(expectedKgHa * (1 - uncertainty));
  const high = Math.round(expectedKgHa * (1 + uncertainty * 0.7));

  let harvestDate = null;
  if (sownAt) {
    const d = new Date(`${String(sownAt).slice(0, 10)}T12:00:00Z`);
    if (!Number.isNaN(d.getTime())) {
      d.setUTCDate(d.getUTCDate() + durationTypical);
      harvestDate = d.toISOString().slice(0, 10);
    }
  }

  const ppk = pricePerKg != null ? pricePerKg : region === "US" ? 0.21 : 25;
  const expectedRevenue = Math.round(expectedKgHa * fieldHa * ppk);

  return {
    modelVersion: "yield_predict_v1",
    confidence: Number((0.55 + (ndvi != null ? 0.1 : 0)).toFixed(2)),
    expectedKgHa,
    yieldLowKgHa: low,
    yieldHighKgHa: high,
    yieldIndex: Number(yieldIndex.toFixed(2)),
    harvestDate,
    expectedRevenue,
    currency: region === "US" ? "USD" : "INR",
    fieldHa,
    summary: `Expected yield ~${expectedKgHa} kg/ha (${low}–${high}); revenue ~${expectedRevenue} ${region === "US" ? "USD" : "INR"} at reference price.`,
    provenance: {
      sources: ["NDVI proxy", "POWER weather", "soil moisture outlook", "fertilizer logs"],
      generatedAt: new Date().toISOString(),
    },
  };
}

/** B1 — fertilizer optimization */
function fertilizerOptimize({ cropStage = "vegetative", region = "IN", fieldHa = 1, recentFertKgHa = 0, fertKgHa = 0 } = {}) {
  const stageNeed = {
    emergence: { n: 40, product: "urea", note: "Starter N" },
    vegetative: { n: 80, product: "urea", note: "Canopy growth" },
    flowering: { n: 30, product: region === "US" ? "dap" : "dap", note: "Support flowering" },
    grain: { n: 20, product: "urea", note: "Late N only if deficient" },
  };
  const need = stageNeed[cropStage] || stageNeed.vegetative;
  const applied = Number(recentFertKgHa) || Number(fertKgHa) || 0;
  const remaining = Math.max(0, need.n - applied * 0.4);
  const qtyKg = Math.round(remaining * fieldHa);
  const costPerKg = region === "US" ? 0.9 : 6;
  const cost = Math.round(qtyKg * costPerKg);
  const roiPct = qtyKg > 0 ? 18 : 0;
  return {
    modelVersion: "fert_opt_v1",
    confidence: 0.5,
    productId: need.product,
    cropStage,
    quantityKg: qtyKg,
    estimatedCost: cost,
    currency: region === "US" ? "USD" : "INR",
    roiImpactPct: roiPct,
    summary: qtyKg > 0
      ? `Apply ~${qtyKg} kg ${need.product} (${need.note}) — est. cost ${cost}, ROI uplift ~${roiPct}%.`
      : "Recent fertilizer looks sufficient for this stage.",
    provenance: { sources: ["crop stage heuristic", "input logs"], generatedAt: new Date().toISOString() },
  };
}

/** B2 — machinery ops: fuel, schedule, maintenance, breakdown risk */
function machineryOptimize({ region = "IN", fieldHa = 1, hoursLogged = 0, machineId = "tractor-cultivator" } = {}) {
  const hirePerHour = region === "US" ? 145 : 900;
  const hours = Math.max(1, Math.round((Number(fieldHa) || 1) * 1.2));
  const hireTotal = Math.round(hours * hirePerHour);
  const fuelEstimate = Math.round(hireTotal * 0.35);
  const logged = Number(hoursLogged) || 0;
  const nextServiceAt = Math.max(0, 50 - (logged % 50));
  const breakdownRisk = Math.round(clamp(logged / 200 + (logged > 80 ? 0.15 : 0), 0.08, 0.85) * 100);
  const dueAt = tomorrowIso(Math.min(7, Math.max(1, Math.ceil(nextServiceAt / 10))));
  return {
    modelVersion: "machinery_ops_v1",
    confidence: 0.55,
    machineId,
    hoursSuggested: hours,
    hireTotal,
    fuelEstimate,
    currency: region === "US" ? "USD" : "INR",
    maintenance: {
      hoursUntilService: nextServiceAt,
      reminderDueAt: dueAt,
      note: "Schedule service / greasing after ~50 hire hours.",
    },
    breakdownRisk,
    taskSuggestion: {
      type: "scout",
      title: `Machinery check — ${machineId}`,
      dueAt,
    },
    summary: `Plan ~${hours} h hire (~${hireTotal} ${region === "US" ? "USD" : "INR"}), fuel ~${fuelEstimate}. Breakdown risk ${breakdownRisk}/100. Next service in ~${nextServiceAt} h.`,
    provenance: { sources: ["CHC / custom-hire tables", "usage hours"], generatedAt: new Date().toISOString() },
  };
}

/** B4 — soil NPK proxy, degradation, carbon */
function soilIntelligence({ metrics = {}, ndvi = null, region = "IN", series } = {}) {
  const rain = Number(metrics.totalRain_mm) || 0;
  const et = Number(metrics.totalET_mm) || 0;
  const veg = ndvi != null ? ndvi : 0.45;
  const n = clamp(40 + veg * 50 + (rain > et ? 5 : -5), 20, 95);
  const p = clamp(35 + veg * 30, 15, 85);
  const k = clamp(45 + (region === "US" ? 5 : 0) + veg * 25, 20, 90);
  const erosion = clamp((et - rain) / 40 + (1 - veg) * 0.4, 0, 1);
  const salinity = clamp(region === "IN" ? 0.25 : 0.15 + (rain < 5 ? 0.1 : 0), 0, 1);
  const compaction = clamp(0.3 + (1 - veg) * 0.25, 0, 1);
  const carbonScore = Math.round(clamp(veg * 70 + (rain > 10 ? 10 : 0) + 15, 10, 95));

  return {
    modelVersion: "soil_intel_v1",
    confidence: 0.42,
    npk: {
      n: Math.round(n),
      p: Math.round(p),
      k: Math.round(k),
      unit: "index_0_100",
      disclaimer: "Satellite/weather proxy — not a lab soil test. Uncertainty is high.",
    },
    degradation: {
      erosion: Math.round(erosion * 100),
      salinity: Math.round(salinity * 100),
      compaction: Math.round(compaction * 100),
      level: erosion > 0.55 ? "elevated" : "moderate",
    },
    carbonScore,
    summary: `Soil carbon score ${carbonScore}/100. NPK indices N${Math.round(n)} P${Math.round(p)} K${Math.round(k)} (proxy).`,
    provenance: { sources: ["NDVI proxy", "POWER weather"], generatedAt: new Date().toISOString() },
  };
}

/** B3 — crop recommendation */
function recommendCrops({ region = "IN", budget = 50000, waterIndex = 0.6, soilCarbon = 50 } = {}) {
  const catalog = region === "US"
    ? [
        { id: "maize", name: "Corn", waterNeed: 0.7, cost: 180, yieldKgHa: 4500, pricePerKg: 0.18 },
        { id: "soybean", name: "Soybeans", waterNeed: 0.55, yieldKgHa: 2800, cost: 140, pricePerKg: 0.41 },
        { id: "wheat", name: "Wheat", waterNeed: 0.5, yieldKgHa: 3200, cost: 120, pricePerKg: 0.21 },
        { id: "cotton-med", name: "Cotton", waterNeed: 0.65, yieldKgHa: 900, cost: 220, pricePerKg: 1.6 },
      ]
    : [
        { id: "wheat", name: "Wheat", waterNeed: 0.5, yieldKgHa: 3500, cost: 12000, pricePerKg: 25 },
        { id: "paddy-common", name: "Paddy", waterNeed: 0.85, yieldKgHa: 4000, cost: 18000, pricePerKg: 24 },
        { id: "maize", name: "Maize", waterNeed: 0.65, yieldKgHa: 4000, cost: 14000, pricePerKg: 24 },
        { id: "soybean", name: "Soybean", waterNeed: 0.55, yieldKgHa: 1800, cost: 13000, pricePerKg: 57 },
        { id: "mustard", name: "Mustard", waterNeed: 0.4, yieldKgHa: 1400, cost: 9000, pricePerKg: 62 },
      ];

  const ranked = catalog
    .map((c) => {
      const waterFit = 1 - Math.abs(c.waterNeed - waterIndex);
      const budgetFit = c.cost <= budget ? 1 : clamp(budget / c.cost, 0.2, 1);
      const soilFit = clamp(soilCarbon / 80, 0.4, 1);
      const revenue = c.yieldKgHa * c.pricePerKg;
      const profit = revenue - c.cost;
      const score = waterFit * 0.35 + budgetFit * 0.25 + soilFit * 0.15 + clamp(profit / (region === "US" ? 800 : 80000), 0, 1) * 0.25;
      const risk = Math.round((1 - waterFit) * 40 + (1 - budgetFit) * 30 + 15);
      return {
        ...c,
        expectedYieldKgHa: c.yieldKgHa,
        expectedProfit: Math.round(profit),
        riskScore: clamp(risk, 5, 95),
        score: Number(score.toFixed(3)),
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  return {
    modelVersion: "crop_recommend_v1",
    confidence: 0.55,
    currency: region === "US" ? "USD" : "INR",
    best,
    alternatives: ranked.slice(1, 4),
    summary: best
      ? `Top pick: ${best.name} — yield ~${best.expectedYieldKgHa} kg/ha, profit ~${best.expectedProfit}, risk ${best.riskScore}.`
      : "No recommendation.",
    provenance: { sources: ["market reference prices", "water outlook", "soil carbon proxy"], generatedAt: new Date().toISOString() },
  };
}

/** D2 — carbon credits + climate resilience */
function carbonAndClimate({ soil, metrics = {}, region = "IN", practices = [] } = {}) {
  const carbonScore = soil?.carbonScore ?? 50;
  const practiceBonus = Math.min(20, (practices || []).length * 5);
  const creditsPerHa = Number(((carbonScore + practiceBonus) / 100 * 1.8).toFixed(2));
  const price = region === "US" ? 25 : 1200;
  const earnings = Math.round(creditsPerHa * price);

  const rain = Number(metrics.totalRain_mm) || 0;
  const et = Number(metrics.totalET_mm) || 0;
  const maxTemp = Number(metrics.maxTemp_c) || 30;
  const drought = clamp((et - rain) / 35, 0, 1);
  const flood = clamp((rain - 40) / 50, 0, 1);
  const heat = clamp((maxTemp - 34) / 10, 0, 1);
  const market = region === "US" ? 0.35 : 0.4;
  const resilience = Math.round((1 - (drought * 0.35 + flood * 0.2 + heat * 0.25 + market * 0.2)) * 100);

  return {
    modelVersion: "carbon_climate_v1",
    confidence: 0.48,
    carbon: {
      score: carbonScore,
      creditsPerHa,
      potentialEarnings: earnings,
      currency: region === "US" ? "USD" : "INR",
      disclaimer: "Indicative estimate for education — not a certified carbon credit.",
    },
    resilience: {
      score: clamp(resilience, 5, 98),
      dimensions: {
        drought: Math.round(drought * 100),
        flood: Math.round(flood * 100),
        heat: Math.round(heat * 100),
        marketShock: Math.round(market * 100),
      },
    },
    provenance: { sources: ["soil_intel_v1", "POWER weather"], generatedAt: new Date().toISOString() },
  };
}

/** Aggregate suite for one field */
function buildUrtcSuite(input = {}) {
  const soil = soilMoistureForecast(input);
  const risks = riskSuite({ ...input, ndvi: input.ndvi });
  const irrigation = irrigationPlan({
    soil,
    metrics: input.metrics,
    cropStage: input.cropStage,
    region: input.region,
    fieldHa: input.fieldHa,
  });
  const yieldPred = yieldPrediction({ ...input, soil });
  const fert = fertilizerOptimize(input);
  const machinery = machineryOptimize(input);
  const soilIntel = soilIntelligence(input);
  const crops = recommendCrops({
    region: input.region,
    budget: input.budget,
    waterIndex: avg(soil.days.map((d) => d.moistureIndex)) ?? 0.6,
    soilCarbon: soilIntel.carbonScore,
  });
  const carbonClimate = carbonAndClimate({ soil: soilIntel, metrics: input.metrics, region: input.region, practices: input.practices });

  return {
    ok: true,
    modelVersion: "urtc_suite_v1",
    generatedAt: new Date().toISOString(),
    soilMoisture: soil,
    risks,
    irrigation,
    yield: yieldPred,
    fertilizer: fert,
    machinery,
    soilIntelligence: soilIntel,
    cropRecommendation: crops,
    carbonClimate,
  };
}

/** C1 — snap rough polygon toward a slightly expanded/simplified cropland ring */
function snapBoundary(lat, lon, polygon) {
  const centerLat = Number(lat);
  const centerLon = Number(lon);
  let ring = Array.isArray(polygon) ? polygon : null;
  if (!ring || ring.length < 3) {
    // default ~1 ha-ish box around pin
    const d = 0.0015;
    ring = [
      [centerLon - d, centerLat - d],
      [centerLon + d, centerLat - d],
      [centerLon + d, centerLat + d],
      [centerLon - d, centerLat + d],
      [centerLon - d, centerLat - d],
    ];
  }
  // "Snap": pull vertices 15% toward centroid + slight outward bias (veg edge proxy)
  let sx = 0;
  let sy = 0;
  const pts = ring.map(([x, y]) => [Number(x), Number(y)]);
  pts.forEach(([x, y]) => {
    sx += x;
    sy += y;
  });
  const n = pts.length || 1;
  const cx = sx / n;
  const cy = sy / n;
  const snapped = pts.map(([x, y]) => {
    const nx = cx + (x - cx) * 1.08;
    const ny = cy + (y - cy) * 1.08;
    return [Number(nx.toFixed(6)), Number(ny.toFixed(6))];
  });
  if (snapped.length && (snapped[0][0] !== snapped[snapped.length - 1][0] || snapped[0][1] !== snapped[snapped.length - 1][1])) {
    snapped.push([...snapped[0]]);
  }
  return {
    type: "Feature",
    properties: {
      modelVersion: "boundary_snap_v1",
      method: "centroid_expand_proxy",
      confidence: 0.4,
      note: "Heuristic snap toward vegetation extent — not a cadastral survey.",
    },
    geometry: { type: "Polygon", coordinates: [snapped] },
  };
}

export {
  buildUrtcSuite,
  soilMoistureForecast,
  riskSuite,
  irrigationPlan,
  yieldPrediction,
  fertilizerOptimize,
  machineryOptimize,
  soilIntelligence,
  recommendCrops,
  carbonAndClimate,
  snapBoundary,
};
