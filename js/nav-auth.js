import {
  watchAuth,
  logOut,
  isFirebaseConfigured,
} from "./auth.js";

function initials(user) {
  const label = user.displayName || user.email || "U";
  return label
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function renderAuthControls(user) {
  const slots = document.querySelectorAll("[data-auth-slot]");
  slots.forEach((slot) => {
    if (!user) {
      slot.innerHTML = `<a class="nav-cta" href="auth.html">Sign in</a>`;
      return;
    }

    const name = user.displayName || user.email || "Account";
    slot.innerHTML = `
      <div class="auth-chip">
        <span class="auth-avatar" aria-hidden="true">${initials(user)}</span>
        <span class="auth-name">${name}</span>
        <button type="button" class="auth-signout" data-signout>Sign out</button>
      </div>
    `;
  });

  document.querySelectorAll("[data-signout]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await logOut();
      } catch (err) {
        console.error(err);
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (!isFirebaseConfigured()) {
    renderAuthControls(null);
    return;
  }
  watchAuth((user) => renderAuthControls(user));
});
