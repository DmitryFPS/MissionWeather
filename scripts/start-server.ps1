# MissionWeather production server - single port :3000
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..

docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Docker is not running. Start Docker Desktop first.' -ForegroundColor Red
  exit 1
}

if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
  Write-Host 'Created .env - set ROUTERAI_API_KEY and JWT_SECRET' -ForegroundColor Yellow
}

Write-Host 'Starting MissionWeather (nginx + api + web + db)...' -ForegroundColor Cyan
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build --remove-orphans
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host 'Waiting for health checks...' -ForegroundColor DarkGray
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 3
  try {
    $h = Invoke-RestMethod http://localhost:3000/api/health -TimeoutSec 3
    if ($h.status -eq 'ok') { $ready = $true; break }
  } catch {}
}
if (-not $ready) {
  Write-Host 'Services not healthy yet. Check: docker compose ps' -ForegroundColor Yellow
  docker compose ps
  exit 1
}

$lan = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match '^192\.168\.' } | Select-Object -First 1).IPAddress
$pub = try { (Invoke-RestMethod https://api.ipify.org -TimeoutSec 4) } catch { $null }

Write-Host ''
Write-Host '=== MissionWeather READY ===' -ForegroundColor Green
Write-Host 'Local:   http://localhost:3000'
Write-Host 'Swagger: http://localhost:3000/docs'
if ($lan) {
  Write-Host "LAN:     http://${lan}:3000" -ForegroundColor Cyan
  Set-Content -Path (Join-Path $PSScriptRoot '..\LAN-URL.txt') -Value "http://${lan}:3000" -Encoding UTF8
}
if ($pub) {
  Write-Host "Public:  http://${pub}:3000" -ForegroundColor Cyan
}
Write-Host 'Admin:   admin@missionweather.local / admin123'
Write-Host ''
Write-Host 'Watchdog: .\scripts\watchdog.ps1' -ForegroundColor DarkGray
