# Проверка здоровья и перезапуск при сбое (запускать по расписанию)
$ErrorActionPreference = 'SilentlyContinue'
Set-Location $PSScriptRoot\..

$ok = $false
try {
  $h = Invoke-RestMethod http://localhost:3000/api/health -TimeoutSec 5
  $ok = ($h.status -eq 'ok')
} catch {}

if (-not $ok) {
  Write-Host "[$(Get-Date -Format 'HH:mm:ss')] MissionWeather unhealthy — restarting stack" -ForegroundColor Yellow
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans 2>&1 | Out-Null
}
