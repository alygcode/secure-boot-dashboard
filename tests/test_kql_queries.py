"""Integration tests for KQL query structure and consistency.

Validates that all KQL query files are well-formed, reference the correct
table, and produce the expected output columns.
"""

import re

import pytest


pytestmark = pytest.mark.kql

# The canonical custom log table all queries should reference
TABLE_NAME = "IntuneSecureBootInventory_CL"


# ---------------------------------------------------------------------------
# File inventory
# ---------------------------------------------------------------------------
class TestKqlFileInventory:
    """The expected set of KQL files must all exist."""

    EXPECTED_FILES = [
        "00_normalized_device_posture.kql",
        "01_classification_5state.kql",
        "02_root_cause_breakdown.kql",
        "03_non_updated_device_detail.kql",
        "04_cohorts_model_bios_tpm.kql",
        "05_trend_posture_over_time.kql",
        "06_alert_deadline_risk.kql",
        "07_preflight_readiness.kql",
    ]

    def test_all_expected_kql_files_exist(self, kql_dir):
        existing = {f.name for f in kql_dir.glob("*.kql")}
        for name in self.EXPECTED_FILES:
            assert name in existing, f"Missing KQL file: {name}"

    def test_no_unexpected_kql_files(self, kql_dir):
        existing = {f.name for f in kql_dir.glob("*.kql")}
        expected = set(self.EXPECTED_FILES)
        unexpected = existing - expected
        assert not unexpected, f"Unexpected KQL files: {unexpected}"

    def test_dcr_transform_exists(self, deploy_dir):
        assert (deploy_dir / "dcr-transform.kql").is_file()


# ---------------------------------------------------------------------------
# Query structure
# ---------------------------------------------------------------------------
class TestKqlQueryStructure:
    """Each KQL query must be non-empty and reference the correct table."""

    def test_queries_are_nonempty(self, kql_files):
        for path in kql_files:
            content = path.read_text().strip()
            assert len(content) > 0, f"{path.name} is empty"

    def test_queries_reference_custom_table(self, kql_files):
        for path in kql_files:
            content = path.read_text()
            assert TABLE_NAME in content, (
                f"{path.name} does not reference {TABLE_NAME}"
            )

    def test_queries_have_header_comment(self, kql_files):
        for path in kql_files:
            first_line = path.read_text().split("\n")[0]
            assert first_line.startswith("//"), (
                f"{path.name} should start with a header comment"
            )

    def test_queries_use_30d_or_explicit_lookback(self, kql_files):
        """All point-in-time queries should declare a lookback window."""
        trend_file = "05_trend_posture_over_time.kql"
        for path in kql_files:
            content = path.read_text()
            if path.name == trend_file:
                assert "90d" in content, f"{path.name} should use a 90d window"
            elif path.name == "07_preflight_readiness.kql":
                assert "7d" in content, f"{path.name} should use a 7d window"
            else:
                assert "30d" in content, (
                    f"{path.name} should use a 30d lookback"
                )


# ---------------------------------------------------------------------------
# Normalization layer (query 00)
# ---------------------------------------------------------------------------
class TestNormalizedPosture:
    """Query 00 must produce the canonical normalized column set."""

    EXPECTED_COLUMNS = [
        "TimeGenerated", "DeviceId", "DeviceName", "PrimaryUser",
        "Department", "Model", "Manufacturer", "BIOSVersion",
        "RequiredBIOSVersion", "WarrantyEndDate", "OSVersion", "OSBuild",
        "SecureBootEnabled", "BootMode", "TPMVersion",
        "UEFICertificateVersion", "IsExempt", "ExemptionReason",
        "LastSeen", "DataSource",
    ]

    def test_projects_all_expected_columns(self, kql_dir):
        content = (kql_dir / "00_normalized_device_posture.kql").read_text()
        for col in self.EXPECTED_COLUMNS:
            assert col in content, (
                f"Query 00 missing expected column: {col}"
            )

    def test_normalizes_boot_mode_to_three_values(self, kql_dir):
        content = (kql_dir / "00_normalized_device_posture.kql").read_text()
        for value in ("UEFI", "Legacy", "Unknown"):
            assert f'"{value}"' in content

    def test_normalizes_tpm_version(self, kql_dir):
        content = (kql_dir / "00_normalized_device_posture.kql").read_text()
        for value in ("2.0", "1.2", "None", "Unknown"):
            assert f'"{value}"' in content

    def test_normalizes_uefi_cert_version(self, kql_dir):
        content = (kql_dir / "00_normalized_device_posture.kql").read_text()
        for value in ("2023", "2011", "Unknown"):
            assert f'"{value}"' in content

    def test_deduplicates_by_device_id(self, kql_dir):
        content = (kql_dir / "00_normalized_device_posture.kql").read_text()
        assert "arg_max(TimeGenerated" in content


