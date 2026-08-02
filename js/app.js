import { watchAuth, isFirebaseConfigured } from "./auth.js";
import { listFields, createField, createFieldsBulk, getField } from "./fields.js";
import { createFieldMap, useBrowserLocation } from "./map.js";
import { callGetAlerts, callMarkAlertRead, callClassifyLocation } from "./api.js";
import { loadLastSession, saveLastSession } from "./session.js";
import {
  parseFieldsCsv,
  parseFieldsGeoJson,
  dedupeAgainstExisting,
  fieldsToCsv,
  fieldsToGeoJson,
  downloadText,
} from "./import-export.js";
import { ensureDemoField, startOnboardingTour } from "./onboarding.js";
import { filterAlertsForDisplay, alertPriority } from "./alert-prefs.js";
import "./a11y.js";

const statusEl = document.getElementById("appStatus");
const welcomeLine = document.getElementById("welcomeLine");
const fieldsList = document.getElementById("fieldsList");
const fieldCount = document.getElementById("fieldCount");
const form = document.getElementById("addFieldForm");
const latInput = document.getElementById("fieldLat");
const lonInput = document.getElementById("fieldLon");
const nameInput = document.getElementById("fieldName");
const cropInput = document.getElementById("fieldCrop");
const saveBtn = document.getElementById("saveFieldBtn");
const useLocationBtn = document.getElementById("useLocationBtn");
const openAddField = document.getElementById("openAddField");
const alertsList = document.getElementById("alertsList");
const alertBadge = document.getElementById("alertBadge");
const fieldsTab = document.getElementById("fieldsTab");
const alertsTab = document.getElementById("alertsTab");
const tabBtns = document.querySelectorAll(".app-tab-btn");

let currentUser = null;
let mapApi = null;
let cachedFields = [];
/** Only allow save after classifier says the pin is a field */
let lastLocationValid = false;

const fieldCheckBanner = document.getElementById("fieldCheckBanner");

function setStatus(message, type = "") {
  if (!statusEl) return;
  statusEl.textContent = message || "";
  statusEl.className = `app-status${type ? ` is-${type}` : ""}`;
}

function setFieldCheckBanner(message, type = "") {
  if (!fieldCheckBanner) return;
  if (!message) {
    fieldCheckBanner.hidden = true;
    fieldCheckBanner.textContent = "";
    fieldCheckBanner.className = "field-check-banner";
    return;
  }
  fieldCheckBanner.hidden = false;
  fieldCheckBanner.textContent = message;
  fieldCheckBanner.className = `field-check-banner${type ? ` is-${type}` : ""}`;
}

