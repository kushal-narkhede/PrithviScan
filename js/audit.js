/**
 * Field action audit trail — append-only events for org and personal fields.
 */

import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getDb } from "./firebase-db.js";

function eventsCol({ orgId, uid, fieldId }) {
  if (orgId) {
    return collection(getDb(), "organizations", orgId, "fieldEvents");
  }
  return collection(getDb(), "users", uid, "fields", fieldId, "events");
}

export async function recordFieldEvent({ orgId, uid, fieldId, type, payload = {} }) {
  if (!type) return null;
  if (!orgId && (!uid || !fieldId)) return null;
  const ref = await addDoc(eventsCol({ orgId, uid, fieldId }), {
    type,
    fieldId: fieldId || null,
    orgId: orgId || null,
    actorUid: uid,
    payload,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listFieldEvents({ orgId, uid, fieldId }, max = 80) {
  if (!orgId && (!uid || !fieldId)) return [];
  const q = query(eventsCol({ orgId, uid, fieldId }), orderBy("createdAt", "desc"), limit(max));
  try {
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const snap = await getDocs(query(eventsCol({ orgId, uid, fieldId }), limit(max)));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }
}

export function formatEventLabel(ev) {
  const map = {
    "alert.acknowledged": "Alert acknowledged",
    "alert.created": "Alert created",
    "task.created": "Task created",
    "task.completed": "Task completed",
    "insight.generated": "Insight generated",
    "boundary.saved": "Boundary saved",
    "feedback.submitted": "Feedback submitted",
  };
  return map[ev.type] || ev.type || "Event";
}

export function eventsToCsv(events) {
  const header = "id,type,fieldId,actorUid,createdAt,payload\n";
  const rows = events.map((e) => {
    const created = e.createdAt?.toDate?.()?.toISOString?.() || "";
    const payload = JSON.stringify(e.payload || {}).replace(/"/g, '""');
    return `"${e.id}","${e.type}","${e.fieldId || ""}","${e.actorUid || ""}","${created}","${payload}"`;
  });
  return header + rows.join("\n");
}
