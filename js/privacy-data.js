/**
 * DPDP-minded account export + delete helpers.
 */

import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  query,
  limit,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getDb } from "./firebase-db.js";
import { listFields, deleteField } from "./fields.js";
import { getUserMeta, getOrganization } from "./org.js";
import { deleteUser } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirebaseAuth } from "./auth.js";

const PRIVACY_KEY = "prithvi_privacy_prefs";
const EXPORT_LOG_KEY = "prithvi_export_log";

export function loadPrivacyPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PRIVACY_KEY) || "{}");
  } catch {
    return {};
  }
}

export function savePrivacyPrefs(prefs) {
  localStorage.setItem(PRIVACY_KEY, JSON.stringify(prefs || {}));
  return prefs;
}

export function appendExportLog(entry) {
  const log = readExportLog();
  log.unshift({ ...entry, at: new Date().toISOString() });
  localStorage.setItem(EXPORT_LOG_KEY, JSON.stringify(log.slice(0, 50)));
}

export function readExportLog() {
  try {
    return JSON.parse(localStorage.getItem(EXPORT_LOG_KEY) || "[]");
  } catch {
    return [];
  }
}

export async function exportAccountBundle(uid, { anonymize = false } = {}) {
  const meta = await getUserMeta(uid);
  const fields = await listFields(uid);
  const alertsSnap = await getDocs(
    query(collection(getDb(), "users", uid, "alerts"), limit(100))
  );
  const alerts = alertsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  let org = null;
  if (meta?.orgId) org = await getOrganization(meta.orgId);

  const bundle = {
    exportedAt: new Date().toISOString(),
    userId: anonymize ? "redacted" : uid,
    meta: anonymize ? { orgId: meta?.orgId || null, orgRole: meta?.orgRole || null } : meta,
    organization: org
      ? { id: org.id, name: org.name, role: meta?.orgRole, memberCount: org.memberIds?.length }
      : null,
    fields: fields.map((f, i) => ({
      id: f.id,
      name: anonymize ? `Field ${i + 1}` : f.name,
      lat: anonymize ? Number(f.lat.toFixed(1)) : f.lat,
      lon: anonymize ? Number(f.lon.toFixed(1)) : f.lon,
      cropType: f.cropType,
      sownAt: f.sownAt || null,
      orgId: f.orgId || null,
      region: f.region || null,
      lastInsight: f.lastInsight || null,
      healthNdvi: f.healthNdvi ?? null,
    })),
    alerts: anonymize ? alerts.map((a) => ({ id: a.id, level: a.level, createdAt: a.createdAt })) : alerts,
    privacyPrefs: loadPrivacyPrefs(),
    note: "Personal data export for your records. Organization-owned fields remain with the org.",
  };
  appendExportLog({ type: "account_export", anonymize: Boolean(anonymize), fieldCount: fields.length });
  return bundle;
}

export function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Delete personal fields, profile, user meta — then Firebase Auth user. */
export async function deleteAccountData(user) {
  if (!user?.uid) throw new Error("Not signed in.");
  const uid = user.uid;
  const fields = await listFields(uid);
  for (const f of fields) {
    if (f.orgId) continue; // leave org-owned fields
    try {
      await deleteField(uid, f.id, { orgId: null });
    } catch {
      /* continue */
    }
  }

  const alertsSnap = await getDocs(collection(getDb(), "users", uid, "alerts"));
  for (const d of alertsSnap.docs) {
    await deleteDoc(d.ref).catch(() => {});
  }

  await deleteDoc(doc(getDb(), "profiles", uid)).catch(() => {});
  await deleteDoc(doc(getDb(), "users", uid)).catch(() => {});

  const auth = getFirebaseAuth();
  if (auth.currentUser) {
    await deleteUser(auth.currentUser);
  }
}
