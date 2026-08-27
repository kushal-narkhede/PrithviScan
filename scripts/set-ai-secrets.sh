#!/usr/bin/env bash
# Upload Gemini / OpenRouter API keys into Firebase Secret Manager.
# Usage:
#   GEMINI_API_KEY=... OPENROUTER_API_KEY=... ./scripts/set-ai-secrets.sh
# Or put them in .secrets/ai.env and source that file first.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AI_FILE="$ROOT/.secrets/ai.env"

FIREBASE_BIN=(npx firebase)
if command -v firebase >/dev/null 2>&1; then
  FIREBASE_BIN=(firebase)
fi

if [[ -f "$AI_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$AI_FILE"
  set +a
fi

if [[ -n "${GEMINI_API_KEY:-}" && "$GEMINI_API_KEY" != PLACEHOLDER* ]]; then
  echo "Setting GEMINI_API_KEY..."
  printf '%s' "$GEMINI_API_KEY" | "${FIREBASE_BIN[@]}" functions:secrets:set GEMINI_API_KEY --project prithviscan --data-file -
else
  echo "Skip GEMINI_API_KEY (empty or placeholder)."
fi

if [[ -n "${OPENROUTER_API_KEY:-}" && "$OPENROUTER_API_KEY" != PLACEHOLDER* ]]; then
  echo "Setting OPENROUTER_API_KEY..."
  printf '%s' "$OPENROUTER_API_KEY" | "${FIREBASE_BIN[@]}" functions:secrets:set OPENROUTER_API_KEY --project prithviscan --data-file -
else
  echo "Skip OPENROUTER_API_KEY (empty or placeholder)."
fi

echo "Done. Redeploy aiChat if needed: npx firebase deploy --only functions:aiChat --project prithviscan"
