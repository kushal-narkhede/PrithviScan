/**
 * Ollama provider — local or remote Ollama HTTP API.
 * Docs: https://github.com/ollama/ollama/blob/main/docs/api.md
 *
 * CORS: set OLLAMA_ORIGINS to include https://prithviscan.web.app
 * (and http://localhost:8000 when developing).
 */

export async function chatWithOllama({ baseUrl, model, messages, signal }) {
  const root = String(baseUrl || "http://localhost:11434").replace(/\/$/, "");
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
  } catch (err) {
    throw new Error(
      `Cannot reach Ollama at ${root}. Start Ollama locally and allow this site in OLLAMA_ORIGINS. (${err.message || "network error"})`
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Ollama error HTTP ${res.status}`);
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
  const root = String(baseUrl || "http://localhost:11434").replace(/\/$/, "");
  const res = await fetch(`${root}/api/tags`, { method: "GET" });
  if (!res.ok) throw new Error(`Ollama ping failed (${res.status})`);
  return res.json();
}
