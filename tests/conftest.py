"""Shared fixtures for Secure Boot Dashboard integration tests."""

import json
import os
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs" / "log-analytics"
KQL_DIR = DOCS / "kql"
DEPLOY_DIR = DOCS / "deployment"
WORKBOOK_DIR = DOCS / "workbooks"


@pytest.fixture(scope="session")
def root():
    return ROOT


@pytest.fixture(scope="session")
def kql_dir():
    return KQL_DIR


@pytest.fixture(scope="session")
def deploy_dir():
    return DEPLOY_DIR


@pytest.fixture(scope="session")
def kql_files():
    """Return all .kql files under docs/log-analytics/kql/ sorted by name."""
    return sorted(KQL_DIR.glob("*.kql"))


@pytest.fixture(scope="session")
def deployment_kql_files():
    """Return .kql files under docs/log-analytics/deployment/."""
    return sorted(DEPLOY_DIR.glob("*.kql"))


@pytest.fixture(scope="session")
def ps1_files():
    """Return all .ps1 files under docs/log-analytics/deployment/."""
    return sorted(DEPLOY_DIR.glob("*.ps1"))


@pytest.fixture(scope="session")
def sample_payload():
    """Load and return the sample payload as a list of dicts."""
    path = DEPLOY_DIR / "sample-payload.json"
    with open(path) as f:
        return json.load(f)


@pytest.fixture(scope="session")
def live_payload():
    """Load and return the live payload (single object or list)."""
    path = DEPLOY_DIR / "live-payload.json"
    with open(path) as f:
        data = json.load(f)
    # Normalize to list
    if isinstance(data, dict):
        return [data]
    return data


@pytest.fixture(scope="session")
def all_payloads(sample_payload, live_payload):
    """Combine sample and live payloads into a single list."""
    return sample_payload + live_payload


@pytest.fixture(scope="session")
def workbook():
    """Load and return the workbook JSON."""
    path = WORKBOOK_DIR / "secure-boot-uefi-posture.workbook.json"
    with open(path) as f:
        return json.load(f)


@pytest.fixture(scope="session")
def dcr_transform():
    """Load and return the DCR transform KQL text."""
    path = DEPLOY_DIR / "dcr-transform.kql"
    return path.read_text()


# ---------------------------------------------------------------------------
# Data contract: canonical fields every device record MUST contain
# ---------------------------------------------------------------------------
DEVICE_RECORD_SCHEMA = {
    "type": "object",
    "required": [
        "DeviceId",
        "DeviceName",
        "PrimaryUser",
        "Department",
        "Model",
        "Manufacturer",
        "BIOSVersion",
        "RequiredBIOSVersion",
        "WarrantyEndDate",
        "OSVersion",
        "OSBuild",
        "SecureBootEnabled",
        "BootMode",
        "TPMVersion",
        "UEFICertificateVersion",
        "IsExempt",
        "ExemptionReason",
        "LastSeen",
        "TimeGenerated",
    ],
    "properties": {
        "DeviceId": {"type": "string", "minLength": 1},
        "DeviceName": {"type": "string"},
        "PrimaryUser": {"type": "string"},
        "Department": {"type": "string"},
        "Model": {"type": "string"},
        "Manufacturer": {"type": "string"},
        "BIOSVersion": {"type": "string"},
        "RequiredBIOSVersion": {"type": "string"},
        "WarrantyEndDate": {"type": "string"},
        "OSVersion": {"type": "string"},
        "OSBuild": {"type": "string"},
        "SecureBootEnabled": {"type": "boolean"},
        "BootMode": {"type": "string"},
        "TPMVersion": {"type": "string"},
        "UEFICertificateVersion": {"type": "string"},
        "IsExempt": {"type": "boolean"},
        "ExemptionReason": {"type": "string"},
        "LastSeen": {"type": "string"},
        "TimeGenerated": {"type": "string"},
    },
    "additionalProperties": False,
}


@pytest.fixture(scope="session")
def device_record_schema():
    return DEVICE_RECORD_SCHEMA
