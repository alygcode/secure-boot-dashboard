"""Integration tests for the 5-state device classification logic.

Re-implements the KQL classification logic in Python and validates it
against the sample payloads to ensure correctness without requiring
a Log Analytics workspace.
"""

import pytest


pytestmark = pytest.mark.classification

OS_BUILD_BASELINE = "22631"


# ---------------------------------------------------------------------------
# Pure-Python reimplementation of classification logic from query 01
# ---------------------------------------------------------------------------
def normalize_boot_mode(raw: str) -> str:
    if raw and raw.upper() == "UEFI":
        return "UEFI"
    if raw and raw.upper() == "LEGACY":
        return "Legacy"
    return "Unknown"


def normalize_tpm_version(raw: str) -> str:
    if raw and "2.0" in raw:
        return "2.0"
    if raw and "1.2" in raw:
        return "1.2"
    if raw and raw.lower() == "none":
        return "None"
    return "Unknown"


def normalize_uefi_cert(raw: str) -> str:
    if raw and "2023" in raw:
        return "2023"
    if raw and "2011" in raw:
        return "2011"
    if not raw:
        return "Unknown"
    return raw


def classify_device(record: dict) -> dict:
    """Classify a device record into posture state and block reason.

    Mirrors the KQL logic in 01_classification_5state.kql.
    """
    boot_mode = normalize_boot_mode(record.get("BootMode", ""))
    tpm = normalize_tpm_version(record.get("TPMVersion", ""))
    cert = normalize_uefi_cert(record.get("UEFICertificateVersion", ""))
    sb_enabled = record.get("SecureBootEnabled", False)
    is_exempt = record.get("IsExempt", False)
    bios = record.get("BIOSVersion", "")
    required_bios = record.get("RequiredBIOSVersion", "")
    os_build = record.get("OSBuild", "")

    # Derived flags
    cert_status = (
        "Updated" if cert == "2023"
        else "NotUpdated" if cert == "2011"
        else "Unknown"
    )

    tpm_ok = tpm == "2.0"
    uefi_ok = boot_mode == "UEFI"
    sb_ok = sb_enabled is True
    bios_known = bool(bios) and bool(required_bios)
    bios_meets = bios >= required_bios if bios_known else None
    os_known = bool(os_build)
    os_meets = os_build >= OS_BUILD_BASELINE if os_known else None

    # Unknown data
    unknown_data = (
        not record.get("DeviceName")
        or boot_mode == "Unknown"
        or tpm == "Unknown"
        or cert_status == "Unknown"
        or not os_build
    )

    # Block reason
    if cert_status != "NotUpdated":
        block_reason = "None"
    elif not uefi_ok:
        block_reason = "LegacyMode"
    elif not sb_ok:
        block_reason = "SecureBootDisabled"
    elif not tpm_ok:
        block_reason = "TPMBelow2"
    elif bios_known and not bios_meets:
        block_reason = "FirmwareBelowBaseline"
    elif os_known and not os_meets:
        block_reason = "OSMissingUpdate"
    else:
        block_reason = "None"

    # Posture state
    if is_exempt:
        posture_state = "Exempt"
    elif unknown_data:
        posture_state = "Unknown"
    elif cert_status == "Updated":
        posture_state = "Updated"
    elif cert_status == "NotUpdated" and block_reason != "None":
        posture_state = "Blocked"
    elif cert_status == "NotUpdated":
        posture_state = "NotUpdated"
    else:
        posture_state = "Unknown"

    return {
        "PostureState": posture_state,
        "BlockReason": block_reason,
        "CertStatus": cert_status,
        "BootMode": boot_mode,
        "TPMVersion": tpm,
        "UEFICertificateVersion": cert,
    }