# ---------------------------------------------------------------------------
# Classification query (query 01)
# ---------------------------------------------------------------------------
class TestClassification5State:
    """Query 01 must produce the five posture states and block reasons."""

    POSTURE_STATES = ["Updated", "NotUpdated", "Blocked", "Unknown", "Exempt"]
    BLOCK_REASONS = [
        "LegacyMode", "SecureBootDisabled", "TPMBelow2",
        "FirmwareBelowBaseline", "OSMissingUpdate", "None",
    ]

    def test_contains_all_posture_states(self, kql_dir):
        content = (kql_dir / "01_classification_5state.kql").read_text()
        for state in self.POSTURE_STATES:
            assert f'"{state}"' in content, (
                f"Query 01 missing PostureState: {state}"
            )

    def test_contains_block_reasons(self, kql_dir):
        content = (kql_dir / "01_classification_5state.kql").read_text()
        for reason in self.BLOCK_REASONS:
            assert f'"{reason}"' in content, (
                f"Query 01 missing BlockReason: {reason}"
            )

    def test_orders_by_posture_state(self, kql_dir):
        content = (kql_dir / "01_classification_5state.kql").read_text()
        assert "order by PostureState" in content

    def test_defines_os_build_baseline(self, kql_dir):
        content = (kql_dir / "01_classification_5state.kql").read_text()
        assert 'osBuildBaseline' in content


# ---------------------------------------------------------------------------
# Alert query (query 06)
# ---------------------------------------------------------------------------
class TestAlertDeadlineRisk:
    """Query 06 should define thresholds and a hard deadline."""

    def test_has_non_compliant_threshold(self, kql_dir):
        content = (kql_dir / "06_alert_deadline_risk.kql").read_text()
        assert "nonCompliantPctThreshold" in content

    def test_has_blocked_threshold(self, kql_dir):
        content = (kql_dir / "06_alert_deadline_risk.kql").read_text()
        assert "blockedPctThreshold" in content

    def test_has_hard_deadline(self, kql_dir):
        content = (kql_dir / "06_alert_deadline_risk.kql").read_text()
        assert "hardDeadline" in content
        assert "2026-06-30" in content

    def test_has_stale_cutoff(self, kql_dir):
        content = (kql_dir / "06_alert_deadline_risk.kql").read_text()
        assert "staleCutoff" in content

    def test_filters_only_breached(self, kql_dir):
        content = (kql_dir / "06_alert_deadline_risk.kql").read_text()
        assert 'BreachReason != "None"' in content

    def test_computes_days_to_deadline(self, kql_dir):
        content = (kql_dir / "06_alert_deadline_risk.kql").read_text()
        assert "DaysToDeadline" in content


# ---------------------------------------------------------------------------
# Preflight readiness (query 07)
# ---------------------------------------------------------------------------
class TestPreflightReadiness:
    """Query 07 should check table existence, freshness, and coverage."""

    def test_checks_table_existence(self, kql_dir):
        content = (kql_dir / "07_preflight_readiness.kql").read_text()
        assert "hasTable" in content

    def test_checks_freshness(self, kql_dir):
        content = (kql_dir / "07_preflight_readiness.kql").read_text()
        assert "FreshnessStatus" in content

    def test_checks_device_coverage(self, kql_dir):
        content = (kql_dir / "07_preflight_readiness.kql").read_text()
        assert "DeviceCoverageStatus" in content

    def test_produces_ready_for_workbook_flag(self, kql_dir):
        content = (kql_dir / "07_preflight_readiness.kql").read_text()
        assert "ReadyForWorkbook" in content

    def test_lists_required_columns(self, kql_dir):
        content = (kql_dir / "07_preflight_readiness.kql").read_text()
        assert "requiredColumns" in content
