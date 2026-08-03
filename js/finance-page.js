import { watchAuth, isFirebaseConfigured } from "./auth.js";
import { listFields } from "./fields.js?v=region1";
import { listFieldUsages } from "./field-inputs.js";
import { detectRegion, formatMoney, getRegionMeta, regionBadgeLabel } from "./region.js";
import { getCropPrices, cropPricePerKg } from "./market-prices.js";
import "./a11y.js";

const statusEl = document.getElementById("financeStatus");
const summaryEl = document.getElementById("financeSummary");
const listEl = document.getElementById("financeFieldList");

function setStatus(msg, type = "") {
  if (!statusEl) return;
  statusEl.textContent = msg || "";
  statusEl.className = `app-status${type ? ` is-${type}` : ""}`;
  window.PsLoader?.syncFromStatus?.(msg || "", type);
}

function emi(principal, annualPct, years) {
  const r = annualPct / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1);
}

document.getElementById("loanForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const p = Number(document.getElementById("loanPrincipal").value) || 0;
  const rate = Number(document.getElementById("loanRate").value) || 0;
  const years = Number(document.getElementById("loanYears").value) || 1;
  const monthly = emi(p, rate, years);
  const box = document.getElementById("loanResult");
  box.hidden = false;
  box.innerHTML = `<strong>Est. monthly payment:</strong> ${monthly.toFixed(2)} · total ~${(monthly * years * 12).toFixed(0)}`;
});

watchAuth(async (user) => {
  if (!user) {
    window.location.href = "auth.html";
    return;
  }
  if (!isFirebaseConfigured()) {
    setStatus("Firebase not configured.", "error");
    return;
  }
  setStatus("Loading field finances…");
  try {
    const fields = await listFields(user.uid);
    let totalCost = 0;
    let totalRevenue = 0;
    const rows = [];
    for (const f of fields) {
      const region = f.region || detectRegion(f.lat, f.lon);
      const usages = await listFieldUsages(user.uid, f.id, 40, f.orgId || null).catch(() => []);
      const cost = usages.reduce((a, u) => a + (Number(u.estCost) || 0), 0);
      const crops = getCropPrices(region === "US" ? "US" : "IN");
      const crop = crops[0];
      const revenue = Math.round(3200 * 1 * cropPricePerKg(crop, region === "US" ? "US" : "IN"));
      totalCost += cost;
      totalRevenue += revenue;
      rows.push({ f, region, cost, revenue, profit: revenue - cost });
    }
    const profit = totalRevenue - totalCost;
    const roi = totalCost > 0 ? (profit / totalCost) * 100 : null;
    const region = rows[0]?.region || "IN";
    summaryEl.innerHTML = `
      <div><span>Fields</span><strong>${fields.length}</strong></div>
      <div><span>Costs</span><strong>${formatMoney(totalCost, region)}</strong></div>
      <div><span>Est. revenue</span><strong>${formatMoney(totalRevenue, region)}</strong></div>
      <div><span>Profit</span><strong>${formatMoney(profit, region)}</strong></div>
      <div><span>ROI</span><strong>${roi == null ? "—" : `${roi.toFixed(0)}%`}</strong></div>`;
    listEl.innerHTML = rows
      .map(
        (r) => `<li class="usage-row"><div><strong>${r.f.name || "Field"}</strong>
        <span>${regionBadgeLabel(r.region)}</span></div>
        <div class="usage-side"><strong>${formatMoney(r.profit, r.region)}</strong></div></li>`
      )
      .join("") || `<li class="app-muted">No fields yet.</li>`;

    const tips = document.getElementById("insuranceTips");
    const meta = getRegionMeta(region);
    tips.textContent =
      region === "IN"
        ? "India: consider PMFBY / state crop insurance before monsoon; keep sowing dates documented."
        : region === "US"
          ? "USA: review Federal Crop Insurance / RMA policies; document APH yields."
          : `${meta.name}: ask local cooperatives about crop/weather insurance products; keep input receipts.`;
    setStatus("Finance snapshot ready (revenue is reference-yield based).", "ok");
  } catch (err) {
    setStatus(err?.message || "Could not load finances.", "error");
  }
});
