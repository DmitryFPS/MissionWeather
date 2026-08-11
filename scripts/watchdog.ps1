# Проверка здоровья, алерт и перезапуск при сбое (запускать по расписанию)
$ErrorActionPreference = 'SilentlyContinue'
Set-Location $PSScriptRoot\..

$webhook = $env:ALERT_WEBHOOK_URL
if (-not $webhook -and (Test-Path '.env')) {
  $line = Get-Content '.env' | Where-Object { $_ -match '^ALERT_WEBHOOK_URL=' } | Select-Object -First 1
  if ($line) { $webhook = ($line -split '=', 2)[1].Trim().Trim('"') }
}

function Send-Alert($text) {
  if (-not $webhook) { return }
  try {
    $body = @{ text = $text } | ConvertTo-Json -Compress
    Invoke-RestMethod -Uri $webhook -Method POST -ContentType 'application/json' -Body $body -TimeoutSec 10 | Out-Null
  } catch {
    Write-Host "[watchdog] Alert webhook failed: $($_.Exception.Message)" -ForegroundColor DarkYellow
  }
}

$ok = $false
try {
  $h = Invoke-RestMethod http://localhost:3000/api/health -TimeoutSec 5
  $ok = ($h.status -eq 'ok')
} catch {}

if (-not $ok) {
  $msg = "MissionWeather UNHEALTHY at $(Get-Date -Format 'yyyy-MM-dd HH:mm') — restarting stack"
  Write-Host "[$(Get-Date -Format 'HH:mm:ss')] $msg" -ForegroundColor Yellow
  Send-Alert $msg
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --remove-orphans 2>&1 | Out-Null
}
