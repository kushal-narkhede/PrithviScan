import { watchAuth, isFirebaseConfigured } from "./auth.js";
import { listFields } from "./fields.js";
import {
  ensurePublicProfile,
  sendFriendRequest,
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
  respondFriendRequest,
  removeFriend,
  listConversations,
  createGroup,
  listenMessages,
  sendMessage,
  dmId,
  shareFieldWithFriend,
  listSharesWithMe,
  listSharesByMe,
  getProfile,
} from "./collab.js";
import { listCommunityPosts, createCommunityPost } from "./community.js";

const statusEl = document.getElementById("collabStatus");
let currentUser = null;
let friends = [];
let fields = [];
let activeChatId = null;
let unsubMessages = null;

function setStatus(msg, type = "") {
  if (!statusEl) return;
  statusEl.textContent = msg || "";
  statusEl.className = `app-status${type ? ` is-${type}` : ""}`;
}

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function switchPanel(name) {
  document.querySelectorAll(".collab-tab").forEach((t) => {
    t.classList.toggle("is-active", t.dataset.panel === name);
  });
  document.querySelectorAll(".collab-panel").forEach((p) => {
    p.hidden = p.id !== `panel-${name}`;
  });
  if (name === "community") refreshCommunity();
}

async function refreshCommunity() {
  const feed = document.getElementById("communityFeed");
  if (!feed) return;
  try {
    const posts = await listCommunityPosts(40);
    feed.innerHTML = posts.length
      ? posts
          .map(
            (p) => `<article class="collab-list-item">
          <strong>${esc(p.authorName || "Farmer")}</strong>
          <span class="app-muted">${esc(p.kind || "update")}</span>
          <p>${esc(p.body)}</p>
        </article>`
          )
          .join("")
      : `<div class="collab-empty">No posts yet — be the first.</div>`;
  } catch {
    feed.innerHTML = `<div class="collab-empty">Could not load community (check Firestore rules for communityPosts).</div>`;
  }
}

document.querySelectorAll(".collab-tab").forEach((btn) => {
  btn.addEventListener("click", () => switchPanel(btn.dataset.panel));
});

async function refreshFriends() {
  friends = await listFriends(currentUser.uid);
  const incoming = await listIncomingRequests(currentUser.uid);
  const outgoing = await listOutgoingRequests(currentUser.uid);

  const reqEl = document.getElementById("requestsList");
  if (!incoming.length && !outgoing.length) {
    reqEl.innerHTML = `<div class="collab-empty">No pending requests</div>`;
  } else {
    reqEl.innerHTML = [
      ...incoming.map(
        (r) => `
        <div class="collab-row">
          <div>
            <strong>${esc(r.fromName || "Farmer")}</strong>
            <span>Incoming · ${esc(r.fromEmail || "")}</span>
          </div>
          <div class="collab-row-actions">
            <button type="button" class="collab-btn" data-accept="${esc(r.id)}">Accept</button>
            <button type="button" class="collab-btn collab-btn-danger" data-decline="${esc(r.id)}">Decline</button>
          </div>
        </div>`
      ),
      ...outgoing.map(
        (r) => `
        <div class="collab-row">
          <div>
            <strong>${esc(r.toName || "Farmer")}</strong>
            <span>Outgoing · pending</span>
          </div>
        </div>`
      ),
    ].join("");
  }

  reqEl.querySelectorAll("[data-accept]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await respondFriendRequest(btn.dataset.accept, true, currentUser);
        setStatus("Friend request accepted.", "ok");
        await refreshAll();
      } catch (err) {
        setStatus(err.message || "Could not accept.", "error");
      }
    });
  });
  reqEl.querySelectorAll("[data-decline]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await respondFriendRequest(btn.dataset.decline, false, currentUser);
        setStatus("Request declined.", "ok");
        await refreshFriends();
      } catch (err) {
        setStatus(err.message || "Could not decline.", "error");
      }
    });
  });

  const friendsEl = document.getElementById("friendsList");
  if (!friends.length) {
    friendsEl.innerHTML = `<div class="collab-empty">No friends yet — send a request to get started.</div>`;
  } else {
    friendsEl.innerHTML = friends
      .map(
        (f) => `
      <div class="collab-row">
        <div>
          <strong>${esc(f.displayName || "Farmer")}</strong>
          <span>${esc(f.email || "")}</span>
        </div>
        <div class="collab-row-actions">
          <button type="button" class="collab-btn collab-btn-ghost" data-chat="${esc(f.uid)}">Chat</button>
          <button type="button" class="collab-btn collab-btn-danger" data-unfriend="${esc(f.uid)}">Remove</button>
        </div>
      </div>`
      )
      .join("");
  }

  friendsEl.querySelectorAll("[data-chat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      switchPanel("chat");
      openChat(dmId(currentUser.uid, btn.dataset.chat));
    });
  });
  friendsEl.querySelectorAll("[data-unfriend]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Remove this friend? Any fields shared between you will also be removed.")) return;
      await removeFriend(currentUser.uid, btn.dataset.unfriend);
      setStatus("Friend removed.", "ok");
      await refreshAll();
    });
  });

  // populate selects
  const groupSel = document.getElementById("groupMembers");
  const shareFriend = document.getElementById("shareFriend");
  const opts = friends
    .map((f) => `<option value="${esc(f.uid)}">${esc(f.displayName || f.email || f.uid)}</option>`)
    .join("");
  if (groupSel) groupSel.innerHTML = opts || `<option disabled>Add friends first</option>`;
  if (shareFriend) {
    shareFriend.innerHTML = friends.length
      ? `<option value="">Select friend…</option>${opts}`
      : `<option value="">No friends yet</option>`;
  }
}

