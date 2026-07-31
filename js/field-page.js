import { watchAuth, isFirebaseConfigured } from "./auth.js";
import { getField, deleteField } from "./fields.js";
import { createFieldMap } from "./map.js";

const titleEl = document.getElementById("fieldTitle");
const metaEl = document.getElementById("fieldMeta");
const statusEl = document.getElementById("fieldStatus");
const factsEl = document.getElementById("fieldFacts");
const deleteBtn = document.getElementById("deleteFieldBtn");

function setStatus(message, type = "") {
  if (!statusEl) return;
  statusEl.textContent = message || "";
  statusEl.className = `app-status${type ? ` is-${type}` : ""}`;
}

function fieldIdFromUrl() {
  return new URLSearchParams(window.location.search).get("id");
}

function renderFacts(field) {
  if (!factsEl) return;
  const rows = [
    ["Latitude", Number(field.lat).toFixed(6)],
    ["Longitude", Number(field.lon).toFixed(6)],
    ["Crop", field.cropType || "—"],
  ];
  factsEl.innerHTML = rows
    .map(
      ([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`
    )
    .join("");
}

document.addEventListener("DOMContentLoaded", () => {
  const fieldId = fieldIdFromUrl();
  if (!fieldId) {
    window.location.href = "app.html";
    return;
  }

  if (!isFirebaseConfigured()) {
    setStatus("Firebase is not configured.", "error");
    return;
  }

  watchAuth(async (user) => {
    if (!user) {
      window.location.href = "auth.html";
      return;
    }

    try {
      const field = await getField(user.uid, fieldId);
      if (!field) {
        setStatus("Field not found.", "error");
        titleEl.textContent = "Field not found";
        return;
      }

      titleEl.textContent = field.name || "Untitled field";
      metaEl.textContent = `${Number(field.lat).toFixed(4)}, ${Number(field.lon).toFixed(4)}`;
      renderFacts(field);

      createFieldMap("detailMap", {
        lat: field.lat,
        lon: field.lon,
        pickable: false,
        detailZoom: 14,
      });

      deleteBtn?.addEventListener("click", async () => {
        if (!confirm(`Delete “${field.name}”? This cannot be undone.`)) return;
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
      console.error(err);
      setStatus(
        err?.code === "permission-denied"
          ? "Firestore permission denied. Deploy firestore.rules in Firebase."
          : err?.message || "Could not load field.",
        "error"
      );
    }
  });
});
