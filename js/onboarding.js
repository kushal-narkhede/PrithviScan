/**
 * Guided onboarding + demo field (feature 7.1).
 */

import { createField, listFields } from "./fields.js";

const DONE_KEY = "prithvi_onboarding_done";

const STEPS = [
  {
    title: "Welcome — FPO ready",
    body: "Create an Organization, invite scouts, and share fields. Insights stay on top of each field page.",
    target: ".app-page-head",
  },
  {
    title: "Add or import fields",
    body: "Drop a pin (classifier checks it is cropland), or import CSV/GeoJSON for your cooperative.",
    target: "#addFieldPanel",
  },
  {
    title: "Action Center & Alerts",
    body: "Assign irrigate/spray/scout jobs under Actions. Alerts can fan out by email/SMS/WhatsApp from Profile.",
    target: ".app-tab-btn[data-tab='actions'], .app-tab-btn[data-tab='alerts']",
  },
  {
    title: "Field health & crop plan",
    body: "Open a field → Field health for NDVI stress, Crop & harvest for sowing/harvest timing, Markets to sell nearby.",
    target: ".fields-list",
  },
  {
    title: "Trust & your data",
    body: "Export or delete your account under Profile (DPDP). High-risk recommendations ask for confirmation.",
    target: "[data-auth-slot], .app-nav",
  },
];

export function onboardingDone() {
  return localStorage.getItem(DONE_KEY) === "1";
}

export function markOnboardingDone() {
  localStorage.setItem(DONE_KEY, "1");
}

export async function ensureDemoField(uid) {
  const fields = await listFields(uid);
  if (fields.some((f) => f.isDemo || f.name === "Demo field (sample)")) {
    return { created: false, fields };
  }
  const demo = await createField(uid, {
    name: "Demo field (sample)",
    cropType: "Wheat",
    lat: 20.5937,
    lon: 78.9629,
  });
  // Tag as demo via update is nicer — createField doesn't accept isDemo; patch through updateField
  try {
    const { updateField } = await import("./fields.js");
    await updateField(uid, demo.id, {
      isDemo: true,
      lastInsight: {
        level: "watch",
        title: "Sample: Moisture deficit — monitor closely",
        action: "Scout soil moisture and plan light irrigation",
        confidence: 0.74,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch {
    // non-fatal
  }
  return { created: true, fields: [demo, ...fields] };
}

export function startOnboardingTour({ onDone } = {}) {
  if (onboardingDone()) {
    onDone?.();
    return;
  }

  let i = 0;
  const overlay = document.createElement("div");
  overlay.className = "onboard-overlay";
  overlay.innerHTML = `
    <div class="onboard-card" role="dialog" aria-modal="true" aria-labelledby="onboardTitle">
      <p class="onboard-step" id="onboardStep"></p>
      <h2 id="onboardTitle"></h2>
      <p id="onboardBody"></p>
      <div class="onboard-actions">
        <button type="button" class="app-btn-ghost" id="onboardSkip">Skip</button>
        <button type="button" class="app-btn-primary" id="onboardNext">Next</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const titleEl = overlay.querySelector("#onboardTitle");
  const bodyEl = overlay.querySelector("#onboardBody");
  const stepEl = overlay.querySelector("#onboardStep");
  const nextBtn = overlay.querySelector("#onboardNext");
  const skipBtn = overlay.querySelector("#onboardSkip");

  function clearHighlight() {
    document.querySelectorAll(".onboard-highlight").forEach((el) => el.classList.remove("onboard-highlight"));
  }

  function show() {
    clearHighlight();
    const step = STEPS[i];
    stepEl.textContent = `Step ${i + 1} of ${STEPS.length}`;
    titleEl.textContent = step.title;
    bodyEl.textContent = step.body;
    nextBtn.textContent = i === STEPS.length - 1 ? "Finish" : "Next";
    const target = document.querySelector(step.target);
    if (target) {
      target.classList.add("onboard-highlight");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function finish() {
    clearHighlight();
    overlay.remove();
    markOnboardingDone();
    onDone?.();
  }

  nextBtn.addEventListener("click", () => {
    if (i >= STEPS.length - 1) finish();
    else {
      i += 1;
      show();
    }
  });
  skipBtn.addEventListener("click", finish);
  show();
}
