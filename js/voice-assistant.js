/**
 * Voice assistant — Web Speech API → common farm actions.
 */

export function startVoiceAssistant({ onCommand, onStatus } = {}) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    onStatus?.("Voice not supported in this browser.");
    return null;
  }
  const rec = new SpeechRecognition();
  rec.lang = "en-IN";
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (event) => {
    const text = event.results?.[0]?.[0]?.transcript || "";
    onStatus?.(`Heard: ${text}`);
    const cmd = parseVoiceCommand(text);
    if (cmd) onCommand?.(cmd, text);
    else onStatus?.(`No matching action for “${text}”. Try: weather, irrigate, fertilizer, add field.`);
  };
  rec.onerror = (e) => onStatus?.(`Voice error: ${e.error || "unknown"}`);
  rec.start();
  onStatus?.("Listening…");
  return rec;
}

export function parseVoiceCommand(text) {
  const t = String(text || "").toLowerCase();
  if (/weather|rain|temperature|forecast/.test(t)) return { action: "openTool", tool: "weather" };
  if (/soil|moisture/.test(t)) return { action: "openTool", tool: "soil" };
  if (/irrigat|water the field/.test(t)) return { action: "openTool", tool: "irrigate" };
  if (/fertiliz|urea|dap/.test(t)) return { action: "openTool", tool: "advisor" };
  if (/pest|disease|risk/.test(t)) return { action: "openTool", tool: "risks" };
  if (/add field|new field/.test(t)) return { action: "navigate", href: "app.html#add" };
  if (/log input|log fertilizer/.test(t)) return { action: "openTool", tool: "inputs" };
  if (/market|price|sell/.test(t)) return { action: "openTool", tool: "markets" };
  return null;
}
