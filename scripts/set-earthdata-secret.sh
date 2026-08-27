#!/usr/bin/env bash
# Upload EARTHDATA_TOKEN from .secrets/earthdata.env into Firebase Secret Manager.
# Requires: firebase login (on your machine)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SECRET_FILE="$ROOT/.secrets/earthdata.env"

if [[ ! -f "$SECRET_FILE" ]]; then
  echo "Missing $SECRET_FILE"
  echo "Create it from .env.example first."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$SECRET_FILE"
set +a

if [[ -z "${EARTHDATA_TOKEN:-}" ]]; then
  echo "EARTHDATA_TOKEN is empty in $SECRET_FILE"
  exit 1
fi

echo "Setting Firebase secret EARTHDATA_TOKEN for project prithviscan..."
FIREBASE_BIN=(npx firebase)
if command -v firebase >/dev/null 2>&1; then
  FIREBASE_BIN=(firebase)
fi
printf '%s' "$EARTHDATA_TOKEN" | "${FIREBASE_BIN[@]}" functions:secrets:set EARTHDATA_TOKEN --project prithviscan --data-file -
echo "Done. Deploy functions with: npx firebase deploy --only functions --project prithviscan"
