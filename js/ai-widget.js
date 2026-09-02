/**
 * Floating Ask AI chatbot — injected bottom-right on every page.
 */

import { loadAiConfig, saveAiConfig, AI_PROVIDERS } from "./ai-config.js";
import { providerLabel, FIXED_AI_RESPONSE } from "./ai/client.js";
import { diagnoseOllama } from "./ai/providers/ollama.js";

const HISTORY_KEY = "prithviscan.ai.history.v1";
const OPEN_KEY = "prithviscan.ai.widgetOpen";

const CHAT_ICON = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm2 4v2h12V8H6zm0 4v2h8v-2H6z"/>
  </svg>
`;

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-40)));
  } catch {
    /* ignore */
  }
}

function ensureCss() {
  if (document.getElementById("ps-ai-widget-css")) return;
  const link = document.createElement("link");
  link.id = "ps-ai-widget-css";
  link.rel = "stylesheet";
  // Site pages live at hosting root (cleanUrls)
  link.href = `${window.location.origin}/ai-widget.css`;
  document.head.appendChild(link);
}

function mount() {
  if (document.getElementById("ps-ai-root")) return;

  ensureCss();

  let config = loadAiConfig();
  let history = loadHistory();

  const root = document.createElement("div");
  root.id = "ps-ai-root";
  root.className = "ps-ai-root";
  root.innerHTML = `
    <div class="ps-ai-panel" id="psAiPanel" role="dialog" aria-label="Ask AI chat" hidden>
      <div class="ps-ai-head">
        <div>
          <strong>AI Agronomist</strong>
        </div>
        <div class="ps-ai-head-actions">
          <button type="button" class="ps-ai-icon-btn" id="psAiSettingsBtn" title="Settings" aria-label="Settings">⚙</button>
          <button type="button" class="ps-ai-icon-btn" id="psAiClearBtn" title="Clear chat" aria-label="Clear chat">⌫</button>
          <button type="button" class="ps-ai-icon-btn" id="psAiCloseBtn" title="Close" aria-label="Close">✕</button>
        </div>
      </div>
      <div class="ps-ai-messages" id="psAiMessages" role="log" aria-live="polite"></div>
      <form class="ps-ai-compose" id="psAiForm">
        <textarea id="psAiInput" rows="1" placeholder="Ask about crops, prices, machines…" required></textarea>
        <button type="submit" id="psAiSend">Send</button>
        <p class="ps-ai-status" id="psAiStatus" role="status"></p>
      </form>
      <div class="ps-ai-settings" id="psAiSettings" hidden>
        <h3>AI settings</h3>
        <p>
          Live site → local Ollama needs CORS. Easiest fix: run
          <code>node scripts/ollama-cors-proxy.mjs</code> and set URL to
          <code>http://127.0.0.1:11435</code>.
        </p>
        <label>
          Provider
          <select id="psCfgProvider">
            <option value="ollama">Ollama (local)</option>
            <option value="gemini">Google Gemini</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </label>
        <label>
          Ollama URL
          <input id="psCfgOllamaUrl" type="url" placeholder="http://127.0.0.1:11434" />
        </label>
        <label>
          Ollama model
          <input id="psCfgOllamaModel" type="text" placeholder="llama3.2" />
        </label>
        <label>
          Gemini API key
          <input id="psCfgGeminiKey" type="password" autocomplete="off" />
        </label>
        <label>
          Gemini model
          <input id="psCfgGeminiModel" type="text" placeholder="gemini-2.0-flash" />
        </label>
        <label>
          OpenRouter API key
          <input id="psCfgOpenrouterKey" type="password" autocomplete="off" />
        </label>
        <label>
          OpenRouter model
          <input id="psCfgOpenrouterModel" type="text" />
        </label>
        <p class="ps-ai-diag" id="psAiDiag" hidden></p>
        <div class="ps-ai-settings-actions">
          <button type="button" class="primary" id="psAiSaveSettings">Save</button>
          <button type="button" id="psAiTestOllama">Test Ollama</button>
          <button type="button" id="psAiCloseSettings">Back to chat</button>
        </div>
      </div>
    </div>
    <button type="button" class="ps-ai-fab" id="psAiFab" aria-label="Open Ask AI" aria-expanded="false" title="Ask AI">
      ${CHAT_ICON}
    </button>
  `;
  document.body.appendChild(root);

  const panel = root.querySelector("#psAiPanel");
  const fab = root.querySelector("#psAiFab");
  const messagesEl = root.querySelector("#psAiMessages");
  const form = root.querySelector("#psAiForm");
  const input = root.querySelector("#psAiInput");
  const sendBtn = root.querySelector("#psAiSend");
  const statusEl = root.querySelector("#psAiStatus");
  const settingsEl = root.querySelector("#psAiSettings");

  function setStatus(msg, isError = false) {
    const text = String(msg || "").trim();
    statusEl.textContent = text;
    statusEl.hidden = !text;
    statusEl.classList.toggle("is-error", Boolean(isError && text));
  }

  function renderMessages() {
    if (!history.length) {
      messagesEl.innerHTML = "";
      return;
    }
    messagesEl.innerHTML = history
      .filter((m) => m.role !== "system")
      .map((m) => `<div class="ps-ai-msg ${esc(m.role)}">${esc(m.content)}</div>`)
      .join("");
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setOpen(open) {
    panel.hidden = !open;
    fab.setAttribute("aria-expanded", String(open));
    fab.setAttribute("aria-label", open ? "Close Ask AI" : "Open Ask AI");
    try {
      localStorage.setItem(OPEN_KEY, open ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (open) {
      input.focus();
      renderMessages();
    }
  }

  function fillSettings() {
    root.querySelector("#psCfgProvider").value = config.provider;
    root.querySelector("#psCfgOllamaUrl").value = config.ollama.baseUrl || "";
    root.querySelector("#psCfgOllamaModel").value = config.ollama.model || "";
    root.querySelector("#psCfgGeminiKey").value = config.gemini.apiKey || "";
    root.querySelector("#psCfgGeminiModel").value = config.gemini.model || "";
    root.querySelector("#psCfgOpenrouterKey").value = config.openrouter.apiKey || "";
    root.querySelector("#psCfgOpenrouterModel").value = config.openrouter.model || "";
  }

  fab.addEventListener("click", () => setOpen(panel.hidden));
  root.querySelector("#psAiCloseBtn").addEventListener("click", () => setOpen(false));

  root.querySelector("#psAiClearBtn").addEventListener("click", () => {
    history = [];
    saveHistory(history);
    renderMessages();
    setStatus("Chat cleared.");
  });

  root.querySelector("#psAiSettingsBtn").addEventListener("click", () => {
    fillSettings();
    settingsEl.hidden = false;
  });

  root.querySelector("#psAiCloseSettings").addEventListener("click", () => {
    settingsEl.hidden = true;
  });

  root.querySelector("#psAiTestOllama").addEventListener("click", async () => {
    const diagEl = root.querySelector("#psAiDiag");
    const url =
      root.querySelector("#psCfgOllamaUrl").value.trim() || config.ollama.baseUrl;
    diagEl.hidden = false;
    diagEl.textContent = "Testing…";
    diagEl.classList.remove("is-ok", "is-bad");
    const result = await diagnoseOllama(url);
    diagEl.textContent = result.message;
    diagEl.classList.add(result.ok ? "is-ok" : "is-bad");
  });

  root.querySelector("#psAiSaveSettings").addEventListener("click", () => {
    const provider = root.querySelector("#psCfgProvider").value;
    if (!AI_PROVIDERS.includes(provider)) return;
    config = {
      ...config,
      provider,
      ollama: {
        ...config.ollama,
        baseUrl: root.querySelector("#psCfgOllamaUrl").value.trim() || "http://localhost:11434",
        model: root.querySelector("#psCfgOllamaModel").value.trim() || "llama3.2",
      },
      gemini: {
        ...config.gemini,
        apiKey: root.querySelector("#psCfgGeminiKey").value.trim(),
        model: root.querySelector("#psCfgGeminiModel").value.trim() || "gemini-2.0-flash",
      },
      openrouter: {
        ...config.openrouter,
        apiKey: root.querySelector("#psCfgOpenrouterKey").value.trim(),
        model:
          root.querySelector("#psCfgOpenrouterModel").value.trim() ||
          "meta-llama/llama-3.2-3b-instruct:free",
      },
    };
    saveAiConfig(config);
    settingsEl.hidden = true;
    setStatus(`Using ${providerLabel(config.provider)}.`);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = String(input.value || "").trim();
    if (!text) return;

    history.push({ role: "user", content: text });
    input.value = "";
    renderMessages();
    saveHistory(history);

    sendBtn.disabled = true;

    await new Promise((r) => setTimeout(r, 400));
    history.push({ role: "assistant", content: FIXED_AI_RESPONSE });
    saveHistory(history);
    renderMessages();
    setStatus("");
    sendBtn.disabled = false;
    input.focus();
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  renderMessages();

  // Restore open state only if user left it open; default closed
  try {
    if (localStorage.getItem(OPEN_KEY) === "1") setOpen(true);
  } catch {
    /* ignore */
  }

  // Deep link: ?askai=1 or #askai opens the panel
  const params = new URLSearchParams(window.location.search);
  if (params.get("askai") === "1" || window.location.hash === "#askai") {
    setOpen(true);
  }

  window.addEventListener("ps-ai-open", () => setOpen(true));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
