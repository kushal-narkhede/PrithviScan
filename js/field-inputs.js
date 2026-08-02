/**
 * Log fertilizers, machines, and other inputs applied on a field.
 */

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getDb } from "./firebase-db.js";
import { FERTILIZER_PRICES, MACHINE_HIRE, estimateFertilizerCost, estimateMachineCost } from "./market-prices.js";

export const INPUT_KINDS = [
  { id: "fertilizer", label: "Fertilizer" },
  { id: "machine", label: "Machine / hire" },
  { id: "other", label: "Other input" },
];

export function fertilizerOptions() {
  return FERTILIZER_PRICES.map((f) => ({ id: f.id, name: f.name, meta: `₹${f.bagPrice}/${f.bagKg} kg` }));
}

export function machineOptions() {
  return MACHINE_HIRE.map((m) => ({
    id: m.id,
    name: m.name,
    meta: `₹${m.rate}/${m.unit}`,
  }));
}

function usagesCol(uid, fieldId) {
  return collection(getDb(), "users", uid, "fields", fieldId, "usages");
}

export async function listFieldUsages(uid, fieldId, max = 40) {
  const q = query(usagesCol(uid, fieldId), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addFieldUsage(uid, fieldId, payload) {
  const kind = String(payload.kind || "other");
  const itemId = String(payload.itemId || "").trim();
  const qty = Number(payload.qty);
  const notes = String(payload.notes || "").trim().slice(0, 500);
  const appliedAt = String(payload.appliedAt || "").slice(0, 10) || null;

  if (!["fertilizer", "machine", "other"].includes(kind)) {
    throw new Error("Choose fertilizer, machine, or other.");
  }
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("Quantity must be a positive number.");
  }

  let itemName = String(payload.itemName || itemId || "Input").trim();
  let unit = String(payload.unit || "").trim();
  let estCost = null;

  if (kind === "fertilizer") {
    const fert = FERTILIZER_PRICES.find((f) => f.id === itemId);
    if (!fert) throw new Error("Unknown fertilizer.");
    itemName = fert.name;
    unit = "bags";
    const est = estimateFertilizerCost({ fertId: itemId, bags: qty });
    estCost = est?.cost ?? null;
  } else if (kind === "machine") {
    const mach = MACHINE_HIRE.find((m) => m.id === itemId);
    if (!mach) throw new Error("Unknown machine.");
    itemName = mach.name;
    unit = mach.unit;
    const est = estimateMachineCost({ machineId: itemId, quantity: qty });
    estCost = est?.cost ?? null;
  } else {
    if (!itemName) throw new Error("Name the input.");
    unit = unit || "units";
    if (payload.estCost != null && payload.estCost !== "") {
      estCost = Number(payload.estCost);
      if (!Number.isFinite(estCost)) throw new Error("Cost must be a number.");
    }
  }

  const docBody = {
    kind,
    itemId: itemId || null,
    itemName,
    qty,
    unit,
    estCost: estCost == null ? null : Math.round(estCost),
    appliedAt,
    notes,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(usagesCol(uid, fieldId), docBody);
  return { id: ref.id, ...docBody };
}

export async function deleteFieldUsage(uid, fieldId, usageId) {
  await deleteDoc(doc(getDb(), "users", uid, "fields", fieldId, "usages", usageId));
}
