/**
 * Guided onboarding tour for new accounts.
 */

const PENDING_KEY = "prithvi_onboarding_pending";

function doneKey(uid) {
  return `prithvi_onboarding_done_${uid}`;
}

const STEPS = [
  {
    title: "Welcome — FPO ready",
    body: "Create an Organization, invite scouts, and share fields. Insights stay on top of each field page.",
    target: ".app-page-head",
  },
  {
    title: "Add or import fields",
    body: "Drop a pin in India or the USA — currency, MSP/cash prices, and nearby markets follow that field.",
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

export function onboardingDone(uid) {
  if (!uid) return false;
  return localStorage.getItem(doneKey(uid)) === "1";
}

export function markOnboardingDone(uid) {
  if (!uid) return;
  localStorage.setItem(doneKey(uid), "1");
  sessionStorage.removeItem(PENDING_KEY);
}

/** Call after signup so the tour runs on the next app visit. */
export function markOnboardingPending() {
  sessionStorage.setItem(PENDING_KEY, "1");
}

export function shouldShowOnboardingTour(uid) {
  if (!uid) return false;
  if (sessionStorage.getItem(PENDING_KEY) === "1") return true;
  return !onboardingDone(uid);
}

export function startOnboardingTour({ uid, onDone } = {}) {
  if (!uid || !shouldShowOnboardingTour(uid)) {
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
    markOnboardingDone(uid);
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