function esc(v) {
  return String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function levelClass(level) {
  if (level === "action") return "level-action";
  if (level === "watch") return "level-watch";
  return "level-info";
}

function renderFields(fields) {
  if (!fieldsList) return;
  fieldCount.textContent = String(fields.length);

  if (!fields.length) {
    fieldsList.innerHTML = `
      <div class="empty-state">
        <strong>No fields yet</strong>
        <p>Add your first field on the map to start scanning Earth intelligence for your farm.</p>
      </div>`;
    return;
  }

  fieldsList.innerHTML = fields
    .map((f) => {
      const insight = f.lastInsight;
      const lvl = insight?.level || "info";
      const crop = f.cropType ? ` · ${esc(f.cropType)}` : "";
      return `
        <a class="field-card ${levelClass(lvl)}" href="field.html?id=${encodeURIComponent(f.id)}" data-field-id="${esc(f.id)}">
          <div class="field-card-head">
            <strong>${esc(f.name || "Untitled field")}</strong>
            ${insight ? `<span class="field-card-badge ${levelClass(lvl)}">${esc(insight.title)}</span>` : ""}
          </div>
          <span class="field-card-meta">${Number(f.lat).toFixed(4)}, ${Number(f.lon).toFixed(4)}${crop}</span>
        </a>`;
    })
    .join("");

  fieldsList.querySelectorAll("a.field-card").forEach((a) => {
    a.addEventListener("click", () => {
      if (!currentUser) return;
      const id = a.dataset.fieldId;
      if (id) saveLastSession(currentUser.uid, { fieldId: id, scrollY: 0, section: "insight", page: "field" }).catch(() => {});
    });
  });
}

async function showContinueBanner(uid) {
  const banner = document.getElementById("continueSession");
  const label = document.getElementById("continueLabel");
  if (!banner || !label) return;
  try {
    const session = await loadLastSession(uid);
    if (!session?.fieldId) {
      banner.hidden = true;
      return;
    }
    const field = await getField(uid, session.fieldId);
    if (!field) {
      banner.hidden = true;
      return;
    }
    label.textContent = field.name || "Untitled field";
    banner.href = `field.html?id=${encodeURIComponent(field.id)}`;
    banner.hidden = false;
  } catch {
    banner.hidden = true;
  }
}

async function refreshFields() {
  if (!currentUser) return;
  try {
    const fields = await listFields(currentUser.uid);
    cachedFields = fields;
    renderFields(fields);
  } catch (err) {
    setStatus(
      err?.code === "permission-denied"
        ? "Firestore permission denied — deploy firestore.rules in Firebase console."
        : err?.message || "Could not load fields.",
      "error"
    );
  }
}

async function handleImportFile(file) {
  if (!currentUser || !file) return;
  const text = await file.text();
  const name = (file.name || "").toLowerCase();
  let parsed;
  try {
    if (name.endsWith(".csv") || file.type.includes("csv")) {
      parsed = parseFieldsCsv(text);
    } else {
      parsed = parseFieldsGeoJson(text);
    }
  } catch (err) {
    setStatus(err?.message || "Could not parse file.", "error");
    return;
  }

  const { unique, skipped } = dedupeAgainstExisting(parsed.rows, cachedFields);
  if (!unique.length) {
    setStatus(
      `No new fields to import (${skipped} duplicates, ${parsed.errors.length} invalid).`,
      "error"
    );
    return;
  }

  setStatus(`Importing ${unique.length} field(s)…`);
  const { created, failed } = await createFieldsBulk(
    currentUser.uid,
    unique,
    (done, total) => setStatus(`Importing ${done}/${total}…`)
  );
  await refreshFields();
  const parts = [
    `Imported ${created.length}`,
    skipped ? `${skipped} skipped (duplicates)` : "",
    failed.length ? `${failed.length} failed` : "",
    parsed.errors.length ? `${parsed.errors.length} invalid rows` : "",
  ].filter(Boolean);
  setStatus(parts.join(" · "), failed.length ? "error" : "ok");
}

function renderAlerts(rawAlerts) {
  const { alerts, mutedReason } = filterAlertsForDisplay(rawAlerts);
  const unread = rawAlerts.filter((a) => !a.read && a.level === "action");
  if (alertBadge) {
    alertBadge.textContent = String(unread.length || rawAlerts.filter((a) => !a.read).length);
    alertBadge.hidden = Number(alertBadge.textContent) === 0;
  }

  if (!alertsList) return;
  if (!alerts.length) {
    alertsList.innerHTML = `
      <div class="empty-state">
        <strong>${mutedReason || "No alerts"}</strong>
        <p>${mutedReason ? "Adjust alert preferences in Profile." : "Alerts appear here when fusion detects irrigation needs, heat stress, or disease risk."}</p>
      </div>`;
    return;
  }

  const muteNote = mutedReason
    ? `<p class="app-muted alert-mute-note">${esc(mutedReason)}</p>`
    : "";

  alertsList.innerHTML =
    muteNote +
    alerts
      .map((a) => {
        const lvl = a.level || "info";
        const pri = alertPriority(lvl);
        const when = a.createdAt?.toDate?.()?.toLocaleDateString?.() || "";
        return `
        <div class="alert-item ${levelClass(lvl)} ${a.read ? "is-read" : ""}" data-id="${esc(a.id)}">
          <div class="alert-item-head">
            <span class="alert-dot ${levelClass(lvl)}"></span>
            <span class="alert-priority">${esc(pri)}</span>
            <strong>${esc(a.title)}</strong>
            ${when ? `<span class="alert-when">${when}</span>` : ""}
          </div>
          <p class="alert-msg">${esc(a.message)}</p>
          <div class="alert-actions">
            ${a.fieldId ? `<a class="app-btn-ghost alert-goto" href="field.html?id=${encodeURIComponent(a.fieldId)}">View field</a>` : ""}
            ${!a.read ? `<button type="button" class="app-btn-ghost mark-read-btn" data-alertid="${esc(a.id)}">Mark read</button>` : ""}
          </div>
        </div>`;
      })
      .join("");

  alertsList.querySelectorAll(".mark-read-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.alertid;
      btn.disabled = true;
      await callMarkAlertRead(id).catch(() => {});
      await loadAlerts();
    });
  });
}

async function loadAlerts() {
  try {
    const data = await callGetAlerts();
    if (data.disabled) {
      alertsList.innerHTML = `
        <div class="empty-state">
          <p>Alerts need Cloud Functions (Blaze). Your fields still save normally.</p>
        </div>`;
      return;
    }
    if (data.ok && Array.isArray(data.alerts)) {
      renderAlerts(data.alerts);
    }
  } catch {
    // non-fatal
  }
}

function switchTab(tab) {
  const isAlerts = tab === "alerts";
  fieldsTab.hidden = isAlerts;
  alertsTab.hidden = !isAlerts;
  tabBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.tab === tab));
  if (isAlerts) loadAlerts();
}

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

