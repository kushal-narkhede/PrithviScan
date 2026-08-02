/**
 * Unified AI chat client — routes to Ollama (default), Gemini, or OpenRouter.
 * Optional Cloud Functions proxy when FUNCTIONS_ENABLED (see callAiChat in api.js).
 */

import { loadAiConfig } from "../ai-config.js";
import { chatWithOllama } from "./providers/ollama.js";
import { chatWithGemini } from "./providers/gemini.js";
import { chatWithOpenRouter } from "./providers/openrouter.js";
import { FUNCTIONS_ENABLED, callAiChat } from "../api.js";

/**
 * @param {object} opts
 * @param {Array<{role:string, content:string}>} opts.messages  full history including system
 * @param {AbortSignal} [opts.signal]
 * @param {object} [opts.config] override loaded config
 */
export async function completeChat({ messages, signal, config } = {}) {
  const cfg = config || loadAiConfig();
  const provider = cfg.provider || "ollama";

  // Prefer server proxy for cloud providers when Functions are live (keeps keys off the client).
  if (FUNCTIONS_ENABLED && (provider === "gemini" || provider === "openrouter")) {
    const result = await callAiChat({
      provider,
      messages,
      model: cfg[provider]?.model,
    });
    if (result?.disabled) {
      // fall through to client-side key if present
    } else if (result?.ok && result?.text) {
      return {
        text: result.text,
        provider: result.provider || provider,
        model: result.model,
        via: "functions",
      };
    } else if (result?.error && !cfg[provider]?.apiKey) {
      throw new Error(result.error);
    }
  }

  if (provider === "gemini") {
    return chatWithGemini({
      ...cfg.gemini,
      messages,
      signal,
    });
  }

  if (provider === "openrouter") {
    return chatWithOpenRouter({
      ...cfg.openrouter,
      messages,
      signal,
    });
  }

  // Default: Ollama
  return chatWithOllama({
    ...cfg.ollama,
    messages,
    signal,
  });
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
