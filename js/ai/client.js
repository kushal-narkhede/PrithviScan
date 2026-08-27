/**
 * Unified AI chat client — routes to Ollama (default), Gemini, or OpenRouter.
 * Optional Cloud Functions proxy when FUNCTIONS_ENABLED (see callAiChat in api.js).
 */

import { loadAiConfig } from "../ai-config.js";
import { chatWithOllama } from "./providers/ollama.js";
import { chatWithGemini } from "./providers/gemini.js";
import { chatWithOpenRouter } from "./providers/openrouter.js";
import { FUNCTIONS_ENABLED, callAiChat } from "../api.js";

/** Temporary demo reply for all Ask AI questions. */
export const FIXED_AI_RESPONSE =
  "If the soil is still soft, sticky, or waterlogged → do NOT irrigate.\nIf the soil is firm, crumbly, and moisture is below the crop's normal threshold → irrigation can resume.";

/**
 * @param {object} opts
 * @param {Array<{role:string, content:string}>} opts.messages  full history including system
 * @param {AbortSignal} [opts.signal]
 * @param {object} [opts.config] override loaded config
 */
export async function completeChat({ messages, signal, config } = {}) {
  void messages;
  void signal;
  const cfg = config || loadAiConfig();
  const provider = cfg.provider || "ollama";
  const model =
    provider === "ollama"
      ? cfg.ollama?.model
      : provider === "gemini"
        ? cfg.gemini?.model
        : cfg.openrouter?.model;

  return {
    text: FIXED_AI_RESPONSE,
    provider,
    model,
    via: "fixed-demo",
  };
}

export function providerLabel(id) {
  return (
    {
      ollama: "Ollama (local)",
      gemini: "Google Gemini",
      openrouter: "OpenRouter",
    }[id] || id
  );
}
