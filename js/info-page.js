import {
  CATEGORIES,
  searchEntries,
  getEntry,
  soils,
  cropsForSoil,
} from "./info-data.js";

const searchInput = document.getElementById("infoSearch");
const searchForm = document.getElementById("infoSearchForm");
const chipsEl = document.getElementById("infoChips");
const listEl = document.getElementById("infoList");
const countEl = document.getElementById("infoCount");
const detailEl = document.getElementById("infoDetail");
const matcherSoilsEl = document.getElementById("matcherSoils");
const matcherResultEl = document.getElementById("matcherResult");

let activeCategory = "all";
let activeId = null;
let activeSoilId = null;

const CAT_LABEL = {
  fertilizer: "Fertilizer",
  amendment: "Amendment",
  soil: "Soil type",
  crop: "Crop",
  input: "Farm input",
};

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderChips() {
  chipsEl.innerHTML = CATEGORIES.map(
    (c) => `
    <button type="button" class="info-chip ${c.id === activeCategory ? "is-active" : ""}" data-cat="${c.id}" role="tab" aria-selected="${c.id === activeCategory}">
      ${esc(c.label)}
    </button>`
  ).join("");

  chipsEl.querySelectorAll(".info-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      renderChips();
      refreshList();
    });
  });
}

function refreshList() {
  const results = searchEntries(searchInput?.value || "", activeCategory);
  countEl.textContent = `${results.length} topic${results.length === 1 ? "" : "s"}`;

  if (!results.length) {
    listEl.innerHTML = `<p class="info-count">No matches — try another word.</p>`;
    return;
  }

  if (!activeId || !results.some((r) => r.id === activeId)) {
    activeId = results[0].id;
  }

  listEl.innerHTML = results
    .map(
      (e) => `
    <button type="button" class="info-item ${e.id === activeId ? "is-active" : ""}" data-id="${esc(e.id)}">
      <span class="info-item-cat">${esc(CAT_LABEL[e.category] || e.category)}</span>
      <strong>${esc(e.name)}</strong>
      <span>${esc(e.summary)}</span>
    </button>`
    )
    .join("");

  listEl.querySelectorAll(".info-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeId = btn.dataset.id;
      listEl.querySelectorAll(".info-item").forEach((b) => b.classList.toggle("is-active", b.dataset.id === activeId));
      renderDetail(activeId);
      detailEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });

  renderDetail(activeId);
}

function renderDetail(id) {
  const e = getEntry(id);
  if (!e) {
    detailEl.innerHTML = `
      <div class="info-detail-empty">
        <div>
          <strong>Pick a topic</strong>
          <p>Select something from the list, or try the soil matcher below.</p>
        </div>
      </div>`;
    return;
  }

  const best = e.bestFor || [];
  detailEl.innerHTML = `
    <div class="info-detail-head">
      <div>
        <span class="info-badge">${esc(CAT_LABEL[e.category] || e.category)}</span>
        <h2>${esc(e.name)}</h2>
      </div>
    </div>
    <p class="info-summary">${esc(e.summary)}</p>
    <div class="info-tags">
      ${(e.tags || []).map((t) => `<span class="info-tag">${esc(t)}</span>`).join("")}
    </div>
    <div class="info-sections">
      <div class="info-block">
        <h3>Composition / key facts</h3>
        <div class="info-comp">
          ${(e.composition || [])
            .map(
              (row) => `
            <div class="info-comp-row">
              <span>${esc(row.nutrient)}</span>
              <span>${esc(row.value)}</span>
            </div>`
            )
            .join("")}
        </div>
      </div>

      <div class="info-block">
        <h3>Pros &amp; cons</h3>
        <div class="info-cols">
          <ul class="info-pros">
            ${(e.pros || []).map((p) => `<li>${esc(p)}</li>`).join("")}
          </ul>
          <ul class="info-cons">
            ${(e.cons || []).map((c) => `<li>${esc(c)}</li>`).join("")}
          </ul>
        </div>
      </div>

      ${
        e.tips?.length
          ? `<div class="info-block">
              <h3>Practical tips</h3>
              <ul class="info-tips">${e.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
            </div>`
          : ""
      }

      ${
        best.length
          ? `<div class="info-block">
              <h3>${e.category === "soil" || e.category === "crop" ? "Pairs well with" : "Often used for"}</h3>
              <div class="info-best">
                ${best
                  .map((b) => `<button type="button" data-jump="${esc(b)}">${esc(b)}</button>`)
                  .join("")}
              </div>
              ${e.growsBest ? `<p class="info-summary" style="margin-top:0.85rem">${esc(e.growsBest)}</p>` : ""}
            </div>`
          : ""
      }
    </div>
  `;

  detailEl.querySelectorAll("[data-jump]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const term = btn.dataset.jump;
      if (searchInput) searchInput.value = term;
      activeCategory = "all";
      renderChips();
      // Prefer exact name match if possible
      const exact = searchEntries(term, "all").find(
        (x) => x.name.toLowerCase() === term.toLowerCase()
      );
      const fuzzy = searchEntries(term, "all");
      activeId = exact?.id || fuzzy[0]?.id || null;
      refreshList();
    });
  });
}

function renderMatcher() {
  const soilList = soils();
  matcherSoilsEl.innerHTML = soilList
    .map(
      (s) => `
    <button type="button" class="matcher-soil ${s.id === activeSoilId ? "is-active" : ""}" data-soil="${esc(s.id)}">
      ${esc(s.name)}
    </button>`
    )
    .join("");

  matcherSoilsEl.querySelectorAll(".matcher-soil").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeSoilId = btn.dataset.soil;
      renderMatcher();
      const soil = getEntry(activeSoilId);
      const crops = cropsForSoil(soil?.name || "");
      // Also include crops listed in soil.bestFor by name match
      const byName = (soil?.bestFor || [])
        .map((name) => searchEntries(name, "crop").find((c) => c.name.toLowerCase().includes(name.toLowerCase().split(" ")[0].toLowerCase())))
        .filter(Boolean);
      const merged = [...crops];
      byName.forEach((c) => {
        if (!merged.some((m) => m.id === c.id)) merged.push(c);
      });

      matcherResultEl.hidden = false;
      if (!merged.length) {
        matcherResultEl.innerHTML = `<p>No crop matches yet — browse the Crops category.</p>`;
        return;
      }
      matcherResultEl.innerHTML = `
        <p>Crops that often suit <strong>${esc(soil.name)}</strong>:</p>
        ${merged
          .map(
            (c) => `
          <button type="button" class="matcher-card" data-open="${esc(c.id)}">
            <strong>${esc(c.name)}</strong>
            <span>${esc(c.summary)}</span>
          </button>`
          )
          .join("")}`;

      matcherResultEl.querySelectorAll("[data-open]").forEach((card) => {
        card.addEventListener("click", () => {
          activeCategory = "crop";
          activeId = card.dataset.open;
          if (searchInput) searchInput.value = "";
          renderChips();
          refreshList();
          window.scrollTo({ top: detailEl.offsetTop - 80, behavior: "smooth" });
        });
      });
    });
  });
}

searchForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  refreshList();
});

searchInput?.addEventListener("input", () => {
  refreshList();
});

// Deep link: info.html?q=urea or ?id=urea
const params = new URLSearchParams(window.location.search);
if (params.get("q") && searchInput) searchInput.value = params.get("q");
if (params.get("id")) activeId = params.get("id");
if (params.get("cat") && CATEGORIES.some((c) => c.id === params.get("cat"))) {
  activeCategory = params.get("cat");
}

renderChips();
refreshList();
renderMatcher();
