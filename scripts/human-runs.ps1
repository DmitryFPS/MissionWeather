# 12 human-like integration runs for MissionWeather
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:3000/api'
$results = @()

function Test-Run($num, $name, [scriptblock]$fn) {
  try {
    & $fn
    $script:results += [pscustomobject]@{ Run = $num; Name = $name; Status = 'PASS' }
    Write-Host "RUN $num PASS: $name" -ForegroundColor Green
  } catch {
    $script:results += [pscustomobject]@{ Run = $num; Name = $name; Status = 'FAIL'; Error = $_.Exception.Message }
    Write-Host "RUN $num FAIL: $name - $($_.Exception.Message)" -ForegroundColor Red
  }
}

Test-Run 1 'Health + 12 providers (desktop API)' {
  $ok = $false
  for ($i = 0; $i -lt 5; $i++) {
    try {
      $h = Invoke-RestMethod "$base/health" -TimeoutSec 5
      if ($h.status -eq 'ok') { $ok = $true; break }
    } catch { Start-Sleep -Seconds 1 }
  }
  if (-not $ok) { throw 'health not ok after retries' }
  $p = Invoke-RestMethod "$base/weather/providers"
  if ($p.Count -ne 12) { throw "expected 12 providers, got $($p.Count)" }
}

Test-Run 2 'Login admin + JWT me' {
  $login = Invoke-RestMethod "$base/auth/login" -Method POST -ContentType 'application/json' -Body '{"email":"admin@missionweather.local","password":"admin123"}'
  if (-not $login.accessToken) { throw 'no token' }
  $script:token = $login.accessToken
  $me = Invoke-RestMethod "$base/auth/me" -Headers @{ Authorization = "Bearer $script:token" }
  if ($me.role -ne 'admin') { throw 'not admin' }
}

Test-Run 3 'Create aircraft profile (manual thresholds)' {
  $body = @{
    name = 'Test-Bort-Field'
    cruiseSpeedKmh = 75
    maxDurationHours = 8
    thresholds = @{ windSpeedMs = @{ goMax = 7; cautionMax = 11 }; maxSourceSpreadMs = 4 }
    fusionSourceIds = @('open-meteo-ecmwf','met-norway','aviation-weather-metar')
    aiEnabled = $true
  } | ConvertTo-Json -Depth 5 -Compress
  $profile = Invoke-RestMethod "$base/profiles" -Method POST -ContentType 'application/json' -Headers @{ Authorization = "Bearer $script:token" } -Body $body
  if (-not $profile.id) { throw 'no profile id' }
  $script:profileId = $profile.id
}

Test-Run 4 'Weather evaluate Moscow (human point check)' {
  $body = '{"lat":55.7558,"lon":37.6173,"thresholds":{"windSpeedMs":{"goMax":8,"cautionMax":12},"maxSourceSpreadMs":5}}'
  $eval = Invoke-RestMethod "$base/weather/evaluate" -Method POST -ContentType 'application/json' -Body $body
  if (-not $eval.verdict.status) { throw 'no verdict' }
  if (-not $eval.fused) { throw 'no fused data' }
  if ($eval.snapshots.Count -lt 1) { throw 'no snapshots' }
  $script:verdict = $eval.verdict.status
}

Test-Run 5 'AI advise with RouterAI key' {
  $body = '{"lat":55.7558,"lon":37.6173,"thresholds":{"windSpeedMs":{"goMax":8,"cautionMax":12}}}'
  $ai = Invoke-RestMethod "$base/ai/advise" -Method POST -ContentType 'application/json' -Headers @{ Authorization = "Bearer $script:token" } -Body $body
  if (-not $ai.advice.summary) { throw 'no ai summary' }
}

Test-Run 6 'Create mission route 2 waypoints' {
  $body = @{
    name = 'Patrol-East'
    profileId = $script:profileId
    plannedDurationHours = 4
    waypoints = @(
      @{ lat = 55.75; lon = 37.62 },
      @{ lat = 55.82; lon = 37.75 }
    )
  } | ConvertTo-Json -Depth 5 -Compress
  $m = Invoke-RestMethod "$base/missions" -Method POST -ContentType 'application/json' -Headers @{ Authorization = "Bearer $script:token" } -Body $body
  if ($m.waypoints.Count -ne 2) { throw 'waypoints wrong' }
  $script:missionId = $m.id
}

Test-Run 7 'Temporal mission evaluate (1-10h)' {
  $eval = Invoke-RestMethod "$base/missions/$($script:missionId)/evaluate" -Method POST -ContentType 'application/json' -Headers @{ Authorization = "Bearer $script:token" } -Body '{}'
  if (-not $eval.schedule) { throw 'no schedule' }
  if ($eval.schedule.Count -lt 2) { throw 'schedule too short' }
  if (-not $eval.verdict.status) { throw 'no mission verdict' }
}

Test-Run 8 'Unauthorized access blocked' {
  try {
    Invoke-RestMethod "$base/profiles" -ErrorAction Stop
    throw 'should have failed 401'
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 401) { throw "expected 401 got $($_.Exception.Response.StatusCode)" }
  }
}

Test-Run 9 'Provider health circuit check' {
  $h = Invoke-RestMethod "$base/weather/health"
  if ($h.Count -ne 12) { throw "health count $($h.Count)" }
}

Test-Run 10 'Register second operator (multi-user)' {
  $email = "operator$([guid]::NewGuid().ToString().Substring(0,8))@test.local"
  $body = "{`"email`":`"$email`",`"password`":`"pass123456`",`"name`":`"Operator Test`"}"
  $u = Invoke-RestMethod "$base/auth/register" -Method POST -ContentType 'application/json' -Body $body
  if (-not $u.email) { throw 'register failed' }
}

Test-Run 11 'Extreme thresholds NO-GO path' {
  $body = '{"lat":55.75,"lon":37.62,"thresholds":{"windSpeedMs":{"goMax":0.1,"cautionMax":0.2}}}'
  $eval = Invoke-RestMethod "$base/weather/evaluate" -Method POST -ContentType 'application/json' -Body $body
  if ($eval.verdict.status -eq 'GO') { throw 'expected not GO with extreme low thresholds' }
}

Test-Run 12 'Audit log admin' {
  $audit = Invoke-RestMethod "$base/audit" -Headers @{ Authorization = "Bearer $script:token" }
  if ($audit.Count -lt 1) { throw 'audit empty' }
}

Write-Host "`n=== SUMMARY ===" -ForegroundColor Cyan
$results | Format-Table -AutoSize
$fail = @($results | Where-Object { $_.Status -eq 'FAIL' }).Count
Write-Host "Passed: $($results.Count - $fail)/$($results.Count)"
if ($fail -gt 0) { exit 1 }
