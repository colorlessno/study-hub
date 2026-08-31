from __future__ import annotations

import re

from studyai.systems.system16.services.skill_normalizer import AliasRule, SkillNormalizer


class CandidateProfiler:
    EXPERIENCE_PATTERN = re.compile(r"(\d+(?:\.\d+)?)\s*年")
    PROJECT_PATTERN = re.compile(r"(案件|プロジェクト|project)")

    def __init__(self) -> None:
        self.normalizer = SkillNormalizer()

    def build_from_text(self, text: str, rules: list[AliasRule]) -> dict:
        catalog = self.normalizer.extract_catalog(text, rules)
        years = self._extract_years(text)
        project_count = self._estimate_projects(text)
        unresolved = self._extract_unresolved_terms(text, catalog["technical_all"])
        parse_confidence = self._calculate_confidence(project_count, len(catalog["technical_all"]), len(unresolved))
        review_reasons = []
        if parse_confidence < 0.75:
            review_reasons.append("candidate_text_low_confidence")
        if unresolved:
            review_reasons.append("candidate_text_unresolved_skills")
        return {
            "total_projects": project_count,
            "total_experience_years": years,
            "skills": {
                "languages": catalog["languages"],
                "databases": catalog["databases"],
                "os": catalog["os"],
                "tools": catalog["tools"],
            },
            "processes": catalog["processes"],
            "roles": catalog["roles"],
            "domains": catalog["domains"],
            "parse_confidence": parse_confidence,
            "review_required": parse_confidence < 0.75 or bool(unresolved),
            "review_reasons": review_reasons,
            "unresolved_skills": unresolved,
        }

    def build_from_parsed_skillsheet(self, parsed_payload: dict) -> dict:
        parsed_result = dict(parsed_payload["parsed_result"])
        return {
            **parsed_result,
            "parse_confidence": float(parsed_payload["parse_confidence"]),
            "review_required": bool(parsed_payload["review_required"]),
            "review_reasons": list(parsed_payload["review_reasons"]),
            "unresolved_skills": list(parsed_payload["unresolved_skills"]),
        }

    def summarize_profile(self, profile: dict) -> str:
        skills = profile.get("skills", {})
        parts = [
            f"projects={profile.get('total_projects', 0)}",
            f"years={profile.get('total_experience_years', 0)}",
            f"languages={','.join(skills.get('languages', []))}",
            f"databases={','.join(skills.get('databases', []))}",
            f"os={','.join(skills.get('os', []))}",
            f"tools={','.join(skills.get('tools', []))}",
            f"processes={','.join(profile.get('processes', []))}",
            f"roles={','.join(profile.get('roles', []))}",
            f"domains={','.join(profile.get('domains', []))}",
        ]
        return " | ".join(parts)

    def _extract_years(self, text: str) -> float:
        matches = [float(match.group(1)) for match in self.EXPERIENCE_PATTERN.finditer(text)]
        if not matches:
            return 0.0
        return round(max(matches), 1)

    def _estimate_projects(self, text: str) -> int:
        matches = self.PROJECT_PATTERN.findall(text.casefold())
        return max(len(matches), 1 if text.strip() else 0)

    def _extract_unresolved_terms(self, text: str, recognized_skills: list[str]) -> list[str]:
        candidates = re.findall(r"[A-Za-z][A-Za-z0-9#+.-]{2,}", text)
        blocked = {token.casefold() for token in recognized_skills}
        blocked.update({"project", "projects", "year", "years", "skill", "skills"})
        unresolved = []
        for token in candidates:
            lowered = token.casefold()
            if lowered in blocked:
                continue
            if lowered not in unresolved:
                unresolved.append(lowered)
        return unresolved[:5]

    @staticmethod
    def _calculate_confidence(project_count: int, skill_count: int, unresolved_count: int) -> float:
        score = 0.50
        if project_count > 0:
            score += 0.10
        score += min(skill_count, 6) * 0.05
        score -= min(unresolved_count, 4) * 0.04
        return round(max(0.0, min(1.0, score)), 3)
