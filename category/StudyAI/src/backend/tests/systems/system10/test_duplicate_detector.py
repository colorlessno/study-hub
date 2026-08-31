from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

from studyai.systems.system10.services.duplicate_detector import DuplicateDetector


def test_find_duplicates_detects_exact_hash_match() -> None:
    detector = DuplicateDetector()
    items = [
        SimpleNamespace(id=1, file_name="a.txt", file_hash="hash1", updated_at=datetime(2026, 1, 1), scanned_at=datetime(2026, 1, 1)),
        SimpleNamespace(id=2, file_name="b.txt", file_hash="hash1", updated_at=datetime(2026, 1, 2), scanned_at=datetime(2026, 1, 2)),
    ]
    results = detector.find_duplicates(items)
    assert len(results) == 1
    assert results[0]["similarity_type"] == "exact"
    assert results[0]["latest_file_id"] == 2
