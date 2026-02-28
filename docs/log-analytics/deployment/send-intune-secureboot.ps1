param(
  [Parameter(Mandatory = $true)]
  [string]$TenantId,

  [Parameter(Mandatory = $true)]
  [string]$ClientId,

  [Parameter(Mandatory = $true)]
  [string]$ClientSecret,

  [Parameter(Mandatory = $true)]
  [string]$DceEndpoint,

  [Parameter(Mandatory = $true)]
  [string]$DcrImmutableId,

  [Parameter(Mandatory = $false)]
  [string]$StreamName = "Custom-IntuneSecureBootInventory",

  [Parameter(Mandatory = $false)]
  [string]$PayloadPath = ".\sample-payload.json"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $PayloadPath)) {
  throw "Payload file not found: $PayloadPath"
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

$payload = Get-Content -Raw -Path $PayloadPath
if ([string]::IsNullOrWhiteSpace($payload)) {
  throw "Payload file is empty: $PayloadPath"
}

$baseEndpoint = $DceEndpoint.TrimEnd('/')
$ingestUri = "$baseEndpoint/dataCollectionRules/$DcrImmutableId/streams/$StreamName?api-version=2023-01-01"

$headers = @{
  Authorization = "Bearer $accessToken"
  "Content-Type" = "application/json"
}

Write-Host "Sending payload to Logs Ingestion API..." -ForegroundColor Cyan
Write-Host "Endpoint: $ingestUri" -ForegroundColor DarkCyan

$response = Invoke-WebRequest `
  -Method Post `
  -Uri $ingestUri `
  -Headers $headers `
  -Body $payload

Write-Host "Ingestion request completed." -ForegroundColor Green
Write-Host "StatusCode: $($response.StatusCode)" -ForegroundColor Green

Write-Host "Run validation query in Log Analytics:" -ForegroundColor Yellow
Write-Host "IntuneSecureBootInventory_CL | summarize count(), dcount(DeviceId_g), max(TimeGenerated)" -ForegroundColor Yellow
