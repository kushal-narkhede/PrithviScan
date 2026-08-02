import {
  watchAuth,
  logOut,
  isFirebaseConfigured,
} from "./auth.js";
import "./ai-widget.js";

async function syncProfile(user) {
  try {
    const { ensurePublicProfile } = await import("./collab.js");
    await ensurePublicProfile(user);
  } catch {
    // non-fatal — collab page will retry
  }
}

const PERSON_ICON = `
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    <circle cx="12" cy="8" r="3.5" fill="currentColor"/>
    <path fill="currentColor" d="M5 18.8C5.7 15.6 8.4 13.8 12 13.8s6.3 1.8 7 5c.1.5-.3.9-.8.9H5.8c-.5 0-.9-.4-.8-.9z"/>
  </svg>
`;

function closeAllMenus() {
  document.querySelectorAll(".nav-account").forEach((el) => {
    el.classList.remove("is-open");
    const btn = el.querySelector(".nav-profile-btn");
    const menu = el.querySelector(".nav-menu");
    if (btn) btn.setAttribute("aria-expanded", "false");
    if (menu) menu.hidden = true;
  });
}

function isAppPage() {
  const path = window.location.pathname.replace(/\/$/, "");
  return /\/(app|field|collab|prices|org|info|ai)(\.html)?$/i.test(path);
}

function escapeHtml(v) {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bindAccountMenu(slot) {
  const account = slot.querySelector(".nav-account");
  const btn = slot.querySelector(".nav-profile-btn");
  const menu = slot.querySelector(".nav-menu");
  if (!account || !btn || !menu) return;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const open = menu.hidden;
    closeAllMenus();
    if (open) {
      account.classList.add("is-open");
      menu.hidden = false;
      btn.setAttribute("aria-expanded", "true");
    }
  });

  menu.addEventListener("click", (e) => e.stopPropagation());

  menu.querySelector("[data-signout]")?.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await logOut();
      window.location.href = "index.html";
    } catch {
      window.location.href = "profile.html";
    }
  });
}

function renderAuthControls(user) {
  document.querySelectorAll("[data-auth-slot]").forEach((slot) => {
    slot.classList.add("auth-slot");

    if (!user) {
      slot.innerHTML = `<a class="nav-cta" href="auth.html">Get started</a>`;
      return;
    }

    const name = escapeHtml(user.displayName || user.email || "Account");
    const showOpenApp = !isAppPage();

    slot.innerHTML = `
      ${showOpenApp ? `<a class="nav-app" href="app.html">Open app</a>` : ""}
      <div class="nav-account">
        <button type="button" class="nav-profile-btn" aria-label="Account" aria-haspopup="true" aria-expanded="false">
          <span class="nav-profile-circle">${PERSON_ICON}</span>
        </button>
        <div class="nav-menu" role="menu" hidden>
          <p class="nav-menu-name">${name}</p>
          <a href="index.html" role="menuitem">Home</a>
          <a href="profile.html" role="menuitem">My profile</a>
          <a href="org.html" role="menuitem">Organization</a>
          <a href="prices.html" role="menuitem">Price calculator</a>
          <a href="collab.html" role="menuitem">Collaborate</a>
          <a href="profile.html#profilePrefs" role="menuitem">Settings</a>
          <button type="button" data-signout role="menuitem">Sign out</button>
        </div>
      </div>
    `;

    bindAccountMenu(slot);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("click", closeAllMenus);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllMenus();
  });

  if (!isFirebaseConfigured()) {
    renderAuthControls(null);
    return;
  }
  watchAuth((user) => {
    renderAuthControls(user);
    if (user) syncProfile(user);
  });
});
