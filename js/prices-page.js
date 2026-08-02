import {
  MARKET_META,
  CROP_MSP,
  FERTILIZER_PRICES,
  MACHINE_HIRE,
  estimateCropRevenue,
  estimateFertilizerCost,
  estimateMachineCost,
  formatINR,
} from "./market-prices.js";
import "./nav-auth.js";

function fillSelect(el, items, labelFn) {
  if (!el) return;
  el.innerHTML = items
    .map((item) => `<option value="${item.id}">${labelFn(item)}</option>`)
    .join("");
}

fillSelect(
  document.getElementById("crop-select"),
  CROP_MSP,
  (c) => `${c.name} — MSP ₹${c.mspPerQuintal}/qtl (${c.season})`
);
fillSelect(
  document.getElementById("fert-select"),
  FERTILIZER_PRICES,
  (f) =>
    `${f.name} — ₹${f.bagPrice}/${f.unitLabel ? "bottle" : `${f.bagKg} kg bag`}`
);
fillSelect(
  document.getElementById("machine-select"),
  MACHINE_HIRE,
  (m) => `${m.name} — ₹${m.rate}/${m.unit}`
);

document.querySelectorAll(".prices-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    const id = tab.dataset.tab;
    document.querySelectorAll(".prices-tab").forEach((t) => {
      t.classList.toggle("is-active", t === tab);
    });
    document.querySelectorAll(".prices-panel").forEach((panel) => {
      const on = panel.dataset.panel === id;
      panel.classList.toggle("is-active", on);
      panel.hidden = !on;
    });
  });
});

document.getElementById("form-crop")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const cropId = document.getElementById("crop-select").value;
  const yieldQtlPerAcre = Number(document.getElementById("crop-yield").value);
  const acres = Number(document.getElementById("crop-acres").value);
  const r = estimateCropRevenue({ cropId, acres, yieldQtlPerAcre });
  const box = document.getElementById("crop-result");
  box.hidden = false;
  box.innerHTML = `
    <p class="result-label">Estimated sale value at MSP</p>
    <p class="result-value">${formatINR(r.revenue)}</p>
    <p class="result-detail">
      ${r.totalQtl.toFixed(1)} quintal × ₹${r.crop.mspPerQuintal}/qtl
      · ${r.crop.name} · ${r.crop.season}<br />
      ${formatINR(r.revenue / Math.max(r.acres, 0.0001))} per acre
      · Source: ${r.crop.source}
    </p>
  `;
});

document.getElementById("form-fert")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const fertId = document.getElementById("fert-select").value;
  const bags = Number(document.getElementById("fert-bags").value);
  const acres = Number(document.getElementById("fert-acres").value) || 1;
  const r = estimateFertilizerCost({ fertId, bags });
  const box = document.getElementById("fert-result");
  box.hidden = false;
  const unit = r.fert.unitLabel || `₹ / ${r.fert.bagKg} kg bag`;
  box.innerHTML = `
    <p class="result-label">Fertilizer cost</p>
    <p class="result-value">${formatINR(r.cost)}</p>
    <p class="result-detail">
      ${r.bags} × ₹${r.fert.bagPrice} (${unit})
      · ${r.fert.name} · ${r.fert.season}<br />
      ${formatINR(r.cost / acres)} per acre (at ${acres} acre${acres === 1 ? "" : "s"})
      ${r.perKg != null ? ` · ≈ ₹${r.perKg.toFixed(2)}/kg` : ""}
      · Source: ${r.fert.source}
    </p>
  `;
});

document.getElementById("form-machine")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const machineId = document.getElementById("machine-select").value;
  const quantity = Number(document.getElementById("machine-qty").value);
  const r = estimateMachineCost({ machineId, quantity });
  const box = document.getElementById("machine-result");
  box.hidden = false;
  box.innerHTML = `
    <p class="result-label">Estimated hire cost</p>
    <p class="result-value">${formatINR(r.cost)}</p>
    <p class="result-detail">
      ${r.quantity} ${r.machine.unit}${r.quantity === 1 ? "" : "s"} × ₹${r.machine.rate}/${r.machine.unit}
      · ${r.machine.name}<br />
      Typical use: ${r.machine.typical} · ${r.machine.source}
    </p>
  `;
});

function renderRateSheet() {
  const host = document.getElementById("rates-tables");
  const source = document.getElementById("rates-source");
  if (!host) return;

  const cropRows = CROP_MSP.map(
    (c) => `
    <tr>
      <td>${c.name}<br /><small>${c.season}</small></td>
      <td>₹${c.mspPerQuintal.toLocaleString("en-IN")}/qtl</td>
    </tr>`
  ).join("");

  const fertRows = FERTILIZER_PRICES.map(
    (f) => `
    <tr>
      <td>${f.name}<br /><small>${f.season}</small></td>
      <td>₹${f.bagPrice.toLocaleString("en-IN")}${f.unitLabel ? "" : ` / ${f.bagKg} kg`}</td>
    </tr>`
  ).join("");

  const machRows = MACHINE_HIRE.map(
    (m) => `
    <tr>
      <td>${m.name}<br /><small>${m.typical}</small></td>
      <td>₹${m.rate.toLocaleString("en-IN")}/${m.unit}</td>
    </tr>`
  ).join("");

  host.innerHTML = `
    <div class="rate-block">
      <h3>Crop MSP (₹/quintal)</h3>
      <table class="rate-table">
        <thead><tr><th>Crop</th><th>MSP</th></tr></thead>
        <tbody>${cropRows}</tbody>
      </table>
    </div>
    <div class="rate-block">
      <h3>Fertilizer notified bag prices</h3>
      <table class="rate-table">
        <thead><tr><th>Product</th><th>Retail</th></tr></thead>
        <tbody>${fertRows}</tbody>
      </table>
    </div>
    <div class="rate-block">
      <h3>Machine hire (indicative CHC)</h3>
      <table class="rate-table">
        <thead><tr><th>Machine / operation</th><th>Rate</th></tr></thead>
        <tbody>${machRows}</tbody>
      </table>
    </div>
  `;

  if (source) {
    source.textContent = `${MARKET_META.updatedLabel}. ${MARKET_META.disclaimer}`;
  }
}

renderRateSheet();
