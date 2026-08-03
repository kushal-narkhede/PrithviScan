/**
 * Site-wide interactive UX — auto-runs on every page that imports it.
 */

const REDUCED =
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const REVEAL_SELECTORS = [
  ".app-page-head",
  ".app-panel",
  ".insight-card-wrap",
  ".metrics-grid > *",
  ".field-tools",
  ".field-tool-panel",
  ".urtc-card",
  ".collab-card",
  ".collab-tabs",
  ".info-hero",
  ".info-toolbar",
  ".info-card",
  ".auth-panel",
  ".price-card",
  ".org-card",
  ".section .shell > *",
  ".hero-content > *",
  ".policy-block",
  ".profile-layout > *",
  ".profile-prefs-card",
].join(",");

const PRESS_SELECTORS = [
  ".btn",
  ".app-btn-primary",
  ".app-btn-ghost",
  ".app-btn-danger",
  ".nav-cta",
  ".field-tool-btn",
  ".collab-tab",
  ".collab-btn",
  ".app-tab-btn",
  ".auth-submit",
  ".auth-google",
  ".auth-tab",
  "button:not([disabled])",
  "a.brand",
].join(",");

function ensureProgress() {
  if (document.querySelector(".ux-progress")) return;
  const bar = document.createElement("div");
  bar.className = "ux-progress";
  bar.setAttribute("aria-hidden", "true");
  document.body.appendChild(bar);

  const onScroll = () => {
    const el = document.documentElement;
    const max = el.scrollHeight - el.clientHeight;
    const pct = max > 0 ? (el.scrollTop / max) * 100 : 0;
    bar.style.width = `${pct}%`;
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function ensureBackTop() {
  if (document.querySelector(".ux-top")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ux-top";
  btn.setAttribute("aria-label", "Back to top");
  btn.textContent = "↑";
  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" });
  });
  document.body.appendChild(btn);

  const onScroll = () => {
    btn.classList.toggle("is-show", window.scrollY > 480);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

function markReveals() {
  const nodes = document.querySelectorAll(REVEAL_SELECTORS);
  nodes.forEach((el, i) => {
    if (el.classList.contains("ux-reveal") || el.classList.contains("reveal")) return;
    if (el.closest(".leaflet-container")) return;
    el.classList.add("ux-reveal");
    el.style.setProperty("--ux-delay", `${Math.min((i % 8) * 45, 320)}ms`);
  });

  if (REDUCED || !("IntersectionObserver" in window)) {
    document.querySelectorAll(".ux-reveal, .reveal").forEach((el) => {
      el.classList.add("is-in", "is-visible");
    });
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in", "is-visible");
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );

  document.querySelectorAll(".ux-reveal, .reveal").forEach((el) => io.observe(el));
}

function ripple(e, el) {
  if (REDUCED) return;
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.2;
  const span = document.createElement("span");
  span.className = "ux-ripple";
  span.style.width = `${size}px`;
  span.style.height = `${size}px`;
  span.style.left = `${e.clientX - rect.left - size / 2}px`;
  span.style.top = `${e.clientY - rect.top - size / 2}px`;
  el.appendChild(span);
  span.addEventListener("animationend", () => span.remove());
}

function wirePressables() {
  document.querySelectorAll(PRESS_SELECTORS).forEach((el) => {
    if (el.dataset.uxPress) return;
    el.dataset.uxPress = "1";
    el.classList.add("ux-pressable");
    const bg = getComputedStyle(el).backgroundColor;
    if (bg.includes("255") || bg === "rgba(0, 0, 0, 0)" || bg === "transparent") {
      el.classList.add("ux-dark-ink");
    }
    el.addEventListener("click", (e) => ripple(e, el));
  });
}

function markActiveNav() {
  const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const links = document.querySelectorAll(".app-nav a[href], .site-header .nav a[href], .auth-top a[href]");
  links.forEach((a) => {
    const href = (a.getAttribute("href") || "").split("?")[0].split("#")[0].toLowerCase();
    if (!href || href.startsWith("http")) return;
    const file = href.includes("/") ? href.split("/").pop() : href;
    if (file === path || (path === "" && file === "index.html")) {
      a.classList.add("is-active");
      a.setAttribute("aria-current", "page");
    }
  });
}

function watchDynamicPanels() {
  if (!("MutationObserver" in window)) return;
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === "attributes" && m.attributeName === "hidden") {
        const el = m.target;
        if (el instanceof HTMLElement && !el.hidden) {
          el.classList.remove("ux-panel-anim");
          // reflow to restart animation
          void el.offsetWidth;
          el.classList.add("ux-panel-anim");
        }
      }
      if (m.type === "childList" && m.addedNodes.length) {
        wirePressables();
        markReveals();
        animateNewMetrics(m.target);
      }
    }
  });
  mo.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["hidden"],
  });
}

