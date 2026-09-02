/**
 * Structured crop guides for field pages: season, duration, fertilizers,
 * machines, and a simple harvest-date predictor.
 * Educational — confirm with local agri extension / KVK advice.
 */

export const CROP_GUIDES = [
  {
    id: "wheat",
    aliases: ["wheat", "gehun", "gehu", "crop-wheat"],
    name: "Wheat",
    season: "Rabi",
    sowWindow: "Oct–Dec (zone dependent)",
    harvestWindow: "Mar–Apr",
    durationDays: { min: 110, typical: 130, max: 150 },
    summary:
      "Cool-season cereal. Needs timely nitrogen splits and critical irrigations at crown root, flowering, and grain fill.",
    fertilizers: [
      { id: "dap", name: "DAP", stage: "Basal at sowing", note: "Place near seed for early root growth" },
      { id: "urea", name: "Urea", stage: "Tillering + jointing", note: "Split doses; irrigate after application" },
      { id: "mop", name: "MOP", stage: "Basal / early", note: "Where soil K is low" },
    ],
    machines: [
      { id: "seed-drill", name: "Seed drill / Happy seeder", stage: "Sowing" },
      { id: "sprayer", name: "Boom sprayer", stage: "Weed / disease spray" },
      { id: "combine-wheat", name: "Combine harvester", stage: "Harvest" },
    ],
    tips: [
      "Avoid late sowing into heat — grain fill suffers",
      "Last irrigation near maturity should be careful to avoid lodging",
      "Use rust-resistant varieties recommended for your zone",
    ],
    markets: "Sell to local APMC / FCI procurement when MSP operations are open; compare trader offers.",
    mspId: "wheat",
    infoId: "crop-wheat",
    heatSensitive: true,
  },
  {
    id: "rice",
    aliases: ["rice", "paddy", "dhan", "crop-rice", "paddy-common", "paddy-grade-a"],
    name: "Rice (paddy)",
    season: "Kharif (also rabi/zaid in irrigated belts)",
    sowWindow: "Jun–Jul transplant / direct sown by zone",
    harvestWindow: "Oct–Dec (variety dependent)",
    durationDays: { min: 100, typical: 125, max: 150 },
    summary:
      "Water-loving cereal. Clay paddies with leveling save water and improve uniformity.",
    fertilizers: [
      { id: "dap", name: "DAP", stage: "Basal", note: "With puddling / transplant" },
      { id: "urea", name: "Urea", stage: "Tillering + panicle initiation", note: "3–4 splits preferred" },
      { id: "mop", name: "MOP", stage: "Basal + PI", note: "Especially for hybrids" },
    ],
    machines: [
      { id: "laser-leveler", name: "Laser leveler", stage: "Land prep" },
      { id: "rotavator", name: "Rotavator / puddler", stage: "Puddling" },
      { id: "combine-paddy", name: "Combine (paddy)", stage: "Harvest" },
    ],
    tips: [
      "Alternate wetting and drying where advised to save water",
      "Watch blast and stem borer in humid spells",
      "Drain field before harvest for cleaner grain",
    ],
    markets: "Paddy procurement centres and local rice millers; check Grade A vs common MSP.",
    mspId: "paddy-common",
    infoId: "crop-rice",
    heatSensitive: false,
  },
  {
    id: "maize",
    aliases: ["maize", "corn", "makka", "crop-maize"],
    name: "Maize",
    season: "Kharif (also rabi irrigated)",
    sowWindow: "Jun–Jul kharif; Oct–Nov rabi irrigated",
    harvestWindow: "90–120 days after sowing (hybrid dependent)",
    durationDays: { min: 90, typical: 110, max: 130 },
    summary: "Warm-season cereal and heavy nitrogen feeder. Sensitive to drought at tasseling/silking.",
    fertilizers: [
      { id: "dap", name: "DAP", stage: "Basal", note: "Starter P for roots" },
      { id: "urea", name: "Urea", stage: "Knee-high + pre-tassel", note: "Side-dress N" },
      { id: "mop", name: "MOP", stage: "Basal", note: "Supports stalk strength" },
    ],
    machines: [
      { id: "seed-drill", name: "Seed drill / planter", stage: "Sowing" },
      { id: "sprayer", name: "Sprayer", stage: "FAW / weed control" },
      { id: "reaper", name: "Reaper / combine", stage: "Harvest" },
    ],
    tips: [
      "Ensure drainage — waterlogging kills stands",
      "Protect silking period from moisture stress",
      "Scout for fall armyworm early",
    ],
    markets: "Feed mills, starch units, and APMC maize yards — moisture % drives price.",
    mspId: "maize",
    infoId: "crop-maize",
    heatSensitive: false,
  },
  {
    id: "cotton",
    aliases: ["cotton", "kapas", "crop-cotton", "cotton-med"],
    name: "Cotton",
    season: "Kharif / long warm season",
    sowWindow: "Apr–Jun (irrigated) / with monsoon onset",
    harvestWindow: "Multiple pickings 150–180+ days after sowing",
    durationDays: { min: 150, typical: 170, max: 200 },
    summary: "Long-season cash crop suited to black soils. Pest management dominates cost.",
    fertilizers: [
      { id: "dap", name: "DAP", stage: "Basal", note: "Early rooting" },
      { id: "urea", name: "Urea", stage: "Square / early flower", note: "Avoid excess soft growth" },
      { id: "mop", name: "MOP", stage: "Flowering–boll", note: "Supports boll retention" },
    ],
    machines: [
      { id: "tractor-cultivator", name: "Cultivator / rotavator", stage: "Land prep" },
      { id: "sprayer", name: "Boom sprayer", stage: "Pest sprays" },
    ],
    tips: [
      "Prefer recommended Bt / hybrids for your zone",
      "First picking when bolls crack — don’t delay in rain",
      "Store kapas dry to protect grade",
    ],
    markets: "Cotton ginning yards and CCI / trader purchases — staple length and trash matter.",
    mspId: "cotton-med",
    infoId: "crop-cotton",
    heatSensitive: false,
  },
  {
    id: "chickpea",
    aliases: ["chickpea", "gram", "chana", "crop-chickpea"],
    name: "Chickpea (gram)",
    season: "Rabi",
    sowWindow: "Oct–Nov",
    harvestWindow: "Feb–Mar",
    durationDays: { min: 100, typical: 120, max: 140 },
    summary: "Rabi pulse that fixes nitrogen. Needs well-drained soil and careful irrigation.",
    fertilizers: [
      { id: "dap", name: "DAP", stage: "Basal", note: "P is critical for pulses" },
      { id: "mop", name: "MOP", stage: "Basal", note: "Where K deficient" },
    ],
    machines: [
      { id: "seed-drill", name: "Seed drill", stage: "Sowing" },
      { id: "thresher", name: "Thresher", stage: "Post-harvest" },
    ],
    tips: [
      "Inoculate seed with rhizobium on new fields",
      "Avoid waterlogging — wilt risk rises",
      "Harvest when pods turn tan and seeds rattle",
    ],
    markets: "Pulse traders and APMC chana markets; MSP gram procurement when notified.",
    mspId: "gram",
    infoId: "crop-chickpea",
    heatSensitive: true,
  },
  {
    id: "tomato",
    aliases: ["tomato", "tamatar", "crop-tomato"],
    name: "Tomato",
    season: "Year-round with season-specific varieties",
    sowWindow: "Nursery 25–30 days before transplant",
    harvestWindow: "60–90 days after transplant (variety / season)",
    durationDays: { min: 85, typical: 105, max: 130 },
    summary: "High-value vegetable. Steady moisture and calcium help fruit quality.",
    fertilizers: [
      { id: "dap", name: "DAP / NPK basal", stage: "Transplant", note: "Starter for roots" },
      { id: "urea", name: "Urea", stage: "Vegetative", note: "Ease N once fruiting starts" },
      { id: "mop", name: "MOP", stage: "Fruiting", note: "Favor K for color and firmness" },
    ],
    machines: [
      { id: "rotavator", name: "Bed former / rotavator", stage: "Land prep" },
      { id: "sprayer", name: "Sprayer", stage: "Disease / pest" },
    ],
    tips: [
      "Drip + mulch steadies moisture and cuts blight risk",
      "Pick at breaker / pink stage for distant markets",
      "Do not over-nitrogen during heavy fruiting",
    ],
    markets: "Wholesale vegetable mandis and local traders — price swings daily; grade and packing matter.",
    mspId: null,
    infoId: "crop-tomato",
    heatSensitive: true,
  },
  {
    id: "mustard",
    aliases: ["mustard", "sarson", "rapeseed"],
    name: "Mustard",
    season: "Rabi",
    sowWindow: "Oct–Nov",
    harvestWindow: "Feb–Mar",
    durationDays: { min: 110, typical: 130, max: 145 },
    summary: "Important rabi oilseed. Responds to sulfur and timely irrigation at flowering.",
    fertilizers: [
      { id: "dap", name: "DAP", stage: "Basal", note: "P for branching" },
      { id: "urea", name: "Urea", stage: "Rosette / early flower", note: "Modest N" },
      { id: "mop", name: "MOP", stage: "Basal", note: "If soil K low" },
    ],
    machines: [
      { id: "seed-drill", name: "Seed drill", stage: "Sowing" },
      { id: "thresher", name: "Thresher", stage: "Post-harvest" },
    ],
    tips: [
      "Avoid water stress at flowering",
      "Aphid scouting is essential in warm winters",
      "Harvest when 75% pods turn yellow-brown",
    ],
    markets: "Oilseed traders and APMC — MSP mustard when notified.",
    mspId: "mustard",
    infoId: null,
    heatSensitive: true,
  },
  {
    id: "soybean",
    aliases: ["soybean", "soya", "soy"],
    name: "Soybean",
    season: "Kharif",
    sowWindow: "Jun–Jul with monsoon",
    harvestWindow: "Oct–Nov",
    durationDays: { min: 90, typical: 105, max: 120 },
    summary: "Kharif oilseed/pulse. Needs inoculation and good drainage.",
    fertilizers: [
      { id: "dap", name: "DAP", stage: "Basal", note: "Starter N+P with rhizobium" },
      { id: "mop", name: "MOP", stage: "Basal", note: "Where deficient" },
    ],
    machines: [
      { id: "seed-drill", name: "Seed drill / planter", stage: "Sowing" },
      { id: "reaper", name: "Reaper / thresher", stage: "Harvest" },
    ],
    tips: [
      "Inoculate seed every season on low-rhizobium soils",
      "Harvest at ~14–16% moisture — avoid shatter losses",
    ],
    markets: "Soybean processors and APMC yards; MSP yellow soybean when notified.",
    mspId: "soybean",
    infoId: null,
    heatSensitive: false,
  },
];

