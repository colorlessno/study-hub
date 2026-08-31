from __future__ import annotations

import re


class ChunkService:
    HEADING_PATTERN = re.compile(r"^(#{1,6}\s+.+|第[0-9一二三四五六七八九十]+[章節項].+|[0-9]+[.)]\s+.+)$")

    def __init__(self, *, max_chars: int = 1000, overlap_chars: int = 100) -> None:
        self.max_chars = max_chars
        self.overlap_chars = overlap_chars

    def make_chunks(self, text: str) -> list[dict[str, object]]:
        sections = self.split_sections(text)
        chunks: list[dict[str, object]] = []
        chunk_no = 1
        for section_title, section_text in sections:
            section_chunks = self._split_section_text(section_text)
            for chunk_text in section_chunks:
                chunks.append(
                    {
                        "chunk_no": chunk_no,
                        "section_title": section_title,
                        "chunk_text": chunk_text,
                    }
                )
                chunk_no += 1
        return chunks

    def split_sections(self, text: str) -> list[tuple[str | None, str]]:
        lines = [line.strip() for line in text.splitlines()]
        sections: list[tuple[str | None, str]] = []
        current_title: str | None = None
        buffer: list[str] = []

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

    def _split_section_text(self, section_text: str) -> list[str]:
        if len(section_text) <= self.max_chars:
            return [section_text]

        chunks: list[str] = []
        start = 0
        while start < len(section_text):
            end = min(start + self.max_chars, len(section_text))
            if end < len(section_text):
                split_at = section_text.rfind("\n", start, end)
                if split_at <= start:
                    split_at = section_text.rfind("。", start, end)
                if split_at > start:
                    end = split_at + 1
            chunk = section_text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            if end >= len(section_text):
                break
            start = max(end - self.overlap_chars, start + 1)
        return chunks
