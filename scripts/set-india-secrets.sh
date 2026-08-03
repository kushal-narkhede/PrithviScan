#!/usr/bin/env bash
# Upload India localization secrets to Firebase Secret Manager.
# Usage:
#   1. Create .secrets/india.env with any of:
#        BHUVAN_API_TOKEN=...
#        BHOONIDHI_TOKEN=...
#        BHOONIDHI_USER=...
#        BHOONIDHI_PASSWORD=...
#        IMD_API_KEY=...
#        DATA_GOV_IN_API_KEY=...
#   2. bash scripts/set-india-secrets.sh
#   3. npx firebase-tools deploy --only functions --project prithviscan
#
# Keys you don't have yet can be left as PLACEHOLDER (Functions still deploy).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${1:-$ROOT/.secrets/india.env}"
PROJECT="${FIREBASE_PROJECT:-prithviscan}"

mkdir -p "$ROOT/.secrets"
if [[ ! -f "$ENV_FILE" ]]; then
  cat > "$ENV_FILE" <<'EOF'
BHUVAN_API_TOKEN=PLACEHOLDER
BHOONIDHI_TOKEN=PLACEHOLDER
BHOONIDHI_USER=PLACEHOLDER
BHOONIDHI_PASSWORD=PLACEHOLDER
IMD_API_KEY=PLACEHOLDER
DATA_GOV_IN_API_KEY=PLACEHOLDER
EOF
  echo "Created $ENV_FILE with PLACEHOLDER values — edit in real keys, then re-run."
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

set_secret() {
  local name="$1"
  local val="${2:-PLACEHOLDER}"
  if [[ -z "$val" ]]; then val="PLACEHOLDER"; fi
  echo "Setting $name…"
  printf '%s' "$val" | npx --yes firebase-tools functions:secrets:set "$name" --data-file=- --project "$PROJECT"
}

set_secret BHUVAN_API_TOKEN "${BHUVAN_API_TOKEN:-PLACEHOLDER}"
set_secret BHOONIDHI_TOKEN "${BHOONIDHI_TOKEN:-PLACEHOLDER}"
set_secret BHOONIDHI_USER "${BHOONIDHI_USER:-PLACEHOLDER}"
set_secret BHOONIDHI_PASSWORD "${BHOONIDHI_PASSWORD:-PLACEHOLDER}"
set_secret IMD_API_KEY "${IMD_API_KEY:-PLACEHOLDER}"
set_secret DATA_GOV_IN_API_KEY "${DATA_GOV_IN_API_KEY:-PLACEHOLDER}"

echo "Done. Deploy functions:"
echo "  npx firebase-tools deploy --only functions --project $PROJECT"
echo "Status: https://us-central1-${PROJECT}.cloudfunctions.net/indiaLayersStatus"
