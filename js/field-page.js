import { watchAuth, isFirebaseConfigured } from "./auth.js";
import { getField, deleteField } from "./fields.js";
import { getDb } from "./firebase-db.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { createFieldMap } from "./map.js";
import { callFuseInsight, callFieldTrends } from "./api.js";
import { bindSessionPersistence, restoreScroll } from "./session.js";
import { submitGroundTruth } from "./feedback.js";
import { simulateScenario } from "./scenario.js";
import { assessInsightRisk, confirmRiskyAction } from "./safety.js";
import "./a11y.js";

const titleEl  = document.getElementById("fieldTitle");
const metaEl   = document.getElementById("fieldMeta");
const statusEl = document.getElementById("fieldStatus");
const factsEl  = document.getElementById("fieldFacts");
const deleteBtn  = document.getElementById("deleteFieldBtn");
const refreshBtn = document.getElementById("refreshBtn");
const loadTrendsBtn = document.getElementById("loadTrendsBtn");
const insightCard    = document.getElementById("insightCard");
const insightLevel   = document.getElementById("insightLevel");
const insightTitle   = document.getElementById("insightTitle");
const insightAction  = document.getElementById("insightAction");
const insightMessage = document.getElementById("insightMessage");
const insightWhy     = document.getElementById("insightWhy");
const insightFactors = document.getElementById("insightFactors");
const insightEvidence = document.getElementById("insightEvidence");
const insightRules = document.getElementById("insightRules");
const insightProvenance = document.getElementById("insightProvenance");
const insightConfidenceWrap = document.getElementById("insightConfidenceWrap");
const insightConfidenceLabel = document.getElementById("insightConfidenceLabel");
const insightConfidenceFill = document.getElementById("insightConfidenceFill");
const insightAge     = document.getElementById("insightAge");
const sensitivitySlider = document.getElementById("sensitivitySlider");
const sensitivityValue = document.getElementById("sensitivityValue");
const scenarioForm = document.getElementById("scenarioForm");
const scenarioResult = document.getElementById("scenarioResult");
const feedbackForm = document.getElementById("feedbackForm");
const safetyBanner = document.getElementById("safetyBanner");
const printReportBtn = document.getElementById("printReportBtn");

let latestMetrics = null;
let latestInsight = null;
let ruleSensitivity = Number(localStorage.getItem("prithvi_rule_sensitivity") || "1") || 1;
const metricsGrid    = document.getElementById("metricsGrid");
const satelliteRow   = document.getElementById("satelliteRow");
const satSMAP  = document.getElementById("satSMAP");
const satMODIS = document.getElementById("satMODIS");
const satNote  = document.getElementById("satNote");
const outlookCard = document.getElementById("outlookCard");
const outlookTitle = document.getElementById("outlookTitle");
const outlookMessage = document.getElementById("outlookMessage");
const predRain = document.getElementById("predRain");
const predET = document.getElementById("predET");
const trendExplanations = document.getElementById("trendExplanations");
const historyStrip = document.getElementById("historyStrip");
const historyTrack = document.getElementById("historyTrack");

let currentField = null;
let currentUser = null;

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
  if (level === "action") return "Action needed";
  if (level === "watch")  return "Watch";
  return "Info";
}

