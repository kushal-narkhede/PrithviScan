import {
  watchAuth,
  logOut,
  isFirebaseConfigured,
} from "./auth.js";

const PERSON_ICON = `
  <svg class="nav-person-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
    <circle cx="12" cy="8.2" r="3.6" fill="currentColor"/>
    <path fill="currentColor" d="M4.5 19.6c.6-3.5 3.6-5.6 7.5-5.6s6.9 2.1 7.5 5.6c.1.5-.3 1-.8 1H5.3c-.5 0-.9-.5-.8-1z"/>
  </svg>
`;

function closeAllMenus() {
  document.querySelectorAll(".nav-account.is-open").forEach((el) => {
    el.classList.remove("is-open");
    const btn = el.querySelector(".nav-profile");
    if (btn) btn.setAttribute("aria-expanded", "false");
  });
}

function bindAccountMenus(root) {
  const account = root.querySelector(".nav-account");
  if (!account) return;

  const btn = account.querySelector(".nav-profile");
  const menu = account.querySelector(".nav-account-menu");
  if (!btn || !menu) return;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const willOpen = !account.classList.contains("is-open");
    closeAllMenus();
    if (willOpen) {
      account.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
    }
  });

  menu.addEventListener("click", (e) => e.stopPropagation());

  const signOutBtn = menu.querySelector("[data-signout]");
  signOutBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    signOutBtn.disabled = true;
    try {
      await logOut();
      window.location.href = "index.html";
    } catch {
      signOutBtn.disabled = false;
      window.location.href = "profile.html";
    }
  });
}

function renderAuthControls(user) {
  const slots = document.querySelectorAll("[data-auth-slot]");
  slots.forEach((slot) => {
    slot.classList.add("auth-slot");

    if (!user) {
      slot.innerHTML = `<a class="nav-cta" href="auth.html">Get started</a>`;
      return;
    }

    const onApp =
      window.location.pathname.endsWith("app.html") ||
      window.location.pathname.endsWith("field.html") ||
      window.location.pathname.endsWith("/app") ||
      window.location.pathname.endsWith("/field");

    const name = user.displayName || user.email || "Account";
    const email = user.email || "";

    slot.innerHTML = `
      ${onApp ? "" : `<a class="nav-app" href="app.html"><span>Open app</span></a>`}
      <div class="nav-account">
        <button
          type="button"
          class="nav-profile"
          aria-label="Account menu"
          aria-haspopup="menu"
          aria-expanded="false"
          title="${name}"
        >
          <span class="nav-profile-frame">${PERSON_ICON}</span>
        </button>
        <div class="nav-account-menu" role="menu" hidden>
          <div class="nav-account-head">
            <span class="nav-account-name">${escapeHtml(name)}</span>
            ${email ? `<span class="nav-account-email">${escapeHtml(email)}</span>` : ""}
          </div>
          <a class="nav-account-item" role="menuitem" href="profile.html">My profile</a>
          <a class="nav-account-item" role="menuitem" href="profile.html#profilePrefs">Settings</a>
          <a class="nav-account-item" role="menuitem" href="info.html">Farm knowledge</a>
          <a class="nav-account-item" role="menuitem" href="app.html">My fields</a>
          <a class="nav-account-item" role="menuitem" href="privacy.html">Data ownership</a>
          <button type="button" class="nav-account-item nav-account-danger" role="menuitem" data-signout>Sign out</button>
        </div>
      </div>
    `;

    // Use hidden attribute toggle via CSS class instead
    const menu = slot.querySelector(".nav-account-menu");
    if (menu) menu.removeAttribute("hidden");

    bindAccountMenus(slot);
  });
}

function escapeHtml(v) {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("click", () => closeAllMenus());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllMenus();
  });

  if (!isFirebaseConfigured()) {
    renderAuthControls(null);
    return;
  }
  watchAuth((user) => renderAuthControls(user));
});
