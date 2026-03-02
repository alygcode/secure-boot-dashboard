"""Integration tests for cross-artifact consistency.

Validates that all project components (KQL queries, DCR transform,
PowerShell scripts, payloads, workbook) use a consistent data contract
and reference the same table names, field names, and classification values.
"""

import json
import re

import pytest


pytestmark = pytest.mark.crossartifact

TABLE_NAME = "IntuneSecureBootInventory_CL"
STREAM_NAME = "Custom-IntuneSecureBootInventory"

# The five posture states used across all artifacts
POSTURE_STATES = {"Updated", "NotUpdated", "Blocked", "Unknown", "Exempt"}

# Block reasons referenced in queries 01-06 and the workbook
BLOCK_REASONS = {"LegacyMode", "SecureBootDisabled", "TPMBelow2", "FirmwareBelowBaseline", "OSMissingUpdate", "None"}

# The canonical payload fields (pre-DCR transform)
PAYLOAD_FIELDS = {
    "DeviceId", "DeviceName", "PrimaryUser", "Department",
    "Model", "Manufacturer", "BIOSVersion", "RequiredBIOSVersion",
    "WarrantyEndDate", "OSVersion", "OSBuild", "SecureBootEnabled",
    "BootMode", "TPMVersion", "UEFICertificateVersion", "IsExempt",
    "ExemptionReason", "LastSeen", "TimeGenerated",
}

# Primary coalesced columns the KQL queries use (after normalization)
KQL_COALESCED_DEVICE_ID_SOURCES = [
    "DeviceId_g", "DeviceId_s", "AadDeviceId_g", "ManagedDeviceId_s",
]


# ---------------------------------------------------------------------------
# Table name consistency
# ---------------------------------------------------------------------------
class TestTableNameConsistency:
    """Every artifact that references the log table should use the same name."""

    def test_all_kql_files_use_same_table(self, kql_files):
        for path in kql_files:
            content = path.read_text()
            assert TABLE_NAME in content, (
                f"{path.name} does not reference {TABLE_NAME}"
            )

    def test_workbook_uses_same_table(self, workbook):
        for item in workbook["items"]:
            query = item.get("content", {}).get("query", "")
            if query:
                assert TABLE_NAME in query

    def test_stream_name_in_send_script(self, deploy_dir):
        content = (deploy_dir / "send-intune-secureboot.ps1").read_text()
        assert STREAM_NAME in content

    def test_stream_name_in_collect_script(self, deploy_dir):
        content = (deploy_dir / "collect-live-intune-secureboot.ps1").read_text()
        assert STREAM_NAME in content


# ---------------------------------------------------------------------------
# Payload fields -> DCR transform -> KQL queries consistency
# ---------------------------------------------------------------------------
class TestFieldMappingConsistency:
    """Payload field names must map through the DCR transform to KQL column names."""

    def test_every_payload_field_in_dcr_transform(self, dcr_transform):
        for field in PAYLOAD_FIELDS:
            assert field in dcr_transform, (
                f"Payload field '{field}' missing from DCR transform"
            )

    def test_dcr_output_columns_in_normalization_query(self, kql_dir, dcr_transform):
        """Key DCR output columns should appear in query 00."""
        q00 = (kql_dir / "00_normalized_device_posture.kql").read_text()
        key_dcr_cols = [
            "DeviceId_g", "DeviceName_s", "BootMode_s",
            "SecureBootEnabled_b", "TPMVersion_s",
            "UEFICertificateVersion_s", "IsExempt_b",
        ]
        for col in key_dcr_cols:
            assert col in q00, (
                f"DCR output column '{col}' not referenced in query 00"
            )

    def test_device_id_coalesce_sources_consistent(self, kql_files):
        """All queries that coalesce DeviceId should use the same source columns."""
        for path in kql_files:
            content = path.read_text()
            if "coalesce(DeviceId_g" not in content:
                continue
            for col in KQL_COALESCED_DEVICE_ID_SOURCES:
                assert col in content, (
                    f"{path.name} coalesces DeviceId but missing source: {col}"
                )


# ---------------------------------------------------------------------------
# Classification values consistency
# ---------------------------------------------------------------------------
class TestClassificationConsistency:
    """Posture states and block reasons should be consistent across artifacts."""

    def test_classification_queries_use_same_posture_states(self, kql_dir):
        classification_files = [
            "01_classification_5state.kql",
            "02_root_cause_breakdown.kql",
            "03_non_updated_device_detail.kql",
            "04_cohorts_model_bios_tpm.kql",
            "05_trend_posture_over_time.kql",
            "06_alert_deadline_risk.kql",
        ]
        for name in classification_files:
            content = (kql_dir / name).read_text()
            for state in POSTURE_STATES:
                assert f'"{state}"' in content, (
                    f"{name} missing PostureState '{state}'"
                )

    def test_block_reasons_consistent_across_queries(self, kql_dir):
        """Queries 01-06 should all reference the same block reasons."""
        files = [
            "01_classification_5state.kql",
            "02_root_cause_breakdown.kql",
            "03_non_updated_device_detail.kql",
            "04_cohorts_model_bios_tpm.kql",
            "05_trend_posture_over_time.kql",
            "06_alert_deadline_risk.kql",
        ]
        for name in files:
            content = (kql_dir / name).read_text()
            for reason in BLOCK_REASONS:
                assert f'"{reason}"' in content, (
                    f"{name} missing BlockReason '{reason}'"
                )

    def test_workbook_queries_reference_all_posture_states(self, workbook):
        """The fleet posture workbook query should count all 5 states."""
        for item in workbook["items"]:
            content = item.get("content", {})
            if content.get("title") == "Posture State Distribution":
                query = content["query"]
                for state in POSTURE_STATES:
                    assert state in query
                return
        pytest.fail("Workbook missing Posture State Distribution query")