async function refreshChats(preferId) {
  const chats = await listConversations(currentUser.uid);
  const list = document.getElementById("chatList");
  if (!chats.length) {
    list.innerHTML = `<div class="collab-empty">No chats yet — accept a friend or create a group.</div>`;
    return;
  }

  const labeled = await Promise.all(
    chats.map(async (c) => {
      let title = c.name || "Chat";
      if (c.type === "dm") {
        const other = (c.memberIds || []).find((id) => id !== currentUser.uid);
        const p = other ? await getProfile(other) : null;
        title = p?.displayName || p?.email || "Direct message";
      }
      return { ...c, title };
    })
  );

  list.innerHTML = labeled
    .map(
      (c) => `
    <button type="button" class="collab-chat-item ${c.id === activeChatId ? "is-active" : ""}" data-id="${esc(c.id)}">
      <strong>${esc(c.title)}</strong>
      <span>${esc(c.lastMessage || "No messages yet")}</span>
    </button>`
    )
    .join("");

  list.querySelectorAll(".collab-chat-item").forEach((btn) => {
    btn.addEventListener("click", () => openChat(btn.dataset.id));
  });

  if (preferId) openChat(preferId);
  else if (activeChatId) openChat(activeChatId);
}

function openChat(chatId) {
  activeChatId = chatId;
  document.querySelectorAll(".collab-chat-item").forEach((el) => {
    el.classList.toggle("is-active", el.dataset.id === chatId);
  });

  const input = document.getElementById("composeInput");
  const btn = document.getElementById("composeBtn");
  input.disabled = false;
  btn.disabled = false;

  if (unsubMessages) unsubMessages();
  const box = document.getElementById("chatMessages");
  box.innerHTML = `<div class="collab-empty">Loading…</div>`;

  unsubMessages = listenMessages(
    chatId,
    (msgs) => {
      if (!msgs.length) {
        box.innerHTML = `<div class="collab-empty">No messages yet — say hello.</div>`;
        return;
      }
      box.innerHTML = msgs
        .map((m) => {
          const mine = m.senderId === currentUser.uid;
          return `
          <div class="collab-msg ${mine ? "mine" : ""}">
            ${mine ? "" : `<div class="who">${esc(m.senderName || "Farmer")}</div>`}
            <p>${esc(m.text)}</p>
          </div>`;
        })
        .join("");
      box.scrollTop = box.scrollHeight;
    },
    (err) => {
      box.innerHTML = `<div class="collab-empty">${esc(err.message || "Could not load messages")}</div>`;
    }
  );
}

