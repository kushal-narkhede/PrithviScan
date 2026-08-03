import { watchAuth, isFirebaseConfigured } from "./auth.js";
import { getField, deleteField, updateField } from "./fields.js?v=region1";
import { getDb } from "./firebase-db.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";
import { createFieldMap } from "./map.js?v=region1";
import {
  callFuseInsight,
  callFieldTrends,
  callSatelliteArchive,
  callFieldHealth,
  callSnapFieldBoundary,
  callFieldTomorrowWeather,
} from "./api.js?v=tmrw2";
import {
  healthFromNdvi,
  saveHealthSnapshot,
  listHealthSnapshots,
  detectChange,
} from "./field-health.js";
import {
  buildPrescription,
  prescriptionToCsv,
  prescriptionToGeoJson,
  downloadText,
  savePrescription,
} from "./prescriptions.js";
import { applyI18n, t } from "./i18n.js";
import { cacheFieldOffline } from "./offline-cache.js";
import { bindSessionPersistence, restoreScroll } from "./session.js";
import { submitGroundTruth, compressPhotoToDataUrl } from "./feedback.js";
import { simulateScenario } from "./scenario.js";
import { assessInsightRisk, confirmRiskyAction } from "./safety.js";
import { matchCropGuide, predictHarvest, listGuideOptions } from "./crop-guides.js";
import {
  fertilizerOptions,
  machineOptions,
  addFieldUsage,
  listFieldUsages,
  deleteFieldUsage,
} from "./field-inputs.js";
import { mapsLink, formatDistance } from "./nearby-markets.js";
import { marketplaceIntel } from "./marketplace-intel.js";
import { startVoiceAssistant } from "./voice-assistant.js";
import { getCropPrices, formatCurrency } from "./market-prices.js";
import { detectRegion, getRegionMeta, regionBadgeLabel } from "./region.js";
import { loadUrtcSuite } from "./urtc-suite.js?v=urtc1";
import {
  renderSoilMoisture,
  renderSoilIntel,
  renderRisks,
  renderIrrigation,
  renderYield,
  renderFertOpt,
  renderMachinery,
  renderCropRec,
  renderCarbon,
  renderRiskZones,
  fuelCostEstimate,
} from "./urtc-field-ui.js?v=urtc1";
import { renderTomorrowWeather } from "./tomorrow-weather.js?v=tmrw2";
import { createTask } from "./tasks.js";
import { getUserMeta } from "./org.js";
import "./a11y.js";

const titleEl  = document.getElementById("fieldTitle");
const metaEl   = document.getElementById("fieldMeta");
const statusEl = document.getElementById("fieldStatus");
const factsEl  = document.getElementById("fieldFacts");
const deleteBtn  = document.getElementById("deleteFieldBtn");
const refreshBtn = document.getElementById("refreshBtn");
const loadTrendsBtn = document.getElementById("loadTrendsBtn");
const loadTomorrowBtn = document.getElementById("loadTomorrowBtn");
const tomorrowWeatherCard = document.getElementById("tomorrowWeatherCard");
const tomorrowWeatherStatus = document.getElementById("tomorrowWeatherStatus");
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
const cropPlanForm = document.getElementById("cropPlanForm");
const fieldCropInput = document.getElementById("fieldCropInput");
const fieldSownAt = document.getElementById("fieldSownAt");
const cropGuideList = document.getElementById("cropGuideList");
const cropGuideBody = document.getElementById("cropGuideBody");
const cropGuideEmpty = document.getElementById("cropGuideEmpty");
const cropInfoLink = document.getElementById("cropInfoLink");
const harvestCard = document.getElementById("harvestCard");
const harvestTitle = document.getElementById("harvestTitle");
const harvestMessage = document.getElementById("harvestMessage");
const harvestProgressFill = document.getElementById("harvestProgressFill");
const harvestElapsed = document.getElementById("harvestElapsed");
const harvestExpected = document.getElementById("harvestExpected");
const harvestWindow = document.getElementById("harvestWindow");
const harvestStage = document.getElementById("harvestStage");
const harvestNote = document.getElementById("harvestNote");
const fieldInputForm = document.getElementById("fieldInputForm");
const inputKind = document.getElementById("inputKind");
const inputItem = document.getElementById("inputItem");
const inputItemLabel = document.getElementById("inputItemLabel");
const inputOtherNameLabel = document.getElementById("inputOtherNameLabel");
const inputOtherName = document.getElementById("inputOtherName");
const inputQty = document.getElementById("inputQty");
const inputAppliedAt = document.getElementById("inputAppliedAt");
const inputNotes = document.getElementById("inputNotes");
const usageList = document.getElementById("usageList");
const usageEmpty = document.getElementById("usageEmpty");
const usageTotal = document.getElementById("usageTotal");
const marketList = document.getElementById("marketList");
const marketMspNote = document.getElementById("marketMspNote");
const fieldTools = document.getElementById("fieldTools");
const fieldToolHint = document.getElementById("fieldToolHint");

let latestMetrics = null;
let latestInsight = null;
let activeGuide = null;
let fieldUsages = [];
let detailMapApi = null;
let activeTool = null;
let pendingMapField = null;

function fieldRegion(field = currentField) {
  if (!field) return "IN";
  if (field.region === "US" || field.region === "IN") return field.region;
  return detectRegion(Number(field.lat), Number(field.lon));
}

const TOOL_IDS = [
  "health",
  "satellite",
  "weather",
  "soil",
  "risks",
  "irrigate",
  "advisor",
  "crop",
  "inputs",
  "markets",
  "tools",
  "location",
  "drone",
];
let latestHealth = null;
let healthSnapshots = [];
let healthMapApi = null;
let latestUrtc = null;
let riskMapApi = null;
let boundaryLayer = null;
let drawPoints = [];
let drawHandler = null;
let pendingBoundaryFeature = null;

function ensureDetailMap() {
  if (detailMapApi || !pendingMapField) return;
  try {
    detailMapApi = createFieldMap("detailMap", {
      lat: pendingMapField.lat,
      lon: pendingMapField.lon,
      pickable: false,
      detailZoom: 14,
    });
  } catch {
    detailMapApi = null;
  }
}

