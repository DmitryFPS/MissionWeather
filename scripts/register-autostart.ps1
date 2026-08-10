# Регистрация автозапуска MissionWeather при входе пользователя
$ErrorActionPreference = 'Stop'
$taskName = 'MissionWeather-Autostart'
$script = 'C:\Users\adm\Projects\MissionWeather\scripts\autostart-server.ps1'

Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest -Description 'MissionWeather Docker autostart' | Out-Null

Write-Host "Scheduled task registered: $taskName" -ForegroundColor Green
