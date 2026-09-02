/**
 * Accessibility & inclusive design preferences (feature 5.4).
 * Modes: large text, high contrast, simplified (low-literacy).
 */

const KEY = "prithvi_a11y";

const DEFAULTS = {
  largeText: false,
  highContrast: false,
  simplified: false,
};

export function loadA11yPrefs() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveA11yPrefs(prefs) {
  const next = { ...DEFAULTS, ...prefs };
  localStorage.setItem(KEY, JSON.stringify(next));
  applyA11yPrefs(next);
  return next;
}

export function applyA11yPrefs(prefs = loadA11yPrefs()) {
  const root = document.documentElement;
  root.classList.toggle("a11y-large", Boolean(prefs.largeText));
  root.classList.toggle("a11y-contrast", Boolean(prefs.highContrast));
  root.classList.toggle("a11y-simple", Boolean(prefs.simplified));
}

applyA11yPrefs();
