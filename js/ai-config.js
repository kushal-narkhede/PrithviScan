/**
 * AI provider configuration for PrithviScan Ask AI.
 *
 * Active provider for local/dev: "ollama"
 * Gemini + OpenRouter are wired; set keys in the Ask AI settings panel
 * (stored in localStorage) or later via Cloud Functions secrets.
 *
 * Never commit real API keys. Prefer Functions secrets once on Blaze:
 *   firebase functions:secrets:set GEMINI_API_KEY
 *   firebase functions:secrets:set OPENROUTER_API_KEY
 */

export const AI_PROVIDERS = ["ollama", "gemini", "openrouter"];

export const DEFAULT_AI_CONFIG = {
  provider: "ollama",
  systemPrompt: `You are PrithviScan Ask AI — a practical farm advisor for Indian farmers and FPOs.
Help with crops, soils, fertilizers, irrigation, MSP/price budgeting, tractors/machines, and field decisions.
Be concise, clear, and cautious: remind users to confirm rates and chemicals with local extension officers.
Prefer units farmers use (acres, quintals, ₹). If unsure, say so.`,
  ollama: {
    // 127.0.0.1 often behaves better than "localhost" for browser → Ollama
    baseUrl: "http://127.0.0.1:11434",
    model: "llama3.2",
  },
  gemini: {
    /** Browser key for testing only — move to Cloud Functions in production */
    apiKey: "",
    model: "gemini-2.0-flash",
    endpoint: "https://generativelanguage.googleapis.com/v1beta",
  },
  openrouter: {
    apiKey: "",
    model: "meta-llama/llama-3.2-3b-instruct:free",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    siteUrl: "https://prithviscan.web.app",
    siteName: "PrithviScan",
  },
};

const STORAGE_KEY = "prithviscan.ai.config.v1";

export function loadAiConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_AI_CONFIG);
    const saved = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULT_AI_CONFIG),
      ...saved,
      ollama: { ...DEFAULT_AI_CONFIG.ollama, ...(saved.ollama || {}) },
      gemini: { ...DEFAULT_AI_CONFIG.gemini, ...(saved.gemini || {}) },
      openrouter: { ...DEFAULT_AI_CONFIG.openrouter, ...(saved.openrouter || {}) },
    };
  } catch {
    return structuredClone(DEFAULT_AI_CONFIG);
  }
}

export function saveAiConfig(config) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
