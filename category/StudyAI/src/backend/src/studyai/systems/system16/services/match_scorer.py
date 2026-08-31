from __future__ import annotations


class MatchScorer:
    WEIGHTS = {
        "technical_skills": 0.35,
        "process_experience": 0.25,
        "domain_experience": 0.20,
        "role_experience": 0.20,
    }

    def score_match(self, requirement: dict, candidate_profile: dict) -> dict:
        candidate_technical = set(self._candidate_technical(candidate_profile))
        candidate_process = set(candidate_profile.get("processes", []))
        candidate_domain = set(candidate_profile.get("domains", []))
        candidate_role = set(candidate_profile.get("roles", []))

        technical_score, technical_detail = self._score_technical(
            required=set(requirement.get("required_technical_skills", [])),
            optional=set(requirement.get("optional_technical_skills", [])),
            candidate=candidate_technical,
        )
        process_score, process_detail = self._score_generic(
            required=set(requirement.get("process_experience", [])),
            candidate=candidate_process,
        )
        domain_score, domain_detail = self._score_generic(
            required=set(requirement.get("domain_experience", [])),
            candidate=candidate_domain,
        )
        role_score, role_detail = self._score_generic(
            required=set(requirement.get("role_experience", [])),
            candidate=candidate_role,
        )

        score_breakdown = {
            "technical_skills": technical_score,
            "process_experience": process_score,
            "domain_experience": domain_score,
            "role_experience": role_score,
        }
        overall = round(sum(score_breakdown[key] * weight for key, weight in self.WEIGHTS.items()), 2)
        level = self._level_for_score(overall)
        if technical_detail["required_ratio"] < 0.60 and level in {"S", "A"}:
            level = "B"

        review_reasons = list(candidate_profile.get("review_reasons", []))
        if candidate_profile.get("parse_confidence", 1.0) < 0.75:
            review_reasons.append("parse_confidence_below_threshold")
        if technical_score < 40:
            review_reasons.append("low_technical_match")
        if process_score < 40 and requirement.get("process_experience"):
            review_reasons.append("low_process_match")
        if candidate_profile.get("unresolved_skills"):
            review_reasons.append("candidate_unresolved_skills")
        review_reasons = sorted(dict.fromkeys(review_reasons))

        return {
            "score": overall,
            "level": level,
            "review_required": bool(review_reasons),
            "review_reasons": review_reasons,
            "score_breakdown": score_breakdown,
            "details": {
                "technical": technical_detail,
                "process": process_detail,
                "domain": domain_detail,
                "role": role_detail,
            },
        }

    @staticmethod
    def _candidate_technical(candidate_profile: dict) -> list[str]:
        skills = candidate_profile.get("skills", {})
        return [*skills.get("languages", []), *skills.get("databases", []), *skills.get("os", []), *skills.get("tools", [])]

    def _score_technical(self, *, required: set[str], optional: set[str], candidate: set[str]) -> tuple[float, dict]:
        required_ratio = self._ratio(required, candidate)
        optional_ratio = self._ratio(optional, candidate)
        score = round((required_ratio * 0.8 + optional_ratio * 0.2) * 100, 2) if required or optional else 100.0
        return score, {
            "matched_required": sorted(required & candidate),
            "missing_required": sorted(required - candidate),
            "matched_optional": sorted(optional & candidate),
            "required_ratio": required_ratio,
            "optional_ratio": optional_ratio,
        }

    @staticmethod
    def _score_generic(*, required: set[str], candidate: set[str]) -> tuple[float, dict]:
        ratio = MatchScorer._ratio(required, candidate)
        score = round(ratio * 100, 2) if required else 100.0
        return score, {"matched": sorted(required & candidate), "missing": sorted(required - candidate), "ratio": ratio}

    @staticmethod
    def _ratio(required: set[str], candidate: set[str]) -> float:
        if not required:
            return 1.0
        return len(required & candidate) / len(required)

    @staticmethod
    def _level_for_score(score: float) -> str:
        if score >= 80:
            return "S"
        if score >= 60:
            return "A"
        if score >= 40:
            return "B"
        return "C"
