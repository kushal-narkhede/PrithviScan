/**
 * Render helpers for URTC field panels.
 */

import { formatCurrency } from "./market-prices.js";
import { formatMoney } from "./region.js";

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderSoilMoisture(el, soil) {
  if (!el || !soil) return;
  const rows = (soil.days || [])
    .map(
      (d) => `<tr>
      <td>${esc(d.date)}</td>
      <td>${d.rain_mm}</td>
      <td>${d.et_mm}</td>
      <td>${d.deficit_mm}</td>
      <td><span class="risk-pill is-${esc(d.status)}">${esc(d.status)}</span></td>
    </tr>`
    )
    .join("");
  el.innerHTML = `
    <h3>7-day soil moisture outlook</h3>
    <p>${esc(soil.summary)}</p>
    <table class="urtc-table">
      <thead><tr><th>Date</th><th>Rain</th><th>ET</th><th>Deficit</th><th>Status</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="app-muted">Model ${esc(soil.modelVersion)} · confidence ${Math.round((soil.confidence || 0) * 100)}%</p>`;
}

export function renderSoilIntel(el, intel) {
  if (!el || !intel) return;
  const d = intel.degradation || {};
  el.innerHTML = `
    <h3>Soil nutrients &amp; degradation</h3>
    <p>${esc(intel.summary)}</p>
    <div class="outlook-stats harvest-stats">
      <div><span>N index</span><strong>${intel.npk?.n ?? "—"}</strong></div>
      <div><span>P index</span><strong>${intel.npk?.p ?? "—"}</strong></div>
      <div><span>K index</span><strong>${intel.npk?.k ?? "—"}</strong></div>
      <div><span>Carbon</span><strong>${intel.carbonScore ?? "—"}/100</strong></div>
      <div><span>Erosion</span><strong>${d.erosion ?? "—"}</strong></div>
      <div><span>Salinity</span><strong>${d.salinity ?? "—"}</strong></div>
      <div><span>Compaction</span><strong>${d.compaction ?? "—"}</strong></div>
    </div>
    <p class="app-muted">${esc(intel.npk?.disclaimer || "")}</p>`;
}

