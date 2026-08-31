import argparse
import json
import sys
from pathlib import Path


EXERCISE_ROOT = Path(__file__).resolve().parents[1]
PROFILES = ["employee_hr", "employee_sales"]
ACTIONS = {"answer", "clarify", "escalate", "refuse"}
REQUIRED_SECTIONS = [
    "# 役割",
    "## 担当業務",
    "## 入力として扱ってよい情報",
    "## 禁止事項",
    "## エスカレーション",
    "## 応答形式",
]
REQUIRED_DENY = {
    "Bash",
    "Edit",
    "Write",
    "NotebookEdit",
    "WebFetch",
    "WebSearch",
    "Agent",
    "mcp__*",
}
REQUIRED_CASE_KEYS = {
    "id",
    "profile",
    "request",
    "expected_action",
    "expected_reason",
    "must_not",
}


def configure_utf8_output():
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            reconfigure(encoding="utf-8")


def validate_profile_text(text, label):
    issues = []
    for section in REQUIRED_SECTIONS:
        if section not in text:
            issues.append(f"{label}: section欠落 {section}")
    if "answer | clarify | escalate | refuse" not in text:
        issues.append(f"{label}: 応答actionの選択肢がありません")
    return issues


def validate_settings_data(data, label):
    issues = []
    permissions = data.get("permissions") if isinstance(data, dict) else None
    if not isinstance(permissions, dict):
        return [f"{label}: permissions objectがありません"]
    if permissions.get("defaultMode") != "dontAsk":
        issues.append(f"{label}: permissions.defaultModeはdontAskにしてください")
    deny = permissions.get("deny")
    if not isinstance(deny, list):
        issues.append(f"{label}: permissions.denyはarrayにしてください")
        return issues
    missing = sorted(REQUIRED_DENY - set(deny))
    if missing:
        issues.append(f"{label}: deny rule欠落 {missing}")
    return issues


def validate_profile(root, profile):
    issues = []
    profile_root = root / profile
    claude_path = profile_root / "CLAUDE.md"
    settings_path = profile_root / ".claude" / "settings.json"

    try:
        text = claude_path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as error:
        issues.append(f"{profile}: CLAUDE.mdを読めません: {error}")
    else:
        issues.extend(validate_profile_text(text, profile))

    try:
        settings = json.loads(settings_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        issues.append(f"{profile}: settings.jsonを読めません: {error}")
    else:
        issues.extend(validate_settings_data(settings, profile))
    return issues


def validate_cases_data(data):
    issues = []
    if not isinstance(data, list):
        return ["cases.jsonのrootはarrayにしてください"]

    seen_ids = set()
    actions_by_profile = {profile: set() for profile in PROFILES}
    for index, case in enumerate(data):
        label = f"case[{index}]"
        if not isinstance(case, dict):
            issues.append(f"{label}: objectではありません")
            continue
        missing_keys = sorted(REQUIRED_CASE_KEYS - set(case))
        if missing_keys:
            issues.append(f"{label}: key欠落 {missing_keys}")
            continue

        case_id = case["id"]
        if not isinstance(case_id, str) or not case_id.strip():
            issues.append(f"{label}: idは空でない文字列にしてください")
        elif case_id in seen_ids:
            issues.append(f"{label}: id重複 {case_id}")
        else:
            seen_ids.add(case_id)

        profile = case["profile"]
        if profile not in PROFILES:
            issues.append(f"{label}: 不明なprofile {profile}")
        action = case["expected_action"]
        if action not in ACTIONS:
            issues.append(f"{label}: 不明なexpected_action {action}")
        elif profile in actions_by_profile:
            actions_by_profile[profile].add(action)

        for key in ["request", "expected_reason"]:
            if not isinstance(case[key], str) or not case[key].strip():
                issues.append(f"{label}: {key}は空でない文字列にしてください")
        if not isinstance(case["must_not"], list) or not case["must_not"]:
            issues.append(f"{label}: must_notは空でないarrayにしてください")

    for profile, actions in actions_by_profile.items():
        missing_actions = sorted(ACTIONS - actions)
        if missing_actions:
            issues.append(f"{profile}: action case欠落 {missing_actions}")
    return issues


def validate_repository(root=EXERCISE_ROOT):
    issues = []
    for profile in PROFILES:
        issues.extend(validate_profile(root, profile))

    cases_path = root / "cases.json"
    try:
        cases = json.loads(cases_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        issues.append(f"cases.jsonを読めません: {error}")
    else:
        issues.extend(validate_cases_data(cases))
    return issues


def main():
    configure_utf8_output()
    parser = argparse.ArgumentParser(description="StudyAICorporateEmployee profile validator")
    parser.add_argument("--root", type=Path, default=EXERCISE_ROOT)
    args = parser.parse_args()

    issues = validate_repository(args.root.resolve())
    if issues:
        print("[NG] 役割profileの検証に失敗しました。")
        for issue in issues:
            print(f"     - {issue}")
        sys.exit(1)

    print(f"[OK] profile {len(PROFILES)}件とaction case 8件を検証しました。")


if __name__ == "__main__":
    main()
