#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

git fetch origin
git checkout cursor/homepage-hero-ffb2
git reset --hard origin/cursor/homepage-hero-ffb2

if ! grep -q 'assets/hero\.mp4' index.html; then
  echo "index.html does not point at assets/hero.mp4 — aborting." >&2
  exit 1
fi
grep -n 'source src=.*mp4' index.html || true
md5sum assets/hero.mp4 assets/hero-canopy.mp4 2>/dev/null || true

npx --yes firebase-tools deploy --only hosting --project prithviscan
echo "Hard-refresh https://prithviscan.web.app — source should show assets/hero.mp4?v=fix2"
