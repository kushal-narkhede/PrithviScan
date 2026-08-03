#!/usr/bin/env bash
# Upload Tomorrow.io API key to Firebase Secret Manager and grant the Functions runtime access.
# Usage:
#   1. Create a key at https://app.tomorrow.io (Development → API Keys)
#   2. Put it in .secrets/tomorrow.env as: TOMORROW_API_KEY=your_key_here
#   3. Run: bash scripts/set-tomorrow-secret.sh
#   4. Deploy: npx firebase-tools deploy --only functions --project prithviscan

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${1:-$ROOT/.secrets/tomorrow.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  echo "Create it with:  TOMORROW_API_KEY=your_key_here"
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

if [[ -z "${TOMORROW_API_KEY:-}" ]]; then
  echo "TOMORROW_API_KEY is empty in $ENV_FILE"
  exit 1
fi

echo "Setting Firebase secret TOMORROW_API_KEY…"
printf '%s' "$TOMORROW_API_KEY" | npx --yes firebase-tools functions:secrets:set TOMORROW_API_KEY --data-file=- --project prithviscan
echo "Done. Redeploy Functions so fieldTomorrowWeather / tomorrowStatus pick up the secret:"
echo "  npx firebase-tools deploy --only functions --project prithviscan"
