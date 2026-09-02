/**
 * Alert preferences — local cache + Firestore sync for delivery.
 */

import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getDb } from "./firebase-db.js";

const KEY = "prithvi_alert_prefs";

const DEFAULTS = {
  showCriticalOnly: false,
  quietHoursEnabled: false,
  quietStart: 21,
  quietEnd: 7,
  snoozedUntil: 0,
  pushEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
  smsConsent: false,
  whatsappEnabled: false,
  phoneE164: "",
  email: "",
  fcmToken: "",
};

export function loadAlertPrefs() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAlertPrefs(prefs) {
  const next = { ...DEFAULTS, ...prefs };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function syncAlertPrefsToCloud(uid, prefs = loadAlertPrefs()) {
  if (!uid) return prefs;
  const next = saveAlertPrefs(prefs);
  await setDoc(
    doc(getDb(), "users", uid),
    {
      alertPrefs: {
        showCriticalOnly: Boolean(next.showCriticalOnly),
        quietHoursEnabled: Boolean(next.quietHoursEnabled),
        quietStart: Number(next.quietStart) || 21,
        quietEnd: Number(next.quietEnd) || 7,
        snoozedUntil: Number(next.snoozedUntil) || 0,
        pushEnabled: Boolean(next.pushEnabled),
        emailEnabled: Boolean(next.emailEnabled),
        smsEnabled: Boolean(next.smsEnabled),
        smsConsent: Boolean(next.smsConsent),
        whatsappEnabled: Boolean(next.whatsappEnabled),
        phoneE164: String(next.phoneE164 || ""),
        email: String(next.email || ""),
        fcmToken: String(next.fcmToken || ""),
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return next;
}

export async function loadAlertPrefsFromCloud(uid) {
  if (!uid) return loadAlertPrefs();
  try {
    const snap = await getDoc(doc(getDb(), "users", uid));
    if (snap.exists() && snap.data().alertPrefs) {
      return saveAlertPrefs({ ...loadAlertPrefs(), ...snap.data().alertPrefs });
    }
  } catch {
    /* fall through */
  }
  return loadAlertPrefs();
}

export function snoozeAlerts(hours = 6) {
  const prefs = loadAlertPrefs();
  prefs.snoozedUntil = Date.now() + hours * 3600 * 1000;
  return saveAlertPrefs(prefs);
}

function inQuietHours(prefs, date = new Date()) {
  if (!prefs.quietHoursEnabled) return false;
  const h = date.getHours();
  const start = Number(prefs.quietStart);
  const end = Number(prefs.quietEnd);
  if (start === end) return false;
  if (start < end) return h >= start && h < end;
  return h >= start || h < end;
}

export function filterAlertsForDisplay(alerts = [], prefs = loadAlertPrefs()) {
  if (prefs.snoozedUntil && Date.now() < prefs.snoozedUntil) {
    return { alerts: [], mutedReason: "Alerts snoozed" };
  }
  if (inQuietHours(prefs)) {
    return {
      alerts: alerts.filter((a) => a.level === "action"),
      mutedReason: "Quiet hours — showing critical only",
    };
  }
  if (prefs.showCriticalOnly) {
    return {
      alerts: alerts.filter((a) => a.level === "action"),
      mutedReason: null,
    };
  }
  return { alerts, mutedReason: null };
}

export function alertPriority(level) {
  if (level === "action") return "critical";
  if (level === "watch") return "watch";
  return "info";
}