function renderInsight(insight) {
  if (!insightCard || !insight) return;
  latestInsight = insight;
  const lvl = insight.level || "info";
  insightCard.className = `insight-card ${levelClass(lvl)}`;
  insightLevel.textContent = levelLabel(lvl);
  insightTitle.textContent = insight.title || "—";
  insightMessage.textContent = insight.message || "";

  const risk = assessInsightRisk(insight);
  if (safetyBanner) {
    if (risk.needsConfirmation) {
      safetyBanner.hidden = false;
      safetyBanner.className = `safety-banner ${risk.escalateToHuman ? "is-high" : "is-action"}`;
      safetyBanner.innerHTML = `
        <strong>${risk.escalateToHuman ? "Human review recommended" : "Confirm before acting"}</strong>
        <p>${esc(risk.reason || "")}</p>
        <p class="safety-disclaimer">${esc(risk.disclaimer)}</p>
        <button type="button" class="app-btn-primary" id="confirmRiskBtn">I understand — mark reviewed</button>`;
      safetyBanner.querySelector("#confirmRiskBtn")?.addEventListener("click", () => {
        if (confirmRiskyAction(risk)) {
          safetyBanner.classList.add("is-confirmed");
          setStatus("Safety confirmation recorded for this session.", "ok");
        }
      });
    } else {
      safetyBanner.hidden = true;
      safetyBanner.innerHTML = "";
    }
  }

  if (insightAction) {
    if (insight.action) {
      insightAction.hidden = false;
      insightAction.textContent = `Action: ${insight.action}`;
    } else {
      insightAction.hidden = true;
    }
  }

  if (insightConfidenceWrap && insightConfidenceLabel && insightConfidenceFill) {
    if (typeof insight.confidence === "number") {
      const pct = Math.round(Math.max(0, Math.min(1, insight.confidence)) * 100);
      insightConfidenceWrap.hidden = false;
      insightConfidenceLabel.textContent = `${pct}%`;
      insightConfidenceFill.style.width = `${pct}%`;
    } else {
      insightConfidenceWrap.hidden = true;
    }
  }

  if (insightWhy) {
    if (insight.why) {
      insightWhy.hidden = false;
      insightWhy.textContent = insight.why;
    } else {
      insightWhy.hidden = true;
    }
  }

  insightFactors.innerHTML = (insight.factors || []).map((f) => `<li>${esc(f)}</li>`).join("");

  if (insightEvidence) {
    const ev = insight.evidence || [];
    if (ev.length) {
      insightEvidence.hidden = false;
      insightEvidence.innerHTML = `
        <p class="insight-evidence-title">Evidence</p>
        <ul>
          ${ev
            .map(
              (e) =>
                `<li><strong>${esc(e.label || e.metric)}</strong>: ${esc(String(e.value))} ${esc(e.unit || "")} <span>(${esc(e.source)})</span></li>`
            )
            .join("")}
        </ul>`;
    } else {
      insightEvidence.hidden = true;
      insightEvidence.innerHTML = "";
    }
  }

  if (insightRules) {
    const traces = insight.ruleTraces || [];
    if (traces.length) {
      insightRules.hidden = false;
      insightRules.innerHTML = `
        <p class="insight-evidence-title">Rule transparency</p>
        <ul class="rule-trace-list">
          ${traces
            .map(
              (r) => `
            <li class="${r.fired ? "rule-fired" : "rule-quiet"}">
              <strong>${esc(r.id)}</strong>
              <span class="rule-flag">${r.fired ? "triggered" : "quiet"}</span>
              <span class="rule-cond">${esc(r.condition || "")}</span>
              <span class="rule-reason">${esc(r.reason || "")}</span>
            </li>`
            )
            .join("")}
        </ul>`;
    } else {
      insightRules.hidden = true;
      insightRules.innerHTML = "";
    }
  }

  if (typeof insight.sensitivity === "number" && sensitivitySlider) {
    sensitivitySlider.value = String(insight.sensitivity);
    if (sensitivityValue) sensitivityValue.textContent = `${Number(insight.sensitivity).toFixed(2)}×`;
  }

  latestMetrics = insight.metrics || latestMetrics;

  if (insightProvenance) {
    const p = insight.provenance || {};
    const sources = p.sources || [];
    if (sources.length || insight.generatedAt) {
      insightProvenance.hidden = false;
      const when = insight.generatedAt
        ? new Date(insight.generatedAt).toLocaleString()
        : "";
      insightProvenance.textContent = [
        sources.length ? `Sources: ${sources.join(" · ")}` : "",
        p.model ? `Model: ${p.model}` : "",
        when ? `Generated: ${when}` : "",
      ]
        .filter(Boolean)
        .join(" · ");
    } else {
      insightProvenance.hidden = true;
    }
  }

  if (insight.generatedAt) {
    insightAge.textContent = `Updated ${new Date(insight.generatedAt).toLocaleString()}`;
  }

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

  const ef = insight.earthFlags || insight.provenance?.earthFlags || {};
  if (satelliteRow) {
    satelliteRow.hidden = false;
    satSMAP.textContent = `SMAP ${ef.smapAvailable ? "yes" : "—"}`;
    satSMAP.className = `sat-chip ${ef.smapAvailable ? "sat-on" : "sat-off"}`;
    satMODIS.textContent = `MODIS ${ef.modisAvailable ? "yes" : "—"}`;
    satMODIS.className = `sat-chip ${ef.modisAvailable ? "sat-on" : "sat-off"}`;
    if (!ef.smapAvailable && !ef.modisAvailable) {
      satNote.textContent = "Connect Earthdata token to enable satellite layers.";
    }
  }
}