function animateNewMetrics(root) {
  if (REDUCED || !(root instanceof Element)) return;
  root.querySelectorAll?.(".metric-value, .outlook-stats strong, .harvest-stats strong").forEach((el) => {
    if (el.dataset.uxCounted) return;
    const text = String(el.textContent || "").trim();
    const num = Number(text.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(num) || Math.abs(num) > 1e7) return;
    if (!/\d/.test(text)) return;
    el.dataset.uxCounted = "1";
    el.classList.add("ux-count", "is-ticking");
    const suffix = text.replace(/^[\d.,\s+-]+/, "");
    const prefix = text.match(/^[^0-9-]*/)?.[0] || "";
    const start = performance.now();
    const dur = 700;
    const from = 0;
    const step = (t) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - (1 - p) ** 3;
      const cur = from + (num - from) * eased;
      el.textContent = `${prefix}${Number.isInteger(num) ? Math.round(cur) : cur.toFixed(1)}${suffix}`;
      if (p < 1) requestAnimationFrame(step);
      else {
        el.textContent = text;
        el.classList.remove("is-ticking");
      }
    };
    requestAnimationFrame(step);
  });
}

function pulseInsightOnChange() {
  const card = document.getElementById("insightCard");
  if (!card || !("MutationObserver" in window)) return;
  const mo = new MutationObserver(() => {
    card.classList.remove("ux-pulse");
    void card.offsetWidth;
    card.classList.add("ux-pulse");
  });
  mo.observe(card, { childList: true, subtree: true, characterData: true });
}

function enhanceStickyHeaders() {
  const header = document.querySelector(".app-top, .site-header");
  if (!header) return;
  const onScroll = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 10);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/** Public toast helper for pages that want it */
export function uxToast(message, { ms = 2800 } = {}) {
  let host = document.querySelector(".ux-toast-host");
  if (!host) {
    host = document.createElement("div");
    host.className = "ux-toast-host";
    document.body.appendChild(host);
  }
  const toast = document.createElement("div");
  toast.className = "ux-toast";
  toast.textContent = String(message || "");
  host.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("is-out");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }, ms);
}

export function enhancePage() {
  if (document.documentElement.dataset.uxEnhanced) return;
  document.documentElement.dataset.uxEnhanced = "1";
  document.documentElement.classList.add("ux-ready");

  ensureProgress();
  ensureBackTop();
  markActiveNav();
  markReveals();
  wirePressables();
  enhanceStickyHeaders();
  watchDynamicPanels();
  pulseInsightOnChange();
  animateNewMetrics(document);

  window.addEventListener("ux-toast", (e) => {
    const detail = e.detail;
    if (typeof detail === "string") uxToast(detail);
    else if (detail?.message) uxToast(detail.message, { ms: detail.ms });
  });

  // Soft year stamp if present
  const year = document.getElementById("year");
  if (year && !year.textContent) year.textContent = String(new Date().getFullYear());
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", enhancePage);
} else {
  enhancePage();
}
