/**
 * Org Action Center — irrigate / spray / scout / harvest jobs.
 */

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getDb } from "./firebase-db.js";
import { canAssignTasks } from "./org-roles.js";

export const TASK_TYPES = [
  { id: "irrigate", label: "Irrigate" },
  { id: "spray", label: "Spray" },
  { id: "scout", label: "Scout" },
  { id: "harvest", label: "Harvest" },
  { id: "other", label: "Other" },
];

function tasksCol(orgId) {
  return collection(getDb(), "organizations", orgId, "tasks");
}

export async function listOrgTasks(orgId, max = 40) {
  if (!orgId) return [];
  const q = query(tasksCol(orgId), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listMyOpenTasks(orgId, uid) {
  if (!orgId || !uid) return [];
  const all = await listOrgTasks(orgId, 60);
  return all.filter((t) => t.assigneeUid === uid && t.status === "open");
}

export async function createTask(orgId, actor, payload, actorRole) {
  if (!canAssignTasks(actorRole) && actorRole !== "scout") {
    // Scouts can create scout jobs for themselves
    if (payload.type !== "scout") throw new Error("Your role cannot assign this task.");
  }
  const body = {
    type: payload.type || "other",
    title: String(payload.title || payload.type || "Task").trim().slice(0, 120),
    fieldId: payload.fieldId || null,
    fieldName: payload.fieldName || null,
    orgId,
    assigneeUid: payload.assigneeUid || actor.uid,
    assigneeName: payload.assigneeName || actor.displayName || "Member",
    dueAt: payload.dueAt || null,
    status: "open",
    note: String(payload.note || "").trim().slice(0, 500),
    checklist: Array.isArray(payload.checklist) ? payload.checklist : [],
    templateId: payload.templateId || null,
    sourceAlertId: payload.sourceAlertId || null,
    createdBy: actor.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(tasksCol(orgId), body);
  return { id: ref.id, ...body };
}

export async function completeTask(orgId, taskId, actorUid = null) {
  await updateDoc(doc(getDb(), "organizations", orgId, "tasks", taskId), {
    status: "done",
    completedAt: serverTimestamp(),
    completedBy: actorUid || null,
    updatedAt: serverTimestamp(),
  });
}
