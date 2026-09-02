/**
 * Farmer collaboration: friends, requests, chat, field sharing.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  arrayUnion,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getDb } from "./firebase-db.js";

function db() {
  return getDb();
}

export async function ensurePublicProfile(user) {
  if (!user?.uid) return;
  const ref = doc(db(), "profiles", user.uid);
  await setDoc(
    ref,
    {
      uid: user.uid,
      displayName: user.displayName || user.email?.split("@")[0] || "Farmer",
      email: user.email || "",
      emailLower: (user.email || "").toLowerCase(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function findProfileByEmail(email) {
  const emailLower = String(email || "").trim().toLowerCase();
  if (!emailLower) return null;
  const q = query(collection(db(), "profiles"), where("emailLower", "==", emailLower), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function getProfile(uid) {
  const snap = await getDoc(doc(db(), "profiles", uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function listFriends(uid) {
  const snap = await getDocs(collection(db(), "users", uid, "friends"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function sendFriendRequest(fromUser, toEmail) {
  const target = await findProfileByEmail(toEmail);
  if (!target) throw new Error("No PrithviScan user found with that email.");
  if (target.uid === fromUser.uid) throw new Error("You can't add yourself.");

  // Already friends?
  const existingFriend = await getDoc(doc(db(), "users", fromUser.uid, "friends", target.uid));
  if (existingFriend.exists()) throw new Error("You're already friends.");

  // Pending request either direction?
  const q1 = query(
    collection(db(), "friendRequests"),
    where("fromUid", "==", fromUser.uid),
    where("toUid", "==", target.uid),
    where("status", "==", "pending"),
    limit(1)
  );
  const q2 = query(
    collection(db(), "friendRequests"),
    where("fromUid", "==", target.uid),
    where("toUid", "==", fromUser.uid),
    where("status", "==", "pending"),
    limit(1)
  );
  const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  if (!s1.empty || !s2.empty) throw new Error("A friend request is already pending.");

  const ref = await addDoc(collection(db(), "friendRequests"), {
    fromUid: fromUser.uid,
    fromName: fromUser.displayName || fromUser.email || "Farmer",
    fromEmail: fromUser.email || "",
    toUid: target.uid,
    toName: target.displayName || target.email || "Farmer",
    toEmail: target.email || "",
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, toUid: target.uid };
}

export async function listIncomingRequests(uid) {
  const q = query(
    collection(db(), "friendRequests"),
    where("toUid", "==", uid),
    where("status", "==", "pending")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listOutgoingRequests(uid) {
  const q = query(
    collection(db(), "friendRequests"),
    where("fromUid", "==", uid),
    where("status", "==", "pending")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function respondFriendRequest(requestId, accept, currentUser) {
  const ref = doc(db(), "friendRequests", requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Request not found.");
  const req = snap.data();
  if (req.toUid !== currentUser.uid) throw new Error("Not your request.");
  if (req.status !== "pending") throw new Error("Request already handled.");

  if (!accept) {
    await updateDoc(ref, { status: "declined", respondedAt: serverTimestamp() });
    return;
  }

  const a = req.fromUid;
  const b = req.toUid;
  const aProfile = await getProfile(a);
  const bProfile = await getProfile(b);

  await setDoc(doc(db(), "users", a, "friends", b), {
    uid: b,
    displayName: bProfile?.displayName || req.toName,
    email: bProfile?.email || req.toEmail,
    since: serverTimestamp(),
  });
  await setDoc(doc(db(), "users", b, "friends", a), {
    uid: a,
    displayName: aProfile?.displayName || req.fromName,
    email: aProfile?.email || req.fromEmail,
    since: serverTimestamp(),
  });

  // Ensure DM conversation exists
  const chatId = dmId(a, b);
  await setDoc(
    doc(db(), "conversations", chatId),
    {
      type: "dm",
      memberIds: [a, b].sort(),
      createdBy: a,
      createdAt: serverTimestamp(),
      lastMessage: "You're now friends — say hello!",
      lastAt: serverTimestamp(),
    },
    { merge: true }
  );

  await updateDoc(ref, { status: "accepted", respondedAt: serverTimestamp() });
}

export async function removeFriend(uid, friendUid) {
  await deleteFieldSharesBetween(uid, friendUid);
  await deleteDoc(doc(db(), "users", uid, "friends", friendUid));
  await deleteDoc(doc(db(), "users", friendUid, "friends", uid)).catch(() => {});
}

/** Remove all field shares in either direction between two users. */
export async function deleteFieldSharesBetween(uidA, uidB) {
  if (!uidA || !uidB || uidA === uidB) return 0;

  const queries = [
    query(
      collection(db(), "fieldShares"),
      where("ownerUid", "==", uidA),
      where("sharedWithUid", "==", uidB)
    ),
    query(
      collection(db(), "fieldShares"),
      where("ownerUid", "==", uidB),
      where("sharedWithUid", "==", uidA)
    ),
  ];

  const snaps = await Promise.all(queries.map((q) => getDocs(q)));
  const ids = new Set();
  for (const snap of snaps) {
    for (const d of snap.docs) ids.add(d.id);
  }

  await Promise.all(
    [...ids].map((id) => deleteDoc(doc(db(), "fieldShares", id)).catch(() => {}))
  );
  return ids.size;
}

