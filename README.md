# Secure Boot UEFI Certificate Workbook

This repository contains only Log Analytics content for Secure Boot UEFI certificate readiness monitoring.

## Scope

- KQL query pack for posture normalization, 5-state classification, root-cause diagnostics, cohorts, trends, and alerting.
- Azure Workbook template for fleet-level posture visualization and remediation tracking.
- Intune-first telemetry model in a single Log Analytics workspace.

## Repository Layout

- `docs/log-analytics/README.md` — implementation guide and data contract.
- `docs/log-analytics/kql/` — reusable KQL queries.
- `docs/log-analytics/workbooks/secure-boot-uefi-posture.workbook.json` — workbook template.

## Solution Type

This solution is **workbook-only** for Azure Log Analytics.

There is no frontend application, build pipeline, or runtime code in this repository.
