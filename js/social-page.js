/**
 * Social hub — switch Organization vs Community panels via hash.
 * #org | #organization → org
 * #community | #collab | #collaborate | #friends | #chat | #share → community
 */

const VALID = new Set(["org", "community"]);

function resolveSection(raw) {
  const h = String(raw || "")
    .replace(/^#/, "")
    .toLowerCase();
  if (!h || h === "org" || h === "organization" || h === "team") return "org";
  if (
    h === "community" ||
    h === "collab" ||
    h === "collaborate" ||
    h === "friends" ||
    h === "chat" ||
    h === "share"
  ) {
    return "community";
  }
  return VALID.has(h) ? h : "org";
}

export function showSocialSection(section, { updateHash = true } = {}) {
  const next = resolveSection(section);
  document.querySelectorAll(".social-tab").forEach((btn) => {
    const on = btn.dataset.social === next;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-selected", on ? "true" : "false");
  });
  document.querySelectorAll("[data-social-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.socialPanel !== next;
  });
  if (updateHash) {
    const url = new URL(window.location.href);
    url.hash = next;
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
}

function boot() {
  document.querySelectorAll(".social-tab").forEach((btn) => {
    btn.addEventListener("click", () => showSocialSection(btn.dataset.social));
  });

  const initial = resolveSection(window.location.hash);
  showSocialSection(initial, { updateHash: false });

  window.addEventListener("hashchange", () => {
    showSocialSection(window.location.hash, { updateHash: false });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