function esc(v) {
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function drawSeriesChart(svgId, pastPts, forecastVals) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const past = (pastPts || []).map((p) => Number(p.value)).filter(Number.isFinite);
  const future = (forecastVals || []).map(Number).filter(Number.isFinite);
  const all = [...past, ...future];
  if (!all.length) {
    svg.innerHTML = `<text x="12" y="60" fill="#718096" font-size="12">No data yet — tap Refresh insights or Load trends</text>`;
    return;
  }
  const w = 360, h = 120, pad = 16;
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const totalN = Math.max(past.length + future.length - 1, 1);

  const xAt = (i) => pad + (i / totalN) * (w - pad * 2);
  const yAt = (v) => h - pad - ((v - min) / span) * (h - pad * 2);

  const pastPath = past.map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(" ");
  const futureStart = Math.max(past.length - 1, 0);
  const futurePath = [past[past.length - 1], ...future]
    .filter((v) => v !== undefined)
    .map((v, i) => `${i === 0 ? "M" : "L"} ${xAt(futureStart + i).toFixed(1)} ${yAt(v).toFixed(1)}`)
    .join(" ");

  svg.innerHTML = `
    <defs>
      <linearGradient id="g-${svgId}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#3f9a63" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#3f9a63" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${pastPath}" fill="none" stroke="#0b2417" stroke-width="2.5" class="chart-line past-line"/>
    <path d="${futurePath}" fill="none" stroke="#3f9a63" stroke-width="2.5" stroke-dasharray="6 4" class="chart-line future-line"/>
    ${past.length ? `<circle cx="${xAt(past.length - 1)}" cy="${yAt(past[past.length - 1])}" r="4" fill="#3f9a63" class="chart-dot"/>` : ""}
  `;
}

function renderTrends(data) {
  const outlook = data.outlook || {};
  if (outlookCard) {
    outlookCard.hidden = false;
    outlookCard.className = `outlook-card outlook-${outlook.code || "stable"} reveal-up`;
    outlookTitle.textContent = outlook.title || "—";
    outlookMessage.textContent = outlook.message || "";
    predRain.textContent = `${outlook.predictedRain_mm ?? "—"} mm`;
    predET.textContent = `${outlook.predictedET_mm ?? "—"} mm`;
  }

  if (trendExplanations) {
    trendExplanations.innerHTML = (data.explanations || [])
      .map((t, i) => `<div class="trend-pill reveal-up" style="animation-delay:${i * 80}ms">${t}</div>`)
      .join("");
  }

  drawSeriesChart("rainChart", data.series?.rainfall, data.forecasts?.rainfall);
  drawSeriesChart("tempChart", data.series?.temp, data.forecasts?.temp);

  const snaps = data.historySnapshots || [];
  if (historyStrip && historyTrack) {
    if (snaps.length) {
      historyStrip.hidden = false;
      historyTrack.innerHTML = snaps
        .map(
          (s, i) => `
          <div class="history-chip reveal-up" style="animation-delay:${i * 60}ms">
            <strong>${s.id}</strong>
            <span>${s.hasPower ? "Weather saved" : "Snapshot"}</span>
          </div>`
        )
        .join("");
    } else {
      historyStrip.hidden = true;
    }
  }
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
    // none yet
  }
}

