#!/usr/bin/env bash
# Allow https://prithviscan.web.app to call local Ollama (CORS).
set -euo pipefail

export OLLAMA_ORIGINS="https://prithviscan.web.app,https://prithviscan.firebaseapp.com,http://localhost:*,http://127.0.0.1:*"
export OLLAMA_HOST="${OLLAMA_HOST:-127.0.0.1:11434}"

echo "OLLAMA_ORIGINS=$OLLAMA_ORIGINS"
echo "Starting Ollama for PrithviScan web…"
echo "Tip: ollama pull llama3.2"
exec ollama serve
