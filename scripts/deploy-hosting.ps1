# Deploy hosting from the correct branch tip (Windows PowerShell).
# Run from the repo root.

$ErrorActionPreference = "Stop"

git fetch origin
git checkout cursor/homepage-hero-ffb2
git reset --hard origin/cursor/homepage-hero-ffb2

$src = Select-String -Path .\index.html -Pattern 'source src=.*\.mp4' | Select-Object -First 1
Write-Host "Hero video tag: $($src.Line.Trim())"
if ($src.Line -notmatch 'assets/hero\.mp4') {
  throw "index.html does not point at assets/hero.mp4 — aborting deploy."
}

Get-FileHash .\assets\hero.mp4 -Algorithm MD5 | Format-List
if (Test-Path .\assets\hero-canopy.mp4) {
  Get-FileHash .\assets\hero-canopy.mp4 -Algorithm MD5 | Format-List
}

npx --yes firebase-tools deploy --only hosting --project prithviscan

Write-Host ""
Write-Host "Done. Hard-refresh https://prithviscan.web.app (Ctrl+Shift+R)."
Write-Host "View-source should show: assets/hero.mp4?v=fix2"
