# Установка Tailscale для доступа к серверу из поля
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..

Write-Host '=== MissionWeather: Tailscale для поля ===' -ForegroundColor Cyan

$tsExe = "$env:ProgramFiles\Tailscale\tailscale.exe"
if (-not (Test-Path $tsExe)) {
  Write-Host 'Installing Tailscale via winget...' -ForegroundColor Yellow
  winget install Tailscale.Tailscale --accept-package-agreements --accept-source-agreements
}

if (-not (Test-Path $tsExe)) {
  Write-Host 'Install Tailscale manually: https://tailscale.com/download/windows' -ForegroundColor Red
  exit 1
}

Write-Host 'Opening firewall ports 3000/3001...' -ForegroundColor Yellow
& "$PSScriptRoot\open-firewall.ps1"

Write-Host ''
Write-Host '--- NEXT STEPS (manual) ---' -ForegroundColor Yellow
Write-Host '1. Open Tailscale from Start menu and sign in'
Write-Host '2. Wait for Connected status'
Write-Host '3. Run: tailscale ip -4'
Write-Host '4. On Android: install Tailscale, same account, open http://<tailscale-ip>:3000'
Write-Host ''
Write-Host 'Full guide: docs/FIELD-ANDROID.md' -ForegroundColor Cyan

try {
  $ip = & $tsExe ip -4 2>$null
  if ($ip) {
    Write-Host ''
    Write-Host "Tailscale IP: $ip" -ForegroundColor Green
    Write-Host "Phone URL:    http://${ip}:3000" -ForegroundColor Green
  } else {
    Write-Host 'Tailscale not connected yet — sign in first.' -ForegroundColor Yellow
  }
} catch {
  Write-Host 'Sign in to Tailscale first.' -ForegroundColor Yellow
}
