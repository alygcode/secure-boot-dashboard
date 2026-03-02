"""Integration tests for payload schema and data contract validation.

Ensures that sample-payload.json and live-payload.json conform to the
canonical device record schema expected by the DCR transform, KQL queries,
and Azure Workbook.
"""

import json
import re
from datetime import datetime

import pytest
from jsonschema import validate, ValidationError


pytestmark = pytest.mark.payload


# ---------------------------------------------------------------------------
# Schema compliance
# ---------------------------------------------------------------------------
class TestPayloadSchemaCompliance:
    """Every device record must satisfy the JSON schema data contract."""

    def test_sample_payload_is_list(self, sample_payload):
        assert isinstance(sample_payload, list)
        assert len(sample_payload) >= 1

    def test_live_payload_is_list(self, live_payload):
        assert isinstance(live_payload, list)
        assert len(live_payload) >= 1

    def test_sample_records_match_schema(self, sample_payload, device_record_schema):
        for i, record in enumerate(sample_payload):
            try:
                validate(instance=record, schema=device_record_schema)
            except ValidationError as e:
                pytest.fail(f"sample-payload record [{i}] schema violation: {e.message}")

    def test_live_records_match_schema(self, live_payload, device_record_schema):
        for i, record in enumerate(live_payload):
            try:
                validate(instance=record, schema=device_record_schema)
            except ValidationError as e:
                pytest.fail(f"live-payload record [{i}] schema violation: {e.message}")


# ---------------------------------------------------------------------------
# Field value constraints
# ---------------------------------------------------------------------------
class TestPayloadFieldValues:
    """Field-level validations beyond type checks."""

    def test_device_ids_are_nonempty(self, all_payloads):
        for rec in all_payloads:
            assert rec["DeviceId"].strip(), f"Empty DeviceId on {rec.get('DeviceName')}"

    def test_device_ids_are_unique(self, sample_payload):
        ids = [r["DeviceId"] for r in sample_payload]
        assert len(ids) == len(set(ids)), "Duplicate DeviceId in sample payload"

    def test_boot_mode_values(self, all_payloads):
        valid = {"UEFI", "Legacy", "Unknown"}
        for rec in all_payloads:
            assert rec["BootMode"] in valid, (
                f"Invalid BootMode '{rec['BootMode']}' on {rec['DeviceName']}"
            )

    def test_tpm_version_values(self, all_payloads):
        valid = {"2.0", "1.2", "None", "Unknown"}
        for rec in all_payloads:
            assert rec["TPMVersion"] in valid, (
                f"Invalid TPMVersion '{rec['TPMVersion']}' on {rec['DeviceName']}"
            )

    def test_uefi_cert_version_values(self, all_payloads):
        valid = {"2023", "2011", "Unknown"}
        for rec in all_payloads:
            assert rec["UEFICertificateVersion"] in valid, (
                f"Invalid UEFICertificateVersion '{rec['UEFICertificateVersion']}' on {rec['DeviceName']}"
            )

    def test_secure_boot_is_boolean(self, all_payloads):
        for rec in all_payloads:
            assert isinstance(rec["SecureBootEnabled"], bool)

    def test_is_exempt_is_boolean(self, all_payloads):
        for rec in all_payloads:
            assert isinstance(rec["IsExempt"], bool)

    def test_timestamps_are_iso8601(self, all_payloads):
        iso_pattern = re.compile(
            r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}"
        )
        for rec in all_payloads:
            for field in ("LastSeen", "TimeGenerated"):
                val = rec[field]
                assert iso_pattern.match(val), (
                    f"{field}='{val}' is not ISO 8601 on {rec['DeviceName']}"
                )

    def test_no_null_values_in_required_fields(self, all_payloads):
        """Required fields should never be JSON null."""
        for rec in all_payloads:
            for key in ("DeviceId", "SecureBootEnabled", "IsExempt"):
                assert rec[key] is not None, (
                    f"{key} is null on {rec.get('DeviceName')}"
                )


# ---------------------------------------------------------------------------
# Sample payload specific: known test data assertions
# ---------------------------------------------------------------------------
class TestSamplePayloadKnownValues:
    """The two sample devices should represent one healthy and one unhealthy device."""

    def test_has_at_least_two_records(self, sample_payload):
        assert len(sample_payload) >= 2

    def test_contains_updated_device(self, sample_payload):
        updated = [r for r in sample_payload if r["UEFICertificateVersion"] == "2023"]
        assert len(updated) >= 1, "No updated (2023 cert) device in sample payload"

    def test_contains_non_updated_device(self, sample_payload):
        old = [r for r in sample_payload if r["UEFICertificateVersion"] == "2011"]
        assert len(old) >= 1, "No non-updated (2011 cert) device in sample payload"

    def test_updated_device_has_healthy_posture(self, sample_payload):
        """The updated device should also have UEFI mode, SB enabled, TPM 2.0."""
        for rec in sample_payload:
            if rec["UEFICertificateVersion"] == "2023":
                assert rec["SecureBootEnabled"] is True
                assert rec["BootMode"] == "UEFI"
                assert rec["TPMVersion"] == "2.0"
                break

    def test_non_updated_device_has_blockers(self, sample_payload):
        """The non-updated device should have at least one blocker."""
        for rec in sample_payload:
            if rec["UEFICertificateVersion"] == "2011":
                has_blocker = (
                    rec["BootMode"] != "UEFI"
                    or rec["SecureBootEnabled"] is not True
                    or rec["TPMVersion"] != "2.0"
                    or (
                        rec["BIOSVersion"]
                        and rec["RequiredBIOSVersion"]
                        and rec["BIOSVersion"] < rec["RequiredBIOSVersion"]
                    )
                )
                assert has_blocker, "Non-updated sample device has no blockers"
                break
