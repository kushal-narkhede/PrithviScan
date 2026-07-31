import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirebaseApp } from "./auth.js";

const FUNCTIONS_BASE = "https://us-central1-prithviscan.cloudfunctions.net";

export async function getIdToken() {
  const auth = getAuth(getFirebaseApp());
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in.");
  return user.getIdToken();
}

async function apiFetch(path, params = {}) {
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

export async function callFuseInsight(fieldId, lat, lon) {
  return apiFetch("fuseFieldInsight", { fieldId, lat, lon });
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
