import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirebaseApp } from "./auth.js";

const FUNCTIONS_BASE = "https://us-central1-prithviscan.cloudfunctions.net";

/**
 * Cloud Functions enabled after Blaze upgrade.
 * Base: https://us-central1-prithviscan.cloudfunctions.net
 */
export const FUNCTIONS_ENABLED = true;

const BLAZE_MSG =
  "Cloud Functions are temporarily unavailable. Try again shortly, or check the Firebase console.";

export async function getIdToken() {
  const auth = getAuth(getFirebaseApp());
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");
  return user.getIdToken();
}

async function apiFetch(path, params = {}) {
  if (!FUNCTIONS_ENABLED) {
    return { ok: false, disabled: true, error: BLAZE_MSG, status: 503 };
  }
  const token = await getIdToken();
  const url = new URL(`${FUNCTIONS_BASE}/${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined) url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({ error: "Invalid JSON", status: res.status }));
  return json;
}

export async function callPowerSummary(fieldId, lat, lon, days = 7) {
  return apiFetch("powerSummary", { fieldId, lat, lon, days });
}

export async function callFuseInsight(fieldId, lat, lon, sensitivity = 1, orgId = null) {
  return apiFetch("fuseFieldInsight", { fieldId, lat, lon, sensitivity, orgId });
}

export async function callEarthSummary(fieldId, lat, lon) {
  return apiFetch("fieldEarthSummary", { fieldId, lat, lon });
}

export async function callGetAlerts() {
  return apiFetch("getAlerts");
}

export async function callMarkAlertRead(alertId) {
  return apiFetch("markAlertRead", { alertId });
}

export async function callFieldTrends(fieldId, lat, lon) {
  return apiFetch("fieldTrends", { fieldId, lat, lon });
}

/** Tomorrow.io hyperlocal forecast + farm advisories */
export async function callFieldTomorrowWeather(fieldId, lat, lon, units = "metric") {
  return apiFetch("fieldTomorrowWeather", { fieldId, lat, lon, units });
}

export async function callTomorrowStatus() {
  if (!FUNCTIONS_ENABLED) {
    return { ok: false, disabled: true, error: BLAZE_MSG, status: 503 };
  }
  const res = await fetch(`${FUNCTIONS_BASE}/tomorrowStatus`);
  return res.json().catch(() => ({ ok: false, error: "Invalid JSON" }));
}

/** India localization pack — Bhuvan / Bhoonidhi / IMD / Agmarknet */
export async function callFieldIndiaPack(fieldId, lat, lon, cropType = "") {
  return apiFetch("fieldIndiaPack", { fieldId, lat, lon, cropType });
}

export async function callIndiaLayersStatus() {
  if (!FUNCTIONS_ENABLED) {
    return { ok: false, disabled: true, error: BLAZE_MSG, status: 503 };
  }
  const res = await fetch(`${FUNCTIONS_BASE}/indiaLayersStatus`);
  return res.json().catch(() => ({ ok: false, error: "Invalid JSON" }));
}

/** Historical NASA granules + browse imagery (MODIS / SMAP / HLS) */
export async function callSatelliteArchive(lat, lon, { product = "modis_terra", days = 90 } = {}) {
  return apiFetch("fieldSatelliteArchive", { lat, lon, product, days });
}

export async function callClassifyLocation(lat, lon) {
  return apiFetch("classifyLocation", { lat, lon });
}

export async function callFieldHealth(lat, lon) {
  return apiFetch("fieldHealthIndex", { lat, lon });
}

export async function callProcessAlertOutbox() {
  return apiFetch("processAlertOutbox");
}

/** URTC science suite — soil moisture, risks, irrigation, yield, soil intel, crop pick */
export async function callFieldUrtcSuite(params = {}) {
  return apiFetch("fieldUrtcSuite", params);
}

/** Heuristic field boundary snap */
export async function callSnapFieldBoundary({ lat, lon, polygon } = {}) {
  return apiPost("snapFieldBoundary", { lat, lon, polygon });
}

/** POST helper for chat / larger bodies */
async function apiPost(path, body = {}) {
  if (!FUNCTIONS_ENABLED) {
    return { ok: false, disabled: true, error: BLAZE_MSG, status: 503 };
  }
  const token = await getIdToken();
  const res = await fetch(`${FUNCTIONS_BASE}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({ error: "Invalid JSON", status: res.status }));
  return json;
}

/**
 * Server-side AI chat (Gemini / OpenRouter keys via secrets).
 * Available after Blaze + deploy of functions/aiChat.
 */
export async function callAiChat({ provider, messages, model } = {}) {
  return apiPost("aiChat", { provider, messages, model });
}
