param(
  [Parameter(Mandatory = $false)]
  [string]$TaskName = "SecureBootLiveCollector",

  [Parameter(Mandatory = $false)]
  [string]$ScriptPath = ".\collect-live-intune-secureboot.ps1",

  [Parameter(Mandatory = $false)]
  [string]$OutputPath = ".\live-payload.json",

  [Parameter(Mandatory = $false)]
  [int]$IntervalMinutes = 15,

  [Parameter(Mandatory = $false)]
  [switch]$RunImmediately,

  [Parameter(Mandatory = $false)]
  [switch]$EnableLogAnalyticsSend,

  [Parameter(Mandatory = $false)]
  [string]$TenantId,

  [Parameter(Mandatory = $false)]
  [string]$ClientId,

  [Parameter(Mandatory = $false)]
  [string]$ClientSecret,

  [Parameter(Mandatory = $false)]
  [string]$DceEndpoint,

  [Parameter(Mandatory = $false)]
  [string]$DcrImmutableId,

  [Parameter(Mandatory = $false)]
  [string]$StreamName = "Custom-IntuneSecureBootInventory"
)

$ErrorActionPreference = "Stop"

$resolvedScriptPath = (Resolve-Path $ScriptPath).Path
$resolvedOutputPath = [System.IO.Path]::GetFullPath($OutputPath)

$scriptArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$resolvedScriptPath`" -OutputPath `"$resolvedOutputPath`""

if ($EnableLogAnalyticsSend) {
  $required = @($TenantId, $ClientId, $ClientSecret, $DceEndpoint, $DcrImmutableId)
  if ($required | Where-Object { [string]::IsNullOrWhiteSpace($_) }) {
    throw "When -EnableLogAnalyticsSend is set, provide TenantId, ClientId, ClientSecret, DceEndpoint, and DcrImmutableId."
  }

  $scriptArgs += " -SendToLogAnalytics"
  $scriptArgs += " -TenantId `"$TenantId`""
  $scriptArgs += " -ClientId `"$ClientId`""
  $scriptArgs += " -ClientSecret `"$ClientSecret`""
  $scriptArgs += " -DceEndpoint `"$DceEndpoint`""
  $scriptArgs += " -DcrImmutableId `"$DcrImmutableId`""
  $scriptArgs += " -StreamName `"$StreamName`""
}

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $scriptArgs
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1)
$trigger.RepetitionInterval = (New-TimeSpan -Minutes $IntervalMinutes)

$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null

Write-Host "Scheduled task registered: $TaskName" -ForegroundColor Green
Write-Host "Runs as: SYSTEM" -ForegroundColor Green
Write-Host "Interval: every $IntervalMinutes minute(s)" -ForegroundColor Green
Write-Host "Collector script: $resolvedScriptPath" -ForegroundColor Cyan

if ($RunImmediately) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "Task started immediately." -ForegroundColor Green
}

Write-Host "Check status with: Get-ScheduledTaskInfo -TaskName `"$TaskName`"" -ForegroundColor Yellow