function ensureRiskMap() {
  if (!currentField) return;
  if (!riskMapApi) {
    try {
      riskMapApi = createFieldMap("riskMap", {
        lat: currentField.lat,
        lon: currentField.lon,
        pickable: false,
        detailZoom: 14,
      });
    } catch {
      riskMapApi = null;
    }
  }
  requestAnimationFrame(() => {
    riskMapApi?.invalidateSize?.() || riskMapApi?.map?.invalidateSize?.();
    if (latestUrtc?.risks) renderRiskZones(riskMapApi, latestUrtc.risks);
  });
}

async function ensureUrtcSuite(force = false) {
  if (!currentField) return null;
  if (latestUrtc && !force) {
    paintUrtcPanels(latestUrtc);
    return latestUrtc;
  }
  setStatus("Computing soil, risk, irrigation & yield suite…");
  const guide = matchCropGuide(currentField.cropType);
  const region = fieldRegion(currentField);
  const budgetEl = document.getElementById("advisorBudget");
  const stageEl = document.getElementById("advisorStage");
  if (budgetEl && !budgetEl.dataset.primed) {
    budgetEl.value = region === "US" ? "250" : "50000";
    budgetEl.dataset.primed = "1";
  }
  const fertKgHa = fieldUsages
    .filter((u) => u.kind === "fertilizer")
    .reduce((a, u) => a + (Number(u.qty) || 0) * 10, 0);
  const hoursLogged = fieldUsages
    .filter((u) => u.kind === "machine")
    .reduce((a, u) => a + (Number(u.qty) || 0), 0);
  try {
    const suite = await loadUrtcSuite(currentField, {
      cropId: guide?.mspId || "wheat",
      cropStage: stageEl?.value || "vegetative",
      fieldHa: Number(document.getElementById("scenarioHa")?.value) || 1,
      fertKgHa,
      hoursLogged,
      budget: Number(budgetEl?.value) || (region === "US" ? 250 : 50000),
      ndvi: latestHealth?.ndvi ?? null,
      durationTypical: guide?.durationDays?.typical || 120,
      metrics: latestMetrics || {},
    });
    latestUrtc = suite;
    paintUrtcPanels(suite);
    setStatus(`URTC suite ready (${suite.source || "cloud"}).`, "ok");
    return suite;
  } catch (err) {
    setStatus(err?.message || "Could not compute URTC suite.", "error");
    return null;
  }
}

function paintUrtcPanels(suite) {
  if (!suite) return;
  const region = fieldRegion();
  renderSoilMoisture(document.getElementById("soilMoistureCard"), suite.soilMoisture);
  renderSoilIntel(document.getElementById("soilIntelCard"), suite.soilIntelligence);
  const soilProv = document.getElementById("soilProvenance");
  if (soilProv) {
    soilProv.textContent = `Generated ${suite.generatedAt || ""} · ${suite.modelVersion || ""}`;
  }
  renderRisks(document.getElementById("riskSuiteCard"), suite.risks, {
    onAction: (riskId, title) => createRiskTask(riskId, title),
  });
  const riskProv = document.getElementById("riskProvenance");
  if (riskProv && suite.risks?.provenance) {
    riskProv.textContent = `Inputs: ${JSON.stringify(suite.risks.provenance.inputs || {})}`;
  }
  renderIrrigation(document.getElementById("irrigationCard"), suite.irrigation, region);
  const irrBtn = document.getElementById("createIrrigateTaskBtn");
  if (irrBtn) {
    irrBtn.hidden = !suite.irrigation?.taskSuggestion;
  }
  renderYield(document.getElementById("yieldCard"), suite.yield, region);
  renderFertOpt(document.getElementById("fertOptCard"), suite.fertilizer, region);
  renderMachinery(document.getElementById("machineryCard"), suite.machinery, region);
  renderCropRec(document.getElementById("cropRecCard"), suite.cropRecommendation, region);
  renderCarbon(document.getElementById("carbonCard"), suite.carbonClimate, region);
  if (suite.yield?.summary && metaEl && currentField) {
    const y = suite.yield;
    metaEl.textContent = `${Number(currentField.lat).toFixed(4)}, ${Number(currentField.lon).toFixed(4)} · ${regionBadgeLabel(region)} · Yield ~${y.expectedKgHa} kg/ha`;
  }
}

async function createRiskTask(riskId, title) {
  if (!currentUser || !currentField) return;
  const orgId = currentField.orgId || currentMeta?.orgId;
  if (!orgId) {
    setStatus("Join an organization to create Action Center tasks.", "error");
    return;
  }
  try {
    await createTask(
      orgId,
      currentUser,
      {
        type: riskId === "disease" || riskId === "pest" ? "spray" : "scout",
        title: `${title} — ${currentField.name || "field"}`,
        fieldId: currentField.id,
        fieldName: currentField.name,
        note: `Auto from risk suite (${riskId})`,
        dueAt: new Date().toISOString().slice(0, 10),
      },
      currentMeta?.orgRole || "scout"
    );
    setStatus("Task created in Action Center.", "ok");
  } catch (err) {
    setStatus(err?.message || "Could not create task.", "error");
  }
}

function renderCropHistoryUI() {
  const list = document.getElementById("cropHistoryList");
  const note = document.getElementById("cropRotationNote");
  if (!list || !currentField) return;
  const history = Array.isArray(currentField.cropHistory) ? currentField.cropHistory : [];
  list.innerHTML = history.length
    ? history
        .map((h) => `<li><strong>${esc(h.season)}</strong> — ${esc(h.crop)}</li>`)
        .join("")
    : `<li class="app-muted">No seasons logged yet.</li>`;
  if (note) {
    const last = history[0]?.crop || currentField.cropType || "";
    const guide = matchCropGuide(last);
    note.textContent = last
      ? `Rotation tip: avoid repeating ${last} back-to-back when possible. Typical recovery ${guide?.durationDays?.typical ? "one season fallow or pulse break" : "1 season"} before heavy feeders.`
      : "Log past seasons to get rotation suggestions.";
  }
}

