import { watchAuth, isFirebaseConfigured } from "./auth.js";
import { getField, deleteField } from "./fields.js";
import { getDb } from "./firebase-db.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { createFieldMap } from "./map.js";
import { callFuseInsight } from "./api.js";

const titleEl  = document.getElementById("fieldTitle");
const metaEl   = document.getElementById("fieldMeta");
const statusEl = document.getElementById("fieldStatus");
const factsEl  = document.getElementById("fieldFacts");
const deleteBtn  = document.getElementById("deleteFieldBtn");
const refreshBtn = document.getElementById("refreshBtn");
const insightCard    = document.getElementById("insightCard");
const insightLevel   = document.getElementById("insightLevel");
const insightTitle   = document.getElementById("insightTitle");
const insightMessage = document.getElementById("insightMessage");
const insightFactors = document.getElementById("insightFactors");
const insightAge     = document.getElementById("insightAge");
const metricsGrid    = document.getElementById("metricsGrid");
const satelliteRow   = document.getElementById("satelliteRow");
const satSMAP  = document.getElementById("satSMAP");
const satMODIS = document.getElementById("satMODIS");
const satNote  = document.getElementById("satNote");

function setStatus(msg, type = "") {
  if (!statusEl) return;
  statusEl.textContent = msg || "";
  statusEl.className = `app-status${type ? ` is-${type}` : ""}`;
}

function levelClass(level) {
  if (level === "action") return "insight-action";
  if (level === "watch")  return "insight-watch";
  return "insight-info";
}

function levelLabel(level) {
  if (level === "action") return "⚠ Action needed";
  if (level === "watch")  return "👁 Watch";
  return "✓ Info";
}

function renderInsight(insight) {
  if (!insightCard || !insight) return;
  const lvl = insight.level || "info";
  insightCard.className = `insight-card ${levelClass(lvl)}`;
  insightLevel.textContent = levelLabel(lvl);
  insightTitle.textContent = insight.title || "—";
  insightMessage.textContent = insight.message || "";
  insightFactors.innerHTML = (insight.factors || [])
    .map((f) => `<li>${f}</li>`)
    .join("");
  if (insight.generatedAt) {
    const d = new Date(insight.generatedAt);
    insightAge.textContent = `Updated ${d.toLocaleString()}`;
  }

  // Metrics
  const m = insight.metrics || {};
  const fill = (id, val, dp = 1) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val !== null && val !== undefined ? Number(val).toFixed(dp) : "—";
  };
  fill("mRain", m.totalRain_mm, 1);
  fill("mTemp", m.avgTemp_c, 1);
  fill("mTempMax", m.maxTemp_c, 1);
  fill("mHumidity", m.avgHumidity_pct, 0);
  fill("mET", m.totalET_mm, 1);
  fill("mSolar", m.avgSolar, 2);
  if (metricsGrid) metricsGrid.hidden = false;

  // Satellite flags
  const ef = insight.earthFlags || {};
  if (satelliteRow) {
    satelliteRow.hidden = false;
    satSMAP.textContent = `SMAP ${ef.smapAvailable ? "✓" : "—"}`;
    satSMAP.className = `sat-chip ${ef.smapAvailable ? "sat-on" : "sat-off"}`;
    satMODIS.textContent = `MODIS ${ef.modisAvailable ? "✓" : "—"}`;
    satMODIS.className = `sat-chip ${ef.modisAvailable ? "sat-on" : "sat-off"}`;
    if (!ef.smapAvailable && !ef.modisAvailable) {
      satNote.textContent = "Connect Earthdata token to enable satellite layers.";
    }
  }
}

function renderFacts(field) {
  if (!factsEl) return;
  const rows = [
    ["Latitude",  Number(field.lat).toFixed(6)],
    ["Longitude", Number(field.lon).toFixed(6)],
    ["Crop",      field.cropType || "—"],
  ];
  factsEl.innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
}

function fieldIdFromUrl() {
  return new URLSearchParams(window.location.search).get("id");
}

async function loadSavedInsight(uid, fieldId) {
  try {
    const db = getDb();
    const ref = doc(db, "users", uid, "fields", fieldId, "insights", "latest");
    const snap = await getDoc(ref);
    if (snap.exists()) renderInsight(snap.data());
  } catch {
    // no cached insight yet
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const fieldId = fieldIdFromUrl();
  if (!fieldId) { window.location.href = "app.html"; return; }
  if (!isFirebaseConfigured()) { setStatus("Firebase not configured.", "error"); return; }

  watchAuth(async (user) => {
    if (!user) { window.location.href = "auth.html"; return; }

    try {
      const field = await getField(user.uid, fieldId);
      if (!field) {
        titleEl.textContent = "Field not found";
        setStatus("This field doesn't exist or belongs to another account.", "error");
        return;
      }

      titleEl.textContent = field.name || "Untitled field";
      metaEl.textContent  = `${Number(field.lat).toFixed(4)}, ${Number(field.lon).toFixed(4)}`;
      renderFacts(field);

      createFieldMap("detailMap", { lat: field.lat, lon: field.lon, pickable: false, detailZoom: 14 });

      await loadSavedInsight(user.uid, fieldId);

      // Refresh button
      refreshBtn?.addEventListener("click", async () => {
        refreshBtn.disabled = true;
        setStatus("Fetching NASA data and computing insight…");
        try {
          const result = await callFuseInsight(fieldId, field.lat, field.lon);
          if (result.ok && result.insight) {
            renderInsight(result.insight);
            setStatus("Insight updated.", "ok");
          } else if (result.error === "Rate limited") {
            setStatus(`Rate limited — try again in ${result.retryInMinutes} minute(s).`, "error");
          } else {
            setStatus(result.error || "Could not compute insight.", "error");
          }
        } catch (err) {
          setStatus(err.message || "Network error.", "error");
        } finally {
          refreshBtn.disabled = false;
        }
      });

      // Delete
      deleteBtn?.addEventListener("click", async () => {
        if (!confirm(`Delete "${field.name}"? This cannot be undone.`)) return;
        deleteBtn.disabled = true;
        setStatus("Deleting…");
        try {
          await deleteField(user.uid, fieldId);
          window.location.href = "app.html";
        } catch (err) {
          setStatus(err?.message || "Could not delete field.", "error");
          deleteBtn.disabled = false;
        }
      });
    } catch (err) {
      const msg = err?.code === "permission-denied"
        ? "Firestore permission denied. Deploy firestore.rules."
        : err?.message || "Could not load field.";
      setStatus(msg, "error");
    }
  });
});
