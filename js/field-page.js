import { watchAuth, isFirebaseConfigured } from "./auth.js";
import { getField, deleteField } from "./fields.js";
import { getDb } from "./firebase-db.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { createFieldMap } from "./map.js?v=sat2";
import { callFuseInsight, callFieldTrends, callSatelliteArchive } from "./api.js";
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
const loadSatArchiveBtn = document.getElementById("loadSatArchiveBtn");
const satProductSelect = document.getElementById("satProductSelect");
const satDaysSelect = document.getElementById("satDaysSelect");
const satCatalog = document.getElementById("satCatalog");
const satGranuleList = document.getElementById("satGranuleList");
const satBrowseEmpty = document.getElementById("satBrowseEmpty");
const satBrowseFigure = document.getElementById("satBrowseFigure");
const satBrowseImg = document.getElementById("satBrowseImg");
const satBrowseCaption = document.getElementById("satBrowseCaption");
const satBrowseLinks = document.getElementById("satBrowseLinks");
const satArchiveStatus = document.getElementById("satArchiveStatus");
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
let archiveData = null;
let selectedGranuleId = null;

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

function addDaysIso(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatChartDate(iso) {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatAxisDate(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Nice round tick values between min/max (inclusive-ish). */
function niceTicks(minVal, maxVal, targetCount = 4) {
  let lo = Number(minVal);
  let hi = Number(maxVal);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [0, 1];
  if (lo === hi) {
    const pad = Math.abs(lo) * 0.1 || 1;
    lo -= pad;
    hi += pad;
  }
  // Prefer including 0 for rainfall-like series that dip near zero
  if (lo > 0 && lo / (hi - lo) < 0.35) lo = 0;

  const span = hi - lo;
  const rough = span / Math.max(targetCount - 1, 1);
  const pow = 10 ** Math.floor(Math.log10(rough || 1));
  const candidates = [1, 2, 2.5, 5, 10].map((m) => m * pow);
  let step = candidates[0];
  for (const c of candidates) {
    if (span / c <= targetCount + 0.5) {
      step = c;
      break;
    }
    step = c;
  }

  const niceMin = Math.floor(lo / step) * step;
  const niceMax = Math.ceil(hi / step) * step;
  const ticks = [];
  // Guard against floating drift
  for (let v = niceMin; v <= niceMax + step * 0.5; v += step) {
    const rounded = Math.round(v / step) * step;
    ticks.push(Number(rounded.toPrecision(12)));
    if (ticks.length > 12) break;
  }
  return ticks.length ? ticks : [lo, hi];
}

function pickXLabelIndexes(n) {
  if (n <= 1) return [0];
  if (n <= 4) return [...Array(n).keys()];
  if (n <= 10) return [0, Math.floor((n - 1) / 2), n - 1];
  const mid1 = Math.floor((n - 1) / 3);
  const mid2 = Math.floor((2 * (n - 1)) / 3);
  return [...new Set([0, mid1, mid2, n - 1])].sort((a, b) => a - b);
}

function drawSeriesChart(svgId, pastPts, forecastVals, opts = {}) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const tip = document.getElementById(`${svgId}Tip`);
  const label = opts.label || "Value";
  const unit = opts.unit || "";
  const decimals = Number.isFinite(opts.decimals) ? opts.decimals : 1;

  const pastItems = (pastPts || [])
    .map((p) => ({
      date: p?.date || null,
      value: Number(p?.value),
      kind: "past",
    }))
    .filter((p) => Number.isFinite(p.value));
  const futureVals = (forecastVals || []).map(Number).filter(Number.isFinite);
  const lastPastDate = pastItems.length ? pastItems[pastItems.length - 1].date : null;
  const futureItems = futureVals.map((value, i) => ({
    date: lastPastDate ? addDaysIso(lastPastDate, i + 1) : null,
    value,
    kind: "forecast",
  }));

  const points = [...pastItems, ...futureItems];
  if (!points.length) {
    svg.innerHTML = `<text x="12" y="72" fill="#718096" font-size="12">No data yet — tap Refresh insights or Load trends</text>`;
    if (tip) tip.hidden = true;
    return;
  }

  const w = 360;
  const h = 150;
  const padL = 38;
  const padR = 14;
  const padT = 14;
  const padB = 28;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const values = points.map((p) => p.value);
  const yTicks = niceTicks(Math.min(...values), Math.max(...values), 5);
  const yMin = yTicks[0];
  const yMax = yTicks[yTicks.length - 1];
  const span = yMax - yMin || 1;
  const totalN = Math.max(points.length - 1, 1);
  const xAt = (i) => padL + (i / totalN) * plotW;
  const yAt = (v) => padT + (1 - (v - yMin) / span) * plotH;

  const pastPath = pastItems
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(p.value).toFixed(1)}`)
    .join(" ");
  const futureStart = Math.max(pastItems.length - 1, 0);
  const futurePath = [pastItems[pastItems.length - 1], ...futureItems]
    .filter(Boolean)
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(futureStart + i).toFixed(1)} ${yAt(p.value).toFixed(1)}`)
    .join(" ");

  const hGrid = yTicks
    .map((tick) => {
      const y = yAt(tick).toFixed(1);
      const isZero = Math.abs(tick) < 1e-9;
      return `
        <line class="chart-grid-h${isZero ? " is-zero" : ""}" x1="${padL}" y1="${y}" x2="${w - padR}" y2="${y}" />
        <text class="chart-axis-y" x="${padL - 6}" y="${y}" dy="0.35em" text-anchor="end">${tick.toFixed(decimals)}</text>
      `;
    })
    .join("");

  // Vertical grid at a subset of points (not every day when dense)
  const vStep = points.length > 24 ? 4 : points.length > 14 ? 2 : 1;
  const vGrid = points
    .map((_, i) => {
      if (i % vStep !== 0 && i !== points.length - 1) return "";
      const x = xAt(i).toFixed(1);
      return `<line class="chart-grid-v" x1="${x}" y1="${padT}" x2="${x}" y2="${h - padB}" />`;
    })
    .join("");

  const xLabelIdx = pickXLabelIndexes(points.length);
  const xLabels = xLabelIdx
    .map((i) => {
      const x = xAt(i).toFixed(1);
      const anchor = i === 0 ? "start" : i === points.length - 1 ? "end" : "middle";
      return `<text class="chart-axis-x" x="${x}" y="${h - 8}" text-anchor="${anchor}">${esc(formatAxisDate(points[i].date))}</text>`;
    })
    .join("");

  // Divider between past and forecast
  let forecastDivider = "";
  if (pastItems.length && futureItems.length) {
    const x = xAt(pastItems.length - 1).toFixed(1);
    forecastDivider = `
      <line class="chart-forecast-divider" x1="${x}" y1="${padT}" x2="${x}" y2="${h - padB}" />
      <text class="chart-forecast-label" x="${Math.min(Number(x) + 4, w - padR - 2)}" y="${padT + 10}">Forecast</text>
    `;
  }

  const unitLabel = unit
    ? `<text class="chart-unit-label" x="${padL}" y="${padT - 3}">${esc(unit)}</text>`
    : "";

  const dots = points
    .map((p, i) => {
      const cx = xAt(i).toFixed(1);
      const cy = yAt(p.value).toFixed(1);
      const fill = p.kind === "forecast" ? "#3f9a63" : "#0b2417";
      return `
        <circle class="chart-point" data-i="${i}" cx="${cx}" cy="${cy}" r="3.2" fill="${fill}" />
        <circle class="chart-hit" data-i="${i}" cx="${cx}" cy="${cy}" r="10" fill="transparent" tabindex="0" role="img" aria-label="${esc(label)} ${p.value.toFixed(decimals)}${unit ? ` ${unit}` : ""} on ${esc(formatChartDate(p.date))}" />
      `;
    })
    .join("");

  // Clone-replace to drop previous listeners when trends re-render
  const fresh = svg.cloneNode(false);
  fresh.setAttribute("viewBox", `0 0 ${w} ${h}`);
  fresh.innerHTML = `
    <rect class="chart-plot-bg" x="${padL}" y="${padT}" width="${plotW}" height="${plotH}" />
    ${hGrid}
    ${vGrid}
    ${forecastDivider}
    <line class="chart-axis-line" x1="${padL}" y1="${padT}" x2="${padL}" y2="${h - padB}" />
    <line class="chart-axis-line" x1="${padL}" y1="${h - padB}" x2="${w - padR}" y2="${h - padB}" />
    ${unitLabel}
    ${xLabels}
    <line class="chart-crosshair" x1="0" y1="${padT}" x2="0" y2="${h - padB}" stroke="#2f855a" stroke-width="1" stroke-dasharray="3 3" opacity="0" />
    <path d="${pastPath}" fill="none" stroke="#0b2417" stroke-width="2.5" class="chart-line past-line"/>
    <path d="${futurePath}" fill="none" stroke="#3f9a63" stroke-width="2.5" stroke-dasharray="6 4" class="chart-line future-line"/>
    ${dots}
  `;
  svg.replaceWith(fresh);
  const liveSvg = document.getElementById(svgId) || fresh;
  const liveTip = document.getElementById(`${svgId}Tip`);
  const liveCross = liveSvg.querySelector(".chart-crosshair");
  const livePoints = [...liveSvg.querySelectorAll(".chart-point")];

  const hideTip = () => {
    if (liveTip) liveTip.hidden = true;
    if (liveCross) liveCross.setAttribute("opacity", "0");
    livePoints.forEach((el) => el.classList.remove("is-active"));
  };

  const showPoint = (i) => {
    const p = points[i];
    if (!p || !liveTip) return;
    const cx = xAt(i);
    const cy = yAt(p.value);
    const kindLabel = p.kind === "forecast" ? "Forecast" : "Observed";
    const valueText = `${p.value.toFixed(decimals)}${unit ? ` ${unit}` : ""}`;
    liveTip.hidden = false;
    liveTip.innerHTML = `
      <strong>${esc(label)}</strong>
      <span class="chart-tip-value">${esc(valueText)}</span>
      <span class="chart-tip-meta">${esc(formatChartDate(p.date))} · ${esc(kindLabel)}</span>
    `;
    const rect = liveSvg.getBoundingClientRect();
    const left = Math.min(Math.max(cx * (rect.width / w), 56), Math.max(rect.width - 56, 56));
    const top = Math.max(cy * (rect.height / h) - 12, 18);
    liveTip.style.left = `${left}px`;
    liveTip.style.top = `${top}px`;
    if (liveCross) {
      liveCross.setAttribute("x1", cx.toFixed(1));
      liveCross.setAttribute("x2", cx.toFixed(1));
      liveCross.setAttribute("opacity", "1");
    }
    livePoints.forEach((el) => el.classList.toggle("is-active", Number(el.dataset.i) === i));
  };

  const nearestIndex = (clientX) => {
    const rect = liveSvg.getBoundingClientRect();
    if (!rect.width) return 0;
    const x = ((clientX - rect.left) / rect.width) * w;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(xAt(i) - x);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  };

  const onMove = (evt) => {
    const clientX = evt.touches?.[0]?.clientX ?? evt.clientX;
    if (clientX == null) return;
    showPoint(nearestIndex(clientX));
  };

  liveSvg.addEventListener("mousemove", onMove);
  liveSvg.addEventListener("mouseleave", hideTip);
  liveSvg.addEventListener("touchstart", onMove, { passive: true });
  liveSvg.addEventListener("touchmove", onMove, { passive: true });
  liveSvg.addEventListener("touchend", hideTip);
  liveSvg.querySelectorAll(".chart-hit").forEach((hit) => {
    hit.addEventListener("mouseenter", () => showPoint(Number(hit.dataset.i)));
    hit.addEventListener("focus", () => showPoint(Number(hit.dataset.i)));
    hit.addEventListener("blur", hideTip);
  });
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

  drawSeriesChart("rainChart", data.series?.rainfall, data.forecasts?.rainfall, {
    label: "Rainfall",
    unit: "mm",
    decimals: 1,
  });
  drawSeriesChart("tempChart", data.series?.temp, data.forecasts?.temp, {
    label: "Temperature",
    unit: "°C",
    decimals: 1,
  });

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
  if (loadTrendsBtn) loadTrendsBtn.disabled = true;
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
    if (loadTrendsBtn) loadTrendsBtn.disabled = false;
  }
}

