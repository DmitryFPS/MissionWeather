# Один порт 3000 — web + API через nginx
$ErrorActionPreference = 'Stop'

function Add-FwRule($Name, $Port) {
  $existing = Get-NetFirewallRule -DisplayName $Name -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "Rule exists: $Name" -ForegroundColor DarkGray
    return
  }
  New-NetFirewallRule -DisplayName $Name -Direction Inbound -Action Allow -Protocol TCP -LocalPort $Port | Out-Null
  Write-Host "Added: $Name (TCP $Port)" -ForegroundColor Green
}

Add-FwRule 'MissionWeather Gateway' 3000
Write-Host 'Port 3000 open (UI + API + Swagger).' -ForegroundColor Cyan
