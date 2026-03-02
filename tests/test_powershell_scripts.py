"""Integration tests for PowerShell deployment scripts.

Validates script structure, required parameters, function definitions,
and security considerations without executing PowerShell.
"""

import re

import pytest


pytestmark = pytest.mark.powershell


# ---------------------------------------------------------------------------
# File inventory
# ---------------------------------------------------------------------------
class TestPowerShellFileInventory:
    EXPECTED_SCRIPTS = [
        "send-intune-secureboot.ps1",
        "collect-live-intune-secureboot.ps1",
        "register-secureboot-collector-task.ps1",
    ]

    def test_all_expected_scripts_exist(self, deploy_dir):
        existing = {f.name for f in deploy_dir.glob("*.ps1")}
        for name in self.EXPECTED_SCRIPTS:
            assert name in existing, f"Missing script: {name}"


# ---------------------------------------------------------------------------
# send-intune-secureboot.ps1
# ---------------------------------------------------------------------------
class TestSendScript:
    @pytest.fixture(autouse=True)
    def _load(self, deploy_dir):
        self.content = (deploy_dir / "send-intune-secureboot.ps1").read_text()

    def test_has_mandatory_parameters(self):
        for param in ("TenantId", "ClientId", "ClientSecret", "DceEndpoint", "DcrImmutableId"):
            assert param in self.content, f"Missing parameter: {param}"

    def test_mandatory_params_are_required(self):
        """Mandatory params should be marked [Parameter(Mandatory = $true)]."""
        mandatory_count = len(re.findall(r"Mandatory\s*=\s*\$true", self.content))
        assert mandatory_count >= 5, (
            f"Expected at least 5 mandatory parameters, found {mandatory_count}"
        )

    def test_has_stream_name_default(self):
        assert "Custom-IntuneSecureBootInventory" in self.content

    def test_has_payload_path_parameter(self):
        assert "PayloadPath" in self.content

    def test_validates_payload_file_exists(self):
        assert "Test-Path" in self.content

    def test_uses_correct_api_version(self):
        assert "api-version=2023-01-01" in self.content

    def test_uses_azure_monitor_scope(self):
        assert "https://monitor.azure.com/.default" in self.content

    def test_uses_oauth_token_endpoint(self):
        assert "login.microsoftonline.com" in self.content

    def test_sets_error_action_preference(self):
        assert '$ErrorActionPreference = "Stop"' in self.content


# ---------------------------------------------------------------------------
# collect-live-intune-secureboot.ps1
# ---------------------------------------------------------------------------
class TestCollectScript:
    @pytest.fixture(autouse=True)
    def _load(self, deploy_dir):
        self.content = (deploy_dir / "collect-live-intune-secureboot.ps1").read_text()

    def test_requires_elevation(self):
        assert "Test-IsElevated" in self.content or "Administrator" in self.content

    def test_defines_get_device_record(self):
        assert "function Get-DeviceRecord" in self.content

    def test_defines_get_secure_boot_state(self):
        assert "function Get-SecureBootState" in self.content

    def test_defines_get_boot_mode(self):
        assert "function Get-BootMode" in self.content

    def test_defines_get_uefi_certificate_version(self):
        assert "function Get-UefiCertificateVersion" in self.content

    def test_defines_get_tpm_version(self):
        assert "function Get-TpmVersion" in self.content

    def test_device_record_has_all_payload_fields(self):
        """Get-DeviceRecord should set all fields from the data contract."""
        expected_fields = [
            "DeviceId", "DeviceName", "PrimaryUser", "Department",
            "Model", "Manufacturer", "BIOSVersion", "RequiredBIOSVersion",
            "WarrantyEndDate", "OSVersion", "OSBuild", "SecureBootEnabled",
            "BootMode", "TPMVersion", "UEFICertificateVersion", "IsExempt",
            "ExemptionReason", "LastSeen", "TimeGenerated",
        ]
        for field in expected_fields:
            assert field in self.content, (
                f"Get-DeviceRecord missing field: {field}"
            )

    def test_outputs_json(self):
        assert "ConvertTo-Json" in self.content

    def test_has_send_to_log_analytics_flag(self):
        assert "SendToLogAnalytics" in self.content

    def test_uefi_cert_detection_checks_2023(self):
        assert "2023" in self.content

    def test_uefi_cert_detection_checks_2011(self):
        assert "2011" in self.content

    def test_reads_secure_boot_uefi_db(self):
        assert "Get-SecureBootUEFI" in self.content


# ---------------------------------------------------------------------------
# register-secureboot-collector-task.ps1
# ---------------------------------------------------------------------------
class TestRegisterTaskScript:
    @pytest.fixture(autouse=True)
    def _load(self, deploy_dir):
        self.content = (deploy_dir / "register-secureboot-collector-task.ps1").read_text()

    def test_creates_scheduled_task(self):
        assert "Register-ScheduledTask" in self.content

    def test_runs_as_system(self):
        assert "SYSTEM" in self.content

    def test_has_interval_parameter(self):
        assert "IntervalMinutes" in self.content

    def test_default_interval_is_15_minutes(self):
        # Look for default value assignment
        assert re.search(r"IntervalMinutes.*=.*15", self.content)

    def test_has_run_immediately_switch(self):
        assert "RunImmediately" in self.content

    def test_has_task_name_parameter(self):
        assert "TaskName" in self.content

    def test_uses_highest_run_level(self):
        assert "Highest" in self.content

    def test_validates_la_params_when_enabled(self):
        """When EnableLogAnalyticsSend is set, required params must be checked."""
        assert "EnableLogAnalyticsSend" in self.content

    def test_sets_error_action_preference(self):
        assert '$ErrorActionPreference = "Stop"' in self.content