# ---------------------------------------------------------------------------
# Tests against sample payload
# ---------------------------------------------------------------------------
class TestClassificationAgainstSamples:
    """Run the classification logic against the sample payload records."""

    def test_healthy_device_classified_as_updated(self, sample_payload):
        """LAPTOP-ENG-001: cert=2023, UEFI, SB on, TPM 2.0 -> Updated."""
        eng = next(r for r in sample_payload if r["DeviceName"] == "LAPTOP-ENG-001")
        result = classify_device(eng)
        assert result["PostureState"] == "Updated"
        assert result["CertStatus"] == "Updated"
        assert result["BlockReason"] == "None"

    def test_unhealthy_device_classified_as_blocked(self, sample_payload):
        """DESK-FIN-014: cert=2011, Legacy, SB off, TPM 1.2 -> Blocked."""
        fin = next(r for r in sample_payload if r["DeviceName"] == "DESK-FIN-014")
        result = classify_device(fin)
        assert result["PostureState"] == "Blocked"
        assert result["CertStatus"] == "NotUpdated"
        assert result["BlockReason"] != "None"

    def test_unhealthy_device_first_block_reason_is_legacy_mode(self, sample_payload):
        """Block reason priority: LegacyMode is checked before SecureBootDisabled."""
        fin = next(r for r in sample_payload if r["DeviceName"] == "DESK-FIN-014")
        result = classify_device(fin)
        assert result["BlockReason"] == "LegacyMode"


# ---------------------------------------------------------------------------
# Tests for each classification branch
# ---------------------------------------------------------------------------
class TestClassificationBranches:
    """Unit-style tests for every posture state and block reason path."""

    BASE_RECORD = {
        "DeviceId": "test-device-001",
        "DeviceName": "TEST-DEVICE",
        "PrimaryUser": "user@test.com",
        "Department": "IT",
        "Model": "Test Model",
        "Manufacturer": "TestCo",
        "BIOSVersion": "2.0.0",
        "RequiredBIOSVersion": "1.0.0",
        "WarrantyEndDate": "2028-01-01T00:00:00Z",
        "OSVersion": "Windows 11 23H2",
        "OSBuild": "22631",
        "SecureBootEnabled": True,
        "BootMode": "UEFI",
        "TPMVersion": "2.0",
        "UEFICertificateVersion": "2023",
        "IsExempt": False,
        "ExemptionReason": "",
        "LastSeen": "2026-02-27T10:00:00Z",
        "TimeGenerated": "2026-02-27T10:00:00Z",
    }

    def _with(self, **overrides):
        rec = dict(self.BASE_RECORD)
        rec.update(overrides)
        return rec

    # Posture: Updated
    def test_updated_state(self):
        result = classify_device(self._with())
        assert result["PostureState"] == "Updated"

    # Posture: Exempt
    def test_exempt_state(self):
        result = classify_device(self._with(IsExempt=True, ExemptionReason="Lab device"))
        assert result["PostureState"] == "Exempt"

    # Posture: Unknown (missing cert)
    def test_unknown_cert(self):
        result = classify_device(self._with(UEFICertificateVersion=""))
        assert result["PostureState"] == "Unknown"
        assert result["CertStatus"] == "Unknown"

    # Posture: Unknown (missing TPM)
    def test_unknown_tpm(self):
        result = classify_device(self._with(TPMVersion="Unknown"))
        assert result["PostureState"] == "Unknown"

    # Posture: Unknown (missing boot mode)
    def test_unknown_boot_mode(self):
        result = classify_device(self._with(BootMode=""))
        assert result["PostureState"] == "Unknown"

    # Posture: Unknown (missing OS build)
    def test_unknown_os_build(self):
        result = classify_device(self._with(OSBuild=""))
        assert result["PostureState"] == "Unknown"

    # Posture: NotUpdated (no blockers)
    def test_not_updated_no_blockers(self):
        result = classify_device(self._with(UEFICertificateVersion="2011"))
        assert result["PostureState"] == "NotUpdated"
        assert result["BlockReason"] == "None"

    # Block: LegacyMode
    def test_blocked_legacy_mode(self):
        result = classify_device(self._with(
            UEFICertificateVersion="2011",
            BootMode="Legacy",
        ))
        assert result["PostureState"] == "Blocked"
        assert result["BlockReason"] == "LegacyMode"

    # Block: SecureBootDisabled
    def test_blocked_secure_boot_disabled(self):
        result = classify_device(self._with(
            UEFICertificateVersion="2011",
            SecureBootEnabled=False,
        ))
        assert result["PostureState"] == "Blocked"
        assert result["BlockReason"] == "SecureBootDisabled"

    # Block: TPMBelow2
    def test_blocked_tpm_below_2(self):
        result = classify_device(self._with(
            UEFICertificateVersion="2011",
            TPMVersion="1.2",
        ))
        assert result["PostureState"] == "Blocked"
        assert result["BlockReason"] == "TPMBelow2"

    # Block: FirmwareBelowBaseline
    def test_blocked_firmware_below_baseline(self):
        result = classify_device(self._with(
            UEFICertificateVersion="2011",
            BIOSVersion="0.9.0",
            RequiredBIOSVersion="1.0.0",
        ))
        assert result["PostureState"] == "Blocked"
        assert result["BlockReason"] == "FirmwareBelowBaseline"

    # Block: OSMissingUpdate
    def test_blocked_os_missing_update(self):
        result = classify_device(self._with(
            UEFICertificateVersion="2011",
            OSBuild="19045",
        ))
        assert result["PostureState"] == "Blocked"
        assert result["BlockReason"] == "OSMissingUpdate"

    # Block reason priority: LegacyMode > SecureBootDisabled
    def test_block_reason_priority_legacy_over_secureboot(self):
        result = classify_device(self._with(
            UEFICertificateVersion="2011",
            BootMode="Legacy",
            SecureBootEnabled=False,
        ))
        assert result["BlockReason"] == "LegacyMode"

    # Block reason priority: SecureBootDisabled > TPMBelow2
    def test_block_reason_priority_secureboot_over_tpm(self):
        result = classify_device(self._with(
            UEFICertificateVersion="2011",
            SecureBootEnabled=False,
            TPMVersion="1.2",
        ))
        assert result["BlockReason"] == "SecureBootDisabled"

    # Exempt overrides everything
    def test_exempt_overrides_blockers(self):
        result = classify_device(self._with(
            UEFICertificateVersion="2011",
            BootMode="Legacy",
            SecureBootEnabled=False,
            TPMVersion="1.2",
            IsExempt=True,
        ))
        assert result["PostureState"] == "Exempt"