async function validateLocation(lat, lon) {
  lastLocationValid = false;
  setStatus("Checking satellite imagery — is this a farm field?");
  setFieldCheckBanner("Checking this location against the field classifier…", "pending");
  if (saveBtn) saveBtn.disabled = true;

  try {
    const result = await callClassifyLocation(lat, lon);
    if (result.disabled) {
      setFieldCheckBanner(
        "Field check is offline. Try again in a moment, or pick another point.",
        "error"
      );
      setStatus("Field check unavailable.", "error");
      if (saveBtn) saveBtn.disabled = false;
      return false;
    }
    if (result.softFail) {
      // Imagery fetch failed — allow save with a clear warning
      lastLocationValid = true;
      setFieldCheckBanner(
        result.message || "Could not verify imagery right now. You can save, but pick cropland carefully.",
        "warn"
      );
      setStatus("Imagery check skipped — you can still save.", "ok");
      if (saveBtn) saveBtn.disabled = false;
      return true;
    }
    if (!result.valid) {
      lastLocationValid = false;
      const msg =
        result.message ||
        "This location does not look like a farm field (city, water, forest, or bare land). Move the pin to cropland.";
      setFieldCheckBanner(`Not a field — ${msg}`, "error");
      setStatus("Not a field. Choose cropland on the satellite map.", "error");
      if (saveBtn) saveBtn.disabled = false;
      return false;
    }
    lastLocationValid = true;
    const pct = Math.round((result.confidence || result.field_probability || 0) * 100);
    const model = result.model ? ` · ${result.model}` : "";
    setFieldCheckBanner(
      `Looks like a field (${pct}% confidence)${model}. You can save this location.`,
      "ok"
    );
    setStatus(`Looks like a field (${pct}% confidence). ${result.reason || ""}`, "ok");
    if (saveBtn) saveBtn.disabled = false;
    return true;
  } catch (err) {
    lastLocationValid = false;
    setFieldCheckBanner(
      "Could not reach the field classifier. Check your connection and try again.",
      "error"
    );
    setStatus("Field check failed. Try another point.", "error");
    if (saveBtn) saveBtn.disabled = false;
    return false;
  }
}

function initMap() {
  try {
    mapApi = createFieldMap("fieldMap", {
      async onPick(lat, lon) {
        if (latInput) latInput.value = lat.toFixed(6);
        if (lonInput) lonInput.value = lon.toFixed(6);
        await validateLocation(lat, lon);
      },
    });
  } catch (err) {
    setStatus("Map failed to load.", "error");
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) { window.location.href = "auth.html"; return; }

  saveBtn.disabled = true;
  const lat = Number(latInput.value);
  const lon = Number(lonInput.value);

  const ok = await validateLocation(lat, lon);
  if (!ok || !lastLocationValid) {
    setFieldCheckBanner(
      "Cannot save — pick a location that looks like cropland on the satellite map.",
      "error"
    );
    saveBtn.disabled = false;
    return;
  }

  setStatus("Saving field…");
  try {
    const field = await createField(currentUser.uid, {
      name: nameInput.value,
      cropType: cropInput.value,
      lat,
      lon,
    });
    setStatus(`"${field.name}" saved. Open it to see trends and insights.`, "ok");
    form.reset();
    await refreshFields();
  } catch (err) {
    setStatus(err?.message || "Could not save field.", "error");
  } finally {
    saveBtn.disabled = false;
  }
});

useLocationBtn?.addEventListener("click", () => {
  setStatus("Getting location…");
  useBrowserLocation(
    async (lat, lon) => {
      latInput.value = lat.toFixed(6);
      lonInput.value = lon.toFixed(6);
      mapApi?.setMarker(lat, lon);
      mapApi?.map.setView([lat, lon], 14);
      await validateLocation(lat, lon);
    },
    () => setStatus("Could not get location. Click the map instead.", "error")
  );
});

openAddField?.addEventListener("click", () => {
  document.getElementById("addFieldPanel")?.scrollIntoView({ behavior: "smooth", block: "center" });
  nameInput?.focus();
});

document.getElementById("exportCsvBtn")?.addEventListener("click", () => {
  if (!cachedFields.length) {
    setStatus("No fields to export yet.", "error");
    return;
  }
  downloadText("prithviscan-fields.csv", fieldsToCsv(cachedFields), "text/csv");
  setStatus(`Exported ${cachedFields.length} field(s) as CSV.`, "ok");
});

document.getElementById("exportGeoBtn")?.addEventListener("click", () => {
  if (!cachedFields.length) {
    setStatus("No fields to export yet.", "error");
    return;
  }
  downloadText(
    "prithviscan-fields.geojson",
    JSON.stringify(fieldsToGeoJson(cachedFields), null, 2),
    "application/geo+json"
  );
  setStatus(`Exported ${cachedFields.length} field(s) as GeoJSON.`, "ok");
});

document.getElementById("importFileInput")?.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  e.target.value = "";
  await handleImportFile(file);
});

if (window.location.hash === "#alerts") {
  switchTab("alerts");
}

document.addEventListener("DOMContentLoaded", () => {
  if (!isFirebaseConfigured()) { setStatus("Firebase not configured.", "error"); return; }
  initMap();

  watchAuth(async (user) => {
    if (!user) { window.location.href = "auth.html"; return; }
    currentUser = user;
    const label = user.displayName || user.email || "farmer";
    if (welcomeLine) welcomeLine.textContent = `Welcome, ${label}.`;

    try {
      const demo = await ensureDemoField(user.uid);
      if (demo.created) setStatus("Added a demo field so you can explore immediately.", "ok");
    } catch {
      // non-fatal
    }

    await Promise.all([refreshFields(), loadAlerts(), showContinueBanner(user.uid)]);
    startOnboardingTour();
  });
});
