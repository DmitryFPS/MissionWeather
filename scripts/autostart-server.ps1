# Автозапуск MissionWeather при входе в Windows
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..

Write-Host '[MissionWeather] Starting Docker stack...' -ForegroundColor Cyan
docker compose up -d 2>&1 | Out-Null

Start-Sleep -Seconds 5
$health = try { (Invoke-RestMethod http://localhost:3001/health -TimeoutSec 5).status } catch { 'fail' }
Write-Host "[MissionWeather] API health: $health" -ForegroundColor $(if ($health -eq 'ok') { 'Green' } else { 'Yellow' })

$ts = "$env:ProgramFiles\Tailscale\tailscale.exe"
if (Test-Path $ts) {
  $ip = & $ts ip -4 2>$null
  if ($ip) { Write-Host "[MissionWeather] Tailscale field URL: http://${ip}:3000" -ForegroundColor Green }
}
