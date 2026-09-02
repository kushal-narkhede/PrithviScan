/**
 * OpenRouter provider (OpenAI-compatible chat completions).
 * Ready when an API key is set in Ask AI settings.
 * Production path: proxy via Cloud Functions secret OPENROUTER_API_KEY.
 */

export async function chatWithOpenRouter({
  apiKey,
  model,
  endpoint,
  siteUrl,
  siteName,
  messages,
  signal,
}) {
  const key = String(apiKey || "").trim();
  if (!key) {
    throw new Error(
      "OpenRouter API key not set. Open Ask AI → Settings, paste your key, or wire OPENROUTER_API_KEY into Cloud Functions."
    );
  }

  const url = String(endpoint || "https://openrouter.ai/api/v1/chat/completions");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      "HTTP-Referer": siteUrl || "https://prithviscan.web.app",
      "X-Title": siteName || "PrithviScan",
    },
    body: JSON.stringify({
      model: model || "meta-llama/llama-3.2-3b-instruct:free",
      messages,
    }),
    signal,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || data?.error || `OpenRouter error HTTP ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }

  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenRouter returned an empty reply.");
  return {
    text,
    provider: "openrouter",
    model: data?.model || model,
    raw: data,
  };
}
