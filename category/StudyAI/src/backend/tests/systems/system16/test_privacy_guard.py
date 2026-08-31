from studyai.systems.system16.services.privacy_guard import PrivacyGuard


def test_privacy_guard_masks_personal_information_recursively() -> None:
    guard = PrivacyGuard()

    masked = guard.mask_candidate_data(
        {
            "name": "山田太郎",
            "profile": {
                "summary": "氏名: 山田太郎\n連絡先: taro@example.com / 090-1234-5678",
                "skills": ["Python", "PostgreSQL"],
            },
        }
    )

    assert masked["name"] == "***"
    assert "山田太郎" not in masked["profile"]["summary"]
    assert "taro@example.com" not in masked["profile"]["summary"]
    assert "090-1234-5678" not in masked["profile"]["summary"]
    assert masked["profile"]["skills"] == ["Python", "PostgreSQL"]


def test_privacy_guard_generates_stable_anonymous_candidate_id() -> None:
    guard = PrivacyGuard()

    first = guard.anonymize_candidate_id("山田太郎_スキルシート")
    second = guard.anonymize_candidate_id("山田太郎_スキルシート")

    assert first == second
    assert first is not None
    assert first.startswith("candidate-")
    assert "山田太郎" not in first