export function renderRisks(el, risks, { onAction } = {}) {
  if (!el || !risks) return;
  el.innerHTML = `
    <p>Overall risk index: <strong>${risks.overall}</strong> / 100 · model ${esc(risks.modelVersion)}</p>
    <div class="risk-grid">
      ${(risks.risks || [])
        .map(
          (r) => `
        <article class="risk-card is-${esc(r.level)}">
          <header>
            <h3>${esc(r.label)}</h3>
            <strong>${r.severity}</strong>
          </header>
          <ul>${(r.actions || []).map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
          <button type="button" class="app-btn-ghost risk-task-btn" data-risk="${esc(r.id)}" data-title="${esc(r.label)}">Create scout/spray task</button>
        </article>`
        )
        .join("")}
    </div>`;
  el.querySelectorAll(".risk-task-btn").forEach((btn) => {
    btn.addEventListener("click", () => onAction?.(btn.dataset.risk, btn.dataset.title));
  });
}

export function renderIrrigation(el, plan, region) {
  if (!el || !plan) return;
  el.innerHTML = `
    <h3>Recommendation</h3>
    <p>${esc(plan.summary)}</p>
    <div class="outlook-stats harvest-stats">
      <div><span>When</span><strong>${esc(plan.when || "—")}</strong></div>
      <div><span>Apply</span><strong>${plan.applyMm} mm</strong></div>
      <div><span>Cost</span><strong>${esc(formatCurrency(plan.estimatedCost, region))}</strong></div>
      <div><span>Yield impact</span><strong>+${plan.yieldImpactPct}%</strong></div>
      <div><span>Urgency</span><strong>${esc(plan.urgency)}</strong></div>
    </div>
    <p class="app-muted">Model ${esc(plan.modelVersion)} · ${esc(plan.provenance?.generatedAt || "")}</p>`;
}

export function renderYield(el, y, region) {
  if (!el || !y) return;
  el.innerHTML = `
    <h3>Yield &amp; profit prediction</h3>
    <p>${esc(y.summary)}</p>
    <div class="outlook-stats harvest-stats">
      <div><span>Expected</span><strong>${y.expectedKgHa} kg/ha</strong></div>
      <div><span>Range</span><strong>${y.yieldLowKgHa}–${y.yieldHighKgHa}</strong></div>
      <div><span>Harvest</span><strong>${esc(y.harvestDate || "—")}</strong></div>
      <div><span>Revenue</span><strong>${esc(formatCurrency(y.expectedRevenue, region))}</strong></div>
      <div><span>Confidence</span><strong>${Math.round((y.confidence || 0) * 100)}%</strong></div>
    </div>`;
}

export function renderFertOpt(el, fert, region) {
  if (!el || !fert) return;
  el.innerHTML = `
    <h3>Fertilizer optimization</h3>
    <p>${esc(fert.summary)}</p>
    <div class="outlook-stats harvest-stats">
      <div><span>Product</span><strong>${esc(fert.productId)}</strong></div>
      <div><span>Quantity</span><strong>${fert.quantityKg} kg</strong></div>
      <div><span>Cost</span><strong>${esc(formatCurrency(fert.estimatedCost, region))}</strong></div>
      <div><span>ROI uplift</span><strong>~${fert.roiImpactPct}%</strong></div>
    </div>`;
}

export function renderMachinery(el, mach, region) {
  if (!el || !mach) return;
  const m = mach.maintenance || {};
  el.innerHTML = `
    <h3>Machinery ops</h3>
    <p>${esc(mach.summary)}</p>
    <div class="outlook-stats harvest-stats">
      <div><span>Hours</span><strong>${mach.hoursSuggested ?? "—"} h</strong></div>
      <div><span>Hire</span><strong>${esc(formatCurrency(mach.hireTotal || 0, region))}</strong></div>
      <div><span>Fuel</span><strong>${esc(formatCurrency(mach.fuelEstimate || 0, region))}</strong></div>
      <div><span>Breakdown risk</span><strong>${mach.breakdownRisk ?? "—"}/100</strong></div>
      <div><span>Service in</span><strong>${m.hoursUntilService ?? "—"} h</strong></div>
      <div><span>Reminder</span><strong>${esc(m.reminderDueAt || "—")}</strong></div>
    </div>
    <p class="app-muted">${esc(m.note || "")} · model ${esc(mach.modelVersion)}</p>`;
}

export function renderCropRec(el, rec, region) {
  if (!el || !rec) return;
  const best = rec.best;
  const alts = (rec.alternatives || [])
    .map(
      (c) => `<li><strong>${esc(c.name)}</strong> — profit ${esc(formatCurrency(c.expectedProfit, region))}, risk ${c.riskScore}</li>`
    )
    .join("");
  el.innerHTML = `
    <h3>AI crop recommendation</h3>
    <p>${esc(rec.summary)}</p>
    ${
      best
        ? `<div class="outlook-stats harvest-stats">
      <div><span>Best crop</span><strong>${esc(best.name)}</strong></div>
      <div><span>Yield</span><strong>${best.expectedYieldKgHa} kg/ha</strong></div>
      <div><span>Profit</span><strong>${esc(formatCurrency(best.expectedProfit, region))}</strong></div>
      <div><span>Risk</span><strong>${best.riskScore}</strong></div>
    </div>`
        : ""
    }
    <ul>${alts}</ul>`;
}

export function renderCarbon(el, cc, region) {
  if (!el || !cc) return;
  const c = cc.carbon || {};
  const r = cc.resilience || {};
  const dim = r.dimensions || {};
  el.innerHTML = `
    <h3>Carbon credits &amp; climate resilience</h3>
    <div class="outlook-stats harvest-stats">
      <div><span>Carbon score</span><strong>${c.score ?? "—"}/100</strong></div>
      <div><span>Credits / ha</span><strong>${c.creditsPerHa ?? "—"}</strong></div>
      <div><span>Potential</span><strong>${esc(formatCurrency(c.potentialEarnings || 0, region))}</strong></div>
      <div><span>Resilience</span><strong>${r.score ?? "—"}/100</strong></div>
      <div><span>Drought risk</span><strong>${dim.drought ?? "—"}</strong></div>
      <div><span>Flood risk</span><strong>${dim.flood ?? "—"}</strong></div>
      <div><span>Heat risk</span><strong>${dim.heat ?? "—"}</strong></div>
      <div><span>Market shock</span><strong>${dim.marketShock ?? "—"}</strong></div>
    </div>
    <p class="app-muted">${esc(c.disclaimer || "")}</p>`;
}

export function renderRiskZones(mapApi, risks) {
  const Leaflet = typeof window !== "undefined" ? window.L : undefined;
  if (!mapApi?.map || !Leaflet || !risks?.risks) return;
  if (mapApi._riskLayers) {
    mapApi._riskLayers.forEach((l) => {
      try {
        mapApi.map.removeLayer(l);
      } catch {
        /* ignore */
      }
    });
  }
  const colors = { water: "#3182ce", heat: "#dd6b20", disease: "#805ad5", pest: "#c53030" };
  const layers = [];
  risks.risks.forEach((r, i) => {
    const radius = 40 + r.severity * 1.2;
    const circle = Leaflet.circle(mapApi.map.getCenter(), {
      radius,
      color: colors[r.id] || "#276749",
      fillColor: colors[r.id] || "#276749",
      fillOpacity: 0.12 + r.severity / 400,
      weight: 2,
    }).addTo(mapApi.map);
    circle.bindPopup(`${r.label}: ${r.severity}`);
    layers.push(circle);
  });
  mapApi._riskLayers = layers;
}

export function fuelCostEstimate({ hours = 1, region = "IN", ratePerHour } = {}) {
  const rate = ratePerHour ?? (region === "US" ? 35 : 900);
  const fuelShare = 0.35;
  const total = hours * rate;
  const fuel = Math.round(total * fuelShare);
  return {
    hours,
    hireTotal: total,
    fuelEstimate: fuel,
    currency: region === "US" ? "USD" : "INR",
    label: `~${formatMoney(fuel, region)} fuel within ${formatMoney(total, region)} hire (${hours} h)`,
  };
}