function setArchiveStatus(msg) {
  if (satArchiveStatus) satArchiveStatus.textContent = msg || "";
}

function renderCatalog(catalog) {
  if (!satCatalog || !catalog) return;
  const keys = Object.keys(catalog);
  if (!keys.length) {
    satCatalog.hidden = true;
    satCatalog.innerHTML = "";
    return;
  }
  satCatalog.hidden = false;
  satCatalog.innerHTML = keys
    .map((key) => {
      const c = catalog[key];
      const hits = c.hits != null ? `${c.hits} scene(s)` : c.available ? "available" : "n/a";
      const active = (satProductSelect?.value || "modis_terra") === key ? " is-active" : "";
      return `<button type="button" class="sat-catalog-chip${active}" data-product="${esc(key)}" title="${esc(c.description || "")}">
        <strong>${esc(c.label || key)}</strong>
        <span>${esc(hits)}</span>
      </button>`;
    })
    .join("");
  satCatalog.querySelectorAll("[data-product]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!satProductSelect) return;
      satProductSelect.value = btn.dataset.product;
      loadSatelliteArchive();
    });
  });
}

function selectGranule(id) {
  selectedGranuleId = id;
  const g = archiveData?.granules?.find((x) => x.id === id);
  satGranuleList?.querySelectorAll(".sat-granule").forEach((el) => {
    el.classList.toggle("is-active", el.dataset.id === id);
  });
  if (!g) return;

  if (g.browseUrl && satBrowseImg && satBrowseFigure && satBrowseEmpty) {
    satBrowseEmpty.hidden = true;
    satBrowseFigure.hidden = false;
    satBrowseImg.src = g.browseUrl;
    satBrowseImg.alt = `Browse preview: ${g.title || "NASA granule"}`;
  } else if (satBrowseEmpty && satBrowseFigure) {
    satBrowseFigure.hidden = true;
    satBrowseEmpty.hidden = false;
    satBrowseEmpty.textContent = "No browse preview for this granule. Use the data link below if available.";
  }

  const when = g.timeStart ? new Date(g.timeStart).toLocaleString() : "unknown date";
  if (satBrowseCaption) {
    satBrowseCaption.textContent = [
      g.title || "Granule",
      when,
      g.cloudCover != null && Number.isFinite(g.cloudCover) ? `cloud ${g.cloudCover}%` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  if (satBrowseLinks) {
    const links = [];
    if (g.browseUrl) {
      links.push(`<a href="${esc(g.browseUrl)}" target="_blank" rel="noopener noreferrer">Open browse image</a>`);
    }
    if (g.dataUrl) {
      links.push(`<a href="${esc(g.dataUrl)}" target="_blank" rel="noopener noreferrer">Earthdata data link</a>`);
    }
    satBrowseLinks.innerHTML = links.join(" · ") || "";
  }
}

function renderArchive(data) {
  archiveData = data;
  renderCatalog(data.catalog);

  if (!satGranuleList) return;
  satGranuleList.innerHTML = "";

  const granules = data.granules || [];
  if (!granules.length) {
    if (satBrowseEmpty && satBrowseFigure) {
      satBrowseFigure.hidden = true;
      satBrowseEmpty.hidden = false;
      satBrowseEmpty.textContent =
        data.message || data.note || "No granules found for this product/window. Try a longer lookback or another mission.";
    }
    if (satBrowseCaption) satBrowseCaption.textContent = "";
    if (satBrowseLinks) satBrowseLinks.innerHTML = "";
    return;
  }

  granules.forEach((g, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sat-granule" + (idx === 0 ? " is-active" : "");
    btn.dataset.id = g.id;
    const when = g.timeStart ? new Date(g.timeStart).toLocaleDateString() : "—";
    btn.innerHTML = `
      <strong>${esc(when)}</strong>
      <span>${esc((g.title || "").slice(0, 42))}${g.title && g.title.length > 42 ? "…" : ""}</span>
      <small>${g.browseUrl ? "Browse preview" : "Metadata only"}</small>
    `;
    btn.addEventListener("click", () => selectGranule(g.id));
    satGranuleList.appendChild(btn);
  });

  selectGranule(granules[0].id);
}

async function loadSatelliteArchive() {
  if (!currentUser || !currentField) return;
  if (loadSatArchiveBtn) loadSatArchiveBtn.disabled = true;
  setArchiveStatus("Searching NASA CMR for past scenes…");
  try {
    const product = satProductSelect?.value || "modis_terra";
    const days = Number(satDaysSelect?.value || 90);
    const data = await callSatelliteArchive(currentField.lat, currentField.lon, { product, days });
    if (data.ok) {
      renderArchive(data);
      const label = data.productMeta?.label || data.product || product;
      setArchiveStatus(
        `${label}: ${data.count ?? data.granules?.length ?? 0} scene(s) in the last ${data.days || days} days.`
      );
    } else if (data.disabled) {
      setArchiveStatus("Satellite archive needs Cloud Functions (Blaze).");
    } else if (data.reason === "token_placeholder") {
      setArchiveStatus(data.message || "Earthdata token required for satellite archive.");
    } else {
      setArchiveStatus(data.error || data.message || "Could not load satellite archive.");
      if (data.catalog) renderCatalog(data.catalog);
    }
  } catch (err) {
    setArchiveStatus(err.message || "Satellite archive unavailable.");
  } finally {
    if (loadSatArchiveBtn) loadSatArchiveBtn.disabled = false;
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

      // Auto-load trends + satellite archive (non-blocking)
      loadTrends();
      loadSatelliteArchive();

      loadTrendsBtn?.addEventListener("click", loadTrends);
      loadSatArchiveBtn?.addEventListener("click", loadSatelliteArchive);
      satProductSelect?.addEventListener("change", loadSatelliteArchive);
      satDaysSelect?.addEventListener("change", loadSatelliteArchive);

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
