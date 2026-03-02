# Secure Boot / UEFI Certificate Monitoring (Workbook-Only)

This repository provides a complete, workbook-first implementation for tracking UEFI certificate readiness (2011 vs 2023), Secure Boot posture, TPM state, and remediation cohorts in Azure Log Analytics.

## Implementation Guide (Step by Step)

### Step 1 — Confirm prerequisites

You need:

- Azure subscription with Azure Monitor + Log Analytics access.
- A target Log Analytics workspace.
- Permissions:
	- Log Analytics Reader (minimum for validation).
	- Workbook Contributor (for workbook import/edit).
	- Scheduled Query Rule permissions (optional, for alerting).
- Local admin/SYSTEM context for live endpoint collection scripts.

### Step 2 — Create the ingestion table

1. Open your Log Analytics workspace.
2. Create a **DCR-based custom table** named `IntuneSecureBootInventory_CL`.
3. Add key columns (minimum):
	 - `DeviceId_g`, `DeviceName_s`, `BootMode_s`, `SecureBootEnabled_b`,
	 - `TPMVersion_s`, `UEFICertificateVersion_s`, `OSBuild_s`, `TimeGenerated`.

### Step 3 — Configure DCE + DCR

1. Create a Data Collection Endpoint (DCE).
2. Create a Data Collection Rule (DCR) targeting your workspace/table.
3. In transform KQL, use [deployment/dcr-transform.kql](deployment/dcr-transform.kql).
4. Use stream name `Custom-IntuneSecureBootInventory` (or update scripts/workbook if different).

### Step 4 — Send first test data

