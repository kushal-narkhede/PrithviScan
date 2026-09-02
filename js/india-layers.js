/**
 * Client UI for India localization pack (Bhuvan / Bhoonidhi / IMD / Agmarknet).
 */

import { callFieldIndiaPack, callIndiaLayersStatus } from "./api.js";
import { detectRegion } from "./region.js";

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function providerChip(name, configured, error) {
  const cls = configured ? "sat-chip is-ok" : "sat-chip is-warn";
  const tip = configured ? "key loaded" : error || "key missing";
  return `<span class="${cls}" title="${esc(tip)}">${esc(name)} · ${configured ? "live" : "setup"}</span>`;
}

function renderAgmarknet(rows) {
  if (!rows?.length) return `<p class="app-muted">No live mandi rows yet — MSP catalog still applies.</p>`;
  return `
    <div class="india-table-wrap">
      <table class="india-table">
        <thead>
          <tr><th>Market</th><th>Crop</th><th>Modal</th><th>Range</th><th>Date</th></tr>
        </thead>
        <tbody>
          ${rows
            .slice(0, 12)
            .map(
              (r) => `<tr>
              <td>${esc(r.market || "—")}<div class="app-muted">${esc([r.district, r.state].filter(Boolean).join(", "))}</div></td>
              <td>${esc(r.commodity || "—")}</td>
              <td><strong>${r.modal != null ? `₹${r.modal}` : "—"}</strong></td>
              <td>${r.min != null || r.max != null ? `₹${r.min ?? "—"}–${r.max ?? "—"}` : "—"}</td>
              <td>${esc(r.arrivalDate || "—")}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
}

function renderBhoonidhi(scenes) {
  if (!scenes?.length) return `<p class="app-muted">No Bhoonidhi scenes yet (needs API access).</p>`;
  return `<ul class="india-scene-list">${scenes
    .map(
      (s) => `<li>
        <strong>${esc(s.title)}</strong>
        <span class="app-muted">${esc(s.datetime || "")}${s.cloud != null ? ` · cloud ${s.cloud}%` : ""}</span>
        ${s.browse ? `<a class="app-btn-ghost" href="${esc(s.browse)}" target="_blank" rel="noopener">Browse</a>` : ""}
      </li>`
    )
    .join("")}</ul>`;
}

function renderSchemes(schemes) {
  return `<ul class="india-scheme-list">${(schemes || [])
    .map((s) => `<li><strong>${esc(s.name)}</strong> — ${esc(s.note)}</li>`)
    .join("")}</ul>`;
}

