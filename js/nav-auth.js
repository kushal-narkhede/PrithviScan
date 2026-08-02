import {
  watchAuth,
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

    const name = user.displayName || user.email || "Profile";

    slot.innerHTML = `
      ${onApp ? "" : `<a class="nav-app" href="app.html">Open app</a>`}
      <a class="nav-profile" href="profile.html" aria-label="My profile — ${name}" title="My profile">
        <span class="nav-profile-avatar" aria-hidden="true">${initials(user)}</span>
      </a>
    `;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (!isFirebaseConfigured()) {
    renderAuthControls(null);
    return;
  }
  watchAuth((user) => renderAuthControls(user));
});