async function loadTrends() {
  if (!currentUser || !currentField) return;
  loadTrendsBtn.disabled = true;
  setStatus("Analysing past weather and forecasting next week…");
  try {
    const data = await callFieldTrends(currentField.id, currentField.lat, currentField.lon);
    if (data.ok) {
      renderTrends(data);
      setStatus("Trend analysis ready.", "ok");
    } else if (data.disabled) {
      setStatus("Trends need Cloud Functions (Blaze). Fields & map still work.", "error");
    } else {
      setStatus(data.error || "Could not load trends.", "error");
    }
  } catch (err) {
    setStatus(err.message || "Trends unavailable until Functions are deployed (Blaze).", "error");
  } finally {
    loadTrendsBtn.disabled = false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const fieldId = fieldIdFromUrl();
  if (!fieldId) { window.location.href = "app.html"; return; }
  if (!isFirebaseConfigured()) { setStatus("Firebase not configured.", "error"); return; }

  watchAuth(async (user) => {
    if (!user) { window.location.href = "auth.html"; return; }
    currentUser = user;

    try {
      const field = await getField(user.uid, fieldId);
      if (!field) {
        titleEl.textContent = "Field not found";
        setStatus("This field doesn't exist or belongs to another account.", "error");
        return;
      }
      currentField = field;
      titleEl.textContent = field.name || "Untitled field";
      metaEl.textContent  = `${Number(field.lat).toFixed(4)}, ${Number(field.lon).toFixed(4)}`;
      renderFacts(field);
      createFieldMap("detailMap", { lat: field.lat, lon: field.lon, pickable: false, detailZoom: 14 });

      await loadSavedInsight(user.uid, fieldId);

      // 2.1 — restore last scroll/section, then keep saving as user browses
      const lv = field.lastView || {};
      restoreScroll(lv.scrollY, lv.section);
      bindSessionPersistence(user.uid, fieldId);

      if (sensitivitySlider) {
        sensitivitySlider.value = String(ruleSensitivity);
        if (sensitivityValue) sensitivityValue.textContent = `${ruleSensitivity.toFixed(2)}×`;
        sensitivitySlider.addEventListener("input", () => {
          ruleSensitivity = Number(sensitivitySlider.value) || 1;
          localStorage.setItem("prithvi_rule_sensitivity", String(ruleSensitivity));
          if (sensitivityValue) sensitivityValue.textContent = `${ruleSensitivity.toFixed(2)}×`;
        });
      }

      scenarioForm?.addEventListener("submit", (e) => {
        e.preventDefault();
        const metrics = latestMetrics || {};
        const result = simulateScenario(metrics, {
          irrigateWhen: document.getElementById("scenarioIrrigate")?.value,
          irrigateMm: document.getElementById("scenarioMm")?.value,
          fertilizerKgHa: document.getElementById("scenarioFert")?.value,
          fieldHa: document.getElementById("scenarioHa")?.value,
        });
        if (!scenarioResult) return;
        scenarioResult.hidden = false;
        scenarioResult.innerHTML = `
          <div class="scenario-grid">
            <div><span>Effective water</span><strong>${result.effectiveWater_mm} mm</strong></div>
            <div><span>Deficit</span><strong>${result.deficit_mm} mm</strong></div>
            <div><span>Stress index</span><strong>${result.stressIndex}</strong></div>
            <div><span>Expected yield</span><strong>${result.expectedYieldKgHa} kg/ha</strong></div>
            <div><span>Yield range (±${result.uncertaintyPct}%)</span><strong>${result.yieldLowKgHa}–${result.yieldHighKgHa}</strong></div>
            <div><span>Yield vs baseline</span><strong>${result.yieldDeltaPct > 0 ? "+" : ""}${result.yieldDeltaPct}%</strong></div>
            <div><span>Est. cost</span><strong>${result.estimatedCost}</strong></div>
            <div><span>Est. revenue</span><strong>${result.expectedRevenue}</strong></div>
            <div><span>ROI</span><strong>${result.roi == null ? "—" : `${(result.roi * 100).toFixed(0)}%`}</strong></div>
          </div>
          <ul>${result.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
          <p class="app-muted">Illustrative heuristic with uncertainty bands — not a full crop model.</p>`;
      });

      printReportBtn?.addEventListener("click", () => {
        document.body.classList.add("print-report");
        window.print();
        setTimeout(() => document.body.classList.remove("print-report"), 300);
      });

      feedbackForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = feedbackForm.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        setStatus("Saving ground-truth feedback…");
        try {
          await submitGroundTruth(user.uid, fieldId, {
            kind: "ground_truth",
            soilMoisture: document.getElementById("fbMoisture")?.value,
            yieldKgHa: document.getElementById("fbYield")?.value,
            irrigated: document.getElementById("fbIrrigated")?.checked,
            notes: document.getElementById("fbNotes")?.value,
            consentShareForCalibration: document.getElementById("fbConsent")?.checked,
            lat: field.lat,
            lon: field.lon,
          });
          feedbackForm.reset();
          setStatus("Thanks — feedback saved for local calibration.", "ok");
        } catch (err) {
          setStatus(err?.message || "Could not save feedback.", "error");
        } finally {
          if (btn) btn.disabled = false;
        }
      });

      // Auto-load trends (non-blocking)
      loadTrends();

      loadTrendsBtn?.addEventListener("click", loadTrends);

      refreshBtn?.addEventListener("click", async () => {
        refreshBtn.disabled = true;
        setStatus("Fetching NASA data and computing insight…");
        try {
          const result = await callFuseInsight(fieldId, field.lat, field.lon, ruleSensitivity);
          if (result.ok && result.insight) {
            renderInsight(result.insight);
            setStatus("Insight updated.", "ok");
            loadTrends();
          } else if (result.disabled) {
            setStatus("NASA insight needs Cloud Functions (Blaze upgrade).", "error");
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
