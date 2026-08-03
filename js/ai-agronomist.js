/**
 * Lightweight RAG context for Ask AI agronomist mode.
 * Pulls snippets from crop guides + info hub for the user query.
 */

import { CROP_GUIDES, matchCropGuide } from "./crop-guides.js";
import { searchEntries } from "./info-data.js";

function clip(text, n = 220) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

/**
 * @param {string} query
 * @returns {string} context block to prepend into the system prompt
 */
export function buildAgronomistContext(query) {
  const q = String(query || "").trim();
  if (!q) return "";

  const blocks = [];
  const guide = matchCropGuide(q);
  if (guide) {
    const tip = Array.isArray(guide.tips) ? guide.tips[0] : "";
    blocks.push(
      `Crop guide (${guide.name}): season ${guide.season || "—"}; ` +
        `typical duration ~${guide.durationDays?.typical || "?"} days; ` +
        `${clip(`${guide.summary || ""} ${tip}`, 280)}`
    );
  } else {
    const hits = CROP_GUIDES.filter((g) =>
      q.toLowerCase().split(/\s+/).some((w) => w.length > 3 && g.name.toLowerCase().includes(w))
    ).slice(0, 2);
    hits.forEach((g) => {
      blocks.push(`Crop guide (${g.name}): ${clip(g.summary || "", 200)}`);
    });
  }

  try {
    const words = q.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const seen = new Set();
    const entries = [];
    for (const w of words.slice(0, 6)) {
      for (const e of searchEntries(w, "all")) {
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        entries.push(e);
        if (entries.length >= 4) break;
      }
      if (entries.length >= 4) break;
    }
    entries.forEach((e) => {
      const tip = Array.isArray(e.tips) ? e.tips[0] : "";
      blocks.push(`Info hub (${e.category || "item"} · ${e.name}): ${clip(`${e.summary || ""} ${tip}`, 240)}`);
    });
  } catch {
    /* ignore */
  }

  if (!blocks.length) {
    return "No local RAG hits — answer from general agronomy caution and ask for crop/region.";
  }

  return [
    "Retrieved farm knowledge (cite these when relevant; do not invent rates):",
    ...blocks.map((b, i) => `${i + 1}. ${b}`),
  ].join("\n");
}

export const AGRONOMIST_SYSTEM = `You are PrithviScan AI Agronomist — practical advice for farmers and FPOs in India, USA, Brazil, Kenya, Nigeria, and Indonesia.
Use retrieved crop-guide and info-hub snippets when present. Prefer provenance: say when advice is heuristic.
Match currency/markets to region (INR MSP/mandi, USD cash, etc.). Be concise. Confirm chemicals and rates with local extension.`;
