/**
 * Lightweight vernacular layer — English + Hindi for core farmer strings.
 */

const STRINGS = {
  en: {
    "tools.label": "Explore this field",
    "tools.hint": "Pick a button above to open satellite imagery, weather, crop plan, and more. Your analysis stays here at the top.",
    "tool.satellite": "Satellite imagery",
    "tool.satellite.desc": "MODIS, SMAP & HLS scenes",
    "tool.weather": "Weather",
    "tool.weather.desc": "Rain, temp & outlook",
    "tool.crop": "Crop & harvest",
    "tool.crop.desc": "Season, ferts & timing",
    "tool.inputs": "Inputs log",
    "tool.inputs.desc": "Fertilizers & machines",
    "tool.markets": "Markets",
    "tool.markets.desc": "Nearby places to sell",
    "tool.tools": "What-if & feedback",
    "tool.tools.desc": "Scenarios & ground truth",
    "tool.location": "Location",
    "tool.location.desc": "Map & field facts",
    "tool.health": "Field health",
    "tool.health.desc": "NDVI stress map",
    "alerts.title": "Alerts",
    "insight.loading": "Loading insight…",
    "health.good": "Healthy canopy",
    "health.watch": "Watch — stress rising",
    "health.action": "Action — vegetation stress",
    "offline.ready": "Offline copy saved for this field",
  },
  hi: {
    "tools.label": "इस खेत को देखें",
    "tools.hint": "ऊपर बटन दबाकर उपग्रह चित्र, मौसम, फसल योजना आदि खोलें। विश्लेषण ऊपर ही रहेगा।",
    "tool.satellite": "उपग्रह चित्र",
    "tool.satellite.desc": "MODIS, SMAP और HLS",
    "tool.weather": "मौसम",
    "tool.weather.desc": "बारिश, तापमान, पूर्वानुमान",
    "tool.crop": "फसल और कटाई",
    "tool.crop.desc": "मौसम, खाद, समय",
    "tool.inputs": "खाद / मशीन लॉग",
    "tool.inputs.desc": "उर्वरक और मशीनें",
    "tool.markets": "बाज़ार",
    "tool.markets.desc": "नज़दीकी मंडी",
    "tool.tools": "क्या-अगर और प्रतिक्रिया",
    "tool.tools.desc": "परिदृश्य और ज़मीन सच",
    "tool.location": "स्थान",
    "tool.location.desc": "नक्शा और तथ्य",
    "tool.health": "खेत स्वास्थ्य",
    "tool.health.desc": "NDVI तनाव मानचित्र",
    "alerts.title": "अलर्ट",
    "insight.loading": "अंतर्दृष्टि लोड हो रही है…",
    "health.good": "स्वस्थ फसल आवरण",
    "health.watch": "ध्यान दें — तनाव बढ़ रहा है",
    "health.action": "कार्रवाई — वनस्पति तनाव",
    "offline.ready": "इस खेत की ऑफ़लाइन प्रति सहेजी गई",
  },
};

const KEY = "prithvi_locale";

export function getLocale() {
  try {
    const saved = globalThis.localStorage?.getItem(KEY);
    if (saved === "hi" || saved === "en") return saved;
  } catch {
    /* ignore */
  }
  try {
    const nav = (globalThis.navigator?.language || "en").toLowerCase();
    if (nav.startsWith("hi")) return "hi";
  } catch {
    /* ignore */
  }
  return "en";
}

export function setLocale(locale) {
  const next = locale === "hi" ? "hi" : "en";
  try {
    globalThis.localStorage?.setItem(KEY, next);
  } catch {
    /* ignore */
  }
  try {
    if (globalThis.document?.documentElement) {
      globalThis.document.documentElement.lang = next === "hi" ? "hi" : "en";
    }
  } catch {
    /* ignore */
  }
  return next;
}

export function t(key, locale = getLocale()) {
  return STRINGS[locale]?.[key] || STRINGS.en[key] || key;
}

export function applyI18n(root = document) {
  const locale = getLocale();
  document.documentElement.lang = locale === "hi" ? "hi" : "en";
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) el.textContent = t(key, locale);
  });
}
