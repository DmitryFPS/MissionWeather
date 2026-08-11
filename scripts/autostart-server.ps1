# Автозапуск MissionWeather при входе в Windows
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..

Write-Host '[MissionWeather] Starting stack...' -ForegroundColor Cyan
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d 2>&1 | Out-Null

Start-Sleep -Seconds 15
$health = try { (Invoke-RestMethod http://localhost:3000/api/health -TimeoutSec 5).status } catch { 'fail' }
Write-Host "[MissionWeather] http://localhost:3000 — $health" -ForegroundColor $(if ($health -eq 'ok') { 'Green' } else { 'Yellow' })
