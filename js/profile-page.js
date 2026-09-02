import {
  watchAuth,
  logOut,
  authErrorMessage,
  isFirebaseConfigured,
} from "./auth.js";
import { loadA11yPrefs, saveA11yPrefs } from "./a11y.js";
import {
  loadAlertPrefs,
  saveAlertPrefs,
  snoozeAlerts,
  syncAlertPrefsToCloud,
  loadAlertPrefsFromCloud,
} from "./alert-prefs.js";
import { getLocale, setLocale } from "./i18n.js";
import {
  exportAccountBundle,
  downloadJson,
  deleteAccountData,
  loadPrivacyPrefs,
  savePrivacyPrefs,
  readExportLog,
} from "./privacy-data.js";
import { callProcessAlertOutbox, callSendTestSms } from "./api.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getDb } from "./firebase-db.js";

let currentUser = null;

function initials(user) {
  const label = user.displayName || user.email || user.phoneNumber || "U";
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
  if (ids.includes("phone")) return "Phone OTP";
  if (ids.includes("password")) return "Email & password";
  return ids[0] || "Account";
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
  if (email) email.textContent = user.email || user.phoneNumber || "No email on file";
  if (provider) provider.textContent = providerLabel(user);
  if (created) created.textContent = formatDate(user.metadata?.creationTime);
}

function gatherAlertForm() {
  return {
    ...loadAlertPrefs(),
    showCriticalOnly: Boolean(document.getElementById("prefCriticalOnly")?.checked),
    quietHoursEnabled: Boolean(document.getElementById("prefQuietHours")?.checked),
    pushEnabled: Boolean(document.getElementById("prefPush")?.checked),
    emailEnabled: Boolean(document.getElementById("prefEmailAlert")?.checked),
    smsEnabled: Boolean(document.getElementById("prefSms")?.checked),
    smsConsent: Boolean(document.getElementById("prefSmsConsent")?.checked),
    whatsappEnabled: Boolean(document.getElementById("prefWhatsapp")?.checked),
    phoneE164: String(document.getElementById("prefAlertPhone")?.value || "").trim(),
    email: currentUser?.email || "",
  };
}

function bindLocalPrefs() {
  const a11y = loadA11yPrefs();
  const large = document.getElementById("prefLargeText");
  const contrast = document.getElementById("prefContrast");
  const simple = document.getElementById("prefSimple");
  const localeEl = document.getElementById("prefLocale");

  if (large) large.checked = a11y.largeText;
  if (contrast) contrast.checked = a11y.highContrast;
  if (simple) simple.checked = a11y.simplified;
  if (localeEl) localeEl.value = getLocale();

  const syncA11y = () => {
    saveA11yPrefs({
      largeText: Boolean(large?.checked),
      highContrast: Boolean(contrast?.checked),
      simplified: Boolean(simple?.checked),
    });
    setStatus("Accessibility preferences saved.", "ok");
  };
  large?.addEventListener("change", syncA11y);
  contrast?.addEventListener("change", syncA11y);
  simple?.addEventListener("change", syncA11y);

  localeEl?.addEventListener("change", () => {
    setLocale(localeEl.value);
    setStatus(localeEl.value === "hi" ? "भाषा हिन्दी पर सेट।" : "Language set to English.", "ok");
  });

  document.getElementById("prefSnoozeBtn")?.addEventListener("click", async () => {
    snoozeAlerts(6);
    if (currentUser) await syncAlertPrefsToCloud(currentUser.uid, gatherAlertForm());
    setStatus("Alerts snoozed for 6 hours.", "ok");
  });

  document.getElementById("prefTestSmsBtn")?.addEventListener("click", async () => {
    if (!currentUser) return;
    const phone = String(document.getElementById("prefAlertPhone")?.value || "").trim();
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      setStatus("Enter a valid phone in E.164 format (+91…).", "error");
      return;
    }
    if (!document.getElementById("prefSmsConsent")?.checked) {
      setStatus("Check SMS consent before sending a test message.", "error");
      return;
    }
    try {
      const res = await callSendTestSms(phone);
      setStatus(res.ok ? "Test SMS sent." : res.error || "Test SMS failed.", res.ok ? "ok" : "error");
    } catch (err) {
      setStatus(err?.message || "Test SMS failed.", "error");
    }
  });

  document.getElementById("prefSyncAlertsBtn")?.addEventListener("click", async () => {
    if (!currentUser) return;
    try {
      await syncAlertPrefsToCloud(currentUser.uid, gatherAlertForm());
      const out = await callProcessAlertOutbox();
      setStatus(
        out.ok
          ? `Alert prefs saved. Processed ${out.processed || 0} queued delivery(ies).`
          : "Alert prefs saved to cloud.",
        "ok"
      );
    } catch (err) {
      setStatus(err?.message || "Could not sync alert prefs.", "error");
    }
  });

  function fillPrivacyForm() {
    const p = loadPrivacyPrefs();
    const a = document.getElementById("prefConsentAnalytics");
    const t = document.getElementById("prefConsentTraining");
    const an = document.getElementById("prefAnonymizeFields");
    if (a) a.checked = Boolean(p.consentAnalytics);
    if (t) t.checked = Boolean(p.consentTraining);
    if (an) an.checked = Boolean(p.anonymizeFields);
    const note = document.getElementById("privacyLogNote");
    if (note) {
      const log = readExportLog();
      note.textContent = log.length
        ? `Last export: ${log[0].at} (${log.length} event(s) in this browser).`
        : "Export events are stored locally in this browser.";
    }
  }
  fillPrivacyForm();

  document.getElementById("savePrivacyBtn")?.addEventListener("click", () => {
    savePrivacyPrefs({
      consentAnalytics: document.getElementById("prefConsentAnalytics")?.checked,
      consentTraining: document.getElementById("prefConsentTraining")?.checked,
      anonymizeFields: document.getElementById("prefAnonymizeFields")?.checked,
    });
    setStatus("Privacy preferences saved.", "ok");
  });

  document.getElementById("exportDataBtn")?.addEventListener("click", async () => {
    if (!currentUser) return;
    try {
      setStatus("Preparing your data export…");
      const prefs = loadPrivacyPrefs();
      const bundle = await exportAccountBundle(currentUser.uid, {
        anonymize: Boolean(prefs.anonymizeFields),
      });
      downloadJson(`prithviscan-export-${currentUser.uid.slice(0, 6)}.json`, bundle);
      fillPrivacyForm();
      setStatus("Data export downloaded.", "ok");
    } catch (err) {
      setStatus(err?.message || "Export failed.", "error");
    }
  });

  document.getElementById("exportLogBtn")?.addEventListener("click", () => {
    downloadJson("prithviscan-export-log.json", { events: readExportLog() });
    setStatus("Export log downloaded.", "ok");
  });

  document.getElementById("deleteAccountBtn")?.addEventListener("click", async () => {
    if (!currentUser) return;
    const ok = confirm(
      "Delete your personal PrithviScan account and personal fields? Organization-owned fields stay with the org. This cannot be undone."
    );
    if (!ok) return;
    const again = prompt('Type DELETE to confirm account deletion');
    if (again !== "DELETE") {
      setStatus("Account deletion cancelled.", "error");
      return;
    }
    try {
      setStatus("Deleting account…");
      await deleteAccountData(currentUser);
      window.location.href = "index.html";
    } catch (err) {
      setStatus(
        err?.code === "auth/requires-recent-login"
          ? "Please sign out, sign in again, then retry delete."
          : err?.message || "Could not delete account.",
        "error"
      );
    }
  });
}

