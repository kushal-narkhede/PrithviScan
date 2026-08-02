/**
 * Server-side AI chat helpers for Gemini + OpenRouter.
 * Used by exports.aiChat when Cloud Functions are enabled (Blaze).
 * Ollama is typically called from the browser against a local/remote host.
 */

async function chatGemini({ apiKey, model, messages }) {
  const modelId = model || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    modelId
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const system = (messages || []).find((m) => m.role === "system")?.content || "";
  const rest = (messages || []).filter((m) => m.role !== "system");
  const contents = rest.map((m, i) => {
    let text = m.content;
    if (i === 0 && system) text = `${system}\n\n---\n\nUser: ${text}`;
    return {
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text }],
    };
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(data?.error?.message || `Gemini HTTP ${res.status}`), {
      status: res.status,
    });
  }
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("").trim();
  if (!text) throw new Error("Gemini empty reply");
  return { text, provider: "gemini", model: modelId };
}

async function chatOpenRouter({ apiKey, model, messages }) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://prithviscan.web.app",
      "X-Title": "PrithviScan",
    },
    body: JSON.stringify({
      model: model || "meta-llama/llama-3.2-3b-instruct:free",
      messages,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || data?.error || `OpenRouter HTTP ${res.status}`;
    throw Object.assign(new Error(typeof msg === "string" ? msg : JSON.stringify(msg)), {
      status: res.status,
    });
  }
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenRouter empty reply");
  return { text, provider: "openrouter", model: data?.model || model };
}

/**
 * @param {{ provider: string, messages: array, model?: string }} body
 * @param {{ geminiKey?: string, openrouterKey?: string, ollamaBaseUrl?: string }} secrets
 */
async function chatOllama({ baseUrl, model, messages }) {
  const root = String(baseUrl || "http://127.0.0.1:11434").replace(/\/$/, "");
  const res = await fetch(`${root}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: model || "llama3.2", messages, stream: false }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(data?.error || `Ollama HTTP ${res.status}`), {
      status: res.status,
    });
  }
  const text = data?.message?.content?.trim();
  if (!text) throw new Error("Ollama empty reply");
  return { text, provider: "ollama", model: data?.model || model };
}

async function runAiChat(body, secrets = {}) {
  const provider = body?.provider || "ollama";
  const messages = body?.messages;
  if (!Array.isArray(messages) || !messages.length) {
    throw Object.assign(new Error("messages required"), { status: 400 });
  }

  if (provider === "gemini") {
    if (!secrets.geminiKey) {
      throw Object.assign(new Error("GEMINI_API_KEY not configured"), { status: 503 });
    }
    return chatGemini({ apiKey: secrets.geminiKey, model: body.model, messages });
  }
  if (provider === "openrouter") {
    if (!secrets.openrouterKey) {
      throw Object.assign(new Error("OPENROUTER_API_KEY not configured"), { status: 503 });
    }
    return chatOpenRouter({ apiKey: secrets.openrouterKey, model: body.model, messages });
  }
  if (provider === "ollama") {
    return chatOllama({
      baseUrl: secrets.ollamaBaseUrl || body.ollamaBaseUrl,
      model: body.model,
      messages,
    });
  }
  throw Object.assign(new Error(`Unknown provider: ${provider}`), { status: 400 });
}

module.exports = { runAiChat, chatGemini, chatOpenRouter, chatOllama };
