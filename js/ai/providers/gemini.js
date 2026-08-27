/**
 * Google Gemini provider (Generative Language API).
 * Ready for use when an API key is set in Ask AI settings.
 * Production path: proxy via Cloud Functions secret GEMINI_API_KEY.
 */

export async function chatWithGemini({ apiKey, model, endpoint, messages, signal }) {
  const key = String(apiKey || "").trim();
  if (!key) {
    throw new Error(
      "Gemini API key not set. Open Ask AI → Settings, paste your key, or wire GEMINI_API_KEY into Cloud Functions."
    );
  }

  const modelId = model || "gemini-2.0-flash";
  const root = String(endpoint || "https://generativelanguage.googleapis.com/v1beta").replace(
    /\/$/,
    ""
  );
  const url = `${root}/models/${encodeURIComponent(modelId)}:generateContent?key=${encodeURIComponent(key)}`;

  // Gemini uses alternating user/model turns; fold system into first user message.
  const system = messages.find((m) => m.role === "system")?.content || "";
  const rest = messages.filter((m) => m.role !== "system");
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
    signal,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Gemini error HTTP ${res.status}`;
    throw new Error(msg);
  }

  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("").trim();
  if (!text) throw new Error("Gemini returned an empty reply.");
  return {
    text,
    provider: "gemini",
    model: modelId,
    raw: data,
  };
}
