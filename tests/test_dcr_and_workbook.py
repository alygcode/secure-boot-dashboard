"""Integration tests for DCR transform and Azure Workbook template.

Validates that the DCR transform maps all payload fields correctly and
that the workbook template is structurally valid.
"""

import json
import re

import pytest


pytestmark = [pytest.mark.dcr, pytest.mark.workbook]


# ---------------------------------------------------------------------------
# DCR Transform
# ---------------------------------------------------------------------------
class TestDcrTransform:
    """The DCR transform must map every payload field to a _CL typed column."""

    # Expected DCR output columns (suffix convention per Log Analytics)
    EXPECTED_TYPED_COLUMNS = {
        "DeviceId_g": "toguid",
        "DeviceId_s": "tostring",
        "DeviceName_s": "tostring",
        "PrimaryUser_s": "tostring",
        "Department_s": "tostring",
        "Model_s": "tostring",
        "Manufacturer_s": "tostring",
        "BIOSVersion_s": "tostring",
        "RequiredBIOSVersion_s": "tostring",
        "WarrantyEndDate_t": "todatetime",
        "OSVersion_s": "tostring",
        "OSBuild_s": "tostring",
        "SecureBootEnabled_b": "tobool",
        "BootMode_s": "tostring",
        "TPMVersion_s": "tostring",
        "UEFICertificateVersion_s": "tostring",
        "IsExempt_b": "tobool",
        "ExemptionReason_s": "tostring",
        "LastSeen_t": "todatetime",
        "TimeGenerated": "todatetime",
    }

    def test_transform_maps_all_fields(self, dcr_transform):
        for col, cast_fn in self.EXPECTED_TYPED_COLUMNS.items():
            assert col in dcr_transform, (
                f"DCR transform missing column mapping: {col}"
            )

    def test_transform_uses_correct_cast_functions(self, dcr_transform):
        for col, cast_fn in self.EXPECTED_TYPED_COLUMNS.items():
            pattern = rf"{col}\s*=\s*{cast_fn}\("
            assert re.search(pattern, dcr_transform), (
                f"DCR transform: {col} should use {cast_fn}()"
            )

    def test_transform_starts_with_source(self, dcr_transform):
        first_noncomment = [
            line.strip()
            for line in dcr_transform.split("\n")
            if line.strip() and not line.strip().startswith("//")
        ][0]
        assert first_noncomment == "source", (
            "DCR transform should start with 'source' operator"
        )

    def test_transform_projects_all_columns(self, dcr_transform):
        # Find the project block
        assert "| project" in dcr_transform
        project_block = dcr_transform.split("| project")[-1]
        for col in self.EXPECTED_TYPED_COLUMNS:
            assert col in project_block, (
                f"DCR transform project block missing: {col}"
            )

    def test_payload_fields_map_to_dcr_columns(self, all_payloads, dcr_transform):
        """Every field in the payload should have a corresponding DCR mapping."""
        for field in all_payloads[0].keys():
            # TimeGenerated is mapped directly without rename
            if field == "TimeGenerated":
                assert "TimeGenerated" in dcr_transform
                continue
            # The DCR transform should reference the raw field name
            assert field in dcr_transform, (
                f"Payload field '{field}' not referenced in DCR transform"
            )


# ---------------------------------------------------------------------------
# Workbook Template
# ---------------------------------------------------------------------------
class TestWorkbookTemplate:
    """The workbook JSON must be structurally valid and complete."""

    def test_workbook_has_version(self, workbook):
        assert "version" in workbook
        assert workbook["version"] == "Notebook/1.0"

    def test_workbook_has_schema(self, workbook):
        assert "$schema" in workbook

    def test_workbook_has_items(self, workbook):
        assert "items" in workbook
        assert isinstance(workbook["items"], list)
        assert len(workbook["items"]) > 0

    def test_workbook_has_title(self, workbook):
        """First item should be a markdown title."""
        first = workbook["items"][0]
        assert first["type"] == 1  # type 1 = markdown
        assert "Secure Boot" in first["content"]["json"]

    def test_workbook_has_parameters(self, workbook):
        """Should have a parameter block with timeRange and osBuildBaseline."""
        param_items = [
            item for item in workbook["items"]
            if item.get("type") == 3
            and "parameters" in item.get("content", {})
        ]
        assert len(param_items) >= 1, "Workbook missing parameter block"

        param_names = set()
        for item in param_items:
            for p in item["content"].get("parameters", []):
                param_names.add(p["name"])

        assert "timeRange" in param_names
        assert "osBuildBaseline" in param_names

    def test_workbook_has_visualizations(self, workbook):
        """Should contain at least a pie chart, bar chart, and table."""
        viz_types = set()
        for item in workbook["items"]:
            content = item.get("content", {})
            if "visualization" in content:
                viz_types.add(content["visualization"])

        assert "piechart" in viz_types, "Missing pie chart visualization"
        assert "barchart" in viz_types, "Missing bar chart visualization"
        assert "table" in viz_types, "Missing table visualization"

    def test_workbook_queries_reference_custom_table(self, workbook):
        """All KQL query items should reference IntuneSecureBootInventory_CL."""
        table = "IntuneSecureBootInventory_CL"
        for item in workbook["items"]:
            content = item.get("content", {})
            query = content.get("query", "")
            if query and "KqlItem" in content.get("version", ""):
                assert table in query, (
                    f"Workbook query missing {table} reference"
                )

    def test_workbook_queries_use_time_range_param(self, workbook):
        """All query items should filter by the timeRange parameter."""
        for item in workbook["items"]:
            content = item.get("content", {})
            query = content.get("query", "")
            if query and "KqlItem" in content.get("version", ""):
                assert "{timeRange}" in query, (
                    "Workbook query not using timeRange parameter"
                )

    def test_workbook_posture_query_produces_five_states(self, workbook):
        """The fleet posture query should classify into all 5 states."""
        for item in workbook["items"]:
            content = item.get("content", {})
            if content.get("title") == "Posture State Distribution":
                query = content["query"]
                for state in ("Updated", "NotUpdated", "Blocked", "Unknown", "Exempt"):
                    assert state in query
                break
        else:
            pytest.fail("Missing 'Posture State Distribution' visualization")
