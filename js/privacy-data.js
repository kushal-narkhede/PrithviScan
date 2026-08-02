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

export async function exportAccountBundle(uid) {
  const meta = await getUserMeta(uid);
  const fields = await listFields(uid);
  const alertsSnap = await getDocs(
    query(collection(getDb(), "users", uid, "alerts"), limit(100))
  );
  const alerts = alertsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  let org = null;
  if (meta?.orgId) org = await getOrganization(meta.orgId);

  return {
    exportedAt: new Date().toISOString(),
    userId: uid,
    meta,
    organization: org
      ? { id: org.id, name: org.name, role: meta?.orgRole, memberCount: org.memberIds?.length }
      : null,
    fields: fields.map((f) => ({
      id: f.id,
      name: f.name,
      lat: f.lat,
      lon: f.lon,
      cropType: f.cropType,
      sownAt: f.sownAt || null,
      orgId: f.orgId || null,
      lastInsight: f.lastInsight || null,
      healthNdvi: f.healthNdvi ?? null,
    })),
    alerts,
    note: "Personal data export for your records. Organization-owned fields remain with the org.",
  };
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
