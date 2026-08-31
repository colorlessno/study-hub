from __future__ import annotations

import re


class ChunkService:
    CLAUSE_PATTERN = re.compile(r"(第[0-9０-９一二三四五六七八九十百千]+条[^\n]*)")

    def split_by_clause(self, text: str) -> list[dict]:
        matches = list(self.CLAUSE_PATTERN.finditer(text))
        if not matches:
            return self._split_by_length(text)
        chunks = []
        for index, match in enumerate(matches):
            start = match.start()
            end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
            title = match.group(1).strip()
            body = text[start:end].strip()
            chunks.append(
                {
                    "chunk_no": index + 1,
                    "article": title.split("\n", 1)[0].strip(),
                    "title": title,
                    "chunk_text": body,
                }
            )
        return chunks

    def align_for_compare(self, text_a: str, text_b: str) -> list[dict]:
        chunks_a = {chunk["article"] or f"chunk_{chunk['chunk_no']}": chunk for chunk in self.split_by_clause(text_a)}
        chunks_b = {chunk["article"] or f"chunk_{chunk['chunk_no']}": chunk for chunk in self.split_by_clause(text_b)}
        keys = sorted(set(chunks_a) | set(chunks_b))
        aligned = []
        for key in keys:
            aligned.append(
                {
                    "article": key,
                    "chunk_a": chunks_a.get(key),
                    "chunk_b": chunks_b.get(key),
                }
            )
        return aligned

    @staticmethod
    def _split_by_length(text: str, chunk_size: int = 3000) -> list[dict]:
        chunks = []
        for index, start in enumerate(range(0, len(text), chunk_size), start=1):
            body = text[start : start + chunk_size].strip()
            if not body:
                continue
            chunks.append(
                {
                    "chunk_no": index,
                    "article": f"chunk_{index}",
                    "title": None,
                    "chunk_text": body,
                }
            )
        return chunks
