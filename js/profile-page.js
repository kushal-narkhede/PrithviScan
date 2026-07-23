import {
  watchAuth,
  logOut,
  authErrorMessage,
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

function providerLabel(user) {
  const ids = (user.providerData || []).map((p) => p.providerId);
  if (ids.includes("google.com")) return "Google";
  if (ids.includes("password")) return "Email & password";
  return ids[0] || "Email";
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function setStatus(message, type = "") {
  const el = document.getElementById("profileStatus");
  if (!el) return;
  el.textContent = message || "";
  el.className = `auth-msg${type ? ` is-${type}` : ""}`;
}

function fillProfile(user) {
  const avatar = document.getElementById("profileAvatar");
  const name = document.getElementById("profileName");
  const email = document.getElementById("profileEmail");
  const provider = document.getElementById("profileProvider");
  const created = document.getElementById("profileCreated");

  if (avatar) avatar.textContent = initials(user);
  if (name) name.textContent = user.displayName || "PrithviScan farmer";
  if (email) email.textContent = user.email || "No email on file";
  if (provider) provider.textContent = providerLabel(user);
  if (created) created.textContent = formatDate(user.metadata?.creationTime);
}

document.addEventListener("DOMContentLoaded", () => {
  const signOutBtn = document.getElementById("signOutBtn");

  if (!isFirebaseConfigured()) {
    window.location.href = "auth.html";
    return;
  }

  watchAuth((user) => {
    if (!user) {
      window.location.href = "auth.html";
      return;
    }
    fillProfile(user);
  });

  signOutBtn?.addEventListener("click", async () => {
    signOutBtn.disabled = true;
    setStatus("Signing out…");
    try {
      await logOut();
      window.location.href = "index.html";
    } catch (err) {
      setStatus(authErrorMessage(err), "error");
      signOutBtn.disabled = false;
    }
  });
});
