import {
  getMarketMeta,
  getCropPrices,
  getFertilizerPrices,
  getMachineHire,
  estimateCropRevenue,
  estimateFertilizerCost,
  estimateMachineCost,
  formatCurrency,
  cropSelectLabel,
} from "./market-prices.js";
import { getRegionMeta } from "./region.js";
import "./nav-auth.js";

let activeRegion = "IN";

function detectInitialRegion() {
  const q = new URLSearchParams(window.location.search).get("region");
  if (q === "US" || q === "IN") return q;
  try {
    const saved = localStorage.getItem("prithvi_price_region");
    if (saved === "US" || saved === "IN") return saved;
  } catch {
    /* ignore */
  }
  return "IN";
}

function fillSelect(el, items, labelFn) {
  if (!el) return;
  el.innerHTML = items
    .map((item) => `<option value="${item.id}">${labelFn(item)}</option>`)
    .join("");
}

function setRegion(region) {
  activeRegion = region === "US" ? "US" : "IN";
  try {
    localStorage.setItem("prithvi_price_region", activeRegion);
  } catch {
    /* ignore */
  }
  const url = new URL(window.location.href);
  url.searchParams.set("region", activeRegion);
  history.replaceState(null, "", url.pathname + url.search + url.hash);

  document.querySelectorAll("[data-region-btn]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.regionBtn === activeRegion);
  });

  const meta = getMarketMeta(activeRegion);
  const rmeta = getRegionMeta(activeRegion);
  const hero = document.getElementById("pricesHeroCopy");
  if (hero) {
    hero.innerHTML =
      activeRegion === "US"
        ? `Uses <strong>US cash crop reference prices</strong> (USD), <strong>retail fertilizer</strong>, and <strong>custom-hire</strong> machine rates common across US farm country. Local elevator bids and basis still apply.`
        : `Uses <strong>Government of India MSP</strong> (Kharif / Rabi seasons), <strong>notified fertilizer bag prices</strong>, and <strong>Custom Hiring Centre (CHC)</strong> machine hire rates used across Indian states.`;
  }
  const eyebrow = document.getElementById("pricesEyebrow");
  if (eyebrow) eyebrow.textContent = `${rmeta.name} · ${rmeta.currency} market rates`;

  const cropTitle = document.querySelector("#panel-crop h2");
  const cropMuted = document.querySelector("#panel-crop .muted");
  const yieldCaption = document.getElementById("crop-yield-caption");
  if (cropTitle) {
    cropTitle.textContent =
      activeRegion === "US" ? "Estimate crop sale value (cash price)" : "Estimate crop sale value (MSP)";
  }
  if (cropMuted) {
    cropMuted.textContent =
      activeRegion === "US"
        ? "Cash prices are indicative elevator / terminal references. Your local bid and basis may differ."
        : "MSP is the floor price at which government agencies procure. Local mandi prices may differ.";
  }
  if (yieldCaption) {
    yieldCaption.textContent =
      activeRegion === "US" ? "Expected yield (bu or unit / acre)" : "Expected yield (quintal / acre)";
  }

  fillSelect(document.getElementById("crop-select"), getCropPrices(activeRegion), (c) =>
    cropSelectLabel(c, activeRegion)
  );
  fillSelect(document.getElementById("fert-select"), getFertilizerPrices(activeRegion), (f) =>
    activeRegion === "US"
      ? `${f.name} — $${f.bagPrice}/${f.unitLabel ? "bag" : `${f.bagKg} kg`}`
      : `${f.name} — ₹${f.bagPrice}/${f.unitLabel ? "bottle" : `${f.bagKg} kg bag`}`
  );
  fillSelect(document.getElementById("machine-select"), getMachineHire(activeRegion), (m) =>
    activeRegion === "US"
      ? `${m.name} — $${m.rate}/${m.unit}`
      : `${m.name} — ₹${m.rate}/${m.unit}`
  );

  document.getElementById("crop-result").hidden = true;
  document.getElementById("fert-result").hidden = true;
  document.getElementById("machine-result").hidden = true;
  renderRateSheet();

  const source = document.getElementById("rates-source");
  if (source) source.textContent = `${meta.updatedLabel}. ${meta.disclaimer}`;
}

activeRegion = detectInitialRegion();

document.querySelectorAll("[data-region-btn]").forEach((btn) => {
  btn.addEventListener("click", () => setRegion(btn.dataset.regionBtn));
});

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
  const r = estimateCropRevenue({ cropId, acres, yieldQtlPerAcre, region: activeRegion });
  const box = document.getElementById("crop-result");
  box.hidden = false;
  box.classList.remove("prices-result");
  void box.offsetWidth;
  box.classList.add("prices-result");
  const unit = r.unit || (activeRegion === "US" ? r.crop.unit : "qtl");
  const unitPrice = activeRegion === "US" ? r.crop.price : r.crop.mspPerQuintal;
  const priceLabel = activeRegion === "US" ? `$${unitPrice}/${unit}` : `₹${unitPrice}/qtl`;
  box.innerHTML = `
    <p class="result-label">Estimated sale value (${activeRegion === "US" ? "cash" : "MSP"})</p>
    <p class="result-value">${formatCurrency(r.revenue, activeRegion)}</p>
    <p class="result-detail">
      ${r.totalQtl.toFixed(1)} ${unit} × ${priceLabel}
      · ${r.crop.name} · ${r.crop.season}<br />
      ${formatCurrency(r.revenue / Math.max(r.acres, 0.0001), activeRegion)} per acre
      · Source: ${r.crop.source}
    </p>
  `;
});

