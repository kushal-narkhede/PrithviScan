/**
 * Farmer ground-truth feedback loop (feature 3.3 + image GT).
 * Stores calibration signals under the field for later model tuning.
 */

import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getDb } from "./firebase-db.js";

/** Compress image file to a small JPEG data URL for Firestore storage. */
export function compressPhotoToDataUrl(file, { maxEdge = 480, quality = 0.65 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    if (!file.type?.startsWith("image/")) {
      reject(new Error("Photo must be an image."));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error("Photo must be under 8 MB."));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        URL.revokeObjectURL(url);
        // Cap ~450KB string for Firestore doc comfort
        if (dataUrl.length > 450000) {
          resolve(canvas.toDataURL("image/jpeg", 0.45));
        } else {
          resolve(dataUrl);
        }
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read photo."));
    };
    img.src = url;
  });
}

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
    photoKind: payload.photoKind ? String(payload.photoKind).slice(0, 40) : null,
    photoDataUrl: payload.photoDataUrl ? String(payload.photoDataUrl).slice(0, 480000) : null,
    photoName: payload.photoName ? String(payload.photoName).slice(0, 120) : null,
    lat: payload.lat != null ? Number(payload.lat) : null,
    lon: payload.lon != null ? Number(payload.lon) : null,
    modelVersion: "image_gt_v1",
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
