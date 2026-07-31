import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getDb } from "./firebase-db.js";

function fieldsCol(uid) {
  return collection(getDb(), "users", uid, "fields");
}

export async function listFields(uid) {
  const q = query(fieldsCol(uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getField(uid, fieldId) {
  const ref = doc(getDb(), "users", uid, "fields", fieldId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function createField(uid, data) {
  const payload = {
    name: String(data.name || "Untitled field").trim(),
    lat: Number(data.lat),
    lon: Number(data.lon),
    cropType: String(data.cropType || "").trim() || null,
    bbox: data.bbox || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (!Number.isFinite(payload.lat) || !Number.isFinite(payload.lon)) {
    throw new Error("Valid latitude and longitude are required.");
  }
  if (payload.lat < -90 || payload.lat > 90 || payload.lon < -180 || payload.lon > 180) {
    throw new Error("Coordinates out of range.");
  }
  const ref = await addDoc(fieldsCol(uid), payload);
  return { id: ref.id, ...payload };
}

export async function updateField(uid, fieldId, data) {
  const ref = doc(getDb(), "users", uid, "fields", fieldId);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteField(uid, fieldId) {
  const ref = doc(getDb(), "users", uid, "fields", fieldId);
  await deleteDoc(ref);
}
