/**
 * Informational marketplace helpers — buyers, sell timing, transport cost.
 */

import { nearestMarkets, haversineKm, formatDistance } from "./nearby-markets.js";
import { getCropPrices } from "./market-prices.js";
import { formatMoney } from "./region.js";

export function marketplaceIntel(lat, lon, { region = "IN", cropHint = "", fuelPerKm } = {}) {
  const markets = nearestMarkets(lat, lon, { limit: 5, cropHint, region });
  const crops = getCropPrices(region === "US" ? "US" : "IN");
  const crop = crops.find((c) => (c.name || "").toLowerCase().includes(String(cropHint).toLowerCase())) || crops[0];
  const rate = fuelPerKm ?? (region === "US" ? 0.85 : 18);

  const buyers = markets.map((m) => ({
    ...m,
    distanceLabel: formatDistance(m.km, region),
    transportCost: Math.round(m.km * 2 * rate), // round trip proxy
  }));

  const month = new Date().getUTCMonth() + 1;
  let sellTiming = "Monitor local bids this week.";
  if (region === "IN") {
    sellTiming =
      month >= 3 && month <= 5
        ? "Rabi marketing window — compare MSP procurement centres vs trader offers."
        : month >= 10 && month <= 12
          ? "Kharif arrivals rising — early sales may beat post-harvest glut."
          : "Stagger sales; watch mandi arrivals and moisture deductions.";
  } else if (region === "US") {
    sellTiming =
      month >= 9 && month <= 11
        ? "Harvest pressure can weaken basis — consider storage if moisture allows."
        : "Watch USDA reports and local elevator basis before committing.";
  }

  const trend = crop
    ? region === "US"
      ? `${crop.name} cash ref ~$${crop.price}/${crop.unit}`
      : `${crop.name} MSP ₹${crop.mspPerQuintal}/qtl`
    : "No crop price row";

  return {
    buyers,
    priceTrend: trend,
    sellTiming,
    transportNote: `Transport estimate uses ~${formatMoney(rate, region)} per km round-trip proxy.`,
  };
}
