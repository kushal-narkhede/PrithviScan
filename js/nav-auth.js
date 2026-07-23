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
    if (!user) {
      slot.innerHTML = `<a class="nav-cta" href="auth.html">Get started</a>`;
      return;
    }

    slot.innerHTML = `
      <a class="nav-profile" href="profile.html" aria-label="My Profile">
        <span class="nav-profile-avatar" aria-hidden="true">${initials(user)}</span>
        <span class="nav-profile-label">My Profile</span>
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
