import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirebaseApp } from "./auth.js";

const FUNCTIONS_BASE = "https://us-central1-prithviscan.cloudfunctions.net";

/**
 * Cloud Functions need Firebase Blaze. Keep false on Spark so the UI
 * shows clear "coming soon" messages instead of failed network calls.
 * Flip to true after: firebase deploy --only functions
 */
export const FUNCTIONS_ENABLED = false;

const BLAZE_MSG =
  "Cloud Functions are paused until the project is on Blaze. Auth, fields, and map still work.";

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

export async function callFuseInsight(fieldId, lat, lon, sensitivity = 1) {
  return apiFetch("fuseFieldInsight", { fieldId, lat, lon, sensitivity });
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

export async function callClassifyLocation(lat, lon) {
  return apiFetch("classifyLocation", { lat, lon });
}
