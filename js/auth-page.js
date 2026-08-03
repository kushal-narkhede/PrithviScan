import {
  signUpEmail,
  signInEmail,
  signInGoogle,
  completeGoogleRedirect,
  watchAuth,
  authErrorMessage,
  isFirebaseConfigured,
  setupPhoneRecaptcha,
  sendPhoneOtp,
  confirmPhoneOtp,
} from "./auth.js";
import { saveAccountMeta, claimOrgInvites } from "./org.js";

const form = document.getElementById("authForm");
const statusEl = document.getElementById("authStatus");
const modeInput = document.getElementById("authMode");
const nameField = document.getElementById("nameField");
const nameInput = document.getElementById("nameInput");
const accountTypeField = document.getElementById("accountTypeField");
const accountTypeSelect = document.getElementById("accountType");
const orgNameField = document.getElementById("orgNameField");
const orgNameInput = document.getElementById("orgNameInput");
const passwordInput = document.getElementById("passwordInput");
const submitBtn = document.getElementById("authSubmit");
const googleBtn = document.getElementById("googleBtn");
const tabs = document.querySelectorAll("[data-auth-tab]");
const setupNote = document.getElementById("setupNote");
let navigatingAway = false;

function setStatus(message, type = "") {
  if (!statusEl) return;
  statusEl.textContent = message || "";
  statusEl.className = `auth-msg${type ? ` is-${type}` : ""}`;
  window.PsLoader?.syncFromStatus?.(message || "", type);
}

function syncOrgNameVisibility() {
  const signup = modeInput?.value === "signup";
  const isOrg = accountTypeSelect?.value === "organization";
  if (orgNameField) orgNameField.hidden = !(signup && isOrg);
  if (orgNameInput) orgNameInput.required = signup && isOrg;
}

function setMode(mode) {
  const next = mode === "signup" ? "signup" : "signin";
  modeInput.value = next;

  tabs.forEach((tab) => {
    const active = tab.dataset.authTab === next;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  if (nameField) nameField.hidden = next !== "signup";
  if (nameInput) nameInput.required = next === "signup";
  if (accountTypeField) accountTypeField.hidden = next !== "signup";
  if (passwordInput) {
    passwordInput.autocomplete = next === "signup" ? "new-password" : "current-password";
  }

  syncOrgNameVisibility();
  submitBtn.textContent = next === "signup" ? "Create account" : "Sign in";
  setStatus("");
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.authTab));
});

accountTypeSelect?.addEventListener("change", syncOrgNameVisibility);

async function afterAuth(user, { isNewSignup = false, accountType, orgName } = {}) {
  if (!user || navigatingAway) return;
  navigatingAway = true;
  try {
    if (isNewSignup) {
      await saveAccountMeta(user, { accountType, orgName });
    }
    await claimOrgInvites(user);
  } catch {
    // non-fatal — org page can finish setup
  }
  setStatus("Signed in — opening your app…", "ok");
  const goOrg = isNewSignup && accountType === "organization";
  window.location.href = goOrg ? "org.html" : "app.html";
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isFirebaseConfigured()) {
    setStatus("Firebase web config is missing. Check js/firebase-config.js.", "error");
    return;
  }

  const data = new FormData(form);
  const mode = data.get("mode");
  const name = String(data.get("name") || "");
  const email = String(data.get("email") || "").trim();
  const password = String(data.get("password") || "");
  const accountType = String(data.get("accountType") || "individual");
  const orgName = String(data.get("orgName") || "").trim();

  if (mode === "signup" && accountType === "organization" && !orgName) {
    setStatus("Enter an organization name, or switch to Individual farmer.", "error");
    return;
  }

  submitBtn.disabled = true;
  googleBtn.disabled = true;
  setStatus(mode === "signup" ? "Creating your account…" : "Signing in…");

  try {
    if (mode === "signup") {
      const user = await signUpEmail(name, email, password);
      await afterAuth(user, { isNewSignup: true, accountType, orgName });
    } else {
      const user = await signInEmail(email, password);
      await afterAuth(user);
    }
  } catch (err) {
    setStatus(authErrorMessage(err), "error");
  } finally {
    submitBtn.disabled = false;
    googleBtn.disabled = false;
  }
});

googleBtn?.addEventListener("click", async () => {
  if (!isFirebaseConfigured()) {
    setStatus("Firebase web config is missing. Check js/firebase-config.js.", "error");
    return;
  }

  submitBtn.disabled = true;
  googleBtn.disabled = true;
  setStatus("Opening Google…");

  try {
    const user = await signInGoogle();
    if (user) {
      // Google may be first-time: claim invites; org create stays on org page
      await afterAuth(user);
    }
  } catch (err) {
    setStatus(authErrorMessage(err), "error");
    submitBtn.disabled = false;
    googleBtn.disabled = false;
  }
});

const phoneInput = document.getElementById("phoneInput");
const otpInput = document.getElementById("otpInput");
const otpRow = document.getElementById("otpRow");
const phoneSendBtn = document.getElementById("phoneSendBtn");
const phoneConfirmBtn = document.getElementById("phoneConfirmBtn");

phoneSendBtn?.addEventListener("click", async () => {
  if (!isFirebaseConfigured()) {
    setStatus("Firebase web config is missing.", "error");
    return;
  }
  let phone = String(phoneInput?.value || "").trim().replace(/\s+/g, "");
  if (/^[6-9]\d{9}$/.test(phone)) phone = `+91${phone}`;
  if (!/^\+\d{8,15}$/.test(phone)) {
    setStatus("Enter phone as +91… or 10-digit Indian mobile.", "error");
    return;
  }
  phoneSendBtn.disabled = true;
  setStatus("Sending OTP…");
  try {
    setupPhoneRecaptcha("phoneRecaptcha");
    await sendPhoneOtp(phone);
    if (otpRow) otpRow.hidden = false;
    if (phoneConfirmBtn) phoneConfirmBtn.hidden = false;
    setStatus("OTP sent. Enter the code from SMS.", "ok");
  } catch (err) {
    setStatus(authErrorMessage(err), "error");
  } finally {
    phoneSendBtn.disabled = false;
  }
});

phoneConfirmBtn?.addEventListener("click", async () => {
  phoneConfirmBtn.disabled = true;
  setStatus("Verifying OTP…");
  try {
    const user = await confirmPhoneOtp(otpInput?.value);
    await afterAuth(user, { isNewSignup: false });
  } catch (err) {
    setStatus(authErrorMessage(err), "error");
    phoneConfirmBtn.disabled = false;
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  setMode("signin");

  if (!isFirebaseConfigured()) {
    if (setupNote) {
      setupNote.hidden = false;
      setupNote.innerHTML = `<strong>Setup needed.</strong> Enable Email/Password, Google, and <strong>Phone</strong> in Firebase Authentication, then confirm <code>js/firebase-config.js</code>.`;
    }
    return;
  }

  try {
    const redirect = await completeGoogleRedirect();
    if (redirect?.user) {
      await afterAuth(redirect.user);
      return;
    }
  } catch (err) {
    setStatus(authErrorMessage(err), "error");
  }

  watchAuth((user) => {
    if (user && !navigatingAway) {
      afterAuth(user);
    }
  });
});
