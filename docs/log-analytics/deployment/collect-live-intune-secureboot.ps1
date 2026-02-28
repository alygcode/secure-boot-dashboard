param(
  [Parameter(Mandatory = $false)]
  [string]$OutputPath = ".\live-payload.json",

  [Parameter(Mandatory = $false)]
  [switch]$SendToLogAnalytics,

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

function Test-IsElevated {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($id)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-IsElevated)) {
  throw "Run this script in elevated PowerShell (Administrator) or as SYSTEM scheduled task."
}

function Get-UefiCertificateVersionFromBytes {
  param(
    [byte[]]$Bytes
  )

  if (-not $Bytes -or $Bytes.Length -eq 0) { return "Unknown" }

  $ascii = [System.Text.Encoding]::ASCII.GetString($Bytes)
  $unicode = [System.Text.Encoding]::Unicode.GetString($Bytes)
  $blob = "$ascii`n$unicode"

  if ($blob -match "Microsoft Windows UEFI CA 2023") { return "2023" }
  if ($blob -match "Microsoft Windows UEFI CA 2011") { return "2011" }

  return "Unknown"
}

function Get-SecureBootState {
  try {
    return [bool](Confirm-SecureBootUEFI)
  } catch {
    return $false
  }
}

function Get-BootMode {
  try {
    $firmware = (Get-ComputerInfo -Property BiosFirmwareType).BiosFirmwareType
    if ($firmware -eq "Uefi") { return "UEFI" }
    if ($firmware -eq "Legacy") { return "Legacy" }
  } catch {}
  return "Unknown"
}

function Get-UefiCertificateVersion {
  try {
    $db = Get-SecureBootUEFI -Name db -ErrorAction Stop
    return Get-UefiCertificateVersionFromBytes -Bytes $db.Bytes
  } catch {
    return "Unknown"
  }
}

function Get-TpmVersion {
  try {
    $tpm = Get-Tpm -ErrorAction Stop
    if (-not $tpm.TpmPresent) { return "None" }

    $spec = [string]$tpm.SpecVersion
    if ($spec -match "2\.0") { return "2.0" }
    if ($spec -match "1\.2") { return "1.2" }
  } catch {}

  try {
    $tpmWmi = Get-CimInstance -Namespace "root\cimv2\security\microsofttpm" -ClassName Win32_Tpm -ErrorAction Stop | Select-Object -First 1
    if (-not $tpmWmi) { return "None" }

    $spec = [string]$tpmWmi.SpecVersion
    if ($spec -match "2\.0") { return "2.0" }
    if ($spec -match "1\.2") { return "1.2" }
    return "Unknown"
  } catch {
    return "Unknown"
  }
}

function Get-PrimaryUser {
  try {
    return (Get-CimInstance Win32_ComputerSystem -ErrorAction Stop).UserName
  } catch {
    return ""
  }
}

function Get-DeviceRecord {
  $bios = Get-CimInstance Win32_BIOS
  $os = Get-CimInstance Win32_OperatingSystem
  $csProduct = Get-CimInstance Win32_ComputerSystemProduct
  $cs = Get-CimInstance Win32_ComputerSystem

  $osBuild = [string]$os.BuildNumber
  $deviceId = [string]$csProduct.UUID
  if ([string]::IsNullOrWhiteSpace($deviceId)) {
    $deviceId = [guid]::NewGuid().ToString()
  }

  return [ordered]@{
    DeviceId               = $deviceId
    DeviceName             = $env:COMPUTERNAME
    PrimaryUser            = Get-PrimaryUser
    Department             = ""
    Model                  = [string]$cs.Model
    Manufacturer           = [string]$cs.Manufacturer
    BIOSVersion            = [string]$bios.SMBIOSBIOSVersion
    RequiredBIOSVersion    = ""
    WarrantyEndDate        = ""
    OSVersion              = [string]$os.Caption
    OSBuild                = $osBuild
    SecureBootEnabled      = Get-SecureBootState
    BootMode               = Get-BootMode
    TPMVersion             = Get-TpmVersion
    UEFICertificateVersion = Get-UefiCertificateVersion
    IsExempt               = $false
    ExemptionReason        = ""
    LastSeen               = (Get-Date).ToUniversalTime().ToString("o")
    TimeGenerated          = (Get-Date).ToUniversalTime().ToString("o")
  }
}

function Send-PayloadToLogAnalytics {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PayloadJson
  )

  $required = @($TenantId, $ClientId, $ClientSecret, $DceEndpoint, $DcrImmutableId)
  if ($required | Where-Object { [string]::IsNullOrWhiteSpace($_) }) {
    throw "Missing required ingestion parameters. Provide TenantId, ClientId, ClientSecret, DceEndpoint, DcrImmutableId."
  }

  $tokenRequestBody = @{
    client_id     = $ClientId
    client_secret = $ClientSecret
    scope         = "https://monitor.azure.com/.default"
    grant_type    = "client_credentials"
  }

  $tokenResponse = Invoke-RestMethod `
    -Method Post `
    -Uri "https://login.microsoftonline.com/$TenantId/oauth2/v2.0/token" `
    -Body $tokenRequestBody `
    -ContentType "application/x-www-form-urlencoded"

  $accessToken = $tokenResponse.access_token
  if ([string]::IsNullOrWhiteSpace($accessToken)) {
    throw "Failed to acquire AAD token."
  }

  $baseEndpoint = $DceEndpoint.TrimEnd('/')
  $ingestUri = "$baseEndpoint/dataCollectionRules/$DcrImmutableId/streams/$StreamName?api-version=2023-01-01"

  $headers = @{
    Authorization = "Bearer $accessToken"
    "Content-Type" = "application/json"
  }

  $response = Invoke-WebRequest `
    -Method Post `
    -Uri $ingestUri `
    -Headers $headers `
    -Body $PayloadJson

  Write-Host "Ingestion request completed. StatusCode: $($response.StatusCode)" -ForegroundColor Green
}

$record = Get-DeviceRecord
$payloadArray = @($record)
$payloadJson = $payloadArray | ConvertTo-Json -Depth 5

$payloadJson | Set-Content -Path $OutputPath -Encoding UTF8
Write-Host "Live payload written to: $OutputPath" -ForegroundColor Cyan
Write-Host $payloadJson

if ($SendToLogAnalytics) {
  Send-PayloadToLogAnalytics -PayloadJson $payloadJson
  Write-Host "Validate in Logs: IntuneSecureBootInventory_CL | summarize count(), dcount(DeviceId_g), max(TimeGenerated)" -ForegroundColor Yellow
}