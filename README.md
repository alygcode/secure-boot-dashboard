# Secure Boot UEFI Certificate Workbook

This repository contains Log Analytics content for Secure Boot UEFI certificate readiness monitoring — KQL queries, deployment scripts, an Azure Workbook template, and an integration test suite.

## Scope

- **KQL query pack** (8 queries) — posture normalization, 5-state classification, root-cause diagnostics, cohorts, trends, and alerting.
- **Azure Workbook** template for fleet-level posture visualization and remediation tracking.
- **Deployment scripts** — PowerShell for device telemetry collection, Log Analytics ingestion, and scheduled task registration.
- **DCR transform** — Data Collection Rule KQL for mapping raw payloads to typed Log Analytics columns.
- **Integration tests** — 153 pytest tests validating classification logic, data contracts, cross-artifact consistency, and script structure.

## Repository Layout

```
docs/log-analytics/
├── kql/                          # KQL queries (00–07)
│   ├── 00_normalized_device_posture.kql
│   ├── 01_classification_5state.kql
│   ├── 02_root_cause_breakdown.kql
│   ├── 03_non_updated_device_detail.kql
│   ├── 04_cohorts_model_bios_tpm.kql
│   ├── 05_trend_posture_over_time.kql
│   ├── 06_alert_deadline_risk.kql
│   └── 07_preflight_readiness.kql
├── deployment/                   # Scripts and payloads
│   ├── collect-live-intune-secureboot.ps1
│   ├── send-intune-secureboot.ps1
│   ├── register-secureboot-collector-task.ps1
│   ├── dcr-transform.kql
│   ├── sample-payload.json
│   └── live-payload.json
├── workbooks/
│   └── secure-boot-uefi-posture.workbook.json
└── README.md                     # Implementation guide
tests/                            # Integration test suite
├── conftest.py                   # Shared fixtures and schema
├── test_payload_schema.py        # Payload data contract tests
├── test_kql_queries.py           # KQL structure and consistency tests
├── test_classification_logic.py  # 5-state classification logic tests
├── test_dcr_and_workbook.py      # DCR transform and workbook tests
├── test_powershell_scripts.py    # PowerShell script structure tests
└── test_cross_artifact.py        # Cross-artifact consistency tests
```

## Classification Model

Devices are classified into one of 5 posture states:

| State | Meaning |
|-------|---------|
| **Updated** | UEFI cert is 2023, Secure Boot on, UEFI mode, TPM 2.0+ |
| **NotUpdated** | Secure Boot capable but cert is still 2011 |
| **Blocked** | Cannot update due to: LegacyMode, SecureBootDisabled, TPMBelow2, FirmwareBelowBaseline, or OSMissingUpdate |
| **Unknown** | Missing or unreadable signals (empty DeviceName, unknown BootMode/TPM/Cert, empty OSBuild) |
| **Exempt** | Manually exempted with a documented reason |

Block reason priority: `LegacyMode > SecureBootDisabled > TPMBelow2 > FirmwareBelowBaseline > OSMissingUpdate`

## Running Tests

```bash
pip install pytest jsonschema
pytest
```

All 153 tests run offline — no Azure infrastructure required.

Test markers for selective runs:

```bash
pytest -m payload          # Payload schema tests
pytest -m classification   # Classification logic tests
pytest -m kql              # KQL query structure tests
pytest -m crossartifact    # Cross-artifact consistency tests
```

## Getting Started

See [`docs/log-analytics/README.md`](docs/log-analytics/README.md) for the full step-by-step implementation guide covering:

1. Prerequisites and permissions
2. Table creation and DCR setup
3. Test data ingestion
4. Preflight validation
5. Workbook import
6. Automated collection via scheduled task

## Solution Type

This solution is **workbook-only** for Azure Log Analytics.

There is no frontend application, build pipeline, or runtime code in this repository.
