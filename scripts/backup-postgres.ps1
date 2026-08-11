# Backup PostgreSQL (MissionWeather)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot\..

$outDir = Join-Path (Get-Location) 'data\backups'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$outFile = Join-Path $outDir "missionweather-$stamp.sql"

Write-Host "[backup] Dumping postgres to $outFile"
docker compose exec -T postgres pg_dump -U mission missionweather | Set-Content -Encoding utf8 $outFile

# Retention: keep last 14 dumps
Get-ChildItem $outDir -Filter 'missionweather-*.sql' |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip 14 |
  ForEach-Object { Remove-Item $_.FullName -Force; Write-Host "[backup] Removed old $($_.Name)" }

Write-Host "[backup] Done"