function normalizeCropKey(raw) {
  return String(raw || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Match free-text field.cropType to a structured guide. */
export function matchCropGuide(cropType) {
  const key = normalizeCropKey(cropType);
  if (!key) return null;
  for (const g of CROP_GUIDES) {
    if (g.aliases.some((a) => key === normalizeCropKey(a) || key.includes(normalizeCropKey(a)))) {
      return g;
    }
  }
  // Token overlap fallback
  const tokens = key.split(/\s+/);
  for (const g of CROP_GUIDES) {
    if (tokens.some((t) => g.aliases.some((a) => normalizeCropKey(a) === t))) return g;
  }
  return null;
}

function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toIsoDate(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Predict harvest timing from sown date + crop guide.
 * Optional avgTemp_c gently shortens/lengthens duration (simple phenology heuristic).
 */
export function predictHarvest({ guide, sownAt, avgTemp_c = null, today = new Date() } = {}) {
  if (!guide?.durationDays || !sownAt) return null;
  const sown = new Date(`${String(sownAt).slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(sown.getTime())) return null;

  let typical = guide.durationDays.typical;
  const notes = [];

  if (Number.isFinite(avgTemp_c)) {
    if (avgTemp_c >= 32 && guide.heatSensitive) {
      typical = Math.max(guide.durationDays.min, Math.round(typical * 0.94));
      notes.push("Warm recent weather may bring maturity a bit earlier — watch grain/fruit indicators.");
    } else if (avgTemp_c <= 18 && !guide.heatSensitive) {
      typical = Math.min(guide.durationDays.max, Math.round(typical * 1.06));
      notes.push("Cooler conditions can slow development slightly.");
    } else if (avgTemp_c >= 30 && !guide.heatSensitive) {
      typical = Math.max(guide.durationDays.min, Math.round(typical * 0.97));
      notes.push("Warm conditions may slightly accelerate growth.");
    }
  }

  const early = addDays(sown, guide.durationDays.min);
  const expected = addDays(sown, typical);
  const late = addDays(sown, guide.durationDays.max);
  const now = new Date(`${toIsoDate(today)}T12:00:00Z`);
  const daysElapsed = Math.max(0, Math.round((now - sown) / 86400000));
  const daysRemaining = Math.round((expected - now) / 86400000);
  const progress = Math.max(0, Math.min(1, daysElapsed / typical));

  let stage = "Establishment";
  if (progress >= 0.85) stage = "Near harvest";
  else if (progress >= 0.65) stage = "Reproductive / grain fill";
  else if (progress >= 0.35) stage = "Vegetative / canopy";
  else if (progress >= 0.15) stage = "Early growth";

  let status = "on_track";
  let statusLabel = "On track";
  if (daysRemaining < 0) {
    status = "due";
    statusLabel = "Harvest window open — check field maturity";
  } else if (daysRemaining <= 14) {
    status = "soon";
    statusLabel = "Harvest approaching";
  }

  return {
    sownAt: toIsoDate(sown),
    durationTypical: typical,
    durationMin: guide.durationDays.min,
    durationMax: guide.durationDays.max,
    expectedHarvestAt: toIsoDate(expected),
    windowStart: toIsoDate(early),
    windowEnd: toIsoDate(late),
    daysElapsed,
    daysRemaining,
    progress,
    stage,
    status,
    statusLabel,
    notes,
    disclaimer:
      "Estimate from typical crop duration — variety, sowing date accuracy, and local weather change the real harvest date.",
  };
}

export function listGuideOptions() {
  return CROP_GUIDES.map((g) => ({ id: g.id, name: g.name, season: g.season }));
}