function wireUrtcControls(user) {
  document.getElementById("refreshUrtcBtn")?.addEventListener("click", () => ensureUrtcSuite(true));
  document.getElementById("runAdvisorBtn")?.addEventListener("click", () => ensureUrtcSuite(true));

  document.getElementById("createIrrigateTaskBtn")?.addEventListener("click", async () => {
    const task = latestUrtc?.irrigation?.taskSuggestion;
    if (!task || !currentField) return;
    const orgId = currentField.orgId || currentMeta?.orgId;
    if (!orgId) {
      setStatus("Join an organization to create irrigate tasks.", "error");
      return;
    }
    try {
      await createTask(
        orgId,
        user,
        {
          type: "irrigate",
          title: task.title,
          fieldId: currentField.id,
          fieldName: currentField.name,
          dueAt: task.dueAt,
          note: latestUrtc?.irrigation?.summary || "",
        },
        currentMeta?.orgRole || "scout"
      );
      setStatus("Irrigate task created.", "ok");
    } catch (err) {
      setStatus(err?.message || "Could not create task.", "error");
    }
  });

  document.getElementById("cropHistoryForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentField || !user) return;
    const season = document.getElementById("cropHistSeason")?.value?.trim();
    const crop = document.getElementById("cropHistCrop")?.value?.trim();
    if (!season || !crop) return;
    const next = [{ season, crop, at: new Date().toISOString() }, ...(currentField.cropHistory || [])].slice(0, 12);
    try {
      await updateField(user.uid, currentField.id, { cropHistory: next }, { orgId: currentField.orgId });
      currentField = { ...currentField, cropHistory: next };
      renderCropHistoryUI();
      document.getElementById("cropHistSeason").value = "";
      document.getElementById("cropHistCrop").value = "";
      setStatus("Crop history updated.", "ok");
    } catch (err) {
      setStatus(err?.message || "Could not save crop history.", "error");
    }
  });

  document.getElementById("drawBoundaryBtn")?.addEventListener("click", () => {
    ensureDetailMap();
    const map = detailMapApi?.map;
    if (!map) {
      setStatus("Open location map first.", "error");
      return;
    }
    drawPoints = [];
    if (boundaryLayer) {
      try {
        map.removeLayer(boundaryLayer);
      } catch {
        /* ignore */
      }
      boundaryLayer = null;
    }
    if (drawHandler) map.off("click", drawHandler);
    setStatus("Click 3+ points on the map to outline the field, then Snap.", "ok");
    drawHandler = (ev) => {
      drawPoints.push([ev.latlng.lng, ev.latlng.lat]);
      if (boundaryLayer) map.removeLayer(boundaryLayer);
        if (drawPoints.length >= 2) {
        const latlngs = drawPoints.map(([lng, lat]) => [lat, lng]);
        const Leaflet = window.L;
        if (!Leaflet) return;
        boundaryLayer = Leaflet.polyline(latlngs, { color: "#276749", weight: 2 }).addTo(map);
      }
      document.getElementById("boundaryNote").textContent = `${drawPoints.length} vertex point(s)`;
    };
    map.on("click", drawHandler);
  });

  document.getElementById("snapBoundaryBtn")?.addEventListener("click", async () => {
    if (!currentField) return;
    setStatus("Snapping boundary…");
    try {
      const polygon = drawPoints.length >= 3 ? [...drawPoints, drawPoints[0]] : null;
      const res = await callSnapFieldBoundary({
        lat: currentField.lat,
        lon: currentField.lon,
        polygon,
      });
      if (!res?.ok || !res.feature) throw new Error(res?.error || "Snap failed");
      pendingBoundaryFeature = res.feature;
      ensureDetailMap();
      const map = detailMapApi?.map;
      if (map && res.feature.geometry?.coordinates?.[0]) {
        const Leaflet = window.L;
        if (!Leaflet) throw new Error("Leaflet failed to load");
        if (boundaryLayer) map.removeLayer(boundaryLayer);
        const ring = res.feature.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
        boundaryLayer = Leaflet.polygon(ring, { color: "#2f855a", weight: 2, fillOpacity: 0.15 }).addTo(map);
        map.fitBounds(boundaryLayer.getBounds(), { padding: [20, 20] });
      }
      document.getElementById("saveBoundaryBtn").hidden = false;
      document.getElementById("boundaryNote").textContent =
        res.feature.properties?.note || "Boundary snapped (heuristic).";
      setStatus("Boundary snapped — save to keep it on this field.", "ok");
    } catch (err) {
      setStatus(err?.message || "Boundary snap failed.", "error");
    }
  });

  document.getElementById("saveBoundaryBtn")?.addEventListener("click", async () => {
    if (!pendingBoundaryFeature || !currentField || !user) return;
    try {
      await updateField(
        user.uid,
        currentField.id,
        { boundary: pendingBoundaryFeature },
        { orgId: currentField.orgId }
      );
      currentField = { ...currentField, boundary: pendingBoundaryFeature };
      setStatus("Field boundary saved.", "ok");
    } catch (err) {
      setStatus(err?.message || "Could not save boundary.", "error");
    }
  });

  document.getElementById("droneFileInput")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.getElementById("droneCanvas");
      const out = document.getElementById("droneResult");
      if (!canvas || !out) return;
      canvas.hidden = false;
      const w = Math.min(640, img.width);
      const h = Math.round((img.height / img.width) * w);
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h);
      let veg = 0;
      let warm = 0;
      for (let i = 0; i < data.data.length; i += 16) {
        const r = data.data[i];
        const g = data.data[i + 1];
        const b = data.data[i + 2];
        if (g > r + 10 && g > b) {
          veg += 1;
          data.data[i] = 20;
          data.data[i + 1] = Math.min(255, g + 40);
          data.data[i + 2] = 40;
        } else if (r > g + 20) {
          warm += 1;
          data.data[i] = 220;
          data.data[i + 1] = 80;
          data.data[i + 2] = 60;
        }
      }
      ctx.putImageData(data, 0, 0);
      const samples = Math.floor(data.data.length / 16);
      const ndviProxy = Number((veg / Math.max(samples, 1)).toFixed(2));
      const pestProxy = Number((warm / Math.max(samples, 1)).toFixed(2));
      out.hidden = false;
      out.innerHTML = `
        <h3>Simulated drone analytics</h3>
        <p>Stitching: single-frame simulation. High-res NDVI proxy <strong>${ndviProxy}</strong>. Pest/stress spots proxy <strong>${pestProxy}</strong>.</p>
        <p class="app-muted">Simulation only — not live drone control. Model drone_sim_v1.</p>`;
      URL.revokeObjectURL(url);
      setStatus("Drone simulation complete.", "ok");
    };
    img.src = url;
  });

  // Machinery fuel estimator note under inputs
  const usageTotal = document.getElementById("usageTotal");
  if (usageTotal && !document.getElementById("fuelEstimateNote")) {
    const note = document.createElement("p");
    note.id = "fuelEstimateNote";
    note.className = "app-muted";
    const fuel = fuelCostEstimate({ hours: 2, region: fieldRegion() });
    note.textContent = `Machinery tip: ${fuel.label}. Schedule maintenance after ~50 hire hours.`;
    usageTotal.after(note);
  }

  document.getElementById("voiceAssistBtn")?.addEventListener("click", () => {
    startVoiceAssistant({
      onStatus: (msg) => setStatus(msg),
      onCommand: (cmd) => {
        if (cmd.action === "openTool") showFieldTool(cmd.tool);
        else if (cmd.action === "navigate" && cmd.href) window.location.href = cmd.href;
      },
    });
  });

  document.getElementById("fbPhoto")?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    const note = document.getElementById("fbPhotoNote");
    if (note) note.textContent = file ? `Selected: ${file.name}` : "";
  });
}

