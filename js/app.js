import { watchAuth, isFirebaseConfigured } from "./auth.js";
import { listFields, createField } from "./fields.js";
import { createFieldMap, useBrowserLocation } from "./map.js";

const statusEl = document.getElementById("appStatus");
const welcomeLine = document.getElementById("welcomeLine");
const fieldsList = document.getElementById("fieldsList");
const fieldsEmpty = document.getElementById("fieldsEmpty");
const fieldCount = document.getElementById("fieldCount");
const form = document.getElementById("addFieldForm");
const latInput = document.getElementById("fieldLat");
const lonInput = document.getElementById("fieldLon");
const nameInput = document.getElementById("fieldName");
const cropInput = document.getElementById("fieldCrop");
const saveBtn = document.getElementById("saveFieldBtn");
const useLocationBtn = document.getElementById("useLocationBtn");
const openAddField = document.getElementById("openAddField");
const alertsPanel = document.getElementById("alertsPanel");

let currentUser = null;
let mapApi = null;

function setStatus(message, type = "") {
  if (!statusEl) return;
  statusEl.textContent = message || "";
  statusEl.className = `app-status${type ? ` is-${type}` : ""}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderFields(fields) {
  if (!fieldsList) return;
  fieldCount.textContent = String(fields.length);

  const cards = fields
    .map((f) => {
      const crop = f.cropType ? ` · ${escapeHtml(f.cropType)}` : "";
      return `
        <a class="field-card" href="field.html?id=${encodeURIComponent(f.id)}">
          <strong>${escapeHtml(f.name || "Untitled field")}</strong>
          <span>${Number(f.lat).toFixed(4)}, ${Number(f.lon).toFixed(4)}${crop}</span>
        </a>
      `;
    })
    .join("");

  fieldsList.innerHTML = `${cards}<div class="empty-state" id="fieldsEmpty" ${fields.length ? "hidden" : ""}>
    <strong>No fields yet</strong>
    <p>Add your first field on the map to start scanning Earth intelligence for your farm.</p>
  </div>`;
}

async function refreshFields() {
  if (!currentUser) return;
  try {
    const fields = await listFields(currentUser.uid);
    renderFields(fields);
  } catch (err) {
    console.error(err);
    setStatus(
      err?.code === "permission-denied"
        ? "Firestore permission denied. Deploy firestore.rules and enable Firestore in the console."
        : err?.message || "Could not load fields.",
      "error"
    );
  }
}

function initMap() {
  try {
    mapApi = createFieldMap("fieldMap", {
      onPick(lat, lon) {
        if (latInput) latInput.value = lat.toFixed(6);
        if (lonInput) lonInput.value = lon.toFixed(6);
      },
    });
  } catch (err) {
    console.error(err);
    setStatus("Map failed to load. Check your network.", "error");
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) {
    window.location.href = "auth.html";
    return;
  }

  saveBtn.disabled = true;
  setStatus("Saving field…");

  try {
    const field = await createField(currentUser.uid, {
      name: nameInput.value,
      cropType: cropInput.value,
      lat: latInput.value,
      lon: lonInput.value,
    });
    setStatus(`Saved “${field.name}”.`, "ok");
    form.reset();
    await refreshFields();
  } catch (err) {
    console.error(err);
    setStatus(err?.message || "Could not save field.", "error");
  } finally {
    saveBtn.disabled = false;
  }
});

useLocationBtn?.addEventListener("click", () => {
  setStatus("Getting your location…");
  useBrowserLocation(
    (lat, lon) => {
      latInput.value = lat.toFixed(6);
      lonInput.value = lon.toFixed(6);
      mapApi?.setMarker(lat, lon);
      mapApi?.map.setView([lat, lon], 14);
      setStatus("Location set — name the field and save.", "ok");
    },
    () => setStatus("Could not get location. Click the map instead.", "error")
  );
});

openAddField?.addEventListener("click", () => {
  document.getElementById("fieldMap")?.scrollIntoView({ behavior: "smooth", block: "center" });
  nameInput?.focus();
});

if (window.location.hash === "#alerts" && alertsPanel) {
  alertsPanel.hidden = false;
}

document.addEventListener("DOMContentLoaded", () => {
  if (!isFirebaseConfigured()) {
    setStatus("Firebase is not configured.", "error");
    return;
  }

  initMap();

  watchAuth(async (user) => {
    if (!user) {
      window.location.href = "auth.html";
      return;
    }
    currentUser = user;
    const label = user.displayName || user.email || "farmer";
    if (welcomeLine) {
      welcomeLine.textContent = `Welcome, ${label}. Add fields on the map to begin.`;
    }
    await refreshFields();
  });
});