export function renderIndiaPack(host, pack) {
  if (!host) return;
  if (!pack?.ok) {
    host.innerHTML = `<p class="app-muted">${esc(pack?.error || "India pack unavailable for this location.")}</p>`;
    return;
  }

  const p = pack.providers || {};
  const soil = pack.soil?.zone || {};
  const placeBits = [pack.place?.village, pack.place?.district, pack.place?.state].filter(Boolean);

  host.innerHTML = `
    <div class="india-pack">
      <div class="india-provider-row">
        ${providerChip("Bhuvan", p.bhuvan?.configured, p.bhuvan?.needs)}
        ${providerChip("Bhoonidhi", p.bhoonidhi?.configured, p.bhoonidhi?.needs)}
        ${providerChip("IMD", p.imd?.configured, p.imd?.needs)}
        ${providerChip("Agmarknet", p.agmarknet?.configured, p.agmarknet?.needs)}
      </div>

      <div class="urtc-card">
        <h3>Place context</h3>
        <p><strong>${esc(placeBits.join(" · ") || "India field")}</strong></p>
        <p class="app-muted">${esc(pack.place?.error || "Bhuvan reverse-geocode when token is set.")}</p>
      </div>

      <div class="urtc-card">
        <h3>Agro-climatic &amp; soil</h3>
        <p><strong>${esc(soil.name || "—")}</strong></p>
        <p>Soils: ${esc((soil.soils || []).join(", ") || "—")}</p>
        <p>Monsoon: ${esc(soil.monsoon || "—")}</p>
        <p>Typical crops: ${esc((soil.crops || []).join(", ") || "—")}</p>
        <p class="app-muted">${esc(pack.soil?.note || "")}</p>
      </div>

      <div class="urtc-card">
        <h3>Bhuvan land use (LULC)</h3>
        <pre class="india-json">${esc(
          pack.lulc?.classes ? JSON.stringify(pack.lulc.classes, null, 2).slice(0, 1200) : pack.lulc?.error || "Token needed for LULC stats"
        )}</pre>
      </div>

      <div class="urtc-card">
        <h3>IMD weather &amp; warnings</h3>
        <pre class="india-json">${esc(
          pack.imd?.forecast || pack.imd?.warnings || pack.imd?.rainfall
            ? JSON.stringify(
                {
                  forecast: pack.imd.forecast,
                  warnings: pack.imd.warnings,
                  rainfall: pack.imd.rainfall,
                },
                null,
                2
              ).slice(0, 1400)
            : pack.imd?.error || "IMD key needed"
        )}</pre>
      </div>

      <div class="urtc-card">
        <h3>Live mandi prices (Agmarknet)</h3>
        ${pack.agmarknet?.error && !pack.agmarknet?.rows?.length ? `<p class="app-muted">${esc(pack.agmarknet.error)}</p>` : ""}
        ${renderAgmarknet(pack.agmarknet?.rows)}
      </div>

      <div class="urtc-card">
        <h3>Bhoonidhi / ISRO scenes</h3>
        ${pack.bhoonidhi?.error && !pack.bhoonidhi?.scenes?.length ? `<p class="app-muted">${esc(pack.bhoonidhi.error)}</p>` : ""}
        ${renderBhoonidhi(pack.bhoonidhi?.scenes)}
      </div>

      <div class="urtc-card">
        <h3>Schemes &amp; entitlements</h3>
        ${renderSchemes(pack.schemes)}
      </div>

      <p class="app-muted">Bhuvan WMS overlays can be toggled on the Location map. Keys missing? See docs/INDIA_DATA.md</p>
    </div>
  `;
}

/** Attach Bhuvan WMS overlays to a Leaflet map instance */
export function attachBhuvanOverlays(map, wmsList = []) {
  if (!map || typeof L === "undefined") return null;
  const layers = {};
  (wmsList.length
    ? wmsList
    : [
        {
          id: "lulc50k",
          title: "Bhuvan LULC 50K",
          url: "https://bhuvan-vec2.nrsc.gov.in/bhuvan/wms",
          layers: "lulc:BR_LULC50K_0506",
          attribution: "© ISRO / NRSC Bhuvan",
        },
      ]
  ).forEach((spec) => {
    try {
      const layer = L.tileLayer.wms(spec.url, {
        layers: spec.layers,
        format: "image/png",
        transparent: true,
        attribution: spec.attribution || "© Bhuvan",
        opacity: 0.55,
      });
      layers[spec.title || spec.id] = layer;
    } catch {
      /* ignore bad WMS */
    }
  });
  if (Object.keys(layers).length) {
    L.control.layers(null, layers, { collapsed: true, position: "topright" }).addTo(map);
  }
  return layers;
}

export async function loadIndiaPackForField({ lat, lon, fieldId, cropType, host } = {}) {
  const region = detectRegion(lat, lon);
  if (region !== "IN") {
    if (host) {
      host.innerHTML = `<p class="app-muted">India localization (Bhuvan / Bhoonidhi / IMD / Agmarknet) appears for fields in India.</p>`;
    }
    return { ok: false, region };
  }
  if (host) host.innerHTML = `<p class="app-muted">Loading India layers…</p>`;
  const pack = await callFieldIndiaPack(fieldId, lat, lon, cropType);
  renderIndiaPack(host, pack);
  return pack;
}

export async function indiaKeysStatus() {
  return callIndiaLayersStatus();
}
