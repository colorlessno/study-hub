from __future__ import annotations

import asyncio
import hashlib
import math
import os
import re
import time
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.ai.embedding_client import EmbeddingClient
from studyai.common.ai.llm_client import LLMClient
from studyai.common.audit.logger import get_audit_logger
from studyai.common.errors.models import ExternalServiceError, ValidationAppError
from studyai.systems.system10.prompts.file_summary_prompt import build_file_summary_prompt
from studyai.systems.system10.repositories.index_repository import IndexRepository
from studyai.systems.system10.schemas.indexing import (
    DuplicateGroupItem,
    DuplicateGroupResponse,
    DuplicateFileItem,
    FolderMapResponse,
    ReportResponse,
    ScanLogsResponse,
    ScanLogItem,
    ScanRequest,
    ScanResponse,
    SearchDuplicateHit,
    SearchHit,
    SearchResponse,
)
from studyai.systems.system10.services.duplicate_detector import DuplicateDetector
from studyai.systems.system10.services.mcp_filesystem_client import MCPFilesystemClient
from studyai.systems.system10.services.report_service import ReportService
from studyai.systems.system10.services.structure_map_builder import StructureMapBuilder
from studyai.systems.system10.services.text_extractor import TextExtractor


class IndexingService:
    AI_STEP_TIMEOUT_SECONDS = 8
    EMBEDDING_DIMENSIONS = 768

    def __init__(self) -> None:
        self.filesystem_client = MCPFilesystemClient()
        self.text_extractor = TextExtractor()
        self.embedding_client = EmbeddingClient()
        self.llm_client = LLMClient()
        self.duplicate_detector = DuplicateDetector()
        self.structure_map_builder = StructureMapBuilder()
        self.report_service = ReportService()
        self.audit_logger = get_audit_logger()

    async def scan(
        self,
        session: AsyncSession,
        *,
        body: ScanRequest,
        trace_id: str,
        user_id: str,
    ) -> ScanResponse:
        if body.scan_mode not in {"full", "diff", "incremental"}:
            raise ValidationAppError("invalid_scan_mode", "scan_mode は full / diff / incremental のみ指定できます。")

        started_at = time.perf_counter()
        repository = IndexRepository(session)
        scan_log = await repository.create_scan_log(scan_targets=body.scan_targets, scan_mode=body.scan_mode)
        files = self.filesystem_client.scan_files(body.scan_targets, body.exclude_patterns)
        seen_paths: set[str] = set()
        new_files = 0
        updated_files = 0
        summary_fallback_used = False
        embedding_fallback_used = False
        remote_summary_available = True
        remote_embedding_available = True

        for file_record in files:
            file_path = file_record.path
            full_path = str(file_path)
            seen_paths.add(full_path)
            file_bytes = file_record.content
            file_hash = hashlib.sha256(file_bytes).hexdigest()
            text = (
                self.text_extractor.extract_text(file_path.name, file_bytes)
                if file_path.suffix.lower() in self.filesystem_client.SUPPORTED_EXTENSIONS
                else ""
            )
            if remote_summary_available:
                try:
                    summary_payload = await asyncio.wait_for(
                        self._summarize_file(file_path.name, text),
                        timeout=self.AI_STEP_TIMEOUT_SECONDS,
                    )
                except (ExternalServiceError, TimeoutError, KeyError, TypeError, ValueError):
                    remote_summary_available = False
                    summary_fallback_used = True
                    summary_payload = self._fallback_summary(file_path.name, text)
            else:
                summary_fallback_used = True
                summary_payload = self._fallback_summary(file_path.name, text)

            embedding_text = text[:4000] or file_path.name
            if remote_embedding_available:
                try:
                    embedding = (
                        await asyncio.wait_for(
                            self.embedding_client.embed([embedding_text]),
                            timeout=self.AI_STEP_TIMEOUT_SECONDS,
                        )
                    )[0]
                    if len(embedding) != self.EMBEDDING_DIMENSIONS:
                        raise ValueError("unexpected embedding dimensions")
                except (ExternalServiceError, TimeoutError, KeyError, IndexError, TypeError, ValueError):
                    remote_embedding_available = False
                    embedding_fallback_used = True
                    embedding = self._local_embedding(embedding_text)
            else:
                embedding_fallback_used = True
                embedding = self._local_embedding(embedding_text)
            _, state = await repository.upsert_file(
                full_path=full_path,
                file_name=file_path.name,
                folder_path=str(file_path.parent),
                file_hash=file_hash,
                file_size=file_record.size,
                doc_type=summary_payload["doc_type"],
                summary=summary_payload["summary"],
                is_latest=bool(summary_payload["is_latest"]),
                updated_at=self._to_naive_datetime(file_record.modified_at),
                embedding=embedding,
            )
            if state == "new":
                new_files += 1
            elif state == "updated":
                updated_files += 1

        deleted_files = 0
        if body.scan_mode == "full":
            deleted_files = await repository.deactivate_missing_files(
                target_prefixes=body.scan_targets,
                seen_paths=seen_paths,
            )

        active_files = await repository.list_files()
        duplicate_groups = self.duplicate_detector.find_duplicates(active_files)
        await repository.replace_duplicate_groups(duplicate_groups)
        duration_seconds = int(time.perf_counter() - started_at)
        await repository.complete_scan_log(
            scan_log,
            total_files=len(files),
            new_files=new_files,
            updated_files=updated_files,
            deleted_files=deleted_files,
            duplicates_found=len(duplicate_groups),
            duration_seconds=duration_seconds,
        )
        await session.commit()

        self.audit_logger.log(
            action="system10.scan.completed",
            trace_id=trace_id,
            user_id=user_id,
            resource_type="system10_scan",
            resource_id=scan_log.id,
            details={"targets": body.scan_targets, "total_files": len(files)},
        )
        return ScanResponse(
            scan_id=scan_log.id,
            status=scan_log.status,
            total_files=scan_log.total_files,
            new_files=scan_log.new_files,
            updated_files=scan_log.updated_files,
            deleted_files=scan_log.deleted_files,
            duplicates_found=scan_log.duplicates_found,
            scan_duration_seconds=scan_log.duration_seconds or 0,
            processing_notes=self._scan_processing_notes(
                summary_fallback_used=summary_fallback_used,
                embedding_fallback_used=embedding_fallback_used,
            ),
        )

    async def search(
        self,
        session: AsyncSession,
        *,
        query: str,
        search_mode: str,
        path_prefix: str | None,
        latest_only: bool,
    ) -> SearchResponse:
        if not query.strip():
            raise ValidationAppError("search_query_empty", "検索クエリは必須です。")
        if search_mode not in {"keyword", "vector", "hybrid"}:
            raise ValidationAppError("invalid_search_mode", "search_mode は keyword / vector / hybrid のみ指定できます。")

        repository = IndexRepository(session)
        items = await repository.list_files(path_prefix=path_prefix, latest_only=latest_only)
        query_embedding: list[float] | None = None
        processing_notes: list[str] = []
        if search_mode in {"vector", "hybrid"}:
            try:
                query_embedding = (
                    await asyncio.wait_for(
                        self.embedding_client.embed([query]),
                        timeout=self.AI_STEP_TIMEOUT_SECONDS,
                    )
                )[0]
                if len(query_embedding) != self.EMBEDDING_DIMENSIONS:
                    raise ValueError("unexpected embedding dimensions")
                processing_notes.append("検索語の意味ベクトルに設定済み埋め込みモデルを使用しました。")
            except (ExternalServiceError, TimeoutError, KeyError, IndexError, TypeError, ValueError):
                query_embedding = self._local_embedding(query)
                processing_notes.append("埋め込みモデルを利用できなかったため、教材内のローカルベクトルで検索しました。")
        else:
            processing_notes.append("ファイル名、保存場所、種類、要約のキーワード一致で検索しました。")
        duplicates = await repository.list_duplicate_groups()
        duplicate_map = self._build_duplicate_map(duplicates, items)

        ranked: list[tuple[float, object]] = []
        for item in items:
            keyword_score = self._keyword_score(query, item)
            vector_score = self._vector_score(query_embedding, item.embedding) if query_embedding else 0.0
            if search_mode == "keyword":
                score = keyword_score
            elif search_mode == "vector":
                score = vector_score
            else:
                score = keyword_score * 0.4 + vector_score * 0.6
            ranked.append((score, item))
        ranked.sort(key=lambda pair: (pair[0], pair[1].updated_at or pair[1].scanned_at, pair[1].id), reverse=True)
        hits = [pair for pair in ranked if pair[0] > 0][:20]
        return SearchResponse(
            query=query,
            total_hits=len(hits),
            processing_notes=processing_notes,
            results=[
                SearchHit(
                    file_id=item.id,
                    file_name=item.file_name,
                    full_path=item.full_path,
                    summary=item.summary,
                    doc_type=item.doc_type,
                    relevance_score=round(score, 4),
                    updated_at=item.updated_at,
                    file_size_kb=int((item.file_size or 0) / 1024) if item.file_size is not None else None,
                    is_latest=item.is_latest,
                    duplicates=[
                        SearchDuplicateHit(
                            file_name=duplicate["file_name"],
                            full_path=duplicate["full_path"],
                            similarity=duplicate["similarity"],
                        )
                        for duplicate in duplicate_map.get(item.id, [])
                    ],
                )
                for score, item in hits
            ],
        )

    async def get_map(self, session: AsyncSession, *, folder: str | None) -> FolderMapResponse:
        root_path = folder or ""
        repository = IndexRepository(session)
        indexed_files = await repository.list_files(path_prefix=root_path or None)
        if not indexed_files:
            raise ValidationAppError("path_out_of_scope", "対象フォルダにインデックス済みファイルがありません。")
        duplicate_groups = await repository.list_duplicate_groups()
        root = folder or os.path.commonpath([item.folder_path or item.full_path for item in indexed_files])
        return self.structure_map_builder.build(
            root_path=root,
            indexed_files=indexed_files,
            duplicate_groups=duplicate_groups,
        )

    async def get_report(self, session: AsyncSession, *, folder: str | None) -> ReportResponse:
        repository = IndexRepository(session)
        indexed_files = await repository.list_files(path_prefix=folder or None)
        duplicate_groups = await repository.list_duplicate_groups()
        issues = [f"重複候補 {len(duplicate_groups)} 件"]
        return self.report_service.build_report(
            report_id=1,
            indexed_files=indexed_files,
            duplicate_groups=duplicate_groups,
            issues=issues,
        )

    async def get_duplicates(self, session: AsyncSession) -> DuplicateGroupResponse:
        repository = IndexRepository(session)
        groups = await repository.list_duplicate_groups()
        files_by_id = {item.id: item for item in await repository.list_files()}
        return DuplicateGroupResponse(
            items=[
                DuplicateGroupItem(
                    file_ids=item.file_ids,
                    files=[
                        DuplicateFileItem(
                            file_id=file_id,
                            file_name=files_by_id[file_id].file_name,
                            full_path=files_by_id[file_id].full_path,
                            is_latest=file_id == item.latest_file_id,
                        )
                        for file_id in item.file_ids
                        if file_id in files_by_id
                    ],
                    similarity_type=item.similarity_type,
                    similarity_score=float(item.similarity_score),
                    latest_file_id=item.latest_file_id,
                )
                for item in groups
            ]
        )

    async def get_scan_logs(self, session: AsyncSession) -> ScanLogsResponse:
        logs = await IndexRepository(session).list_scan_logs()
        return ScanLogsResponse(
            items=[
                ScanLogItem(
                    scan_id=log.id,
                    scan_targets=log.scan_targets,
                    scan_mode=log.scan_mode,
                    total_files=log.total_files,
                    new_files=log.new_files,
                    updated_files=log.updated_files,
                    deleted_files=log.deleted_files,
                    duplicates_found=log.duplicates_found,
                    duration_seconds=log.duration_seconds,
                    status=log.status,
                    executed_at=log.executed_at,
                )
                for log in logs
            ]
        )

    async def _summarize_file(self, file_name: str, text: str) -> dict[str, object]:
        system_prompt, user_prompt = build_file_summary_prompt(file_name, text)
        raw = await self.llm_client.extract_json(system_prompt, user_prompt)
        return {
            "doc_type": str(raw.get("doc_type", "その他")).strip() or "その他",
            "summary": str(raw.get("summary", "")).strip()[:240],
            "is_latest": bool(raw.get("is_latest", True)),
        }

    @classmethod
    def _fallback_summary(cls, file_name: str, text: str) -> dict[str, object]:
        lower_name = file_name.lower()
        suffix = Path(file_name).suffix.lower()
        if "requirement" in lower_name or "要件" in file_name:
            doc_type = "要件定義"
        elif "design" in lower_name or "設計" in file_name:
            doc_type = "設計書"
        elif "meeting" in lower_name or "議事" in file_name:
            doc_type = "議事録"
        elif suffix in {".py", ".js", ".ts", ".java", ".sql", ".sh"}:
            doc_type = "ソースコード"
        elif suffix in {".yaml", ".yml", ".json", ".xml"}:
            doc_type = "設定ファイル"
        else:
            doc_type = "その他"

        normalized = re.sub(r"\s+", " ", text).strip()
        summary = normalized[:120] if normalized else f"{file_name} の内容"
        is_latest = not any(marker in lower_name for marker in ("old", "backup", "copy", "archive"))
        return {"doc_type": doc_type, "summary": summary, "is_latest": is_latest}

    @classmethod
    def _local_embedding(cls, text: str) -> list[float]:
        tokens = re.findall(r"[A-Za-z0-9_]+|[ぁ-んァ-ン一-龥]+", text.lower())
        expanded: list[str] = []
        for token in tokens:
            expanded.append(token)
            if re.fullmatch(r"[ぁ-んァ-ン一-龥]{3,}", token):
                expanded.extend(token[index : index + 2] for index in range(len(token) - 1))

        vector = [0.0] * cls.EMBEDDING_DIMENSIONS
        for token in expanded:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "big") % cls.EMBEDDING_DIMENSIONS
            vector[index] += 1.0
        length = math.sqrt(sum(value * value for value in vector))
        return [value / length for value in vector] if length else vector

    @staticmethod
    def _scan_processing_notes(*, summary_fallback_used: bool, embedding_fallback_used: bool) -> list[str]:
        notes = [
            "ファイル分類と要約には教材内のローカル規則を使用しました。"
            if summary_fallback_used
            else "ファイル分類と要約に設定済みLLMを使用しました。",
            "意味検索用の索引には教材内のローカルベクトルを使用しました。"
            if embedding_fallback_used
            else "意味検索用の索引に設定済み埋め込みモデルを使用しました。",
        ]
        return notes

    @staticmethod
    def _to_naive_datetime(timestamp: float):
        from datetime import datetime

        return datetime.fromtimestamp(timestamp)

    @staticmethod
    def _keyword_score(query: str, item) -> float:
        query_tokens = {token.lower() for token in query.split() if token.strip()}
        if not query_tokens:
            query_tokens = {query.lower()}
        text = " ".join(
            filter(
                None,
                [
                    item.file_name,
                    item.full_path,
                    item.doc_type or "",
                    item.summary or "",
                ],
            )
        ).lower()
        if not text:
            return 0.0
        matched = sum(1 for token in query_tokens if token in text)
        return matched / len(query_tokens)

    @staticmethod
    def _vector_score(query_embedding: list[float], target_embedding: list[float] | None) -> float:
        if not query_embedding or not target_embedding or len(query_embedding) != len(target_embedding):
            return 0.0
        numerator = sum(a * b for a, b in zip(query_embedding, target_embedding, strict=True))
        left_norm = math.sqrt(sum(a * a for a in query_embedding))
        right_norm = math.sqrt(sum(b * b for b in target_embedding))
        if left_norm == 0 or right_norm == 0:
            return 0.0
        return max(0.0, numerator / (left_norm * right_norm))

    @staticmethod
    def _build_duplicate_map(groups: list, indexed_files: list) -> dict[int, list[dict[str, object]]]:
        files_by_id = {item.id: item for item in indexed_files}
        mapping: dict[int, list[dict[str, object]]] = {}
        for group in groups:
            for file_id in group.file_ids:
                others = [item for item in group.file_ids if item != file_id]
                for other in others:
                    other_file = files_by_id.get(other)
                    if other_file is None:
                        continue
                    mapping.setdefault(file_id, []).append(
                        {
                            "file_name": other_file.file_name,
                            "full_path": other_file.full_path,
                            "similarity": float(group.similarity_score),
                        }
                    )
        return mapping
