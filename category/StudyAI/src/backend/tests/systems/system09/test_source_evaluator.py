from __future__ import annotations

from studyai.systems.system09.services.source_evaluator import SourceEvaluator


def test_filter_sources_deduplicates_and_skips_short_content() -> None:
    evaluator = SourceEvaluator()
    sources = [
        {
            "title": "Official release",
            "url": "https://example.com/news#top",
            "content": "A" * 120,
            "source_type": "web",
        },
        {
            "title": "Duplicate release",
            "url": "https://example.com/news",
            "content": "B" * 200,
            "source_type": "web",
        },
        {
            "title": "Too short",
            "url": "https://other.example.com/post",
            "content": "short",
            "source_type": "web",
        },
    ]
    accepted = evaluator.filter_sources(sources)
    assert len(accepted) == 1
    assert accepted[0]["url"] == "https://example.com/news"