function showFieldTool(toolId, { updateHash = true } = {}) {
  const next = TOOL_IDS.includes(toolId) ? toolId : null;
  activeTool = next;

  document.querySelectorAll(".field-tool-panel").forEach((panel) => {
    const match = next && panel.dataset.toolPanel === next;
    panel.hidden = !match;
  });

  fieldTools?.querySelectorAll(".field-tool-btn").forEach((btn) => {
    const on = btn.dataset.tool === next;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });

  if (fieldToolHint) fieldToolHint.hidden = Boolean(next);

  if (updateHash) {
    const url = new URL(window.location.href);
    if (next) url.hash = next;
    else url.hash = "";
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }

  if (next === "location") {
    ensureDetailMap();
    renderCropHistoryUI();
    requestAnimationFrame(() => {
      detailMapApi?.map?.invalidateSize?.();
      setTimeout(() => detailMapApi?.map?.invalidateSize?.(), 120);
    });
  }

  if (next === "health") {
    loadFieldHealth();
    requestAnimationFrame(() => {
      healthMapApi?.map?.invalidateSize?.();
    });
  }

  if (next === "soil" || next === "risks" || next === "irrigate" || next === "advisor") {
    ensureUrtcSuite().then(() => {
      if (next === "risks") ensureRiskMap();
    });
  }

  if (next === "weather") {
    loadTomorrowWeather();
    // Charts need a layout pass after becoming visible
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
  }

  if (next) {
    const panel = document.querySelector(`[data-tool-panel="${next}"]`);
    panel?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function bindFieldTools() {
  fieldTools?.querySelectorAll(".field-tool-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tool = btn.dataset.tool;
      // Toggle off if clicking the active tool again
      showFieldTool(activeTool === tool ? null : tool);
    });
  });

  const hashTool = window.location.hash.replace(/^#/, "");
  if (TOOL_IDS.includes(hashTool)) {
    showFieldTool(hashTool, { updateHash: false });
  }

  window.addEventListener("hashchange", () => {
    const tool = window.location.hash.replace(/^#/, "");
    if (!tool) showFieldTool(null, { updateHash: false });
    else if (TOOL_IDS.includes(tool)) showFieldTool(tool, { updateHash: false });
  });

  document.getElementById("loadHealthBtn")?.addEventListener("click", () => loadFieldHealth({ force: true }));
  document.getElementById("exportRxCsvBtn")?.addEventListener("click", () => exportPrescription("csv"));
  document.getElementById("exportRxGeoBtn")?.addEventListener("click", () => exportPrescription("geojson"));
  document.getElementById("healthScrubRange")?.addEventListener("input", (e) => {
    const i = Number(e.target.value) || 0;
    const snap = healthSnapshots[i];
    if (!snap) return;
    const label = document.getElementById("healthScrubLabel");
    if (label) {
      label.textContent = `${snap.date}: NDVI ${snap.ndvi} — ${snap.health?.label || ""}`;
    }
    paintHealthMap(snap.ndvi);
  });
}

function paintHealthMap(ndvi) {
  if (!currentField) return;
  const el = document.getElementById("healthMap");
  if (!el) return;
  const h = healthFromNdvi(ndvi);
  if (!healthMapApi) {
    try {
      healthMapApi = createFieldMap("healthMap", {
        lat: currentField.lat,
        lon: currentField.lon,
        pickable: false,
        detailZoom: 15,
      });
    } catch {
      return;
    }
  }
  const map = healthMapApi.map;
  if (!map || typeof L === "undefined") return;
  if (healthMapApi._zones) {
    healthMapApi._zones.forEach((z) => map.removeLayer(z));
  }
  healthMapApi._zones = [60, 120, 180].map((r, i) =>
    L.circle([currentField.lat, currentField.lon], {
      radius: r,
      color: h.color,
      fillColor: h.color,
      fillOpacity: 0.18 - i * 0.04,
      weight: 2,
    }).addTo(map)
  );
}

async function loadFieldHealth({ force = false } = {}) {
  if (!currentField || !currentUser) return;
  const title = document.getElementById("healthTitle");
  const msg = document.getElementById("healthMessage");
  const ndviEl = document.getElementById("healthNdvi");
  const eviEl = document.getElementById("healthEvi");
  const vegEl = document.getElementById("healthVeg");
  const srcEl = document.getElementById("healthSource");
  const changeEl = document.getElementById("healthChange");
  const prov = document.getElementById("healthProvenance");
  if (title) title.textContent = "Measuring canopy…";
  try {
    const data = await callFieldHealth(currentField.lat, currentField.lon);
    if (!data.ok) {
      if (title) title.textContent = data.error || "Could not measure health";
      return;
    }
    latestHealth = data;
    const h = data.health || healthFromNdvi(data.ndvi);
    if (title) title.textContent = h.label || "—";
    if (msg) {
      msg.textContent = Number.isFinite(data.ndvi)
        ? `NDVI proxy ${data.ndvi} (${data.source || "satellite RGB"}).`
        : "No index returned.";
    }
    if (ndviEl) ndviEl.textContent = data.ndvi ?? "—";
    if (eviEl) eviEl.textContent = data.evi ?? "—";
    if (vegEl) vegEl.textContent = data.vegFraction != null ? `${Math.round(data.vegFraction * 100)}%` : "—";
    if (srcEl) srcEl.textContent = "Esri RGB";
    if (prov) {
      prov.textContent = `Source: ${data.source} · Model: ${data.model} · ${data.fetchedAt || ""}`;
    }
    paintHealthMap(data.ndvi);

    if (force || true) {
      await saveHealthSnapshot(currentField, currentUser.uid, {
        ndvi: data.ndvi,
        evi: data.evi,
        source: data.source,
        cloudPct: data.cloudFraction != null ? Math.round(data.cloudFraction * 100) : null,
      }).catch(() => null);
      await updateField(
        currentUser.uid,
        currentField.id,
        { healthNdvi: data.ndvi, healthLabel: h.label, healthCode: h.code },
        { orgId: currentField.orgId }
      ).catch(() => null);
    }

    healthSnapshots = await listHealthSnapshots(currentField, currentUser.uid).catch(() => []);
    const change = detectChange(healthSnapshots);
    if (changeEl) changeEl.textContent = change ? change.message : "Save another day to compare change.";
    const scrub = document.getElementById("healthScrub");
    const range = document.getElementById("healthScrubRange");
    if (scrub && range && healthSnapshots.length > 1) {
      scrub.hidden = false;
      range.max = String(healthSnapshots.length - 1);
      range.value = "0";
      range.dispatchEvent(new Event("input"));
    }

    cacheFieldOffline(currentField, latestInsight, data);
    setStatus(t("offline.ready"), "ok");
  } catch (err) {
    if (title) title.textContent = err.message || "Health unavailable";
  }
}

function exportPrescription(kind) {
  if (!currentField || latestHealth?.ndvi == null) {
    setStatus("Refresh field health before exporting a prescription.", "error");
    return;
  }
  const rx = buildPrescription(currentField, latestHealth.ndvi);
  if (kind === "geojson") {
    downloadText(
      `${currentField.name || "field"}-prescription.json`,
      JSON.stringify(prescriptionToGeoJson(rx), null, 2),
      "application/geo+json"
    );
  } else {
    downloadText(`${currentField.name || "field"}-prescription.csv`, prescriptionToCsv(rx));
  }
  if (currentUser) {
    savePrescription(currentField, currentUser.uid, rx).catch(() => {});
  }
  setStatus("Prescription exported.", "ok");
}
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
let currentMeta = null;
let archiveData = null;
let selectedGranuleId = null;

function setStatus(msg, type = "") {
  if (!statusEl) return;
  statusEl.textContent = msg || "";
  statusEl.className = `app-status${type ? ` is-${type}` : ""}`;
  if (
    type === "ok" &&
    msg &&
    msg.length < 90 &&
    !/(…|\.\.\.|Loading|Computing|Checking|Getting|Saving|Snapping)/i.test(msg)
  ) {
    window.dispatchEvent(new CustomEvent("ux-toast", { detail: { message: msg, ms: 2000 } }));
  }
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
  if (currentField && activeGuide) {
    renderHarvest(
      predictHarvest({
        guide: activeGuide,
        sownAt: currentField.sownAt,
        avgTemp_c: latestMetrics?.avgTemp_c ?? null,
      })
    );
  }

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
  const region = fieldRegion(field);
  const meta = getRegionMeta(region);
  const rows = [
    ["Latitude", Number(field.lat).toFixed(6)],
    ["Longitude", Number(field.lon).toFixed(6)],
    ["Region", `${meta.name} (${meta.currency})`],
    ["Crop", field.cropType || "—"],
    ["Sown", field.sownAt || "—"],
  ];
  factsEl.innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
}

function populateCropDatalist() {
  if (!cropGuideList) return;
  cropGuideList.innerHTML = listGuideOptions()
    .map((g) => `<option value="${esc(g.name)}"></option>`)
    .join("");
}

function formatShortDate(iso) {
  if (!iso) return "—";
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function renderCropGuide(field) {
  activeGuide = matchCropGuide(field?.cropType);
  if (fieldCropInput) fieldCropInput.value = field?.cropType || "";
  if (fieldSownAt) fieldSownAt.value = field?.sownAt ? String(field.sownAt).slice(0, 10) : "";

  if (!activeGuide) {
    if (cropGuideEmpty) cropGuideEmpty.hidden = false;
    if (cropGuideBody) {
      cropGuideBody.innerHTML = `<p class="app-muted" id="cropGuideEmpty">No matching crop guide yet. Try Wheat, Rice/Paddy, Maize, Cotton, Chickpea, Tomato, Mustard, or Soybean — or keep your own crop name and still log inputs below.</p>`;
    }
    if (cropInfoLink) cropInfoLink.hidden = true;
    renderHarvest(null);
    renderNearbyMarkets(field, null);
    return;
  }

  if (cropInfoLink) {
    if (activeGuide.infoId) {
      cropInfoLink.hidden = false;
      cropInfoLink.href = `info.html#${activeGuide.infoId}`;
    } else {
      cropInfoLink.hidden = true;
    }
  }

  const fertHtml = activeGuide.fertilizers
    .map(
      (f) => `
      <li>
        <strong>${esc(f.name)}</strong>
        <span>${esc(f.stage)}</span>
        <small>${esc(f.note || "")}</small>
      </li>`
    )
    .join("");
  const machHtml = activeGuide.machines
    .map(
      (m) => `
      <li>
        <strong>${esc(m.name)}</strong>
        <span>${esc(m.stage)}</span>
      </li>`
    )
    .join("");
  const tipsHtml = (activeGuide.tips || []).map((t) => `<li>${esc(t)}</li>`).join("");

  if (cropGuideBody) {
    cropGuideBody.innerHTML = `
      <div class="crop-guide-hero reveal-up">
        <p class="outlook-kicker">${esc(activeGuide.season)} season</p>
        <h3>${esc(activeGuide.name)}</h3>
        <p>${esc(activeGuide.summary)}</p>
      </div>
      <div class="crop-meta-grid">
        <div><span>Sow window</span><strong>${esc(activeGuide.sowWindow)}</strong></div>
        <div><span>Harvest season</span><strong>${esc(activeGuide.harvestWindow)}</strong></div>
        <div><span>Cultivate length</span><strong>${activeGuide.durationDays.min}–${activeGuide.durationDays.max} days</strong></div>
        <div><span>Typical</span><strong>~${activeGuide.durationDays.typical} days</strong></div>
      </div>
      <div class="crop-guide-columns">
        <div>
          <h4>Best fertilizers</h4>
          <ul class="crop-rec-list">${fertHtml}</ul>
        </div>
        <div>
          <h4>Useful machines</h4>
          <ul class="crop-rec-list">${machHtml}</ul>
        </div>
      </div>
      <div class="crop-tips-block">
        <h4>Field tips</h4>
        <ul>${tipsHtml}</ul>
        <p class="app-muted">${esc(activeGuide.markets)}</p>
      </div>`;
  }

  const avgTemp = latestMetrics?.avgTemp_c ?? null;
  const prediction = predictHarvest({
    guide: activeGuide,
    sownAt: field?.sownAt,
    avgTemp_c: avgTemp,
  });
  renderHarvest(prediction);
  renderNearbyMarkets(field, activeGuide);
}

function renderHarvest(prediction) {
  if (!harvestCard) return;
  if (!prediction) {
    harvestCard.hidden = true;
    return;
  }
  harvestCard.hidden = false;
  harvestCard.className = `harvest-card harvest-${prediction.status} reveal-up`;
  if (harvestTitle) harvestTitle.textContent = prediction.statusLabel;
  if (harvestMessage) {
    harvestMessage.textContent =
      prediction.daysRemaining >= 0
        ? `About ${prediction.daysRemaining} day(s) until the typical harvest date for ${activeGuide?.name || "this crop"}.`
        : `Typical harvest date has passed by ${Math.abs(prediction.daysRemaining)} day(s) — verify maturity in the field.`;
  }
  if (harvestProgressFill) {
    harvestProgressFill.style.width = `${Math.round(prediction.progress * 100)}%`;
  }
  if (harvestElapsed) harvestElapsed.textContent = String(prediction.daysElapsed);
  if (harvestExpected) harvestExpected.textContent = formatShortDate(prediction.expectedHarvestAt);
  if (harvestWindow) {
    harvestWindow.textContent = `${formatShortDate(prediction.windowStart)} – ${formatShortDate(prediction.windowEnd)}`;
  }
  if (harvestStage) harvestStage.textContent = prediction.stage;
  if (harvestNote) {
    const extra = prediction.notes?.length ? ` ${prediction.notes.join(" ")}` : "";
    harvestNote.textContent = `${prediction.disclaimer}${extra}`;
  }
}

function renderNearbyMarkets(field, guide) {
  if (!marketList) return;
  const region = fieldRegion(field);
  const meta = getRegionMeta(region);
  const hint = guide?.name?.split(/\s+/)[0] || field?.cropType || "";
  const intel = marketplaceIntel(Number(field.lat), Number(field.lon), {
    region,
    cropHint: hint.toLowerCase(),
  });
  const markets = intel.buyers || [];
  if (!markets.length) {
    marketList.innerHTML = `<p class="app-muted">Could not rank markets for this location.</p>`;
    return;
  }
  marketList.innerHTML =
    `<p class="app-muted"><strong>Sell timing:</strong> ${esc(intel.sellTiming)} · <strong>Price:</strong> ${esc(intel.priceTrend)}</p>` +
    markets
      .map((m, i) => {
        const dist = m.distanceLabel || formatDistance(m.km, region);
        return `
        <article class="market-card reveal-up" style="animation-delay:${i * 50}ms">
          <div>
            <h3>${esc(m.name)}</h3>
            <p>${esc(m.place)} · ${esc(m.type)}</p>
            <p class="market-goods">${esc(m.goods)}</p>
            <p class="app-muted">Transport est. ${esc(formatCurrency(m.transportCost, region))} (${esc(intel.transportNote)})</p>
          </div>
          <div class="market-side">
            <strong>~${esc(dist)}</strong>
            <a href="${esc(mapsLink(m.lat, m.lon, m.name))}" target="_blank" rel="noopener noreferrer">Directions</a>
          </div>
        </article>`;
      })
      .join("");

  if (marketMspNote) {
    const crops = getCropPrices(region === "US" ? "US" : "IN");
    const crop = guide?.mspId ? crops.find((c) => c.id === guide.mspId) : null;
    if (region === "US") {
      marketMspNote.innerHTML = crop
        ? `US cash reference for <strong>${esc(crop.name)}</strong>: $${crop.price}/${esc(crop.unit)} (${esc(crop.season)}). Compare with your local elevator bid / basis. <a href="prices.html?region=US">Open price calculator</a>`
        : `US field — showing nearby elevators and wholesale hubs. Confirm today’s cash bid and basis. <a href="prices.html?region=US">Open price calculator</a>`;
    } else if (crop?.mspPerQuintal != null) {
      marketMspNote.innerHTML = `Reference MSP for <strong>${esc(crop.name)}</strong>: ${formatCurrency(crop.mspPerQuintal, "IN")} / quintal (${esc(crop.season)}). Compare with local ${esc(meta.marketLabel)} offers. <a href="prices.html?region=IN">Open price calculator</a>`;
    } else {
      marketMspNote.textContent =
        `${meta.name} marketplace intel — confirm local ${meta.marketLabel} rates before selling.`;
    }
  }
}

function fillInputItemSelect() {
  if (!inputKind || !inputItem) return;
  const kind = inputKind.value;
  const isOther = kind === "other";
  if (inputItemLabel) inputItemLabel.hidden = isOther;
  if (inputOtherNameLabel) inputOtherNameLabel.hidden = !isOther;
  if (isOther) return;
  const region = fieldRegion();
  const opts = kind === "machine" ? machineOptions(region) : fertilizerOptions(region);
  inputItem.innerHTML = opts
    .map((o) => `<option value="${esc(o.id)}">${esc(o.name)} — ${esc(o.meta)}</option>`)
    .join("");
}

function renderUsages(rows) {
  fieldUsages = rows || [];
  if (!usageList) return;
  if (!fieldUsages.length) {
    usageList.innerHTML = "";
    if (usageEmpty) usageEmpty.hidden = false;
    if (usageTotal) usageTotal.hidden = true;
    return;
  }
  if (usageEmpty) usageEmpty.hidden = true;
  const region = fieldRegion();
  usageList.innerHTML = fieldUsages
    .map((u) => {
      const when = u.appliedAt || (u.createdAt?.toDate ? u.createdAt.toDate().toISOString().slice(0, 10) : "");
      const uRegion = u.region === "US" || u.currency === "USD" ? "US" : region;
      const cost = u.estCost != null ? formatCurrency(u.estCost, uRegion) : "—";
      return `
        <li class="usage-row">
          <div>
            <strong>${esc(u.itemName || u.itemId || "Input")}</strong>
            <span>${esc(u.kind)} · ${esc(String(u.qty))} ${esc(u.unit || "")}${when ? ` · ${esc(formatShortDate(when))}` : ""}</span>
            ${u.notes ? `<small>${esc(u.notes)}</small>` : ""}
          </div>
          <div class="usage-side">
            <strong>${esc(cost)}</strong>
            <button type="button" class="app-btn-ghost usage-del" data-id="${esc(u.id)}">Remove</button>
          </div>
        </li>`;
    })
    .join("");
  const sum = fieldUsages.reduce((a, u) => a + (Number(u.estCost) || 0), 0);
  if (usageTotal) {
    usageTotal.hidden = false;
    usageTotal.textContent = `Logged input cost (reference): ${formatCurrency(sum, region)}`;
  }
  usageList.querySelectorAll(".usage-del").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!currentUser || !currentField) return;
      if (!confirm("Remove this input log?")) return;
      try {
        await deleteFieldUsage(currentUser.uid, currentField.id, btn.dataset.id, currentField.orgId || null);
        const rowsNext = await listFieldUsages(currentUser.uid, currentField.id, 40, currentField.orgId || null);
        renderUsages(rowsNext);
        setStatus("Input removed.", "ok");
      } catch (err) {
        setStatus(err?.message || "Could not remove input.", "error");
      }
    });
  });
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

