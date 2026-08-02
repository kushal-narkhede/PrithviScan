/**
 * India market reference rates for the Price Calculator.
 * Crop prices use Government of India MSP (₹/quintal).
 * Fertilizer bag prices use government-notified retail rates.
 * Machinery uses indicative Custom Hiring Centre (CHC) rates commonly used in India.
 *
 * Sources / season notes are shown in the UI. Local mandi & hire rates can differ by state.
 */

export const MARKET_META = {
  currency: "INR",
  cropUnit: "quintal",
  updatedLabel: "MSP / notified rates for 2025–27 marketing seasons (India)",
  disclaimer:
    "Estimates use official MSP and notified fertilizer bag prices where available. Machinery hire is based on typical Custom Hiring Centre (CHC) rates — confirm your local mandi and hire centre before deciding.",
};

/** MSP ₹ / quintal — GoI announcements for 2025-26 / 2026-27 seasons */
export const CROP_MSP = [
  { id: "wheat", name: "Wheat", mspPerQuintal: 2585, season: "Rabi MSP 2026–27", source: "GoI / Cabinet MSP" },
  { id: "paddy-common", name: "Paddy (Common)", mspPerQuintal: 2441, season: "Kharif MSP 2026–27", source: "GoI MSP" },
  { id: "paddy-grade-a", name: "Paddy (Grade A)", mspPerQuintal: 2461, season: "Kharif MSP 2026–27", source: "GoI MSP" },
  { id: "maize", name: "Maize", mspPerQuintal: 2410, season: "Kharif MSP 2026–27", source: "GoI MSP" },
  { id: "bajra", name: "Bajra", mspPerQuintal: 2900, season: "Kharif MSP 2026–27", source: "GoI MSP" },
  { id: "jowar", name: "Jowar (Hybrid)", mspPerQuintal: 4023, season: "Kharif MSP 2026–27", source: "GoI MSP" },
  { id: "gram", name: "Gram (Chana)", mspPerQuintal: 5875, season: "Rabi MSP 2026–27", source: "GoI MSP" },
  { id: "lentil", name: "Lentil (Masur)", mspPerQuintal: 7000, season: "Rabi MSP 2026–27", source: "GoI MSP" },
  { id: "moong", name: "Moong", mspPerQuintal: 8780, season: "Kharif MSP 2026–27", source: "GoI MSP" },
  { id: "urad", name: "Urad", mspPerQuintal: 8200, season: "Kharif MSP 2026–27", source: "GoI MSP" },
  { id: "tur", name: "Tur / Arhar", mspPerQuintal: 8450, season: "Kharif MSP 2026–27", source: "GoI MSP" },
  { id: "mustard", name: "Mustard (Rapeseed)", mspPerQuintal: 6200, season: "Rabi MSP 2026–27", source: "GoI MSP" },
  { id: "soybean", name: "Soybean (Yellow)", mspPerQuintal: 5708, season: "Kharif MSP 2026–27", source: "GoI MSP" },
  { id: "groundnut", name: "Groundnut", mspPerQuintal: 7517, season: "Kharif MSP 2026–27", source: "GoI MSP" },
  { id: "cotton-med", name: "Cotton (Medium Staple)", mspPerQuintal: 8267, season: "Kharif MSP 2026–27", source: "GoI MSP" },
  { id: "barley", name: "Barley", mspPerQuintal: 2150, season: "Rabi MSP 2026–27", source: "GoI MSP" },
];

/** Notified retail fertilizer prices (India) — convert bags to ₹/kg for maths */
export const FERTILIZER_PRICES = [
  {
    id: "urea",
    name: "Urea",
    bagPrice: 266.5,
    bagKg: 45,
    season: "Kharif 2026 notified retail",
    source: "State / GoI notified fertilizer rates",
  },
  {
    id: "dap",
    name: "DAP",
    bagPrice: 1350,
    bagKg: 50,
    season: "Kharif 2026 notified retail",
    source: "State / GoI notified fertilizer rates",
  },
  {
    id: "npk-12-32-16",
    name: "NPK 12:32:16",
    bagPrice: 1190,
    bagKg: 50,
    season: "Kharif 2026 notified retail",
    source: "Notified fertilizer rates",
  },
  {
    id: "npk-20-20-0-13",
    name: "NPK 20:20:0:13",
    bagPrice: 1850,
    bagKg: 50,
    season: "Kharif 2026 notified retail",
    source: "Notified fertilizer rates",
  },
  {
    id: "npk-12-26-26",
    name: "NPK 12:26:26",
    bagPrice: 1990,
    bagKg: 50,
    season: "Kharif 2026 notified retail",
    source: "Notified fertilizer rates",
  },
  {
    id: "nano-urea",
    name: "Nano Urea (IFFCO)",
    bagPrice: 225,
    bagKg: 0.5,
    season: "Kharif 2026 notified",
    source: "Notified nano fertilizer rates",
    unitLabel: "₹ / 500 ml bottle",
  },
];

