import {
  signUpEmail,
  signInEmail,
  signInGoogle,
  completeGoogleRedirect,
  watchAuth,
  authErrorMessage,
  isFirebaseConfigured,
} from "./auth.js";

const form = document.getElementById("authForm");
const statusEl = document.getElementById("authStatus");
const modeInput = document.getElementById("authMode");
const nameField = document.getElementById("nameField");
const submitBtn = document.getElementById("authSubmit");
const googleBtn = document.getElementById("googleBtn");
const tabs = document.querySelectorAll("[data-auth-tab]");
const setupNote = document.getElementById("setupNote");

function setStatus(message, type = "") {
  if (!statusEl) return;
  statusEl.textContent = message || "";
  statusEl.className = `auth-status${type ? ` is-${type}` : ""}`;
}

function setMode(mode) {
  const next = mode === "signup" ? "signup" : "signin";
  modeInput.value = next;
  tabs.forEach((tab) => {
    const active = tab.dataset.authTab === next;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  nameField.hidden = next !== "signup";
  nameField.querySelector("input").required = next === "signup";
  submitBtn.textContent = next === "signup" ? "Create account" : "Sign in";
  setStatus("");
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.authTab));
});

async function finishLogin() {
  setStatus("Signed in — redirecting…", "ok");
  window.location.href = "index.html";
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isFirebaseConfigured()) {
    setStatus("Add your Firebase web apiKey and appId in js/firebase-config.js first.", "error");
    return;
  }

  const data = new FormData(form);
  const mode = data.get("mode");
  const name = String(data.get("name") || "");
  const email = String(data.get("email") || "").trim();
  const password = String(data.get("password") || "");

  submitBtn.disabled = true;
  googleBtn.disabled = true;
  setStatus(mode === "signup" ? "Creating your account…" : "Signing in…");

  try {
    if (mode === "signup") {
      await signUpEmail(name, email, password);
    } else {
      await signInEmail(email, password);
    }
    await finishLogin();
  } catch (err) {
    setStatus(authErrorMessage(err), "error");
  } finally {
    submitBtn.disabled = false;
    googleBtn.disabled = false;
  }
});

googleBtn?.addEventListener("click", async () => {
  if (!isFirebaseConfigured()) {
    setStatus("Add your Firebase web apiKey and appId in js/firebase-config.js first.", "error");
    return;
  }

  submitBtn.disabled = true;
  googleBtn.disabled = true;
  setStatus("Opening Google…");

  try {
    const user = await signInGoogle();
    if (user) await finishLogin();
  } catch (err) {
    setStatus(authErrorMessage(err), "error");
    submitBtn.disabled = false;
    googleBtn.disabled = false;
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  setMode("signin");

  if (!isFirebaseConfigured()) {
    setupNote.hidden = false;
    return;
  }

  try {
    const redirect = await completeGoogleRedirect();
    if (redirect?.user) {
      await finishLogin();
      return;
    }
  } catch (err) {
    setStatus(authErrorMessage(err), "error");
  }

  watchAuth((user) => {
    if (user) {
      setStatus(`Signed in as ${user.email || user.displayName}. Redirecting…`, "ok");
      window.setTimeout(() => {
        window.location.href = "index.html";
      }, 600);
    }
  });
});
