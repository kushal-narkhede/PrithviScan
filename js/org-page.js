import { watchAuth, isFirebaseConfigured } from "./auth.js";
import {
  getUserMeta,
  getOrganization,
  listOrgMembers,
  addOrgMemberByEmail,
  removeOrgMember,
  createOrgInvite,
  listPendingInvitesForOrg,
  saveAccountMeta,
  claimOrgInvites,
} from "./org.js";
import "./nav-auth.js";

const gate = document.getElementById("orgGate");
const content = document.getElementById("orgContent");
const summary = document.getElementById("orgSummary");
const membersCard = document.getElementById("orgMembersCard");
const memberList = document.getElementById("orgMemberList");
const ownerTools = document.getElementById("orgOwnerTools");
const createCard = document.getElementById("orgCreateCard");
const inviteForm = document.getElementById("orgInviteForm");
const inviteStatus = document.getElementById("orgInviteStatus");
const pendingEl = document.getElementById("orgPendingInvites");
const createForm = document.getElementById("orgCreateForm");
const createStatus = document.getElementById("orgCreateStatus");

let currentUser = null;
let currentOrg = null;
let currentMeta = null;

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setInviteStatus(msg, type = "") {
  if (!inviteStatus) return;
  inviteStatus.textContent = msg || "";
  inviteStatus.className = `org-status${type ? ` is-${type}` : ""}`;
}

function setCreateStatus(msg, type = "") {
  if (!createStatus) return;
  createStatus.textContent = msg || "";
  createStatus.className = `org-status${type ? ` is-${type}` : ""}`;
}

async function refresh() {
  if (!currentUser) return;

  await claimOrgInvites(currentUser).catch(() => null);
  currentMeta = await getUserMeta(currentUser.uid);
  currentOrg = currentMeta?.orgId ? await getOrganization(currentMeta.orgId) : null;

  if (!currentOrg) {
    summary.innerHTML = `
      <h2>No organization yet</h2>
      <p class="muted">
        Individual accounts work fine, but most users join a farm group, FPO, or family holding.
        Create one below, or ask your organization owner to invite your email.
      </p>
    `;
    membersCard.hidden = true;
    ownerTools.hidden = true;
    createCard.hidden = false;
    return;
  }

  createCard.hidden = true;
  const isOwner = currentOrg.ownerUid === currentUser.uid;
  summary.innerHTML = `
    <h2>${esc(currentOrg.name)}</h2>
    <dl class="org-meta">
      <dt>Your role</dt>
      <dd>${isOwner ? "Owner" : "Member"}</dd>
      <dt>Members</dt>
      <dd>${(currentOrg.memberIds || []).length}</dd>
    </dl>
  `;

  const members = await listOrgMembers(currentOrg);
  membersCard.hidden = false;
  memberList.innerHTML = members
    .map(
      (m) => `
    <li>
      <div>
        <strong>${esc(m.displayName)}</strong>
        <span>${esc(m.email)}</span>
        <span class="org-role">${esc(m.orgRole)}</span>
      </div>
      ${
        isOwner && m.uid !== currentOrg.ownerUid
          ? `<button type="button" class="btn-ghost" data-remove="${esc(m.uid)}">Remove</button>`
          : ""
      }
    </li>`
    )
    .join("");

  memberList.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Remove this member from the organization?")) return;
      try {
        await removeOrgMember(currentUser, currentOrg.id, btn.dataset.remove);
        await refresh();
      } catch (err) {
        alert(err.message || "Could not remove member.");
      }
    });
  });

  ownerTools.hidden = !isOwner;
  if (isOwner) {
    const invites = await listPendingInvitesForOrg(currentOrg.id);
    pendingEl.innerHTML = invites.length
      ? `<div class="org-pending"><h3>Pending invites</h3><ul>${invites
          .map((i) => `<li>${esc(i.emailLower)}</li>`)
          .join("")}</ul></div>`
      : "";
  }
}

inviteForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser || !currentOrg) return;
  const email = document.getElementById("orgInviteEmail").value.trim();
  setInviteStatus("Adding…");
  try {
    const result = await createOrgInvite(currentUser, currentOrg.id, email);
    if (result?.invited) {
      setInviteStatus(`Invite pending for ${email}. They’ll join when they create an account.`, "ok");
    } else {
      setInviteStatus(`Added ${result.displayName || email} to your organization.`, "ok");
    }
    inviteForm.reset();
    await refresh();
  } catch (err) {
    setInviteStatus(err.message || "Could not add member.", "error");
  }
});

createForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  const name = document.getElementById("orgCreateName").value.trim();
  setCreateStatus("Creating…");
  try {
    await saveAccountMeta(currentUser, { accountType: "organization", orgName: name });
    setCreateStatus("Organization created.", "ok");
    await refresh();
  } catch (err) {
    setCreateStatus(err.message || "Could not create organization.", "error");
  }
});

watchAuth(async (user) => {
  currentUser = user;
  if (!user) {
    gate.hidden = false;
    content.hidden = true;
    return;
  }
  if (!isFirebaseConfigured()) {
    gate.innerHTML = `<p>Firebase is not configured.</p>`;
    return;
  }
  gate.hidden = true;
  content.hidden = false;
  await refresh();
});
