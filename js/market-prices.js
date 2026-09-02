/**
 * Market reference rates for India (INR / MSP) and United States (USD / cash).
 * Region is chosen from the field's coordinates (see region.js).
 */

import { formatMoney, getRegionMeta } from "./region.js";

export const MARKET_META_BY_REGION = {
  IN: {
    currency: "INR",
    cropUnit: "quintal",
    updatedLabel: "MSP / notified rates for 2025–27 marketing seasons (India)",
    disclaimer:
      "Estimates use official MSP and notified fertilizer bag prices where available. Machinery hire is based on typical Custom Hiring Centre (CHC) rates — confirm your local mandi and hire centre before deciding.",
  },
  US: {
    currency: "USD",
    cropUnit: "bushel",
    updatedLabel: "US cash / custom-hire reference rates (indicative)",
    disclaimer:
      "Estimates use indicative US cash crop prices and typical custom-hire / retail input rates. Local elevator bids, basis, and dealer prices vary by county — confirm before deciding.",
  },
};

/** @deprecated prefer getMarketMeta(region) */
export const MARKET_META = MARKET_META_BY_REGION.IN;

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

/**
 * US cash reference — USD / bushel (or lb for cotton).
 * kgPerUnit converts bushels (or lb) to kg for scenario maths.
 */
export const CROP_CASH_US = [
  { id: "wheat", name: "Wheat", price: 5.75, unit: "bu", kgPerUnit: 27.22, season: "US cash reference", source: "USDA/market indicative" },
  { id: "paddy-common", name: "Rice (rough)", price: 15.4, unit: "cwt", kgPerUnit: 45.36, season: "US cash reference", source: "USDA/market indicative" },
  { id: "paddy-grade-a", name: "Rice (long grain)", price: 16.2, unit: "cwt", kgPerUnit: 45.36, season: "US cash reference", source: "USDA/market indicative" },
  { id: "maize", name: "Corn", price: 4.45, unit: "bu", kgPerUnit: 25.4, season: "US cash reference", source: "USDA/market indicative" },
  { id: "soybean", name: "Soybeans", price: 11.2, unit: "bu", kgPerUnit: 27.22, season: "US cash reference", source: "USDA/market indicative" },
  { id: "cotton-med", name: "Cotton", price: 0.72, unit: "lb", kgPerUnit: 0.4536, season: "US cash reference", source: "USDA/market indicative" },
  { id: "barley", name: "Barley", price: 4.9, unit: "bu", kgPerUnit: 21.77, season: "US cash reference", source: "USDA/market indicative" },
  { id: "mustard", name: "Canola / rapeseed", price: 11.5, unit: "bu", kgPerUnit: 22.68, season: "US cash reference", source: "USDA/market indicative" },
  { id: "groundnut", name: "Peanuts", price: 0.55, unit: "lb", kgPerUnit: 0.4536, season: "US cash reference", source: "USDA/market indicative" },
  { id: "lentil", name: "Lentils", price: 0.28, unit: "lb", kgPerUnit: 0.4536, season: "US cash reference", source: "USDA/market indicative" },
  { id: "gram", name: "Chickpeas", price: 0.32, unit: "lb", kgPerUnit: 0.4536, season: "US cash reference", source: "USDA/market indicative" },
  { id: "moong", name: "Dry beans (ref.)", price: 0.35, unit: "lb", kgPerUnit: 0.4536, season: "US cash reference", source: "USDA/market indicative" },
];

