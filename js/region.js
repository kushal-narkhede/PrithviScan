/**
 * Field region helpers — India (IN) vs United States (US).
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
  },
};

const INDIA_BOX = { latMin: 6.5, latMax: 37.6, lonMin: 68.0, lonMax: 97.5 };
const US_CONUS = { latMin: 24.4, latMax: 49.5, lonMin: -125.0, lonMax: -66.5 };
const US_AK = { latMin: 51.0, latMax: 72.0, lonMin: -180.0, lonMax: -129.0 };
const US_HI = { latMin: 18.5, latMax: 22.5, lonMin: -161.0, lonMax: -154.0 };

function inBox(lat, lon, b) {
  return lat >= b.latMin && lat <= b.latMax && lon >= b.lonMin && lon <= b.lonMax;
}

export function isInIndia(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && inBox(lat, lon, INDIA_BOX);
}

export function isInUSA(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
  return inBox(lat, lon, US_CONUS) || inBox(lat, lon, US_AK) || inBox(lat, lon, US_HI);
}

/** Haversine km — local copy to avoid circular imports */
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
 * Points outside both countries snap to the nearer of India vs US Midwest.
 * @returns {"IN"|"US"}
 */
export function detectRegion(lat, lon) {
  if (isInIndia(lat, lon)) return "IN";
  if (isInUSA(lat, lon)) return "US";
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return "IN";
  const dIn = haversineKm(lat, lon, REGIONS.IN.center[0], REGIONS.IN.center[1]);
  const dUs = haversineKm(lat, lon, REGIONS.US.center[0], REGIONS.US.center[1]);
  return dUs < dIn ? "US" : "IN";
}

export function getRegionMeta(region) {
  return REGIONS[region] || REGIONS.IN;
}

export function formatMoney(amount, region = "IN") {
  const meta = getRegionMeta(region);
  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency: meta.currency,
    maximumFractionDigits: meta.currency === "USD" ? 2 : 0,
  }).format(Number(amount) || 0);
}

/** @deprecated use formatMoney — kept for older imports */
export function formatINR(n) {
  return formatMoney(n, "IN");
}

export function regionBadgeLabel(region) {
  const meta = getRegionMeta(region);
  return `${meta.name} · ${meta.currency}`;
}

/** Leaflet-friendly world view covering India + CONUS */
export const DUAL_BOUNDS = [
  [8, -125], // SW
  [49, 97], // NE
];

export function preferredMapView(lat, lon) {
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    const region = detectRegion(lat, lon);
    const meta = getRegionMeta(region);
    return { center: [lat, lon], zoom: 14, region };
  }
  return { center: REGIONS.IN.center, zoom: 3, region: null, fitDual: true };
}