async function fillAlertForm(uid) {
  const alerts = await loadAlertPrefsFromCloud(uid);
  const critical = document.getElementById("prefCriticalOnly");
  const quiet = document.getElementById("prefQuietHours");
  const push = document.getElementById("prefPush");
  const email = document.getElementById("prefEmailAlert");
  const sms = document.getElementById("prefSms");
  const smsConsent = document.getElementById("prefSmsConsent");
  const wa = document.getElementById("prefWhatsapp");
  const phone = document.getElementById("prefAlertPhone");
  if (critical) critical.checked = alerts.showCriticalOnly;
  if (quiet) quiet.checked = alerts.quietHoursEnabled;
  if (push) push.checked = alerts.pushEnabled !== false;
  if (email) email.checked = alerts.emailEnabled !== false;
  if (sms) sms.checked = Boolean(alerts.smsEnabled);
  if (smsConsent) smsConsent.checked = Boolean(alerts.smsConsent);
  if (wa) wa.checked = Boolean(alerts.whatsappEnabled);
  if (phone) phone.value = alerts.phoneE164 || "";
}

async function loadOptIn(uid) {
  const el = document.getElementById("prefAggregateOptIn");
  if (!el) return;
  try {
    const snap = await getDoc(doc(getDb(), "users", uid));
    el.checked = Boolean(snap.data()?.preferences?.aggregateOptIn);
  } catch {
    // ignore
  }
  el.addEventListener("change", async () => {
    try {
      await setDoc(
        doc(getDb(), "users", uid),
        {
          preferences: {
            aggregateOptIn: Boolean(el.checked),
            updatedAt: serverTimestamp(),
          },
        },
        { merge: true }
      );
      setStatus(
        el.checked
          ? "Opted in to anonymized aggregated insights."
          : "Opted out of aggregated insights.",
        "ok"
      );
    } catch (err) {
      setStatus(err?.message || "Could not save preference.", "error");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const signOutBtn = document.getElementById("signOutBtn");
  bindLocalPrefs();

  if (!isFirebaseConfigured()) {
    window.location.href = "auth.html";
    return;
  }

  watchAuth(async (user) => {
    if (!user) {
      window.location.href = "auth.html";
      return;
    }
    currentUser = user;
    fillProfile(user);
    await fillAlertForm(user.uid);
    loadOptIn(user.uid);
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
