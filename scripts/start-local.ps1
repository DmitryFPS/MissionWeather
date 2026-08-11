# Web UI для разработки (Docker API должен быть уже запущен)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..

$apiUrl = 'http://localhost:3001'
try {
  $h = Invoke-RestMethod "$apiUrl/health" -TimeoutSec 5
  if ($h.status -ne 'ok') { throw 'not ok' }
} catch {
  Write-Host 'Сначала запустите сервер: .\scripts\start-server.ps1' -ForegroundColor Red
  exit 1
}

Set-Content -Path (Join-Path $PSScriptRoot '..\apps\web\.env.local') -Value "NEXT_PUBLIC_API_URL=$apiUrl" -Encoding UTF8
Write-Host 'Dev Web: http://localhost:3000' -ForegroundColor Green
npm run dev:web
