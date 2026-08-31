from studyai.systems.system16.services.match_scorer import MatchScorer


def test_match_scorer_returns_s_when_required_skills_align() -> None:
    requirement = {
        "required_technical_skills": ["Python", "AWS", "Linux"],
        "optional_technical_skills": ["PostgreSQL"],
        "process_experience": ["要件定義", "詳細設計"],
        "domain_experience": ["金融"],
        "role_experience": ["SE"],
    }
    candidate_profile = {
        "skills": {
            "languages": ["Python"],
            "databases": ["PostgreSQL"],
            "os": ["Linux"],
            "tools": ["AWS"],
        },
        "processes": ["要件定義", "詳細設計", "製造"],
        "domains": ["金融"],
        "roles": ["SE"],
        "parse_confidence": 0.91,
        "review_reasons": [],
        "unresolved_skills": [],
    }

    scored = MatchScorer().score_match(requirement, candidate_profile)

    assert scored["score"] >= 80
    assert scored["level"] == "S"
    assert scored["review_required"] is False


def test_match_scorer_sets_review_required_for_low_confidence() -> None:
    requirement = {
        "required_technical_skills": ["Python", "AWS"],
        "optional_technical_skills": [],
        "process_experience": ["要件定義"],
        "domain_experience": [],
        "role_experience": ["SE"],
    }
    candidate_profile = {
        "skills": {
            "languages": ["Python"],
            "databases": [],
            "os": [],
            "tools": [],
        },
        "processes": [],
        "domains": [],
        "roles": ["PG"],
        "parse_confidence": 0.62,
        "review_reasons": ["candidate_text_low_confidence"],
        "unresolved_skills": ["terraform"],
    }

    scored = MatchScorer().score_match(requirement, candidate_profile)

    assert scored["review_required"] is True
    assert "parse_confidence_below_threshold" in scored["review_reasons"]
    assert "candidate_unresolved_skills" in scored["review_reasons"]