/** Notified retail fertilizer prices (India) */
export const FERTILIZER_PRICES = [
  { id: "urea", name: "Urea", bagPrice: 266.5, bagKg: 45, season: "Kharif 2026 notified retail", source: "State / GoI notified fertilizer rates" },
  { id: "dap", name: "DAP", bagPrice: 1350, bagKg: 50, season: "Kharif 2026 notified retail", source: "State / GoI notified fertilizer rates" },
  { id: "npk-12-32-16", name: "NPK 12:32:16", bagPrice: 1190, bagKg: 50, season: "Kharif 2026 notified retail", source: "Notified fertilizer rates" },
  { id: "npk-20-20-0-13", name: "NPK 20:20:0:13", bagPrice: 1850, bagKg: 50, season: "Kharif 2026 notified retail", source: "Notified fertilizer rates" },
  { id: "npk-12-26-26", name: "NPK 12:26:26", bagPrice: 1990, bagKg: 50, season: "Kharif 2026 notified retail", source: "Notified fertilizer rates" },
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

/** US retail / bulk fertilizer — USD per bag (or ton-equivalent bag) */
export const FERTILIZER_PRICES_US = [
  { id: "urea", name: "Urea (46-0-0)", bagPrice: 28, bagKg: 22.7, season: "US retail reference", source: "Dealer / bulk indicative", unitLabel: "$ / 50 lb bag" },
  { id: "dap", name: "DAP (18-46-0)", bagPrice: 32, bagKg: 22.7, season: "US retail reference", source: "Dealer / bulk indicative", unitLabel: "$ / 50 lb bag" },
  { id: "npk-12-32-16", name: "MAP (11-52-0)", bagPrice: 34, bagKg: 22.7, season: "US retail reference", source: "Dealer indicative", unitLabel: "$ / 50 lb bag" },
  { id: "npk-20-20-0-13", name: "NPK blend 20-20-20", bagPrice: 30, bagKg: 22.7, season: "US retail reference", source: "Dealer indicative", unitLabel: "$ / 50 lb bag" },
  { id: "npk-12-26-26", name: "Potash (0-0-60)", bagPrice: 22, bagKg: 22.7, season: "US retail reference", source: "Dealer indicative", unitLabel: "$ / 50 lb bag" },
  {
    id: "anhydrous",
    name: "Anhydrous ammonia (ref. bag eq.)",
    bagPrice: 45,
    bagKg: 45.4,
    season: "US bulk reference",
    source: "Bulk N indicative",
    unitLabel: "$ / ~100 lb N-eq",
  },
];

/** India CHC hire */
export const MACHINE_HIRE = [
  { id: "tractor-cultivator", name: "Tractor + cultivator", rate: 900, unit: "hour", typical: "Land preparation", source: "Indicative CHC / custom hire rate" },
  { id: "rotavator", name: "Tractor + rotavator", rate: 1600, unit: "acre", typical: "Seedbed preparation", source: "Indicative CHC rate" },
  { id: "seed-drill", name: "Seed drill (tractor operated)", rate: 700, unit: "acre", typical: "Sowing cereals", source: "Indicative CHC rate" },
  { id: "happy-seeder", name: "Happy seeder", rate: 1800, unit: "acre", typical: "Wheat sowing in residue", source: "Indicative CHC rate" },
  { id: "combine-wheat", name: "Combine harvester (wheat)", rate: 2000, unit: "acre", typical: "Wheat harvest", source: "Indicative CHC rate" },
  { id: "combine-paddy", name: "Combine harvester (paddy)", rate: 2200, unit: "acre", typical: "Paddy harvest", source: "Indicative CHC rate" },
  { id: "thresher", name: "Thresher", rate: 120, unit: "quintal", typical: "Threshing grain", source: "Indicative custom hire rate" },
  { id: "laser-leveler", name: "Laser land leveler", rate: 1000, unit: "hour", typical: "Leveling for water saving", source: "Indicative CHC rate" },
  { id: "sprayer", name: "Boom / tractor sprayer", rate: 400, unit: "acre", typical: "Pesticide / nutrient spray", source: "Indicative CHC rate" },
  { id: "reaper", name: "Reaper binder", rate: 1200, unit: "acre", typical: "Harvest where combine not used", source: "Indicative CHC rate" },
];

/** US custom hire — USD */
export const MACHINE_HIRE_US = [
  { id: "tractor-cultivator", name: "Tractor + cultivator", rate: 145, unit: "hour", typical: "Tillage", source: "US custom-hire indicative" },
  { id: "rotavator", name: "Vertical tillage / disk", rate: 28, unit: "acre", typical: "Seedbed prep", source: "US custom-hire indicative" },
  { id: "seed-drill", name: "Grain drill / planter", rate: 22, unit: "acre", typical: "Planting", source: "US custom-hire indicative" },
  { id: "combine-wheat", name: "Combine (wheat / small grain)", rate: 42, unit: "acre", typical: "Harvest", source: "US custom-hire indicative" },
  { id: "combine-paddy", name: "Combine (corn / soy)", rate: 45, unit: "acre", typical: "Harvest", source: "US custom-hire indicative" },
  { id: "sprayer", name: "Self-propelled sprayer", rate: 12, unit: "acre", typical: "Crop protection", source: "US custom-hire indicative" },
  { id: "laser-leveler", name: "Land leveling / scraper", rate: 160, unit: "hour", typical: "Precision grade", source: "US custom-hire indicative" },
  { id: "bailer", name: "Baler (hay / straw)", rate: 18, unit: "acre", typical: "Residue / forage", source: "US custom-hire indicative" },
];

export function getMarketMeta(region = "IN") {
  return MARKET_META_BY_REGION[region] || MARKET_META_BY_REGION.IN;
}

export function getCropPrices(region = "IN") {
  if (region === "US") return CROP_CASH_US;
  return CROP_MSP;
}

export function getFertilizerPrices(region = "IN") {
  if (region === "US") return FERTILIZER_PRICES_US;
  return FERTILIZER_PRICES;
}

export function getMachineHire(region = "IN") {
  if (region === "US") return MACHINE_HIRE_US;
  return MACHINE_HIRE;
}

export function fertilizerPerKg(item) {
  if (!item?.bagKg) return null;
  return item.bagPrice / item.bagKg;
}

/** Price per kg for scenario maths */
export function cropPricePerKg(crop, region = "IN") {
  if (!crop) return 0;
  if (region === "US") {
    const kg = Number(crop.kgPerUnit) || 27.22;
    return (Number(crop.price) || 0) / kg;
  }
  return (Number(crop.mspPerQuintal) || 0) / 100;
}

export function estimateCropRevenue({ cropId, acres, yieldQtlPerAcre, region = "IN" }) {
  const crops = getCropPrices(region);
  const crop = crops.find((c) => c.id === cropId);
  if (!crop) throw new Error("Unknown crop");
  const a = Math.max(0, Number(acres) || 0);
  const y = Math.max(0, Number(yieldQtlPerAcre) || 0);

  if (region === "US") {
    // Treat yield input as bushels (or cwt/lb units) per acre for US
    const totalUnits = a * y;
    const revenue = totalUnits * crop.price;
    return {
      crop,
      acres: a,
      yieldQtlPerAcre: y,
      totalQtl: totalUnits,
      revenue,
      region,
      unit: crop.unit,
    };
  }

  const totalQtl = a * y;
  const revenue = totalQtl * crop.mspPerQuintal;
  return { crop, acres: a, yieldQtlPerAcre: y, totalQtl, revenue, region, unit: "qtl" };
}

export function estimateFertilizerCost({ fertId, bags, region = "IN" }) {
  const list = getFertilizerPrices(region);
  const fert = list.find((f) => f.id === fertId);
  if (!fert) throw new Error("Unknown fertilizer");
  const n = Math.max(0, Number(bags) || 0);
  const cost = n * fert.bagPrice;
  return { fert, bags: n, cost, perKg: fertilizerPerKg(fert), region };
}

export function estimateMachineCost({ machineId, quantity, region = "IN" }) {
  const list = getMachineHire(region);
  const machine = list.find((m) => m.id === machineId);
  if (!machine) throw new Error("Unknown machine");
  const q = Math.max(0, Number(quantity) || 0);
  const cost = q * machine.rate;
  return { machine, quantity: q, cost, region };
}

export function formatINR(n) {
  return formatMoney(n, "IN");
}

export function formatCurrency(n, region = "IN") {
  return formatMoney(n, region);
}

export function cropSelectLabel(crop, region = "IN") {
  if (region === "US") {
    return `${crop.name} — $${crop.price}/${crop.unit} (${crop.season})`;
  }
  return `${crop.name} — MSP ₹${crop.mspPerQuintal}/qtl (${crop.season})`;
}

export { formatMoney, getRegionMeta };
