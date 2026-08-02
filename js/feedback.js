/**
 * Farmer ground-truth feedback loop (feature 3.3).
 * Stores calibration signals under the field for later model tuning.
 */

import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getDb } from "./firebase-db.js";

export async function submitGroundTruth(uid, fieldId, payload) {
  const col = collection(getDb(), "users", uid, "fields", fieldId, "feedback");
  const doc = {
    kind: String(payload.kind || "note"),
    soilMoisture: payload.soilMoisture === "" || payload.soilMoisture == null
      ? null
      : Number(payload.soilMoisture),
    yieldKgHa: payload.yieldKgHa === "" || payload.yieldKgHa == null
      ? null
      : Number(payload.yieldKgHa),
    irrigated: Boolean(payload.irrigated),
    notes: String(payload.notes || "").trim().slice(0, 1000),
    consentShareForCalibration: Boolean(payload.consentShareForCalibration),
    lat: payload.lat != null ? Number(payload.lat) : null,
    lon: payload.lon != null ? Number(payload.lon) : null,
    createdAt: serverTimestamp(),
  };
  if (doc.soilMoisture != null && !Number.isFinite(doc.soilMoisture)) {
    throw new Error("Soil moisture must be a number (0–100%).");
  }
  if (doc.yieldKgHa != null && !Number.isFinite(doc.yieldKgHa)) {
    throw new Error("Yield must be a number (kg/ha).");
  }
  const ref = await addDoc(col, doc);
  return { id: ref.id, ...doc };
}
