import { watchAuth, isFirebaseConfigured } from "./auth.js";
import { listFields, createField, createFieldsBulk, getField } from "./fields.js?v=region1";
import { createFieldMap, useBrowserLocation } from "./map.js?v=region1";
import { detectRegion, regionBadgeLabel } from "./region.js";
import { callGetAlerts, callMarkAlertRead, callClassifyLocation, callProcessAlertOutbox } from "./api.js";
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
import { getUserMeta } from "./org.js";
import { listOrgTasks, createTask, completeTask, TASK_TYPES } from "./tasks.js";
import { cacheFieldsList, readCachedFieldsList } from "./offline-cache.js";
import { applyI18n } from "./i18n.js";
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
const actionsTab = document.getElementById("actionsTab");
const tabBtns = document.querySelectorAll(".app-tab-btn");
const orgFieldsNote = document.getElementById("orgFieldsNote");
const taskForm = document.getElementById("taskForm");
const taskList = document.getElementById("taskList");
const taskEmpty = document.getElementById("taskEmpty");
const taskField = document.getElementById("taskField");

let currentUser = null;
let currentMeta = null;
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
      const region = f.region || detectRegion(Number(f.lat), Number(f.lon));
      const regionTag = region === "US" ? "USA · $" : "India · ₹";
      return `
        <a class="field-card ${levelClass(lvl)}" href="field.html?id=${encodeURIComponent(f.id)}${f.orgId ? `&org=${encodeURIComponent(f.orgId)}` : ""}" data-field-id="${esc(f.id)}">
          <div class="field-card-head">
            <strong>${esc(f.name || "Untitled field")}</strong>
            <span class="field-card-badge">${esc(regionTag)}</span>
            ${f.orgId ? `<span class="field-card-badge">Org</span>` : ""}
            ${insight ? `<span class="field-card-badge ${levelClass(lvl)}">${esc(insight.title)}</span>` : ""}
          </div>
          <span class="field-card-meta">${Number(f.lat).toFixed(4)}, ${Number(f.lon).toFixed(4)}${crop}${f.healthLabel ? ` · ${esc(f.healthLabel)}` : ""}</span>
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
    cacheFieldsList(fields);
    renderFields(fields);
    if (orgFieldsNote) orgFieldsNote.hidden = !fields.some((f) => f.orgId);
    fillTaskFieldSelect(fields);
  } catch (err) {
    const cached = readCachedFieldsList();
    if (cached?.fields?.length) {
      cachedFields = cached.fields;
      renderFields(cached.fields);
      setStatus("Showing offline cached fields.", "ok");
      return;
    }
    setStatus(
      err?.code === "permission-denied"
        ? "Firestore permission denied — deploy firestore.rules in Firebase console."
        : err?.message || "Could not load fields.",
      "error"
    );
  }
}

function fillTaskFieldSelect(fields) {
  if (!taskField) return;
  taskField.innerHTML = (fields || [])
    .map((f) => `<option value="${esc(f.id)}" data-org="${esc(f.orgId || "")}">${esc(f.name || f.id)}</option>`)
    .join("");
}

async function refreshTasks() {
  if (!currentUser || !currentMeta?.orgId) {
    if (taskList) taskList.innerHTML = "";
    if (taskEmpty) {
      taskEmpty.hidden = false;
      taskEmpty.textContent = "Join or create an organization to coordinate crew tasks.";
    }
    return;
  }
  try {
    const tasks = await listOrgTasks(currentMeta.orgId);
    const open = tasks.filter((t) => t.status !== "done");
    if (taskEmpty) taskEmpty.hidden = open.length > 0;
    if (!taskList) return;
    taskList.innerHTML = open
      .map(
        (t) => `
      <li class="usage-row">
        <div>
          <strong>${esc(t.title || t.type)}</strong>
          <span>${esc(t.fieldName || t.fieldId || "Field")} · ${esc(t.assigneeName || "")}${t.dueAt ? ` · due ${esc(t.dueAt)}` : ""}</span>
          ${t.note ? `<small>${esc(t.note)}</small>` : ""}
        </div>
        <div class="usage-side">
          <button type="button" class="app-btn-ghost" data-done="${esc(t.id)}">Done</button>
        </div>
      </li>`
      )
      .join("");
    taskList.querySelectorAll("[data-done]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await completeTask(currentMeta.orgId, btn.dataset.done);
        await refreshTasks();
        setStatus("Task marked done.", "ok");
      });
    });
  } catch (err) {
    if (taskEmpty) {
      taskEmpty.hidden = false;
      taskEmpty.textContent = err?.message || "Could not load tasks.";
    }
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
  const which = tab || "fields";
  if (fieldsTab) fieldsTab.hidden = which !== "fields";
  if (alertsTab) alertsTab.hidden = which !== "alerts";
  if (actionsTab) actionsTab.hidden = which !== "actions";
  tabBtns.forEach((b) => b.classList.toggle("is-active", b.dataset.tab === which));
  if (which === "alerts") loadAlerts();
  if (which === "actions") refreshTasks();
  if (which === "fields") {
    // Map was hidden — Leaflet needs a size refresh or tiles stay gray/blank
    const refresh = () => {
      if (mapApi?.invalidateSize) mapApi.invalidateSize();
      else mapApi?.map?.invalidateSize?.();
    };
    requestAnimationFrame(refresh);
    setTimeout(refresh, 150);
  }
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

function wireMapPick(api) {
  const onPick = async (lat, lon) => {
    if (latInput) latInput.value = Number(lat).toFixed(6);
    if (lonInput) lonInput.value = Number(lon).toFixed(6);
    await validateLocation(lat, lon);
  };
  // Classic map-boot.js path
  window.__psFieldMapOnPick = onPick;
  if (api?.map && !api._pickBound) {
    api._pickBound = true;
    // createFieldMap already calls onPick via options; for boot map use global hook
  }
  return onPick;
}

function initMap() {
  const onPick = wireMapPick(null);

  // Prefer the classic boot map (independent of ES module failures / stale SW)
  if (window.__psFieldMap?.map) {
    mapApi = window.__psFieldMap;
    window.__psFieldMapOnPick = onPick;
    mapApi.invalidateSize?.();
    setStatus("Satellite map ready — click cropland to place a field.", "ok");
    return;
  }

  const mount = () => {
    try {
      if (window.__psFieldMap?.map) {
        mapApi = window.__psFieldMap;
        window.__psFieldMapOnPick = onPick;
      } else {
        mapApi = createFieldMap("fieldMap", { onPick });
      }
      setStatus("Satellite map ready — click cropland to place a field.", "ok");
    } catch (err) {
      setStatus(err?.message || "Map failed to load. Refresh the page.", "error");
    }
  };

  if (typeof L !== "undefined") {
    // Give map-boot.js a tick to finish if both scripts race
    setTimeout(mount, 0);
    return;
  }
  let tries = 0;
  const wait = setInterval(() => {
    tries += 1;
    if (typeof L !== "undefined") {
      clearInterval(wait);
      mount();
    } else if (tries >= 40) {
      clearInterval(wait);
      setStatus("Map library failed to load (Leaflet). Check network / ad-block.", "error");
    }
  }, 50);
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
    const region = detectRegion(lat, lon);
    const field = await createField(currentUser.uid, {
      name: nameInput.value,
      cropType: cropInput.value,
      lat,
      lon,
      region,
    });
    setStatus(
      `"${field.name}" saved (${regionBadgeLabel(field.region || region)}). Open it for local markets & prices.`,
      "ok"
    );
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
    (lat, lon) => {
      latInput.value = lat.toFixed(6);
      lonInput.value = lon.toFixed(6);
      mapApi?.map.setView([lat, lon], 16);
      // setMarker triggers onPick → validateLocation
      mapApi?.setMarker(lat, lon);
    },
    () => setStatus("Could not get location. Click the map instead.", "error")
  );
});

openAddField?.addEventListener("click", () => {
  switchTab("fields");
  document.getElementById("addFieldPanel")?.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => {
    if (mapApi?.invalidateSize) mapApi.invalidateSize();
    else mapApi?.map?.invalidateSize?.();
  }, 200);
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

function bootApp() {
  if (!isFirebaseConfigured()) {
    setStatus("Firebase not configured.", "error");
    // Still try to show the map for placement UX
    initMap();
    return;
  }
  initMap();

  applyI18n(document);
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  taskForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser || !currentMeta?.orgId) {
      setStatus("Create or join an organization first (Organization page).", "error");
      return;
    }
    const fieldId = taskField?.value;
    const field = cachedFields.find((f) => f.id === fieldId);
    try {
      await createTask(
        currentMeta.orgId,
        currentUser,
        {
          type: document.getElementById("taskType")?.value,
          title: TASK_TYPES.find((t) => t.id === document.getElementById("taskType")?.value)?.label,
          fieldId,
          fieldName: field?.name,
          assigneeUid: document.getElementById("taskAssignee")?.value?.trim() || currentUser.uid,
          assigneeName: currentUser.displayName || currentUser.email || "Me",
          dueAt: document.getElementById("taskDue")?.value || null,
          note: document.getElementById("taskNote")?.value,
        },
        currentMeta.orgRole || "scout"
      );
      document.getElementById("taskNote").value = "";
      await refreshTasks();
      setStatus("Task created for your crew.", "ok");
    } catch (err) {
      setStatus(err?.message || "Could not create task.", "error");
    }
  });

  watchAuth(async (user) => {
    if (!user) { window.location.href = "auth.html"; return; }
    currentUser = user;
    currentMeta = await getUserMeta(user.uid).catch(() => null);
    const label = user.displayName || user.email || user.phoneNumber || "farmer";
    if (welcomeLine) {
      welcomeLine.textContent = currentMeta?.orgId
        ? `Welcome, ${label}. Organization fields are shared with your team.`
        : `Welcome, ${label}.`;
    }

    try {
      const demo = await ensureDemoField(user.uid);
      if (demo.created) setStatus("Added a demo field so you can explore immediately.", "ok");
    } catch {
      // non-fatal
    }

    await Promise.all([refreshFields(), loadAlerts(), showContinueBanner(user.uid)]);
    callProcessAlertOutbox().catch(() => {});
    startOnboardingTour();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootApp);
} else {
  bootApp();
}