export function dmId(a, b) {
  return `dm_${[a, b].sort().join("_")}`;
}

export async function listConversations(uid) {
  const q = query(
    collection(db(), "conversations"),
    where("memberIds", "array-contains", uid),
    orderBy("lastAt", "desc"),
    limit(40)
  );
  try {
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    // Fallback if composite index missing
    const q2 = query(collection(db(), "conversations"), where("memberIds", "array-contains", uid), limit(40));
    const snap = await getDocs(q2);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.lastAt?.seconds || 0) - (a.lastAt?.seconds || 0));
  }
}

export async function createGroup(creator, name, memberUids) {
  const members = Array.from(new Set([creator.uid, ...memberUids]));
  if (members.length < 2) throw new Error("Add at least one friend to the group.");
  const ref = await addDoc(collection(db(), "conversations"), {
    type: "group",
    name: String(name || "Farm group").trim() || "Farm group",
    memberIds: members,
    createdBy: creator.uid,
    createdAt: serverTimestamp(),
    lastMessage: `${creator.displayName || "Someone"} created the group`,
    lastAt: serverTimestamp(),
  });
  return { id: ref.id };
}

export function listenMessages(chatId, onData, onError) {
  const q = query(
    collection(db(), "conversations", chatId, "messages"),
    orderBy("createdAt", "asc"),
    limit(200)
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export async function sendMessage(chatId, user, text) {
  const body = String(text || "").trim();
  if (!body) throw new Error("Message is empty.");
  if (body.length > 2000) throw new Error("Message too long.");

  await addDoc(collection(db(), "conversations", chatId, "messages"), {
    text: body,
    senderId: user.uid,
    senderName: user.displayName || user.email || "Farmer",
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db(), "conversations", chatId), {
    lastMessage: body.slice(0, 140),
    lastAt: serverTimestamp(),
  });
}

export async function shareFieldWithFriend(owner, field, friendUid, note = "") {
  if (!field?.id) throw new Error("Pick a field to share.");
  const friend = await getProfile(friendUid);
  if (!friend) throw new Error("Friend profile not found.");

  const ref = await addDoc(collection(db(), "fieldShares"), {
    ownerUid: owner.uid,
    ownerName: owner.displayName || owner.email || "Farmer",
    sharedWithUid: friendUid,
    sharedWithName: friend.displayName || friend.email || "Farmer",
    fieldId: field.id,
    fieldName: field.name || "Untitled field",
    lat: field.lat,
    lon: field.lon,
    cropType: field.cropType || null,
    note: String(note || "").trim().slice(0, 500),
    createdAt: serverTimestamp(),
  });

  // Notify via DM
  const chatId = dmId(owner.uid, friendUid);
  await setDoc(
    doc(db(), "conversations", chatId),
    {
      type: "dm",
      memberIds: [owner.uid, friendUid].sort(),
      createdBy: owner.uid,
      createdAt: serverTimestamp(),
      lastMessage: `Shared field: ${field.name || "Untitled"}`,
      lastAt: serverTimestamp(),
    },
    { merge: true }
  );
  await addDoc(collection(db(), "conversations", chatId, "messages"), {
    text: `📍 Shared field “${field.name || "Untitled"}” (${Number(field.lat).toFixed(4)}, ${Number(field.lon).toFixed(4)})${field.cropType ? ` · ${field.cropType}` : ""}${note ? `\n${note}` : ""}`,
    senderId: owner.uid,
    senderName: owner.displayName || owner.email || "Farmer",
    kind: "field_share",
    fieldShareId: ref.id,
    createdAt: serverTimestamp(),
  });

  return { id: ref.id };
}

export async function listSharesWithMe(uid) {
  const q = query(
    collection(db(), "fieldShares"),
    where("sharedWithUid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  try {
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const q2 = query(collection(db(), "fieldShares"), where("sharedWithUid", "==", uid), limit(50));
    const snap = await getDocs(q2);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}

export async function listSharesByMe(uid) {
  const q = query(collection(db(), "fieldShares"), where("ownerUid", "==", uid), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addMembersToGroup(chatId, uids) {
  const ref = doc(db(), "conversations", chatId);
  await updateDoc(ref, { memberIds: arrayUnion(...uids) });
}