document.getElementById("form-fert")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const fertId = document.getElementById("fert-select").value;
  const bags = Number(document.getElementById("fert-bags").value);
  const acres = Number(document.getElementById("fert-acres").value) || 1;
  const r = estimateFertilizerCost({ fertId, bags, region: activeRegion });
  const box = document.getElementById("fert-result");
  box.hidden = false;
  box.classList.remove("prices-result");
  void box.offsetWidth;
  box.classList.add("prices-result");
  const unit = r.fert.unitLabel || `${formatCurrency(r.fert.bagPrice, activeRegion)} / ${r.fert.bagKg} kg bag`;
  box.innerHTML = `
    <p class="result-label">Fertilizer cost</p>
    <p class="result-value">${formatCurrency(r.cost, activeRegion)}</p>
    <p class="result-detail">
      ${r.bags} × ${formatCurrency(r.fert.bagPrice, activeRegion)} (${unit})
      · ${r.fert.name} · ${r.fert.season}<br />
      ${formatCurrency(r.cost / acres, activeRegion)} per acre (at ${acres} acre${acres === 1 ? "" : "s"})
      ${r.perKg != null ? ` · ≈ ${formatCurrency(r.perKg, activeRegion)}/kg` : ""}
      · Source: ${r.fert.source}
    </p>
  `;
});

document.getElementById("form-machine")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const machineId = document.getElementById("machine-select").value;
  const quantity = Number(document.getElementById("machine-qty").value);
  const r = estimateMachineCost({ machineId, quantity, region: activeRegion });
  const box = document.getElementById("machine-result");
  box.hidden = false;
  box.classList.remove("prices-result");
  void box.offsetWidth;
  box.classList.add("prices-result");
  box.innerHTML = `
    <p class="result-label">Estimated hire cost</p>
    <p class="result-value">${formatCurrency(r.cost, activeRegion)}</p>
    <p class="result-detail">
      ${r.quantity} ${r.machine.unit}${r.quantity === 1 ? "" : "s"} × ${formatCurrency(r.machine.rate, activeRegion)}/${r.machine.unit}
      · ${r.machine.name}<br />
      Typical use: ${r.machine.typical} · ${r.machine.source}
    </p>
  `;
});

function renderRateSheet() {
  const host = document.getElementById("rates-tables");
  const source = document.getElementById("rates-source");
  if (!host) return;
  const crops = getCropPrices(activeRegion);
  const ferts = getFertilizerPrices(activeRegion);
  const machines = getMachineHire(activeRegion);
  const meta = getMarketMeta(activeRegion);

  const cropRows = crops
    .map((c) => {
      const price =
        activeRegion === "US"
          ? `$${c.price}/${c.unit}`
          : `₹${c.mspPerQuintal.toLocaleString("en-IN")}/qtl`;
      return `
    <tr>
      <td>${c.name}<br /><small>${c.season}</small></td>
      <td>${price}</td>
    </tr>`;
    })
    .join("");

  const fertRows = ferts
    .map(
      (f) => `
    <tr>
      <td>${f.name}<br /><small>${f.season}</small></td>
      <td>${formatCurrency(f.bagPrice, activeRegion)}${f.unitLabel ? "" : ` / ${f.bagKg} kg`}</td>
    </tr>`
    )
    .join("");

  const machRows = machines
    .map(
      (m) => `
    <tr>
      <td>${m.name}<br /><small>${m.typical}</small></td>
      <td>${formatCurrency(m.rate, activeRegion)}/${m.unit}</td>
    </tr>`
    )
    .join("");

  host.innerHTML = `
    <div class="rate-block">
      <h3>${activeRegion === "US" ? "Crop cash prices" : "Crop MSP (₹/quintal)"}</h3>
      <table class="rate-table">
        <thead><tr><th>Crop</th><th>Price</th></tr></thead>
        <tbody>${cropRows}</tbody>
      </table>
    </div>
    <div class="rate-block">
      <h3>${activeRegion === "US" ? "Fertilizer retail (indicative)" : "Fertilizer notified bag prices"}</h3>
      <table class="rate-table">
        <thead><tr><th>Product</th><th>Retail</th></tr></thead>
        <tbody>${fertRows}</tbody>
      </table>
    </div>
    <div class="rate-block">
      <h3>${activeRegion === "US" ? "Machine hire (custom)" : "Machine hire (indicative CHC)"}</h3>
      <table class="rate-table">
        <thead><tr><th>Machine / operation</th><th>Rate</th></tr></thead>
        <tbody>${machRows}</tbody>
      </table>
    </div>
  `;

  if (source) {
    source.textContent = `${meta.updatedLabel}. ${meta.disclaimer}`;
  }
}

setRegion(activeRegion);