async function refreshShares() {
  fields = await listFields(currentUser.uid);
  const fieldSel = document.getElementById("shareField");
  fieldSel.innerHTML = fields.length
    ? `<option value="">Select field…</option>` +
      fields
        .map((f) => `<option value="${esc(f.id)}">${esc(f.name || "Untitled")} (${Number(f.lat).toFixed(3)}, ${Number(f.lon).toFixed(3)})</option>`)
        .join("")
    : `<option value="">No fields yet — add one in Fields</option>`;

  const incoming = await listSharesWithMe(currentUser.uid);
  const outgoing = await listSharesByMe(currentUser.uid);

  const inEl = document.getElementById("sharesInList");
  inEl.innerHTML = incoming.length
    ? incoming
        .map(
          (s) => `
      <div class="collab-row">
        <div>
          <strong>${esc(s.fieldName)}</strong>
          <span>From ${esc(s.ownerName)} · ${Number(s.lat).toFixed(4)}, ${Number(s.lon).toFixed(4)}${s.cropType ? ` · ${esc(s.cropType)}` : ""}</span>
          ${s.note ? `<span>${esc(s.note)}</span>` : ""}
        </div>
      </div>`
        )
        .join("")
    : `<div class="collab-empty">No shared fields yet</div>`;

  const outEl = document.getElementById("sharesOutList");
  outEl.innerHTML = outgoing.length
    ? outgoing
        .map(
          (s) => `
      <div class="collab-row">
        <div>
          <strong>${esc(s.fieldName)}</strong>
          <span>Shared with ${esc(s.sharedWithName)}</span>
        </div>
      </div>`
        )
        .join("")
    : `<div class="collab-empty">You haven’t shared a field yet</div>`;
}

async function refreshAll() {
  await Promise.all([refreshFriends(), refreshChats(), refreshShares()]);
}

document.getElementById("friendRequestForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await sendFriendRequest(currentUser, document.getElementById("friendEmail").value);
    document.getElementById("friendEmail").value = "";
    setStatus("Friend request sent.", "ok");
    await refreshFriends();
  } catch (err) {
    setStatus(err.message || "Could not send request.", "error");
  }
});

document.getElementById("groupForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const sel = document.getElementById("groupMembers");
  const memberUids = Array.from(sel.selectedOptions).map((o) => o.value);
  try {
    const g = await createGroup(currentUser, document.getElementById("groupName").value, memberUids);
    document.getElementById("groupName").value = "";
    setStatus("Group created.", "ok");
    switchPanel("chat");
    await refreshChats(g.id);
  } catch (err) {
    setStatus(err.message || "Could not create group.", "error");
  }
});

document.getElementById("composeForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!activeChatId) return;
  const input = document.getElementById("composeInput");
  try {
    await sendMessage(activeChatId, currentUser, input.value);
    input.value = "";
  } catch (err) {
    setStatus(err.message || "Could not send.", "error");
  }
});

document.getElementById("shareForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const fieldId = document.getElementById("shareField").value;
  const friendUid = document.getElementById("shareFriend").value;
  const field = fields.find((f) => f.id === fieldId);
  try {
    await shareFieldWithFriend(currentUser, field, friendUid, document.getElementById("shareNote").value);
    document.getElementById("shareNote").value = "";
    setStatus("Field shared — your friend will see it in chat and Share.", "ok");
    await refreshShares();
  } catch (err) {
    setStatus(err.message || "Could not share field.", "error");
  }
});

document.getElementById("communityForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;
  try {
    await createCommunityPost(currentUser, {
      kind: document.getElementById("communityKind")?.value,
      body: document.getElementById("communityBody")?.value,
    });
    document.getElementById("communityBody").value = "";
    await refreshCommunity();
    setStatus("Posted to the community.", "ok");
  } catch (err) {
    setStatus(err?.message || "Could not post.", "error");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  if (!isFirebaseConfigured()) {
    setStatus("Firebase not configured.", "error");
    return;
  }
  watchAuth(async (user) => {
    if (!user) {
      window.location.href = "auth.html";
      return;
    }
    currentUser = user;
    try {
      await ensurePublicProfile(user);
      await refreshAll();
    } catch (err) {
      setStatus(err.message || "Could not load collaboration data.", "error");
    }
  });
});
