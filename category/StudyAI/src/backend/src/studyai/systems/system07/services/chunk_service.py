from __future__ import annotations

import re


class ChunkService:
    HEADING_PATTERN = re.compile(r"^(#{1,6}\s+.+|第[0-9一二三四五六七八九十百千]+[章節項].+|[0-9]+[.)]\s+.+)$")

    def __init__(self, *, max_chars: int = 1200, overlap_chars: int = 150) -> None:
        self.max_chars = max_chars
        self.overlap_chars = overlap_chars

    def make_chunks(self, text: str) -> list[dict[str, object]]:
        sections = self._split_sections(text)
        chunks: list[dict[str, object]] = []
        chunk_no = 1
        for section_name, section_text in sections:
            for chunk_text in self._split_large_text(section_text):
                chunks.append(
                    {
                        "chunk_no": chunk_no,
                        "section": section_name,
                        "chunk_text": chunk_text,
                    }
                )
                chunk_no += 1
        return chunks

    def _split_sections(self, text: str) -> list[tuple[str | None, str]]:
        lines = [line.strip() for line in text.splitlines()]
        current_title: str | None = None
        buffer: list[str] = []
        sections: list[tuple[str | None, str]] = []
        for line in lines:
            if not line:
                continue
            if self.HEADING_PATTERN.match(line):
                if buffer:
                    sections.append((current_title, "\n".join(buffer).strip()))
                    buffer = []
                current_title = line
                continue
            buffer.append(line)
        if buffer:
            sections.append((current_title, "\n".join(buffer).strip()))
        if not sections and text.strip():
            return [(None, text.strip())]
        return sections

    def _split_large_text(self, text: str) -> list[str]:
        if len(text) <= self.max_chars:
            return [text]
        chunks: list[str] = []
        start = 0
        while start < len(text):
            end = min(start + self.max_chars, len(text))
            if end < len(text):
                split_at = text.rfind("\n", start, end)
                if split_at <= start:
                    split_at = text.rfind("。", start, end)
                if split_at > start:
                    end = split_at + 1
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            if end >= len(text):
                break
            start = max(end - self.overlap_chars, start + 1)
        return chunks
