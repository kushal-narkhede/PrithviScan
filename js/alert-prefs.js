/**
 * Smart alerts & prioritization preferences (feature 6.8).
 */

const KEY = "prithvi_alert_prefs";

const DEFAULTS = {
  showCriticalOnly: false,
  quietHoursEnabled: false,
  quietStart: 21,
  quietEnd: 7,
  snoozedUntil: 0,
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

/** Filter alerts for UI: critical-only, snooze, quiet hours. */
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
