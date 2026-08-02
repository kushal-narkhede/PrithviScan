import { loadAiConfig, saveAiConfig, AI_PROVIDERS } from "./ai-config.js";
import { completeChat, providerLabel } from "./ai/client.js";
import { pingOllama } from "./ai/providers/ollama.js";
import "./nav-auth.js";

const messagesEl = document.getElementById("aiMessages");
const form = document.getElementById("aiForm");
const input = document.getElementById("aiInput");
const sendBtn = document.getElementById("aiSendBtn");
const statusEl = document.getElementById("aiStatus");
const pillEl = document.getElementById("aiProviderPill");
const settingsPanel = document.getElementById("aiSettings");
const settingsBtn = document.getElementById("aiSettingsBtn");
const settingsClose = document.getElementById("aiSettingsClose");
const settingsForm = document.getElementById("aiSettingsForm");
const clearBtn = document.getElementById("aiClearBtn");
const pingBtn = document.getElementById("aiPingOllama");

const HISTORY_KEY = "prithviscan.ai.history.v1";

/** @type {Array<{role: string, content: string}>} */
let history = [];
let config = loadAiConfig();
let abortCtrl = null;

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setStatus(msg, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = msg || "";
  statusEl.classList.toggle("is-error", Boolean(isError));
}

function updatePill() {
  if (pillEl) {
    pillEl.textContent = `Provider: ${providerLabel(config.provider)} · ${
      config.provider === "ollama"
        ? config.ollama.model
        : config.provider === "gemini"
          ? config.gemini.model
          : config.openrouter.model
    }`;
  }
}

function renderMessages() {
  if (!messagesEl) return;
  if (!history.length) {
    messagesEl.innerHTML = `
      <div class="ai-msg system">
        Ask about wheat MSP, urea rates, rotavator hire, irrigation, or soil tips.
        Default engine is Ollama on your machine — open Settings to switch to Gemini or OpenRouter.
      </div>`;
    return;
  }
  messagesEl.innerHTML = history
    .filter((m) => m.role !== "system")
    .map((m) => `<div class="ai-msg ${esc(m.role)}">${esc(m.content)}</div>`)
    .join("");
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function persistHistory() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-40)));
  } catch {
    /* ignore quota */
  }
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function fillSettingsForm() {
  document.getElementById("cfgProvider").value = config.provider;
  document.getElementById("cfgOllamaUrl").value = config.ollama.baseUrl || "";
  document.getElementById("cfgOllamaModel").value = config.ollama.model || "";
  document.getElementById("cfgGeminiKey").value = config.gemini.apiKey || "";
  document.getElementById("cfgGeminiModel").value = config.gemini.model || "";
  document.getElementById("cfgOpenrouterKey").value = config.openrouter.apiKey || "";
  document.getElementById("cfgOpenrouterModel").value = config.openrouter.model || "";
  syncProviderFields();
}

function syncProviderFields() {
  const p = document.getElementById("cfgProvider")?.value || "ollama";
  document.querySelectorAll("[data-provider-fields]").forEach((fs) => {
    fs.hidden = fs.getAttribute("data-provider-fields") !== p;
  });
}

function appendError(text) {
  const div = document.createElement("div");
  div.className = "ai-msg error";
  div.textContent = text;
  messagesEl?.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

settingsBtn?.addEventListener("click", () => {
  fillSettingsForm();
  settingsPanel.hidden = false;
  settingsPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

settingsClose?.addEventListener("click", () => {
  settingsPanel.hidden = true;
});

document.getElementById("cfgProvider")?.addEventListener("change", syncProviderFields);

settingsForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const provider = document.getElementById("cfgProvider").value;
  if (!AI_PROVIDERS.includes(provider)) return;
  config = {
    ...config,
    provider,
    ollama: {
      ...config.ollama,
      baseUrl: document.getElementById("cfgOllamaUrl").value.trim() || "http://localhost:11434",
      model: document.getElementById("cfgOllamaModel").value.trim() || "llama3.2",
    },
    gemini: {
      ...config.gemini,
      apiKey: document.getElementById("cfgGeminiKey").value.trim(),
      model: document.getElementById("cfgGeminiModel").value.trim() || "gemini-2.0-flash",
    },
    openrouter: {
      ...config.openrouter,
      apiKey: document.getElementById("cfgOpenrouterKey").value.trim(),
      model:
        document.getElementById("cfgOpenrouterModel").value.trim() ||
        "meta-llama/llama-3.2-3b-instruct:free",
    },
  };
  saveAiConfig(config);
  updatePill();
  setStatus(`Saved. Using ${providerLabel(config.provider)}.`);
  settingsPanel.hidden = true;
});

pingBtn?.addEventListener("click", async () => {
  const url = document.getElementById("cfgOllamaUrl").value.trim() || config.ollama.baseUrl;
  setStatus("Pinging Ollama…");
  try {
    const tags = await pingOllama(url);
    const names = (tags?.models || []).map((m) => m.name).slice(0, 8);
    setStatus(
      names.length
        ? `Ollama OK — models: ${names.join(", ")}`
        : "Ollama OK — no models pulled yet (try: ollama pull llama3.2)"
    );
  } catch (err) {
    setStatus(err.message || "Ollama unreachable", true);
  }
});

clearBtn?.addEventListener("click", () => {
  history = [];
  persistHistory();
  renderMessages();
  setStatus("Chat cleared.");
});

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = String(input.value || "").trim();
  if (!text) return;

  history.push({ role: "user", content: text });
  input.value = "";
  renderMessages();
  persistHistory();

  sendBtn.disabled = true;
  setStatus("Thinking…");
  abortCtrl?.abort();
  abortCtrl = new AbortController();

  const messages = [
    { role: "system", content: config.systemPrompt },
    ...history.filter((m) => m.role === "user" || m.role === "assistant"),
  ];

  try {
    const result = await completeChat({
      messages,
      signal: abortCtrl.signal,
      config,
    });
    history.push({ role: "assistant", content: result.text });
    persistHistory();
    renderMessages();
    setStatus(`Reply from ${providerLabel(result.provider)}${result.model ? ` · ${result.model}` : ""}`);
  } catch (err) {
    if (err?.name === "AbortError") return;
    appendError(err.message || "Something went wrong.");
    setStatus(err.message || "Request failed", true);
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
});

input?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form?.requestSubmit();
  }
});

history = loadHistory();
updatePill();
renderMessages();
