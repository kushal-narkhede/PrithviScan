/**
 * Field region helpers — country intelligence packs.
 * Currency, markets, and reference prices follow the field's coordinates.
 */

export const REGIONS = {
  IN: {
    id: "IN",
    name: "India",
    currency: "INR",
    locale: "en-IN",
    cropUnit: "quintal",
    areaUnit: "acre",
    marketLabel: "APMC / mandi",
    priceLabel: "MSP",
    center: [20.5937, 78.9629],
    zoom: 5,
    crops: ["wheat", "paddy", "maize", "soybean", "cotton"],
  },
  US: {
    id: "US",
    name: "United States",
    currency: "USD",
    locale: "en-US",
    cropUnit: "bushel",
    areaUnit: "acre",
    marketLabel: "elevator / wholesale",
    priceLabel: "cash price",
    center: [39.8283, -98.5795],
    zoom: 4,
    crops: ["maize", "soybean", "wheat", "cotton"],
  },
  BR: {
    id: "BR",
    name: "Brazil",
    currency: "BRL",
    locale: "pt-BR",
    cropUnit: "tonne",
    areaUnit: "hectare",
    marketLabel: "cooperative / CEASA",
    priceLabel: "reference price",
    center: [-14.235, -51.9253],
    zoom: 4,
    crops: ["soybean", "maize", "sugarcane", "coffee"],
  },
  KE: {
    id: "KE",
    name: "Kenya",
    currency: "KES",
    locale: "en-KE",
    cropUnit: "bag",
    areaUnit: "acre",
    marketLabel: "market / NCPB",
    priceLabel: "reference price",
    center: [-1.2921, 36.8219],
    zoom: 6,
    crops: ["maize", "tea", "coffee", "wheat"],
  },
  NG: {
    id: "NG",
    name: "Nigeria",
    currency: "NGN",
    locale: "en-NG",
    cropUnit: "tonne",
    areaUnit: "hectare",
    marketLabel: "commodity market",
    priceLabel: "reference price",
    center: [9.082, 8.6753],
    zoom: 5,
    crops: ["maize", "cassava", "rice", "sorghum"],
  },
  ID: {
    id: "ID",
    name: "Indonesia",
    currency: "IDR",
    locale: "id-ID",
    cropUnit: "tonne",
    areaUnit: "hectare",
    marketLabel: "pasar / BULOG",
    priceLabel: "reference price",
    center: [-2.5489, 118.0149],
    zoom: 4,
    crops: ["paddy", "palm", "maize", "coffee"],
  },
};

const BOXES = {
  IN: { latMin: 6.5, latMax: 37.6, lonMin: 68.0, lonMax: 97.5 },
  US_CONUS: { latMin: 24.4, latMax: 49.5, lonMin: -125.0, lonMax: -66.5 },
  US_AK: { latMin: 51.0, latMax: 72.0, lonMin: -180.0, lonMax: -129.0 },
  US_HI: { latMin: 18.5, latMax: 22.5, lonMin: -161.0, lonMax: -154.0 },
  BR: { latMin: -34.0, latMax: 5.5, lonMin: -74.0, lonMax: -32.0 },
  KE: { latMin: -4.8, latMax: 5.1, lonMin: 33.8, lonMax: 42.0 },
  NG: { latMin: 4.0, latMax: 14.0, lonMin: 2.5, lonMax: 15.0 },
  ID: { latMin: -11.2, latMax: 6.2, lonMin: 95.0, lonMax: 141.5 },
};

function inBox(lat, lon, b) {
  return lat >= b.latMin && lat <= b.latMax && lon >= b.lonMin && lon <= b.lonMax;
}

export function isInIndia(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && inBox(lat, lon, BOXES.IN);
}

export function isInUSA(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  return inBox(lat, lon, BOXES.US_CONUS) || inBox(lat, lon, BOXES.US_AK) || inBox(lat, lon, BOXES.US_HI);
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Detect farming region from coordinates.
 * @returns {"IN"|"US"|"BR"|"KE"|"NG"|"ID"}
 */
export function detectRegion(lat, lon) {
  if (isInIndia(lat, lon)) return "IN";
  if (isInUSA(lat, lon)) return "US";
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    if (inBox(lat, lon, BOXES.BR)) return "BR";
    if (inBox(lat, lon, BOXES.KE)) return "KE";
    if (inBox(lat, lon, BOXES.NG)) return "NG";
    if (inBox(lat, lon, BOXES.ID)) return "ID";
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return "IN";
  let best = "IN";
  let bestD = Infinity;
  for (const id of Object.keys(REGIONS)) {
    const [clat, clon] = REGIONS[id].center;
    const d = haversineKm(lat, lon, clat, clon);
    if (d < bestD) {
      bestD = d;
      best = id;
    }
  }
  return best;
}

export function getRegionMeta(region) {
  return REGIONS[region] || REGIONS.IN;
}

export function formatMoney(amount, region = "IN") {
  const meta = getRegionMeta(region);
  const zeroDec = ["INR", "JPY", "KRW", "VND", "IDR"].includes(meta.currency);
  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency: meta.currency,
    maximumFractionDigits: zeroDec ? 0 : 2,
  }).format(Number(amount) || 0);
}

export function formatINR(n) {
  return formatMoney(n, "IN");
}

export function regionBadgeLabel(region) {
  const meta = getRegionMeta(region);
  return `${meta.name} · ${meta.currency}`;
}

export const DUAL_BOUNDS = [
  [8, -125],
  [49, 97],
];

export function preferredMapView(lat, lon) {
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    const region = detectRegion(lat, lon);
    return { center: [lat, lon], zoom: 14, region };
  }
  return { center: REGIONS.IN.center, zoom: REGIONS.IN.zoom, region: "IN", fitDual: false };
}

export const COUNTRY_PACK_IDS = Object.keys(REGIONS);
