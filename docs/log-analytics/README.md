# Secure Boot / UEFI Certificate Monitoring (Workbook-Only)

This package is a workbook-only Log Analytics solution using Intune-first telemetry.

## What is included

- `kql/00_normalized_device_posture.kql` — normalized latest posture per device.
- `kql/01_classification_5state.kql` — 5-state classifier: Updated / NotUpdated / Blocked / Unknown / Exempt.
- `kql/02_root_cause_breakdown.kql` — blocker and root-cause summary.
- `kql/03_non_updated_device_detail.kql` — per-device remediation-ready detail view.
- `kql/04_cohorts_model_bios_tpm.kql` — cohort table by model/BIOS/TPM/cert posture.
- `kql/05_trend_posture_over_time.kql` — fleet posture trend over time.
- `kql/06_alert_deadline_risk.kql` — scheduled alert query for June 2026 readiness risk.
- `workbooks/secure-boot-uefi-posture.workbook.json` — starter Azure Workbook template.

## Data contract (expected columns)

The queries expect an Intune-ingested custom table named `IntuneSecureBootInventory_CL` with these fields (suffixes accepted as `_s`, `_b`, `_d`, `_g`, `_t`):

- Device identity: `DeviceId`, `DeviceName`, `PrimaryUser`, `Department`
- Hardware: `Model`, `Manufacturer`, `BIOSVersion`, `RequiredBIOSVersion`, `WarrantyEndDate`
- OS: `OSVersion`, `OSBuild`
- Security posture: `SecureBootEnabled`, `BootMode`, `TPMVersion`, `UEFICertificateVersion`
- Governance: `IsExempt`, `ExemptionReason`
- Timestamps: `LastSeen`, `TimeGenerated`

If your table/column names differ, update only the normalization query and keep the downstream queries unchanged.

## Deployment flow

1. Validate `00_normalized_device_posture.kql` returns one row per active device.
2. Validate `01_classification_5state.kql` for expected state distribution.
3. Use `02` + `03` to identify blocker categories and remediation queues.
4. Use `04` to form remediation cohorts.
5. Import `workbooks/secure-boot-uefi-posture.workbook.json` into Azure Monitor Workbooks.
6. Optionally use `06` as the scheduled query alert source.

## Notes

- This package is single-workspace by default.
- Classifier precedence is explicit and can be tuned in `01_classification_5state.kql`.
- `Unknown` is used when data is missing/inconsistent; this avoids false "Updated" results.
