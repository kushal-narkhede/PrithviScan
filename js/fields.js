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
import { getUserMeta, getOrganization } from "./org.js";
import { canWriteFields, canDeleteFields, normalizeOrgRole } from "./org-roles.js";

function personalFieldsCol(uid) {
  return collection(getDb(), "users", uid, "fields");
}

function orgFieldsCol(orgId) {
  return collection(getDb(), "organizations", orgId, "fields");
}

function fieldRef(scope) {
  if (scope.orgId) {
    return doc(getDb(), "organizations", scope.orgId, "fields", scope.fieldId);
  }
  return doc(getDb(), "users", scope.uid, "fields", scope.fieldId);
}

export function parseFieldScope(field) {
  if (!field) return null;
  if (field.orgId) {
    return { orgId: field.orgId, fieldId: field.id, uid: field.createdBy || null };
  }
  return { uid: field.ownerUid || field._ownerUid, fieldId: field.id, orgId: null };
}

async function resolveContext(uid) {
  const meta = await getUserMeta(uid);
  const orgId = meta?.orgId || null;
  let org = null;
  let role = "viewer";
  if (orgId) {
    org = await getOrganization(orgId);
    role = normalizeOrgRole(meta?.orgRole, { isOwner: org?.ownerUid === uid });
  }
  return { meta, orgId, org, role };
}

export async function listFields(uid) {
  const { orgId, role } = await resolveContext(uid);
  const personalQ = query(personalFieldsCol(uid), orderBy("createdAt", "desc"));
  const personalSnap = await getDocs(personalQ);
  const personal = personalSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    ownerUid: uid,
    _ownerUid: uid,
    scope: "personal",
  }));

  if (!orgId) return personal;

  try {
    const orgQ = query(orgFieldsCol(orgId), orderBy("createdAt", "desc"));
    const orgSnap = await getDocs(orgQ);
    const orgFields = orgSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      orgId,
      scope: "org",
      orgRole: role,
    }));
    // Org fields first for FPO users, then personal
    return [...orgFields, ...personal];
  } catch {
    return personal;
  }
}

export async function getField(uid, fieldId, hint = {}) {
  // Try org field first when orgId hint or user belongs to org
  const { orgId } = await resolveContext(uid);
  const tryOrg = hint.orgId || orgId;
  if (tryOrg) {
    const ref = doc(getDb(), "organizations", tryOrg, "fields", fieldId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const { role } = await resolveContext(uid);
      return { id: snap.id, ...snap.data(), orgId: tryOrg, scope: "org", orgRole: role };
    }
  }
  const pref = doc(getDb(), "users", uid, "fields", fieldId);
  const ps = await getDoc(pref);
  if (ps.exists()) {
    return { id: ps.id, ...ps.data(), ownerUid: uid, _ownerUid: uid, scope: "personal" };
  }
  return null;
}

function buildPayload(uid, data, { orgId = null } = {}) {
  const payload = {
    name: String(data.name || "Untitled field").trim(),
    lat: Number(data.lat),
    lon: Number(data.lon),
    cropType: String(data.cropType || "").trim() || null,
    bbox: data.bbox || null,
    createdBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (orgId) {
    payload.orgId = orgId;
    payload.ownerUid = uid;
  }
  if (!Number.isFinite(payload.lat) || !Number.isFinite(payload.lon)) {
    throw new Error("Valid latitude and longitude are required.");
  }
  if (payload.lat < -90 || payload.lat > 90 || payload.lon < -180 || payload.lon > 180) {
    throw new Error("Coordinates out of range.");
  }
  return payload;
}

/** Create field — org members with write access create org fields by default. */
export async function createField(uid, data) {
  const { orgId, role } = await resolveContext(uid);
  const preferOrg = data.scope !== "personal" && orgId && canWriteFields(role);

  if (preferOrg) {
    const payload = buildPayload(uid, data, { orgId });
    const ref = await addDoc(orgFieldsCol(orgId), payload);
    return { id: ref.id, ...payload, orgId, scope: "org", orgRole: role };
  }

  const payload = buildPayload(uid, data);
  const ref = await addDoc(personalFieldsCol(uid), payload);
  return { id: ref.id, ...payload, ownerUid: uid, _ownerUid: uid, scope: "personal" };
}

export async function updateField(uid, fieldId, data, hint = {}) {
  const field = await getField(uid, fieldId, hint);
  if (!field) throw new Error("Field not found.");
  if (field.orgId && !canWriteFields(field.orgRole)) {
    throw new Error("Your role cannot edit organization fields.");
  }
  const ref = field.orgId
    ? doc(getDb(), "organizations", field.orgId, "fields", fieldId)
    : doc(getDb(), "users", uid, "fields", fieldId);
  const { scope, orgRole, _ownerUid, ownerUid, ...patch } = data;
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
}

export async function deleteField(uid, fieldId, hint = {}) {
  const field = await getField(uid, fieldId, hint);
  if (!field) throw new Error("Field not found.");
  if (field.orgId && !canDeleteFields(field.orgRole)) {
    throw new Error("Your role cannot delete organization fields.");
  }
  if (field.orgId) {
    await deleteDoc(doc(getDb(), "organizations", field.orgId, "fields", fieldId));
  } else {
    await deleteDoc(doc(getDb(), "users", uid, "fields", fieldId));
  }
}

export async function createFieldsBulk(uid, rows, onProgress) {
  const created = [];
  const failed = [];
  for (let i = 0; i < rows.length; i++) {
    try {
      const field = await createField(uid, rows[i]);
      created.push(field);
    } catch (err) {
      failed.push({ row: rows[i], error: err?.message || "failed" });
    }
    onProgress?.(i + 1, rows.length);
  }
  return { created, failed };
}

export { fieldRef, parseFieldScope };
