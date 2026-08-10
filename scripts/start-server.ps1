# MissionWeather — запуск сервера на этом ПК
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..

Write-Host 'Stopping local node on 3000/3001...' -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 3000,3001 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
  Write-Host 'Created .env from .env.example — set ROUTERAI_API_KEY' -ForegroundColor Yellow
}

Write-Host 'Building and starting Docker...' -ForegroundColor Cyan
docker compose up -d --build

Start-Sleep -Seconds 8
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match '^192\.168\.' } | Select-Object -First 1).IPAddress
Write-Host ''
Write-Host '=== MissionWeather SERVER READY ===' -ForegroundColor Green
Write-Host "Local:  http://localhost:3000"
if ($ip) { Write-Host "LAN:    http://${ip}:3000" }
Write-Host 'Admin:  admin@missionweather.local / admin123'