function orgIdFromUrl() {
  return new URLSearchParams(window.location.search).get("org");
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

async function loadTomorrowWeather(force = false) {
  if (!currentUser || !currentField) return;
  if (loadTomorrowBtn) loadTomorrowBtn.disabled = true;
  if (tomorrowWeatherStatus) tomorrowWeatherStatus.textContent = "Loading Tomorrow.io hyperlocal weather…";
  try {
    const data = await callFieldTomorrowWeather(
      currentField.id,
      currentField.lat,
      currentField.lon
    );
    renderTomorrowWeather(tomorrowWeatherCard, data);
    if (data.ok) {
      if (tomorrowWeatherStatus) tomorrowWeatherStatus.textContent = "Tomorrow.io forecast ready.";
      if (force) setStatus("Tomorrow.io weather refreshed.", "ok");
    } else if (data.configured === false) {
      if (tomorrowWeatherStatus) {
        tomorrowWeatherStatus.textContent =
          "Add your Tomorrow.io API key (TOMORROW_API_KEY), then redeploy Functions.";
      }
    } else {
      if (tomorrowWeatherStatus) tomorrowWeatherStatus.textContent = data.error || "Tomorrow.io unavailable.";
    }
  } catch (err) {
    renderTomorrowWeather(tomorrowWeatherCard, {
      ok: false,
      error: err?.message || "Tomorrow.io request failed",
    });
    if (tomorrowWeatherStatus) tomorrowWeatherStatus.textContent = err?.message || "Tomorrow.io failed.";
  } finally {
    if (loadTomorrowBtn) loadTomorrowBtn.disabled = false;
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
    currentMeta = await getUserMeta(user.uid).catch(() => null);

    try {
      const field = await getField(user.uid, fieldId, { orgId: orgIdFromUrl() });
      if (!field) {
        titleEl.textContent = "Field not found";
        setStatus("This field doesn't exist or belongs to another account.", "error");
        return;
      }
      if (field.orgId && !orgIdFromUrl()) {
        const u = new URL(window.location.href);
        u.searchParams.set("org", field.orgId);
        history.replaceState(null, "", u.pathname + u.search + u.hash);
      }
      currentField = field;
      if (!field.region) {
        currentField = { ...field, region: detectRegion(Number(field.lat), Number(field.lon)) };
      }
      titleEl.textContent = field.name || "Untitled field";
      metaEl.textContent = `${Number(field.lat).toFixed(4)}, ${Number(field.lon).toFixed(4)} · ${regionBadgeLabel(fieldRegion(currentField))}`;
      renderFacts(currentField);
      populateCropDatalist();
      fillInputItemSelect();
      renderCropGuide(currentField);
      pendingMapField = { lat: currentField.lat, lon: currentField.lon };
      applyI18n(document);
      bindFieldTools();
      // If hash/restored tool is Location, map is created inside showFieldTool

      try {
        const usages = await listFieldUsages(user.uid, fieldId, 40, field.orgId || null);
        renderUsages(usages);
      } catch {
        renderUsages([]);
      }

      await loadSavedInsight(user.uid, fieldId);

      // 2.1 — restore last tool/section if saved (and no hash already chose one)
      const lv = field.lastView || {};
      if (!window.location.hash && lv.section && TOOL_IDS.includes(lv.section)) {
        showFieldTool(lv.section, { updateHash: true });
      } else if (!window.location.hash) {
        restoreScroll(lv.scrollY, lv.section);
      }
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
        const guide = matchCropGuide(currentField.cropType);
        const region = fieldRegion(currentField);
        const result = simulateScenario(metrics, {
          irrigateWhen: document.getElementById("scenarioIrrigate")?.value,
          irrigateMm: document.getElementById("scenarioMm")?.value,
          fertilizerKgHa: document.getElementById("scenarioFert")?.value,
          fieldHa: document.getElementById("scenarioHa")?.value,
          cropId: guide?.mspId || "wheat",
          fertId: "urea",
          region,
        });
        if (!scenarioResult) return;
        scenarioResult.hidden = false;
        const cur = result.currency || getRegionMeta(region).currency;
        scenarioResult.innerHTML = `
          <div class="scenario-grid">
            <div><span>Effective water</span><strong>${result.effectiveWater_mm} mm</strong></div>
            <div><span>Deficit</span><strong>${result.deficit_mm} mm</strong></div>
            <div><span>Stress index</span><strong>${result.stressIndex}</strong></div>
            <div><span>Expected yield</span><strong>${result.expectedYieldKgHa} kg/ha</strong></div>
            <div><span>Yield range (±${result.uncertaintyPct}%)</span><strong>${result.yieldLowKgHa}–${result.yieldHighKgHa}</strong></div>
            <div><span>Yield vs baseline</span><strong>${result.yieldDeltaPct > 0 ? "+" : ""}${result.yieldDeltaPct}%</strong></div>
            <div><span>Est. cost (${esc(cur)})</span><strong>${esc(result.estimatedCostLabel || String(result.estimatedCost))}</strong></div>
            <div><span>Est. revenue (${esc(cur)})</span><strong>${esc(result.expectedRevenueLabel || String(result.expectedRevenue))}</strong></div>
            <div><span>ROI</span><strong>${result.roi == null ? "—" : `${(result.roi * 100).toFixed(0)}%`}</strong></div>
          </div>
          <ul>${result.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
          <p class="app-muted">${esc(cur)} rates for ${region === "US" ? "US cash + custom-hire" : "India MSP + notified fertilizer"} — heuristic with uncertainty bands, not a full crop model. ${esc(result.priceBasis || "")}</p>`;
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
          const photoFile = document.getElementById("fbPhoto")?.files?.[0] || null;
          const photoKind = document.getElementById("fbPhotoKind")?.value || "";
          const photoDataUrl = photoFile ? await compressPhotoToDataUrl(photoFile) : null;
          await submitGroundTruth(user.uid, fieldId, {
            kind: photoKind || "ground_truth",
            soilMoisture: document.getElementById("fbMoisture")?.value,
            yieldKgHa: document.getElementById("fbYield")?.value,
            irrigated: document.getElementById("fbIrrigated")?.checked,
            notes: document.getElementById("fbNotes")?.value,
            consentShareForCalibration: document.getElementById("fbConsent")?.checked,
            photoKind: photoKind || null,
            photoDataUrl,
            photoName: photoFile?.name || null,
            lat: field.lat,
            lon: field.lon,
          });
          feedbackForm.reset();
          const pn = document.getElementById("fbPhotoNote");
          if (pn) pn.textContent = "";
          setStatus(
            photoDataUrl
              ? "Thanks — feedback + photo label saved for local calibration."
              : "Thanks — feedback saved for local calibration.",
            "ok"
          );
        } catch (err) {
          setStatus(err?.message || "Could not save feedback.", "error");
        } finally {
          if (btn) btn.disabled = false;
        }
      });

      // Auto-load weather + satellite archive (non-blocking)
      loadTomorrowWeather();
      loadTrends();
      loadSatelliteArchive();

      loadTomorrowBtn?.addEventListener("click", () => loadTomorrowWeather(true));
      loadTrendsBtn?.addEventListener("click", loadTrends);
      loadSatArchiveBtn?.addEventListener("click", loadSatelliteArchive);
      satProductSelect?.addEventListener("change", loadSatelliteArchive);
      satDaysSelect?.addEventListener("change", loadSatelliteArchive);
      inputKind?.addEventListener("change", fillInputItemSelect);

      cropPlanForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!currentUser || !currentField) return;
        const cropType = String(fieldCropInput?.value || "").trim() || null;
        const sownAt = String(fieldSownAt?.value || "").trim() || null;
        const btn = cropPlanForm.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        setStatus("Saving crop plan…");
        try {
          const guide = matchCropGuide(cropType);
          await updateField(currentUser.uid, currentField.id, {
            cropType,
            sownAt,
            cropGuideId: guide?.id || null,
            expectedHarvestAt: guide && sownAt
              ? predictHarvest({ guide, sownAt, avgTemp_c: latestMetrics?.avgTemp_c })?.expectedHarvestAt || null
              : null,
          });
          currentField = { ...currentField, cropType, sownAt, cropGuideId: guide?.id || null };
          renderFacts(currentField);
          renderCropGuide(currentField);
          setStatus("Crop plan saved.", "ok");
        } catch (err) {
          setStatus(err?.message || "Could not save crop plan.", "error");
        } finally {
          if (btn) btn.disabled = false;
        }
      });

      fieldInputForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!currentUser || !currentField) return;
        const btn = fieldInputForm.querySelector('button[type="submit"]');
        if (btn) btn.disabled = true;
        setStatus("Logging input…");
        try {
          await addFieldUsage(
            currentUser.uid,
            currentField.id,
            {
              kind: inputKind?.value,
              itemId: inputItem?.value,
              itemName: inputOtherName?.value,
              qty: inputQty?.value,
              appliedAt: inputAppliedAt?.value,
              notes: inputNotes?.value,
              region: fieldRegion(currentField),
            },
            currentField.orgId || null
          );
          const rows = await listFieldUsages(currentUser.uid, currentField.id, 40, currentField.orgId || null);
          renderUsages(rows);
          if (inputNotes) inputNotes.value = "";
          setStatus("Input logged on this field.", "ok");
        } catch (err) {
          setStatus(err?.message || "Could not log input.", "error");
        } finally {
          if (btn) btn.disabled = false;
        }
      });

      refreshBtn?.addEventListener("click", async () => {
        refreshBtn.disabled = true;
        setStatus("Fetching NASA data and computing insight…");
        try {
          const result = await callFuseInsight(
            fieldId,
            field.lat,
            field.lon,
            ruleSensitivity,
            field.orgId || null
          );
          if (result.ok && result.insight) {
            renderInsight(result.insight);
            cacheFieldOffline(field, result.insight, latestHealth);
            setStatus("Insight updated.", "ok");
            loadTrends();
            ensureUrtcSuite(true);
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

      wireUrtcControls(user);

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
