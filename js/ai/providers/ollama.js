/**
 * Ollama provider — local or remote Ollama HTTP API.
 *
 * From https://prithviscan.web.app the browser needs CORS:
 *   OLLAMA_ORIGINS=https://prithviscan.web.app
 * Or run: node scripts/ollama-cors-proxy.mjs  → use http://127.0.0.1:11435
 */

function normalizeBase(baseUrl) {
  return String(baseUrl || "http://127.0.0.1:11434").replace(/\/$/, "");
}

function corsHelp(root) {
  const page = typeof location !== "undefined" ? location.origin : "https://prithviscan.web.app";
  return [
    `Cannot reach Ollama at ${root} from ${page}.`,
    "",
    "Ollama is running, but the browser blocked the request (usually CORS).",
    "",
    "Fix (pick one):",
    "",
    "1) Restart Ollama with this site allowed:",
    "   Windows PowerShell:",
    '     $env:OLLAMA_ORIGINS="https://prithviscan.web.app,http://localhost:*,http://127.0.0.1:*"',
    "     # Quit Ollama from the system tray first, then:",
    "     ollama serve",
    "   Or run:  scripts\\start-ollama-for-web.ps1",
    "",
    "2) Easier CORS proxy (keep Ollama as-is):",
    "     node scripts/ollama-cors-proxy.mjs",
    "   Then in Ask AI → Settings set Ollama URL to:",
    "     http://127.0.0.1:11435",
    "",
    "3) Or switch provider to Gemini / OpenRouter in Settings.",
  ].join("\n");
}

export async function diagnoseOllama(baseUrl) {
  const root = normalizeBase(baseUrl);
  const url = `${root}/api/tags`;
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      return { ok: false, root, message: `Ollama responded HTTP ${res.status} at ${root}` };
    }
    const data = await res.json();
    const models = (data?.models || []).map((m) => m.name);
    return {
      ok: true,
      root,
      models,
      message: models.length
        ? `Connected to ${root}. Models: ${models.slice(0, 8).join(", ")}`
        : `Connected to ${root}, but no models yet — run: ollama pull llama3.2`,
    };
  } catch (err) {
    return {
      ok: false,
      root,
      corsLikely: true,
      message: corsHelp(root),
      detail: err.message || "Failed to fetch",
    };
  }
}

export async function chatWithOllama({ baseUrl, model, messages, signal }) {
  const root = normalizeBase(baseUrl);
  const url = `${root}/api/chat`;

  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model || "llama3.2",
        messages,
        stream: false,
      }),
      signal,
    });
  } catch {
    throw new Error(corsHelp(root));
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error || `Ollama error HTTP ${res.status}`;
    if (String(msg).toLowerCase().includes("not found") || res.status === 404) {
      throw new Error(`${msg}\n\nPull the model: ollama pull ${model || "llama3.2"}`);
    }
    throw new Error(msg);
  }

  const text = data?.message?.content?.trim();
  if (!text) throw new Error("Ollama returned an empty reply.");
  return {
    text,
    provider: "ollama",
    model: data?.model || model,
    raw: data,
  };
}

export async function pingOllama(baseUrl) {
  const result = await diagnoseOllama(baseUrl);
  if (!result.ok) throw new Error(result.message);
  return { models: (result.models || []).map((name) => ({ name })) };
}
