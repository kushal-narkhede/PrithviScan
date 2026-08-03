/**
 * PrithviScan Lottie loading overlay — page boot + async status ops.
 */

const ANIM_SRC = "/assets/loading.json";
const LOTTIE_SRC = "/vendor/lottie/lottie.min.js";

const HEAVY_RE =
  /(Loading|Computing|Checking|Getting|Importing|Fetching|Analys|Snapping|Deleting|Uploading|NASA|Trend)/i;
const BUSY_RE =
  /(…|\.\.\.|Loading|Computing|Checking|Getting|Importing|Saving|Deleting|Snapping|Fetching|Analys|Logging|Uploading)/i;

const REDUCED =
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

let lottieReady = null;
let bootAnim = null;
let busyAnim = null;
let bootTimer = null;
let busyDepth = 0;
let statusBusy = false;
let bootHidden = false;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-ps-lottie]`);
    if (existing && window.lottie) {
      resolve(window.lottie);
      return;
    }
    if (window.lottie) {
      resolve(window.lottie);
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.psLottie = "1";
    s.onload = () => resolve(window.lottie);
    s.onerror = () => reject(new Error("Could not load Lottie"));
    document.head.appendChild(s);
  });
}

function ensureLottie() {
  if (!lottieReady) lottieReady = loadScript(LOTTIE_SRC).catch(() => null);
  return lottieReady;
}

function ensureDom() {
  let root = document.getElementById("psLoaderRoot");
  if (root) return root;

  root = document.createElement("div");
  root.id = "psLoaderRoot";
  root.innerHTML = `
    <div class="ps-loader-boot" id="psLoaderBoot" hidden>
      <div class="ps-loader-card" role="status" aria-live="polite" aria-busy="true">
        <div class="ps-loader-anim" id="psLoaderBootAnim" aria-hidden="true"></div>
        <p class="ps-loader-label" id="psLoaderBootLabel">Loading PrithviScan…</p>
      </div>
    </div>
    <div class="ps-loader-busy" id="psLoaderBusy" hidden>
      <div class="ps-loader-busy-card" role="status" aria-live="polite" aria-busy="true">
        <div class="ps-loader-anim ps-loader-anim--sm" id="psLoaderBusyAnim" aria-hidden="true"></div>
        <p class="ps-loader-busy-label" id="psLoaderBusyLabel">Working…</p>
      </div>
    </div>
  `;
  document.body.appendChild(root);
  return root;
}

async function playIn(host, size) {
  if (!host) return null;
  host.replaceChildren();
  if (REDUCED) {
    host.classList.add("ps-loader-anim--fallback");
    return null;
  }
  const lottie = await ensureLottie();
  if (!lottie) {
    host.classList.add("ps-loader-anim--fallback");
    return null;
  }
  host.classList.remove("ps-loader-anim--fallback");
  return lottie.loadAnimation({
    container: host,
    renderer: "svg",
    loop: true,
    autoplay: true,
    path: ANIM_SRC,
    rendererSettings: { progressiveLoad: true, hideOnTransparent: true },
  });
}

export async function showBoot(message = "Loading PrithviScan…") {
  ensureDom();
  const boot = document.getElementById("psLoaderBoot");
  const label = document.getElementById("psLoaderBootLabel");
  if (label) label.textContent = message;
  if (boot) {
    boot.hidden = false;
    document.documentElement.classList.add("ps-loading-boot");
  }
  if (!bootAnim) {
    bootAnim = await playIn(document.getElementById("psLoaderBootAnim"), "lg");
  } else if (bootAnim?.play) {
    bootAnim.play();
  }
}

export function hideBoot() {
  if (bootHidden) return;
  bootHidden = true;
  if (bootTimer) {
    clearTimeout(bootTimer);
    bootTimer = null;
  }
  const boot = document.getElementById("psLoaderBoot");
  if (!boot || boot.hidden) {
    document.documentElement.classList.remove("ps-loading-boot");
    return;
  }
  boot.classList.add("is-leaving");
  window.setTimeout(() => {
    boot.hidden = true;
    boot.classList.remove("is-leaving");
    document.documentElement.classList.remove("ps-loading-boot");
    if (bootAnim?.pause) bootAnim.pause();
  }, REDUCED ? 0 : 280);
}

function setBusyVisible(on, message) {
  ensureDom();
  const busy = document.getElementById("psLoaderBusy");
  const label = document.getElementById("psLoaderBusyLabel");
  if (label && message) label.textContent = message;
  if (!busy) return;
  if (on) {
    busy.hidden = false;
    document.documentElement.classList.add("ps-loading-busy");
  } else {
    busy.hidden = true;
    document.documentElement.classList.remove("ps-loading-busy");
    if (busyAnim?.pause) busyAnim.pause();
  }
}

async function ensureBusyAnim() {
  if (!busyAnim) {
    busyAnim = await playIn(document.getElementById("psLoaderBusyAnim"), "sm");
  } else if (busyAnim?.play) {
    busyAnim.play();
  }
}

function refreshBusy(message) {
  const on = busyDepth > 0 || statusBusy;
  setBusyVisible(on, message);
  if (on) ensureBusyAnim();
}

export async function showBusy(message = "Working…", { fromStatus = false } = {}) {
  if (fromStatus) statusBusy = true;
  else busyDepth += 1;
  refreshBusy(message);
  await ensureBusyAnim();
}

export function hideBusy(force = false) {
  if (force) {
    busyDepth = 0;
    statusBusy = false;
  } else {
    busyDepth = Math.max(0, busyDepth - 1);
  }
  refreshBusy();
}

export function syncFromStatus(message = "", type = "") {
  const msg = String(message || "").trim();
  if (!msg || type === "ok" || type === "error") {
    statusBusy = false;
    refreshBusy();
    return;
  }
  if (HEAVY_RE.test(msg) || BUSY_RE.test(msg)) {
    statusBusy = true;
    refreshBusy(msg);
    ensureBusyAnim();
  } else {
    statusBusy = false;
    refreshBusy();
  }
}

/** Watch common status nodes for Loading… style copy. */
export function bindStatusWatch() {
  const nodes = document.querySelectorAll(
    "#appStatus, #fieldStatus, #collabStatus, #financeStatus, #orgStatus, #pricesStatus, #profileStatus, .app-status[role='status']"
  );
  nodes.forEach((el) => {
    if (el.dataset.psLoaderBound) return;
    el.dataset.psLoaderBound = "1";
    const apply = () => {
      const type = el.classList.contains("is-error")
        ? "error"
        : el.classList.contains("is-ok")
          ? "ok"
          : "";
      syncFromStatus(el.textContent || "", type);
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(el, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  });

  // Insight title while field detail boots
  const insight = document.getElementById("insightTitle");
  if (insight && !insight.dataset.psLoaderBound) {
    insight.dataset.psLoaderBound = "1";
    const wrap = document.getElementById("insightWrap") || insight.closest(".insight-card-wrap");
    const applyInsight = () => {
      const text = insight.textContent || "";
      if (/Loading/i.test(text)) {
        wrap?.classList.add("ps-insight-loading");
        ensureInline(wrap);
      } else {
        wrap?.classList.remove("ps-insight-loading");
      }
    };
    applyInsight();
    new MutationObserver(applyInsight).observe(insight, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }
}

async function ensureInline(host) {
  if (!host || host.querySelector(".ps-loader-inline")) return;
  const box = document.createElement("div");
  box.className = "ps-loader-inline";
  box.setAttribute("aria-hidden", "true");
  host.appendChild(box);
  await playIn(box, "sm");
}

export function bootPageLoader(options = {}) {
  const {
    message = document.body?.classList?.contains("app-body")
      ? "Loading your fields…"
      : "Loading PrithviScan…",
    minMs = 450,
    maxMs = 4200,
  } = options;

  const started = performance.now();
  showBoot(message);

  const finish = () => {
    const elapsed = performance.now() - started;
    const wait = Math.max(0, minMs - elapsed);
    bootTimer = window.setTimeout(hideBoot, wait);
  };

  if (document.readyState === "complete") finish();
  else window.addEventListener("load", finish, { once: true });

  // Never leave the splash stuck
  window.setTimeout(hideBoot, maxMs);

  // Re-bind after dynamic mounts
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      bindStatusWatch();
    });
  } else {
    bindStatusWatch();
  }
  window.setTimeout(bindStatusWatch, 800);
}

export const PsLoader = {
  showBoot,
  hideBoot,
  showBusy,
  hideBusy,
  syncFromStatus,
  bindStatusWatch,
  bootPageLoader,
};

if (typeof window !== "undefined") {
  window.PsLoader = PsLoader;
}
