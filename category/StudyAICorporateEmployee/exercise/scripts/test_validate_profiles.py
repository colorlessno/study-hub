import copy
import json
import unittest
from pathlib import Path

import validate_profiles as target


class ValidateProfilesTest(unittest.TestCase):
    def setUp(self):
        cases_path = Path(__file__).resolve().parents[1] / "cases.json"
        self.cases = json.loads(cases_path.read_text(encoding="utf-8"))

    def test_repository_profiles_and_cases_are_valid(self):
        self.assertEqual(target.validate_repository(), [])

    def test_missing_profile_section_is_reported(self):
        text = "# 役割\n\n## 担当業務\n"

        issues = target.validate_profile_text(text, "sample")

        self.assertTrue(any("禁止事項" in issue for issue in issues))

    def test_permissive_settings_are_reported(self):
        settings = {"permissions": {"defaultMode": "default", "deny": ["Bash"]}}

        issues = target.validate_settings_data(settings, "sample")

        self.assertTrue(any("dontAsk" in issue for issue in issues))
        self.assertTrue(any("deny rule欠落" in issue for issue in issues))

    def test_duplicate_case_id_is_reported(self):
        cases = copy.deepcopy(self.cases)
        cases[1]["id"] = cases[0]["id"]

        issues = target.validate_cases_data(cases)

        self.assertTrue(any("id重複" in issue for issue in issues))

    def test_missing_action_coverage_is_reported(self):
        cases = [case for case in copy.deepcopy(self.cases) if case["expected_action"] != "refuse"]

        issues = target.validate_cases_data(cases)

        self.assertTrue(any("action case欠落" in issue for issue in issues))


if __name__ == "__main__":
    unittest.main()
