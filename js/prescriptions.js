/**
 * VRA-lite prescriptions — zone table + CSV/GeoJSON export.
 */

import { buildHealthZones, healthFromNdvi } from "./field-health.js";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getDb } from "./firebase-db.js";

export function buildPrescription(field, ndvi, { fertName = "Urea" } = {}) {
  const health = healthFromNdvi(ndvi);
  const zones = buildHealthZones(field.lat, field.lon, ndvi);
  return {
    fieldId: field.id,
    fieldName: field.name,
    cropType: field.cropType || null,
    ndvi: Number(ndvi),
    health,
    fertName,
    zones,
    generatedAt: new Date().toISOString(),
    provenance: {
      source: "esri_rgb_ndvi_proxy",
      model: "vra_lite_v1",
      disclaimer: "Indicative zones from vegetation proxy — confirm with agronomist before applying.",
    },
  };
}

export function prescriptionToCsv(rx) {
  const lines = [
    "zone,lat,lon,radius_m,ndvi,rate_kg_ha,fertilizer,field,generated_at,source",
  ];
  for (const z of rx.zones || []) {
    lines.push(
      [
        z.zone,
        z.lat,
        z.lon,
        z.radiusM,
        z.ndvi,
        z.rateKgHa,
        JSON.stringify(rx.fertName || "Urea"),
        JSON.stringify(rx.fieldName || ""),
        rx.generatedAt,
        rx.provenance?.source || "",
      ].join(",")
    );
  }
  return lines.join("\n");
}

export function prescriptionToGeoJson(rx) {
  return {
    type: "FeatureCollection",
    features: (rx.zones || []).map((z) => ({
      type: "Feature",
      properties: {
        zone: z.zone,
        ndvi: z.ndvi,
        rate_kg_ha: z.rateKgHa,
        fertilizer: rx.fertName,
        field: rx.fieldName,
        source: rx.provenance?.source,
        generatedAt: rx.generatedAt,
      },
      geometry: {
        type: "Point",
        coordinates: [z.lon, z.lat],
      },
    })),
  };
}

export function downloadText(filename, text, mime = "text/csv") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function savePrescription(field, uid, rx) {
  const col = field.orgId
    ? collection(getDb(), "organizations", field.orgId, "fields", field.id, "prescriptions")
    : collection(getDb(), "users", uid, "fields", field.id, "prescriptions");
  const ref = await addDoc(col, {
    ...rx,
    savedAt: serverTimestamp(),
    savedBy: uid,
  });
  return ref.id;
}
