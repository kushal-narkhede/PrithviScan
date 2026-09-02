/**
 * Task templates and recurrences for Action Center.
 */

import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getDb } from "./firebase-db.js";
import { createTask } from "./tasks.js";
import { recordFieldEvent } from "./audit.js";

function templatesCol(orgId) {
  return collection(getDb(), "organizations", orgId, "taskTemplates");
}

function recurrencesCol(orgId) {
  return collection(getDb(), "organizations", orgId, "recurrences");
}

export async function listTaskTemplates(orgId) {
  if (!orgId) return [];
  const q = query(templatesCol(orgId), orderBy("createdAt", "desc"), limit(40));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveTaskTemplate(orgId, actor, data) {
  if (!orgId) throw new Error("Organization required.");
  const body = {
    name: String(data.name || "Untitled template").trim().slice(0, 80),
    type: data.type || "other",
    title: String(data.title || data.name || "Task").trim().slice(0, 120),
    note: String(data.note || "").trim().slice(0, 500),
    defaultAssigneeUid: data.defaultAssigneeUid || actor.uid,
    defaultAssigneeName: data.defaultAssigneeName || actor.displayName || "Member",
    checklist: Array.isArray(data.checklist) ? data.checklist.map((c) => String(c).slice(0, 120)) : [],
    durationMinutes: Number(data.durationMinutes) || null,
    createdBy: actor.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(templatesCol(orgId), body);
  return { id: ref.id, ...body };
}

export async function updateTaskTemplate(orgId, templateId, patch) {
  const ref = doc(getDb(), "organizations", orgId, "taskTemplates", templateId);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
}

export async function deleteTaskTemplate(orgId, templateId) {
  await deleteDoc(doc(getDb(), "organizations", orgId, "taskTemplates", templateId));
}

export async function createTaskFromTemplate(orgId, actor, templateId, field, actorRole) {
  const snap = await getDoc(doc(getDb(), "organizations", orgId, "taskTemplates", templateId));
  if (!snap.exists()) throw new Error("Template not found.");
  const t = snap.data();
  const task = await createTask(
    orgId,
    actor,
    {
      type: t.type,
      title: t.title || t.name,
      fieldId: field?.id || null,
      fieldName: field?.name || null,
      assigneeUid: t.defaultAssigneeUid || actor.uid,
      assigneeName: t.defaultAssigneeName || actor.displayName || "Member",
      note: t.note || "",
      checklist: t.checklist || [],
      templateId,
    },
    actorRole
  );
  if (field?.id) {
    await recordFieldEvent({
      orgId,
      uid: actor.uid,
      fieldId: field.id,
      type: "task.created",
      payload: { templateId, taskId: task.id },
    });
  }
  return task;
}

export async function listRecurrences(orgId) {
  if (!orgId) return [];
  const snap = await getDocs(query(recurrencesCol(orgId), limit(30)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveRecurrence(orgId, actor, data) {
  if (!orgId) throw new Error("Organization required.");
  const freq = data.frequency || "weekly";
  const rrule = freq === "daily" ? "FREQ=DAILY" : `FREQ=WEEKLY;BYDAY=${data.weekday || "MO"}`;
  const next = new Date();
  next.setDate(next.getDate() + (freq === "daily" ? 1 : 7));

  const body = {
    templateId: data.templateId,
    fieldIds: data.fieldIds === "all" ? "all" : data.fieldIds || [],
    rrule,
    frequency: freq,
    timezone: data.timezone || "Asia/Kolkata",
    active: data.active !== false,
    nextRunAt: next.toISOString(),
    createdBy: actor.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(recurrencesCol(orgId), body);
  return { id: ref.id, ...body };
}

export async function toggleRecurrence(orgId, recurrenceId, active) {
  await updateDoc(doc(getDb(), "organizations", orgId, "recurrences", recurrenceId), {
    active: Boolean(active),
    updatedAt: serverTimestamp(),
  });
}
