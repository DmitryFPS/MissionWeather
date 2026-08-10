# Открыть порты MissionWeather в брандмауэре Windows
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

Add-FwRule 'MissionWeather Web' 3000
Add-FwRule 'MissionWeather API' 3001
Write-Host 'Firewall ready for LAN and Tailscale access.' -ForegroundColor Cyan
