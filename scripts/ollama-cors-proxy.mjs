#!/usr/bin/env node
/**
 * Tiny CORS proxy: browser → http://127.0.0.1:11435 → Ollama :11434
 *
 * Use when Ollama's own OLLAMA_ORIGINS is hard to set (e.g. Windows app service).
 * In Ask AI settings, set Base URL to: http://127.0.0.1:11435
 *
 *   node scripts/ollama-cors-proxy.mjs
 */

import http from "node:http";

const PROXY_PORT = Number(process.env.PROXY_PORT || 11435);
const OLLAMA = (process.env.OLLAMA_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
const ALLOW = [
  "https://prithviscan.web.app",
  "https://prithviscan.firebaseapp.com",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
  "http://localhost:5000",
  "null",
];

function cors(req, res) {
  const origin = req.headers.origin || "";
  const ok = !origin || ALLOW.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  res.setHeader("Access-Control-Allow-Origin", ok ? origin || "*" : ALLOW[0]);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] || "Content-Type, Authorization"
  );
  res.setHeader("Access-Control-Max-Age", "86400");
}

const server = http.createServer(async (req, res) => {
  cors(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const target = `${OLLAMA}${req.url}`;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: {
        "Content-Type": req.headers["content-type"] || "application/json",
        Accept: req.headers.accept || "application/json",
      },
      body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
    });
    const buf = Buffer.from(await upstream.arrayBuffer());
    cors(req, res);
    res.writeHead(upstream.status, {
      "Content-Type": upstream.headers.get("content-type") || "application/json",
    });
    res.end(buf);
  } catch (err) {
    cors(req, res);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: `Proxy could not reach Ollama at ${OLLAMA}: ${err.message}` }));
  }
});

server.listen(PROXY_PORT, "127.0.0.1", () => {
  console.log(`Ollama CORS proxy listening on http://127.0.0.1:${PROXY_PORT}`);
  console.log(`Upstream: ${OLLAMA}`);
  console.log(`In Ask AI → Settings → Ollama URL, set: http://127.0.0.1:${PROXY_PORT}`);
});