Note: Multiline PowerShell examples below use the backtick (`` ` ``) as a line-continuation character. You can also remove the backticks and run each command as a single line.

Option A (sample payload):

```powershell
./deployment/send-intune-secureboot.ps1 `
	-TenantId "<tenant-guid>" `
	-ClientId "<app-client-id>" `
	-ClientSecret "<app-client-secret>" `
	-DceEndpoint "https://<your-dce-name>.<region>-1.ingest.monitor.azure.com" `
	-DcrImmutableId "dcr-xxxxxxxxxxxxxxxxxxxxxxxx" `
	-StreamName "Custom-IntuneSecureBootInventory" `
	-PayloadPath "./deployment/sample-payload.json"
```

Option B (live machine data):

```powershell
./deployment/collect-live-intune-secureboot.ps1 -OutputPath ./deployment/live-payload.json
```

Option C (live machine + direct ingestion):

```powershell
./deployment/collect-live-intune-secureboot.ps1 `
	-OutputPath "./deployment/live-payload.json" `
	-SendToLogAnalytics `
	-TenantId "<tenant-guid>" `
	-ClientId "<app-client-id>" `
	-ClientSecret "<app-client-secret>" `
	-DceEndpoint "https://<your-dce-name>.<region>-1.ingest.monitor.azure.com" `
	-DcrImmutableId "dcr-xxxxxxxxxxxxxxxxxxxxxxxx"
```

### Step 5 — Run preflight validation

Run [kql/07_preflight_readiness.kql](kql/07_preflight_readiness.kql).

Expected:

- `ReadyForWorkbook = YES`
- `TableStatus = OK`
- `FreshnessStatus = OK`
- `DeviceCoverageStatus = OK`

If not, fix ingestion/column mapping before continuing.

### Step 6 — Import the workbook

1. Azure Monitor → Workbooks → New → Advanced Editor.
2. Paste [workbooks/secure-boot-uefi-posture.workbook.json](workbooks/secure-boot-uefi-posture.workbook.json).
3. Select workspace and save workbook.
4. Validate visuals with defaults:
	 - `timeRange`, `workspaceName='*'`, `department='*'`, `osBuildBaseline='22631'`.

### Step 7 — Automate collection as SYSTEM

Create recurring task:

```powershell
./deployment/register-secureboot-collector-task.ps1 `
	-TaskName "SecureBootLiveCollector" `
	-ScriptPath "./deployment/collect-live-intune-secureboot.ps1" `
	-OutputPath "./deployment/live-payload.json" `
	-IntervalMinutes 15 `
	-RunImmediately
```

Task + direct ingestion:

```powershell
./deployment/register-secureboot-collector-task.ps1 `
	-TaskName "SecureBootLiveCollector" `
	-ScriptPath "./deployment/collect-live-intune-secureboot.ps1" `
	-OutputPath "./deployment/live-payload.json" `
	-IntervalMinutes 15 `
	-EnableLogAnalyticsSend `
	-TenantId "<tenant-guid>" `
	-ClientId "<app-client-id>" `
	-ClientSecret "<app-client-secret>" `
	-DceEndpoint "https://<your-dce-name>.<region>-1.ingest.monitor.azure.com" `
	-DcrImmutableId "dcr-xxxxxxxxxxxxxxxxxxxxxxxx" `
	-StreamName "Custom-IntuneSecureBootInventory" `
	-RunImmediately
```

Check task health:

```powershell
Get-ScheduledTaskInfo -TaskName "SecureBootLiveCollector"
```

### Step 8 — Validate posture queries and operations

Run these in order:

1. [kql/00_normalized_device_posture.kql](kql/00_normalized_device_posture.kql)
2. [kql/01_classification_5state.kql](kql/01_classification_5state.kql)
3. [kql/02_root_cause_breakdown.kql](kql/02_root_cause_breakdown.kql)
4. [kql/03_non_updated_device_detail.kql](kql/03_non_updated_device_detail.kql)
5. [kql/04_cohorts_model_bios_tpm.kql](kql/04_cohorts_model_bios_tpm.kql)
6. [kql/05_trend_posture_over_time.kql](kql/05_trend_posture_over_time.kql)
7. [kql/06_alert_deadline_risk.kql](kql/06_alert_deadline_risk.kql) (optional alert source)

**Operational queries (run as needed):**

8. [kql/08_stale_device_list.kql](kql/08_stale_device_list.kql) — devices with no telemetry in >7 days
9. [kql/09_exempt_audit.kql](kql/09_exempt_audit.kql) — governance audit of all exempted devices
10. [kql/10_department_posture_summary.kql](kql/10_department_posture_summary.kql) — posture roll-up by department (backs workbook department filter)
11. [kql/11_regression_detection.kql](kql/11_regression_detection.kql) — devices that newly became Blocked within the last 7 days
12. [kql/12_remediation_progress.kql](kql/12_remediation_progress.kql) — devices that moved from non-compliant → Updated within the last 14 days

---

## Repository Contents

- `kql/00_normalized_device_posture.kql` — normalization layer; one latest row per device (30d lookback)
- `kql/01_classification_5state.kql` — 5-state posture classifier (Updated / NotUpdated / Blocked / Unknown / Exempt)
- `kql/02_root_cause_breakdown.kql` — aggregated root-cause breakdown for non-ready devices
- `kql/03_non_updated_device_detail.kql` — per-device remediation queue with `RemediationHint`
- `kql/04_cohorts_model_bios_tpm.kql` — cohort prioritization with `RiskScore` and P1–P4 bands
- `kql/05_trend_posture_over_time.kql` — 90-day time-series, daily posture bins
- `kql/06_alert_deadline_risk.kql` — scheduled alert source; hard deadline 2026-06-30
- `kql/07_preflight_readiness.kql` — environment readiness check before importing the workbook
- `kql/08_stale_device_list.kql` — devices not seen in >7 days; ordered worst-first (nulls first)
- `kql/09_exempt_audit.kql` — governance audit of all `IsExempt=true` devices with `ExemptionReason`
- `kql/10_department_posture_summary.kql` — posture counts + `UpdatedPct` / `NonCompliantPct` by department
- `kql/11_regression_detection.kql` — devices that became Blocked in the last 7 days but had prior healthy state
- `kql/12_remediation_progress.kql` — devices that moved NotUpdated/Blocked → Updated in the last 14 days
- `deployment/dcr-transform.kql`
- `deployment/sample-payload.json`
- `deployment/send-intune-secureboot.ps1`
- `deployment/collect-live-intune-secureboot.ps1`
- `deployment/register-secureboot-collector-task.ps1`
- `workbooks/secure-boot-uefi-posture.workbook.json`

---

## Data Contract (Required Fields)

Expected table: `IntuneSecureBootInventory_CL`

- Identity: `DeviceId`, `DeviceName`, `PrimaryUser`, `Department`
- Hardware: `Model`, `Manufacturer`, `BIOSVersion`, `RequiredBIOSVersion`, `WarrantyEndDate`
- OS: `OSVersion`, `OSBuild`
- Security: `SecureBootEnabled`, `BootMode`, `TPMVersion`, `UEFICertificateVersion`
- Governance: `IsExempt`, `ExemptionReason`
- Timing: `LastSeen`, `TimeGenerated`

If your names differ, adjust source mapping in `00_normalized_device_posture.kql` and DCR transform.

---

## Tenant Mapping Matrix

| Normalized Field | Primary Candidate | Fallback Candidates | Required | Used In |
|---|---|---|---|---|
| `DeviceId` | `DeviceId_g` | `DeviceId_s`, `AadDeviceId_g`, `ManagedDeviceId_s` | Yes | All queries |
| `DeviceName` | `DeviceName_s` | `DeviceHostname_s`, `DeviceDisplayName_s` | Yes | Inventory, detail, workbook tables |
| `PrimaryUser` | `PrimaryUser_s` | `UserPrincipalName_s`, `AssignedUser_s` | No | Device queue, ownership views |
| `Department` | `Department_s` | `OrgUnit_s` | No | Parameter filtering, cohorts |
| `Model` | `Model_s` | `HardwareModel_s` | No | Cohorts, prioritization |
| `Manufacturer` | `Manufacturer_s` | `Vendor_s` | No | Inventory context |
| `BIOSVersion` | `BIOSVersion_s` | `FirmwareVersion_s` | No | Blocker detection, cohorts |
| `RequiredBIOSVersion` | `RequiredBIOSVersion_s` | `BIOSBaseline_s` | No | Firmware baseline blocker |
| `WarrantyEndDate` | `WarrantyEndDate_t` | `WarrantyExpiry_t`, `WarrantyEndDate_s` | No | Cohorts, aging |
| `OSVersion` | `OSVersion_s` | `OSName_s` | No | Inventory context |
| `OSBuild` | `OSBuild_s` | `Build_s` | Yes* | `OSMissingUpdate` blocker |
| `SecureBootEnabled` | `SecureBootEnabled_b` | `SecureBootState_b`, `SecureBootEnabled_s` | Yes | Classifier core |
| `BootMode` | `BootMode_s` | `FirmwareType_s` | Yes | UEFI/Legacy blocker |
| `TPMVersion` | `TPMVersion_s` | `TpmVersion_s` | Yes | TPM blocker |
| `UEFICertificateVersion` | `UEFICertificateVersion_s` | `SecureBootCertVersion_s`, `CertVersion_s` | Yes | Updated vs NotUpdated classification |
| `IsExempt` | `IsExempt_b` | `Exempt_b`, `IsException_b` | No | Exempt posture override |
| `ExemptionReason` | `ExemptionReason_s` | `ExceptionReason_s` | No | Governance / auditability |
| `LastSeen` | `LastSeen_t` | `LastSeen_s`, `LastCheckIn_t`, `LastSync_t` | No | Stale data checks, detail queue |
| `WorkspaceName` | `_ResourceId` parse | n/a | No | Optional workbook workspace filter |
| `TimeGenerated` | `TimeGenerated` | n/a | Yes | Time filtering, trend windows |

\* `OSBuild` is required only when using the `OSMissingUpdate` blocker.

---

## Troubleshooting

- No data in workbook: validate ingestion with `07_preflight_readiness.kql`.
- `UEFICertificateVersion` or TPM reads as `Unknown`: run collector as admin/SYSTEM.
- Empty department filter: ensure `Department_s` or `OrgUnit_s` is populated.
- `workspaceName` empty: keep `workspaceName='*'` (some ingestion paths do not set `_ResourceId`).
- Different table name: update workbook queries + KQL files consistently.

---

## Notes

- Single-workspace by default.
- Classifier precedence is defined in `01_classification_5state.kql`.
- `Unknown` is intentional when signals are missing or unreadable.
