/**
 * Field health (NDVI proxy) client helpers — snapshots + change detection.
 */

import {
  doc,
  setDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getDb } from "./firebase-db.js";
import { t } from "./i18n.js";

export function healthFromNdvi(ndvi) {
  const v = Number(ndvi);
  if (!Number.isFinite(v)) {
    return { code: "unknown", label: "No index yet", color: "#718096", level: "info" };
  }
  if (v >= 0.35) {
    return { code: "good", label: t("health.good"), color: "#2f855a", level: "info" };
  }
  if (v >= 0.18) {
    return { code: "watch", label: t("health.watch"), color: "#d69e2e", level: "watch" };
  }
  return { code: "action", label: t("health.action"), color: "#c53030", level: "action" };
}

function snapshotsCol(field) {
  if (field.orgId) {
    return collection(getDb(), "organizations", field.orgId, "fields", field.id, "snapshots");
  }
  return collection(getDb(), "users", field.ownerUid || field._ownerUid || field.createdBy, "fields", field.id, "snapshots");
}

export async function saveHealthSnapshot(field, uid, payload) {
  const dateId = String(payload.date || new Date().toISOString().slice(0, 10));
  const col = field.orgId
    ? collection(getDb(), "organizations", field.orgId, "fields", field.id, "snapshots")
    : collection(getDb(), "users", uid, "fields", field.id, "snapshots");
  const ref = doc(col, dateId);
  const body = {
    date: dateId,
    ndvi: Number(payload.ndvi),
    evi: payload.evi != null ? Number(payload.evi) : null,
    source: payload.source || "esri_rgb_proxy",
    cloudPct: payload.cloudPct ?? null,
    health: healthFromNdvi(payload.ndvi),
    lat: field.lat,
    lon: field.lon,
    savedAt: serverTimestamp(),
  };
  await setDoc(ref, body, { merge: true });
  return { id: dateId, ...body };
}

export async function listHealthSnapshots(field, uid, max = 12) {
  const owner = field.orgId ? null : uid;
  const col = field.orgId
    ? collection(getDb(), "organizations", field.orgId, "fields", field.id, "snapshots")
    : collection(getDb(), "users", owner, "fields", field.id, "snapshots");
  const q = query(col, orderBy("date", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function detectChange(snapshots = []) {
  if (snapshots.length < 2) return null;
  const newest = snapshots[0];
  const older = snapshots[1];
  const a = Number(newest.ndvi);
  const b = Number(older.ndvi);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const delta = a - b;
  let message = "Canopy index is stable versus the previous snapshot.";
  if (delta <= -0.08) message = "Vegetation index dropped sharply — check irrigation, pests, or cloud noise.";
  else if (delta <= -0.04) message = "Mild decline versus last snapshot — watch this field.";
  else if (delta >= 0.06) message = "Canopy greening improved versus the previous snapshot.";
  return {
    newestDate: newest.date,
    olderDate: older.date,
    delta: Number(delta.toFixed(3)),
    message,
    worsening: delta <= -0.04,
  };
}

/** Build leaflet-friendly zone rings from a point (VRA-lite). */
export function buildHealthZones(lat, lon, ndvi) {
  const h = healthFromNdvi(ndvi);
  // Approximate 3 concentric zones ~ hectare scale
  const meters = [60, 120, 180];
  return meters.map((m, i) => ({
    zone: i === 0 ? "core" : i === 1 ? "mid" : "edge",
    radiusM: m,
    lat,
    lon,
    ndvi: Number((ndvi * (1 - i * 0.04)).toFixed(3)),
    rateKgHa: h.code === "action" ? 80 - i * 10 : h.code === "watch" ? 50 - i * 8 : 30 - i * 5,
    color: h.color,
  }));
}