# ---------------------------------------------------------------------------
# Normalization functions
# ---------------------------------------------------------------------------
class TestNormalizationFunctions:
    """Test the normalization helpers for edge cases."""

    @pytest.mark.parametrize("raw,expected", [
        ("UEFI", "UEFI"),
        ("uefi", "UEFI"),
        ("Uefi", "UEFI"),
        ("Legacy", "Legacy"),
        ("legacy", "Legacy"),
        ("BIOS", "Unknown"),
        ("", "Unknown"),
        (None, "Unknown"),
    ])
    def test_normalize_boot_mode(self, raw, expected):
        assert normalize_boot_mode(raw) == expected

    @pytest.mark.parametrize("raw,expected", [
        ("2.0", "2.0"),
        ("TPM 2.0", "2.0"),
        ("1.2", "1.2"),
        ("TPM 1.2", "1.2"),
        ("None", "None"),
        ("none", "None"),
        ("", "Unknown"),
        (None, "Unknown"),
        ("3.0", "Unknown"),
    ])
    def test_normalize_tpm_version(self, raw, expected):
        assert normalize_tpm_version(raw) == expected

    @pytest.mark.parametrize("raw,expected", [
        ("2023", "2023"),
        ("Microsoft Windows UEFI CA 2023", "2023"),
        ("2011", "2011"),
        ("Microsoft Windows UEFI CA 2011", "2011"),
        ("", "Unknown"),
        (None, "Unknown"),
    ])
    def test_normalize_uefi_cert(self, raw, expected):
        assert normalize_uefi_cert(raw) == expected
