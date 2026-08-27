# Allow https://prithviscan.web.app (and local dev) to call Ollama.
# Run in PowerShell, then keep this window open OR set the env var permanently.

$origins = @(
  "https://prithviscan.web.app",
  "https://prithviscan.firebaseapp.com",
  "http://localhost:*",
  "http://127.0.0.1:*",
  "app://*"
) -join ","

Write-Host "Stopping any running Ollama processes..."
Get-Process -Name "ollama*" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

$env:OLLAMA_ORIGINS = $origins
$env:OLLAMA_HOST = "127.0.0.1:11434"

Write-Host ""
Write-Host "OLLAMA_ORIGINS=$env:OLLAMA_ORIGINS"
Write-Host "Starting Ollama with CORS for PrithviScan..."
Write-Host "Then open https://prithviscan.web.app and use Ask AI."
Write-Host ""

# Prefer `ollama serve` if available
$ollama = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $ollama) {
  Write-Host "ERROR: 'ollama' not found on PATH. Install from https://ollama.com" -ForegroundColor Red
  exit 1
}

# Pull a default model if missing (non-fatal)
try {
  ollama list 2>$null | Out-Null
} catch {}

Write-Host "If chat fails, also run: ollama pull llama3.2"
ollama serve
