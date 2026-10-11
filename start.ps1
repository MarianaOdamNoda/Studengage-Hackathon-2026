# Studengage local demo launcher.
#   .\start.ps1          install if needed, seed if the DB is missing, start the dev server
#   .\start.ps1 -Reseed  wipe and reseed the demo data first
param([switch]$Reseed)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$web = Join-Path $root "web"
$dbFile = Join-Path $root "data\studengage.db"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js 20+ is required: https://nodejs.org" -ForegroundColor Red
  exit 1
}

Push-Location $web
try {
  if (-not (Test-Path (Join-Path $web "node_modules"))) {
    Write-Host "Installing dependencies (first run only)..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
  }

  if ($Reseed -or -not (Test-Path $dbFile)) {
    Write-Host "Seeding Bluenose University demo data..." -ForegroundColor Cyan
    npm run seed
    if ($LASTEXITCODE -ne 0) { throw "Seeding failed" }
  }

  Write-Host "Starting Studengage at http://localhost:3000" -ForegroundColor Green
  npm run dev
}
finally {
  Pop-Location
}
