/**
 * Moderated community feed on Collaborate.
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

function postsCol() {
  return collection(getDb(), "communityPosts");
}

export async function listCommunityPosts(max = 40) {
  const q = query(postsCol(), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createCommunityPost(user, { body, kind = "update" } = {}) {
  const text = String(body || "").trim().slice(0, 800);
  if (!text) throw new Error("Write something to post.");
  // Light moderation
  const banned = /\b(kill|hate|spam)\b/i;
  if (banned.test(text)) throw new Error("Post blocked by community moderation.");
  const ref = await addDoc(postsCol(), {
    body: text,
    kind: String(kind || "update").slice(0, 40),
    authorUid: user.uid,
    authorName: user.displayName || user.email || "Farmer",
    status: "visible",
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, body: text };
}
