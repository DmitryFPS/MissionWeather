# Статус production-сервера
$ErrorActionPreference = 'SilentlyContinue'
Set-Location $PSScriptRoot\..

Write-Host '=== MissionWeather ===' -ForegroundColor Cyan
docker compose ps --format "table {{.Name}}\t{{.Status}}"

$health = try { (Invoke-RestMethod http://localhost:3000/api/health -TimeoutSec 3).status } catch { 'offline' }
Write-Host "Health: $health"

$lan = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match '^192\.168\.' } | Select-Object -First 1).IPAddress
Write-Host 'URL:    http://localhost:3000'
if ($lan) { Write-Host "LAN:    http://${lan}:3000" -ForegroundColor Green }
Write-Host 'Admin:  admin@missionweather.local / admin123'
