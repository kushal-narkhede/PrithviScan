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
printf '%s' "$EARTHDATA_TOKEN" | firebase functions:secrets:set EARTHDATA_TOKEN --project prithviscan --data-file -
echo "Done. Deploy functions with: firebase deploy --only functions"