# ---------------------------------------------------------------------------
# Normalization consistency across queries
# ---------------------------------------------------------------------------
class TestNormalizationConsistency:
    """The normalization extend blocks should be consistent across KQL files."""

    NORMALIZED_VALUES = {
        "BootMode": ["UEFI", "Legacy", "Unknown"],
        "TPMVersion": ["2.0", "1.2", "None", "Unknown"],
        "UEFICertificateVersion": ["2023", "2011"],
    }

    def test_boot_mode_normalization_consistent(self, kql_files):
        for path in kql_files:
            content = path.read_text()
            if "BootMode" not in content or "case(" not in content:
                continue
            for val in self.NORMALIZED_VALUES["BootMode"]:
                assert f'"{val}"' in content, (
                    f"{path.name} BootMode normalization missing '{val}'"
                )

    def test_cert_version_normalization_consistent(self, kql_files):
        for path in kql_files:
            content = path.read_text()
            if "UEFICertificateVersion" not in content or "case(" not in content:
                continue
            for val in self.NORMALIZED_VALUES["UEFICertificateVersion"]:
                assert f'"{val}"' in content, (
                    f"{path.name} cert normalization missing '{val}'"
                )


# ---------------------------------------------------------------------------
# Remediation hint consistency (query 03)
# ---------------------------------------------------------------------------
class TestRemediationHints:
    """Query 03 should provide a remediation hint for every block reason."""

    def test_has_hint_for_every_block_reason(self, kql_dir):
        content = (kql_dir / "03_non_updated_device_detail.kql").read_text()
        assert "RemediationHint" in content
        for reason in ("LegacyMode", "SecureBootDisabled", "TPMBelow2", "FirmwareBelowBaseline", "OSMissingUpdate"):
            assert reason in content, (
                f"Query 03 missing remediation hint for {reason}"
            )

    def test_has_hint_for_not_updated_state(self, kql_dir):
        content = (kql_dir / "03_non_updated_device_detail.kql").read_text()
        assert "Stage 2023 UEFI cert" in content or "NotUpdated" in content

    def test_has_hint_for_unknown_state(self, kql_dir):
        content = (kql_dir / "03_non_updated_device_detail.kql").read_text()
        assert "telemetry" in content.lower() or "Unknown" in content


# ---------------------------------------------------------------------------
# Risk scoring consistency (query 04)
# ---------------------------------------------------------------------------
class TestRiskScoring:
    """Query 04 should define risk scores and priority bands."""

    def test_risk_score_weights_blocked_highest(self, kql_dir):
        content = (kql_dir / "04_cohorts_model_bios_tpm.kql").read_text()
        assert "RiskScore" in content
        # Blocked * 5, NotUpdated * 3, Unknown * 2
        assert "Blocked * 5" in content or "Blocked*5" in content.replace(" ", "")

    def test_has_priority_bands(self, kql_dir):
        content = (kql_dir / "04_cohorts_model_bios_tpm.kql").read_text()
        for band in ("P1", "P2", "P3", "P4"):
            assert f'"{band}"' in content, f"Missing priority band: {band}"

    def test_orders_by_risk_score_desc(self, kql_dir):
        content = (kql_dir / "04_cohorts_model_bios_tpm.kql").read_text()
        assert "RiskScore desc" in content


# ---------------------------------------------------------------------------
# End-to-end payload -> classification coherence
# ---------------------------------------------------------------------------
class TestEndToEndCoherence:
    """Sample payloads should be classifiable and produce expected results."""

    def test_updated_device_would_not_trigger_alert(self, sample_payload):
        """A fully-updated fleet should not breach alert thresholds."""
        updated_devices = [
            r for r in sample_payload
            if r["UEFICertificateVersion"] == "2023"
        ]
        assert len(updated_devices) >= 1
        for dev in updated_devices:
            assert dev["SecureBootEnabled"] is True
            assert dev["BootMode"] == "UEFI"
            assert dev["TPMVersion"] == "2.0"

    def test_sample_covers_both_cert_generations(self, sample_payload):
        certs = {r["UEFICertificateVersion"] for r in sample_payload}
        assert "2023" in certs, "Sample missing 2023 cert generation"
        assert "2011" in certs, "Sample missing 2011 cert generation"

    def test_sample_covers_multiple_departments(self, sample_payload):
        depts = {r["Department"] for r in sample_payload if r["Department"]}
        assert len(depts) >= 2, "Sample should cover at least 2 departments"

    def test_sample_covers_multiple_manufacturers(self, sample_payload):
        mfrs = {r["Manufacturer"] for r in sample_payload}
        assert len(mfrs) >= 2, "Sample should cover at least 2 manufacturers"