/**
 * Indicative Custom Hiring Centre rates widely used for farm budgeting in India.
 * Shown as ₹/acre or ₹/hour — farmers should verify with local CHC / custom operator.
 */
export const MACHINE_HIRE = [
  {
    id: "tractor-cultivator",
    name: "Tractor + cultivator",
    rate: 900,
    unit: "hour",
    typical: "Land preparation",
    source: "Indicative CHC / custom hire rate",
  },
  {
    id: "rotavator",
    name: "Tractor + rotavator",
    rate: 1600,
    unit: "acre",
    typical: "Seedbed preparation",
    source: "Indicative CHC rate",
  },
  {
    id: "seed-drill",
    name: "Seed drill (tractor operated)",
    rate: 700,
    unit: "acre",
    typical: "Sowing cereals",
    source: "Indicative CHC rate",
  },
  {
    id: "happy-seeder",
    name: "Happy seeder",
    rate: 1800,
    unit: "acre",
    typical: "Wheat sowing in residue",
    source: "Indicative CHC rate",
  },
  {
    id: "combine-wheat",
    name: "Combine harvester (wheat)",
    rate: 2000,
    unit: "acre",
    typical: "Wheat harvest",
    source: "Indicative CHC rate",
  },
  {
    id: "combine-paddy",
    name: "Combine harvester (paddy)",
    rate: 2200,
    unit: "acre",
    typical: "Paddy harvest",
    source: "Indicative CHC rate",
  },
  {
    id: "thresher",
    name: "Thresher",
    rate: 120,
    unit: "quintal",
    typical: "Threshing grain",
    source: "Indicative custom hire rate",
  },
  {
    id: "laser-leveler",
    name: "Laser land leveler",
    rate: 1000,
    unit: "hour",
    typical: "Leveling for water saving",
    source: "Indicative CHC rate",
  },
  {
    id: "sprayer",
    name: "Boom / tractor sprayer",
    rate: 400,
    unit: "acre",
    typical: "Pesticide / nutrient spray",
    source: "Indicative CHC rate",
  },
  {
    id: "reaper",
    name: "Reaper binder",
    rate: 1200,
    unit: "acre",
    typical: "Harvest where combine not used",
    source: "Indicative CHC rate",
  },
];

export function fertilizerPerKg(item) {
  if (!item?.bagKg) return null;
  return item.bagPrice / item.bagKg;
}

/** Revenue at MSP for yield (quintal/acre) × acres */
export function estimateCropRevenue({ cropId, acres, yieldQtlPerAcre }) {
  const crop = CROP_MSP.find((c) => c.id === cropId);
  if (!crop) throw new Error("Unknown crop");
  const a = Math.max(0, Number(acres) || 0);
  const y = Math.max(0, Number(yieldQtlPerAcre) || 0);
  const totalQtl = a * y;
  const revenue = totalQtl * crop.mspPerQuintal;
  return { crop, acres: a, yieldQtlPerAcre: y, totalQtl, revenue };
}

export function estimateFertilizerCost({ fertId, bags }) {
  const fert = FERTILIZER_PRICES.find((f) => f.id === fertId);
  if (!fert) throw new Error("Unknown fertilizer");
  const n = Math.max(0, Number(bags) || 0);
  const cost = n * fert.bagPrice;
  return { fert, bags: n, cost, perKg: fertilizerPerKg(fert) };
}

export function estimateMachineCost({ machineId, quantity }) {
  const machine = MACHINE_HIRE.find((m) => m.id === machineId);
  if (!machine) throw new Error("Unknown machine");
  const q = Math.max(0, Number(quantity) || 0);
  const cost = q * machine.rate;
  return { machine, quantity: q, cost };
}

export function formatINR(n) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}
