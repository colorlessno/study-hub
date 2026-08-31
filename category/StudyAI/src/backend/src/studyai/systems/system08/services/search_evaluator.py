from __future__ import annotations


class SearchEvaluator:
    REQUIRED_SOURCE_COUNTS = {
        "概要レベル": 3,
        "標準レベル": 5,
        "詳細レベル": 7,
    }
    REQUIRED_DOMAINS = {
        "概要レベル": 2,
        "標準レベル": 3,
        "詳細レベル": 4,
    }

    def need_more_search(self, *, accepted_sources: list[dict], step_count: int, depth: str) -> bool:
        if step_count >= 10:
            return False
        source_target = self.REQUIRED_SOURCE_COUNTS.get(depth, 5)
        domain_target = self.REQUIRED_DOMAINS.get(depth, 3)
        domains = {
            str(source.get("domain") or "").strip().casefold()
            for source in accepted_sources
            if str(source.get("domain") or "").strip()
        }
        return len(accepted_sources) < source_target or len(domains) < domain_target
