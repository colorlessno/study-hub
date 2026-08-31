from __future__ import annotations

from io import BytesIO
from pathlib import Path
from xml.etree import ElementTree
from zipfile import ZipFile

from studyai.common.errors.models import ValidationAppError


class TextExtractor:
    SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}

    def validate_requirement_file(self, file_name: str | None) -> str:
        if not file_name:
            raise ValidationAppError("invalid_requirement_file", "A requirement file name is required.")
        suffix = Path(file_name).suffix.lower()
        if suffix not in self.SUPPORTED_EXTENSIONS:
            raise ValidationAppError("invalid_requirement_file", "Unsupported requirement file type.")
        return suffix

    def extract_requirement_text(self, file_name: str, file_bytes: bytes) -> str:
        suffix = self.validate_requirement_file(file_name)
        if suffix == ".pdf":
            return self._extract_pdf(file_bytes)
        if suffix == ".docx":
            return self._extract_docx(file_bytes)
        return self._decode_text(file_bytes)

    def _extract_pdf(self, file_bytes: bytes) -> str:
        try:
            import fitz
        except ImportError as exc:
            raise ValidationAppError("pdf_support_missing", "PDF support library is not installed.") from exc

        document = fitz.open(stream=file_bytes, filetype="pdf")
        try:
            texts = [page.get_text("text") for page in document]
        finally:
            document.close()
        return self._normalize_text("\n".join(texts))

    def _extract_docx(self, file_bytes: bytes) -> str:
        with ZipFile(BytesIO(file_bytes)) as archive:
            try:
                xml_bytes = archive.read("word/document.xml")
            except KeyError as exc:
                raise ValidationAppError("invalid_requirement_file", "The DOCX file could not be parsed.") from exc
        root = ElementTree.fromstring(xml_bytes)
        namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
        texts = [node.text for node in root.findall(".//w:t", namespace) if node.text]
        return self._normalize_text("\n".join(texts))

    def _decode_text(self, file_bytes: bytes) -> str:
        for encoding in ("utf-8-sig", "utf-8", "cp932"):
            try:
                return self._normalize_text(file_bytes.decode(encoding))
            except UnicodeDecodeError:
                continue
        raise ValidationAppError("invalid_requirement_encoding", "The requirement file encoding is not supported.")

    @staticmethod
    def _normalize_text(text: str) -> str:
        return "\n".join(line.rstrip() for line in text.replace("\r\n", "\n").replace("\r", "\n").split("\n")).strip()
