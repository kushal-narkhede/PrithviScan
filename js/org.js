/**
 * Farm organizations — owner creates org, invites members by email.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getDb } from "./firebase-db.js";
import { findProfileByEmail, getProfile, ensurePublicProfile } from "./collab.js";
import { normalizeOrgRole, canManageMembers, ORG_ROLES } from "./org-roles.js";

export { ORG_ROLES, normalizeOrgRole, canManageMembers };

function db() {
  return getDb();
}

function orgIdFromName(name, uid) {
  const slug = String(name || "org")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${slug || "org"}-${uid.slice(0, 8)}`;
}

/** Persist account type on user + profile after signup / Google join flow */
export async function saveAccountMeta(user, { accountType, orgName, orgId } = {}) {
  if (!user?.uid) return;
  await ensurePublicProfile(user);
  const type = accountType === "organization" ? "organization" : "individual";
  const userRef = doc(db(), "users", user.uid);
  const profileRef = doc(db(), "profiles", user.uid);

  const userPatch = {
    accountType: type,
    updatedAt: serverTimestamp(),
  };
  const profilePatch = {
    uid: user.uid,
    accountType: type,
    email: user.email || "",
    emailLower: (user.email || "").toLowerCase(),
    displayName: user.displayName || user.email?.split("@")[0] || "Farmer",
    updatedAt: serverTimestamp(),
  };

  if (type === "organization" && orgName) {
    const id = orgId || orgIdFromName(orgName, user.uid);
    const orgRef = doc(db(), "organizations", id);
    const existing = await getDoc(orgRef);
    if (!existing.exists()) {
      await setDoc(orgRef, {
        id,
        name: orgName.trim(),
        ownerUid: user.uid,
        memberIds: [user.uid],
        pendingEmails: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    userPatch.orgId = id;
    userPatch.orgRole = "owner";
    profilePatch.orgId = id;
    profilePatch.orgRole = "owner";
    profilePatch.orgName = orgName.trim();
  }

  await setDoc(userRef, userPatch, { merge: true });
  await setDoc(profileRef, profilePatch, { merge: true });
  return userPatch;
}

export async function getUserMeta(uid) {
  const snap = await getDoc(doc(db(), "users", uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getOrganization(orgId) {
  if (!orgId) return null;
  const snap = await getDoc(doc(db(), "organizations", orgId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function listOrgMembers(org) {
  if (!org?.memberIds?.length) return [];
  const members = await Promise.all(
    org.memberIds.map(async (uid) => {
      const p = await getProfile(uid);
      return {
        uid,
        displayName: p?.displayName || "Member",
        email: p?.email || "",
        orgRole: normalizeOrgRole(uid === org.ownerUid ? "owner" : p?.orgRole || "scout", {
          isOwner: uid === org.ownerUid,
        }),
      };
    })
  );
  return members;
}

/** Owner sets a member role: agronomist | scout | viewer */
export async function setOrgMemberRole(ownerUser, orgId, memberUid, role) {
  const org = await getOrganization(orgId);
  if (!org) throw new Error("Organization not found.");
  if (org.ownerUid !== ownerUser.uid) throw new Error("Only the owner can change roles.");
  if (memberUid === org.ownerUid) throw new Error("Owner role cannot be changed.");
  if (!org.memberIds?.includes(memberUid)) throw new Error("Not a member of this organization.");

  const next = normalizeOrgRole(role);
  if (next === "owner") throw new Error("Cannot assign owner this way.");

  await updateDoc(doc(db(), "users", memberUid), {
    orgRole: next,
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(db(), "profiles", memberUid), {
    orgRole: next,
    updatedAt: serverTimestamp(),
  });
  return next;
}

/** Owner adds an existing PrithviScan user to the organization by email */
export async function addOrgMemberByEmail(ownerUser, orgId, email) {
  const org = await getOrganization(orgId);
  if (!org) throw new Error("Organization not found.");
  if (org.ownerUid !== ownerUser.uid) throw new Error("Only the organization owner can add people.");

  const target = await findProfileByEmail(email);
  if (!target) throw new Error("No PrithviScan account with that email. Ask them to sign up first.");
  if (org.memberIds?.includes(target.uid)) throw new Error("That person is already in your organization.");

  if (target.orgId && target.orgId !== orgId) {
    throw new Error("That account already belongs to another organization.");
  }

  await updateDoc(doc(db(), "organizations", orgId), {
    memberIds: arrayUnion(target.uid),
    updatedAt: serverTimestamp(),
  });

  // Owner may only patch membership fields on another user's docs (see firestore.rules)
  try {
    await updateDoc(doc(db(), "users", target.uid), {
      accountType: "organization",
      orgId,
      orgRole: "scout",
      updatedAt: serverTimestamp(),
    });
  } catch {
    // User meta doc may not exist yet — org membership still holds via organizations.memberIds
  }

  await updateDoc(doc(db(), "profiles", target.uid), {
    accountType: "organization",
    orgId,
    orgRole: "scout",
    orgName: org.name,
    updatedAt: serverTimestamp(),
  });

  return target;
}

export async function removeOrgMember(ownerUser, orgId, memberUid) {
  const org = await getOrganization(orgId);
  if (!org) throw new Error("Organization not found.");
  if (org.ownerUid !== ownerUser.uid) throw new Error("Only the owner can remove members.");
  if (memberUid === org.ownerUid) throw new Error("You can't remove the owner.");

  await updateDoc(doc(db(), "organizations", orgId), {
    memberIds: arrayRemove(memberUid),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db(), "users", memberUid), {
    orgId: null,
    orgRole: null,
    accountType: "individual",
    updatedAt: serverTimestamp(),
  });

  await updateDoc(doc(db(), "profiles", memberUid), {
    orgId: null,
    orgRole: null,
    orgName: null,
    accountType: "individual",
    updatedAt: serverTimestamp(),
  });
}

/** Pending invite for users who don't have an account yet — owner creates, invitee accepts after signup */
export async function createOrgInvite(ownerUser, orgId, email) {
  const org = await getOrganization(orgId);
  if (!org) throw new Error("Organization not found.");
  if (org.ownerUid !== ownerUser.uid) throw new Error("Only the owner can invite.");

  const emailLower = String(email || "").trim().toLowerCase();
  if (!emailLower || !emailLower.includes("@")) throw new Error("Enter a valid email.");

  const existing = await findProfileByEmail(emailLower);
  if (existing) {
    return addOrgMemberByEmail(ownerUser, orgId, emailLower);
  }

  const q = query(
    collection(db(), "orgInvites"),
    where("orgId", "==", orgId),
    where("emailLower", "==", emailLower),
    where("status", "==", "pending"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (!snap.empty) throw new Error("An invite is already pending for that email.");

  await updateDoc(doc(db(), "organizations", orgId), {
    pendingEmails: arrayUnion(emailLower),
    updatedAt: serverTimestamp(),
  });

  const ref = doc(collection(db(), "orgInvites"));
  await setDoc(ref, {
    id: ref.id,
    orgId,
    orgName: org.name,
    emailLower,
    fromUid: ownerUser.uid,
    fromName: ownerUser.displayName || ownerUser.email || "Owner",
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return { invited: true, emailLower };
}

export async function listPendingInvitesForOrg(orgId) {
  const q = query(
    collection(db(), "orgInvites"),
    where("orgId", "==", orgId),
    where("status", "==", "pending"),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** After signup, claim any pending org invites for this email */
export async function claimOrgInvites(user) {
  if (!user?.email) return null;
  const emailLower = user.email.toLowerCase();
  const q = query(
    collection(db(), "orgInvites"),
    where("emailLower", "==", emailLower),
    where("status", "==", "pending"),
    limit(5)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const invite = snap.docs[0].data();
  const org = await getOrganization(invite.orgId);
  if (!org) {
    await updateDoc(doc(db(), "orgInvites", snap.docs[0].id), { status: "expired" });
    return null;
  }

  await updateDoc(doc(db(), "organizations", invite.orgId), {
    memberIds: arrayUnion(user.uid),
    pendingEmails: arrayRemove(emailLower),
    updatedAt: serverTimestamp(),
  });

  await setDoc(
    doc(db(), "users", user.uid),
    {
      accountType: "organization",
      orgId: invite.orgId,
      orgRole: "scout",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await setDoc(
    doc(db(), "profiles", user.uid),
    {
      uid: user.uid,
      accountType: "organization",
      orgId: invite.orgId,
      orgRole: "scout",
      orgName: org.name,
      email: user.email || "",
      emailLower,
      displayName: user.displayName || user.email?.split("@")[0] || "Farmer",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await updateDoc(doc(db(), "orgInvites", snap.docs[0].id), {
    status: "accepted",
    acceptedUid: user.uid,
    acceptedAt: serverTimestamp(),
  });

  return org;
}
