import {
  watchAuth,
  logOut,
  authErrorMessage,
  isFirebaseConfigured,
} from "./auth.js";
import { loadA11yPrefs, saveA11yPrefs } from "./a11y.js";
import { loadAlertPrefs, saveAlertPrefs, snoozeAlerts } from "./alert-prefs.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getDb } from "./firebase-db.js";

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

function bindLocalPrefs() {
  const a11y = loadA11yPrefs();
  const alerts = loadAlertPrefs();
  const large = document.getElementById("prefLargeText");
  const contrast = document.getElementById("prefContrast");
  const simple = document.getElementById("prefSimple");
  const critical = document.getElementById("prefCriticalOnly");
  const quiet = document.getElementById("prefQuietHours");

  if (large) large.checked = a11y.largeText;
  if (contrast) contrast.checked = a11y.highContrast;
  if (simple) simple.checked = a11y.simplified;
  if (critical) critical.checked = alerts.showCriticalOnly;
  if (quiet) quiet.checked = alerts.quietHoursEnabled;

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

  const syncAlerts = () => {
    saveAlertPrefs({
      ...loadAlertPrefs(),
      showCriticalOnly: Boolean(critical?.checked),
      quietHoursEnabled: Boolean(quiet?.checked),
    });
    setStatus("Alert preferences saved.", "ok");
  };
  critical?.addEventListener("change", syncAlerts);
  quiet?.addEventListener("change", syncAlerts);

  document.getElementById("prefSnoozeBtn")?.addEventListener("click", () => {
    snoozeAlerts(6);
    setStatus("Alerts snoozed for 6 hours.", "ok");
  });
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

  watchAuth((user) => {
    if (!user) {
      window.location.href = "auth.html";
      return;
    }
    fillProfile(user);
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
