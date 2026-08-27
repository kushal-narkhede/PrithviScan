/**
 * White-label / multi-tenant theming hook (feature 4.3).
 * Loads optional /assets/tenant.json and applies CSS variables + brand text.
 *
 * Example tenant.json:
 * {
 *   "tenantId": "demo-coop",
 *   "brandName": "CoopScan",
 *   "primary": "#1b5e3b",
 *   "accent": "#c4a35a",
 *   "logoUrl": "assets/logo-mark.png",
 *   "supportEmail": "help@example.org"
 * }
 */

const DEFAULT = {
  tenantId: "prithviscan",
  brandName: "PrithviScan",
  primary: "#1f6b45",
  accent: "#c4a35a",
};

let cached = null;

export async function loadTenantConfig() {
  if (cached) return cached;
  try {
    const res = await fetch("assets/tenant.json", { cache: "no-store" });
    if (!res.ok) {
      cached = { ...DEFAULT };
      return cached;
    }
    const json = await res.json();
    cached = { ...DEFAULT, ...json };
  } catch {
    cached = { ...DEFAULT };
  }
  return cached;
}

export async function applyTenantTheme() {
  const t = await loadTenantConfig();
  const root = document.documentElement;
  if (t.primary) root.style.setProperty("--tenant-primary", t.primary);
  if (t.accent) root.style.setProperty("--tenant-accent", t.accent);
  if (t.bg) root.style.setProperty("--tenant-bg", t.bg);

  document.querySelectorAll("[data-tenant-brand]").forEach((el) => {
    el.textContent = t.brandName || DEFAULT.brandName;
  });

  if (t.logoUrl) {
    document.querySelectorAll("[data-tenant-logo]").forEach((el) => {
      if (el.tagName === "IMG") el.src = t.logoUrl;
    });
  }

  if (t.brandName && t.brandName !== "PrithviScan") {
    const title = document.title.replace("PrithviScan", t.brandName);
    if (title !== document.title) document.title = title;
  }

  document.documentElement.dataset.tenant = t.tenantId || "prithviscan";
  return t;
}

// Auto-apply on module load for pages that import this file
applyTenantTheme().catch(() => {});
