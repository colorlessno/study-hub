import json
import tempfile
import unittest
from pathlib import Path

import verify_prompts as target


class VerifyPromptsTest(unittest.TestCase):
    def test_repository_assets_are_valid(self):
        input_path = Path(__file__).with_name("test_input.json")

        base_vars, issues = target.validate_assets(input_path, target.STEP_ORDER)

        self.assertEqual(issues, [])
        self.assertTrue(set(target.BASE_INPUT_KEYS).issubset(base_vars))

    def test_exercise_inputs_are_valid(self):
        exercise_dir = Path(__file__).resolve().parents[1] / "exercise"

        for name in ["baseline_input.json", "variant_input.json"]:
            with self.subTest(name=name):
                _, issues = target.validate_assets(exercise_dir / name, target.STEP_ORDER)
                self.assertEqual(issues, [])

    def test_parse_steps_preserves_workflow_order(self):
        self.assertEqual(target.parse_steps("all"), target.STEP_ORDER)
        self.assertEqual(target.parse_steps("mindmap,scamper"), ["mindmap", "scamper"])
        with self.assertRaisesRegex(ValueError, "不明なステップ"):
            target.parse_steps("mindmap,unknown")
        with self.assertRaisesRegex(ValueError, "上流から順"):
            target.parse_steps("scamper,mindmap")

    def test_extract_json_ignores_surrounding_text_and_braces_in_strings(self):
        data, error = target.extract_json('before {"message": "value with { braces }"} after')

        self.assertIsNone(error)
        self.assertEqual(data, {"message": "value with { braces }"})

    def test_display_path_hides_host_absolute_path(self):
        input_path = Path(__file__).resolve().parents[1] / "exercise" / "baseline_input.json"

        self.assertEqual(target.display_path(input_path), "exercise/baseline_input.json")

    def test_validate_assets_reports_missing_input(self):
        with tempfile.TemporaryDirectory() as directory:
            input_path = Path(directory) / "input.json"
            input_path.write_text(
                json.dumps({"theme": "test", "background": "test", "purpose": "test"}),
                encoding="utf-8",
            )

            _, issues = target.validate_assets(input_path, ["mindmap"])

        self.assertTrue(any("constraints" in issue for issue in issues))

    def test_six_hats_validator_accepts_complete_scores(self):
        data = {key: "value" for key in target.SIX_HATS_KEYS}
        data["scores"] = {key: 5 for key in target.SCORE_KEYS}

        self.assertEqual(target.v_six_hats(data), [])


if __name__ == "__main__":
    unittest.main()
