# Статус сервера MissionWeather
$ErrorActionPreference = 'SilentlyContinue'
Set-Location $PSScriptRoot\..

Write-Host '=== MissionWeather Server Status ===' -ForegroundColor Cyan

docker compose ps --format "table {{.Name}}\t{{.Status}}"

$health = try { (Invoke-RestMethod http://localhost:3001/health -TimeoutSec 3).status } catch { 'offline' }
Write-Host "API health: $health"

$lan = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match '^192\.168\.' } | Select-Object -First 1).IPAddress
if ($lan) { Write-Host "LAN:  http://${lan}:3000" -ForegroundColor Green }

$ts = "$env:ProgramFiles\Tailscale\tailscale.exe"
if (Test-Path $ts) {
  $status = & $ts status 2>&1 | Select-Object -First 1
  Write-Host "Tailscale: $status"
  $tip = & $ts ip -4 2>$null
  if ($tip) {
    Write-Host "FIELD (phone): http://${tip}:3000" -ForegroundColor Green
    Set-Content -Path "$PSScriptRoot\..\FIELD-URL.txt" -Value "http://${tip}:3000"
  } else {
    Write-Host "Tailscale: NOT LOGGED IN — run scripts\setup-tailscale.ps1" -ForegroundColor Yellow
  }
}

Write-Host "Local: http://localhost:3000"
Write-Host "Admin: admin@missionweather.local / admin123"
