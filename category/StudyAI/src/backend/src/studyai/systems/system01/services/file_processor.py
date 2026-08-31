from __future__ import annotations

import base64
import hashlib
from io import BytesIO

from fastapi import UploadFile

from studyai.common.config.settings import get_settings
from studyai.common.errors.models import AppError


class FileProcessor:
    ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}

    def __init__(self) -> None:
        self.settings = get_settings()

    async def read_upload(self, upload_file: UploadFile) -> bytes:
        file_bytes = await upload_file.read()
        if len(file_bytes) > self.settings.max_upload_size_mb * 1024 * 1024:
            raise AppError("file_too_large", "ファイルサイズが上限を超えています。", 413)
        return file_bytes

    def validate_file_name(self, file_name: str) -> None:
        suffix = ""
        if "." in file_name:
            suffix = file_name[file_name.rfind(".") :].lower()
        if suffix not in self.ALLOWED_EXTENSIONS:
            raise AppError("unsupported_file_type", "非対応のファイル形式です。", 400)

    def compute_hash(self, file_bytes: bytes) -> str:
        return hashlib.sha256(file_bytes).hexdigest()

    def detect_input_type(self, file_name: str, file_bytes: bytes) -> tuple[str, str | None]:
        lower_name = file_name.lower()
        if lower_name.endswith(".pdf"):
            text = self.extract_text_pdf(file_bytes)
            if len(text.strip()) >= self.settings.text_pdf_threshold:
                return "pdf_text", text
            return "pdf_scan", None
        return "image", None

    def extract_text_pdf(self, file_bytes: bytes) -> str:
        import fitz

        with fitz.open(stream=file_bytes, filetype="pdf") as document:
            texts = [page.get_text("text") for page in document]
        return "\n".join(texts)

    def prepare_vlm_images(self, file_name: str, file_bytes: bytes) -> list[str]:
        if file_name.lower().endswith(".pdf"):
            return self._render_pdf_images(file_bytes)
        return [self._encode_image(file_bytes)]

    def _render_pdf_images(self, file_bytes: bytes) -> list[str]:
        import fitz

        images: list[str] = []
        with fitz.open(stream=file_bytes, filetype="pdf") as document:
            limit = min(len(document), 10)
            for index in range(limit):
                page = document[index]
                pix = page.get_pixmap(dpi=150)
                images.append(self._encode_image(pix.tobytes("png")))
        return images

    def _encode_image(self, raw_bytes: bytes) -> str:
        from PIL import Image

        image = Image.open(BytesIO(raw_bytes))
        buffer = BytesIO()
        image.convert("RGB").save(buffer, format="PNG")
        return f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode('ascii')}"
