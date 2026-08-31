from __future__ import annotations

from collections import defaultdict
from difflib import SequenceMatcher
from pathlib import Path


class DuplicateDetector:
    def find_duplicates(self, indexed_files: list) -> list[dict[str, object]]:
        groups: list[dict[str, object]] = []
        by_hash: dict[str, list] = defaultdict(list)
        for item in indexed_files:
            if item.file_hash:
                by_hash[item.file_hash].append(item)
        for items in by_hash.values():
            if len(items) > 1:
                latest = max(items, key=lambda row: row.updated_at or row.scanned_at)
                groups.append(
                    {
                        "file_ids": [item.id for item in items],
                        "similarity_type": "exact",
                        "similarity_score": 1.0,
                        "latest_file_id": latest.id,
                    }
                )

        seen_pairs: set[tuple[int, int]] = set()
        for index, left in enumerate(indexed_files):
            left_stem = Path(left.file_name).stem.lower()
            for right in indexed_files[index + 1 :]:
                if left.file_hash and right.file_hash and left.file_hash == right.file_hash:
                    continue
                pair = tuple(sorted((left.id, right.id)))
                if pair in seen_pairs:
                    continue
                score = SequenceMatcher(None, left_stem, Path(right.file_name).stem.lower()).ratio()
                if score >= 0.9:
                    latest = max((left, right), key=lambda row: row.updated_at or row.scanned_at)
                    groups.append(
                        {
                            "file_ids": [left.id, right.id],
                            "similarity_type": "similar",
                            "similarity_score": round(score, 2),
                            "latest_file_id": latest.id,
                        }
                    )
                    seen_pairs.add(pair)
        return groups
