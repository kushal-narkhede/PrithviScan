/**
 * Persistent last-view / session restore (feature 2.1).
 * Saves per-user last field + scroll position in Firestore.
 */

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { getDb } from "./firebase-db.js";

function userRef(uid) {
  return doc(getDb(), "users", uid);
}

function fieldRef(uid, fieldId) {
  return doc(getDb(), "users", uid, "fields", fieldId);
}

export async function loadLastSession(uid) {
  const snap = await getDoc(userRef(uid));
  if (!snap.exists()) return null;
  return snap.data().lastSession || null;
}

export async function saveLastSession(uid, payload) {
  const data = {
    lastSession: {
      fieldId: String(payload.fieldId || ""),
      scrollY: Number(payload.scrollY) || 0,
      section: String(payload.section || "insight"),
      page: String(payload.page || "field"),
      updatedAt: serverTimestamp(),
    },
  };
  await setDoc(userRef(uid), data, { merge: true });
}

export async function saveFieldLastView(uid, fieldId, payload) {
  await setDoc(
    fieldRef(uid, fieldId),
    {
      lastView: {
        scrollY: Number(payload.scrollY) || 0,
        section: String(payload.section || "insight"),
        updatedAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** Infer which field tool / section is active. */
export function detectSection() {
  const activePanel = document.querySelector(".field-tool-panel:not([hidden])");
  if (activePanel?.dataset?.toolPanel) return activePanel.dataset.toolPanel;

  const ids = ["insightWrap", "metricsGrid", "trendsPanel", "detailMap"];
  let best = "insight";
  let bestDist = Infinity;
  const y = window.scrollY + 80;
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el || el.hidden) continue;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const dist = Math.abs(top - y);
    if (dist < bestDist) {
      bestDist = dist;
      best = id === "insightWrap" ? "insight" : id === "metricsGrid" ? "metrics" : id === "trendsPanel" ? "weather" : "location";
    }
  }
  return best;
}

export function restoreScroll(scrollY, section) {
  const apply = () => {
    if (section) {
      const map = {
        insight: "insightWrap",
        metrics: "metricsGrid",
        trends: "trendsPanel",
        weather: "trendsPanel",
        satellite: "satArchivePanel",
        crop: "cropGuidePanel",
        inputs: "fieldInputsPanel",
        markets: "nearbyMarketsPanel",
        tools: "toolsPanel",
        location: "locationPanel",
        map: "locationPanel",
      };
      const el = document.getElementById(map[section] || section);
      if (el) {
        // Reveal tool panels that start hidden
        if (el.classList.contains("field-tool-panel") || el.closest(".field-tool-panel")) {
          const panel = el.classList.contains("field-tool-panel") ? el : el.closest(".field-tool-panel");
          const tool = panel?.dataset?.toolPanel;
          if (tool) {
            document.querySelector(`.field-tool-btn[data-tool="${tool}"]`)?.click();
            return;
          }
        }
        if (!el.hidden) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
      }
    }
    if (Number.isFinite(scrollY) && scrollY > 0) {
      window.scrollTo({ top: scrollY, behavior: "smooth" });
    }
  };
  // Wait for layout (maps / cards) before restoring
  requestAnimationFrame(() => setTimeout(apply, 120));
}

export function bindSessionPersistence(uid, fieldId) {
  let timer = null;
  const persist = () => {
    const payload = {
      fieldId,
      scrollY: Math.round(window.scrollY),
      section: detectSection(),
      page: "field",
    };
    saveLastSession(uid, payload).catch(() => {});
    saveFieldLastView(uid, fieldId, payload).catch(() => {});
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(persist, 800);
  };
  window.addEventListener("scroll", schedule, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") persist();
  });
  window.addEventListener("pagehide", persist);
  return persist;
}
