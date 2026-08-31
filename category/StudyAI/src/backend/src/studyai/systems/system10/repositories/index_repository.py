from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.systems.system10.models.index import (
    System10DuplicateGroup,
    System10FileIndex,
    System10ScanLog,
)


class IndexRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_scan_log(self, *, scan_targets: list[str], scan_mode: str) -> System10ScanLog:
        log = System10ScanLog(
            scan_targets=scan_targets,
            scan_mode=scan_mode,
            status="running",
        )
        self.session.add(log)
        await self.session.flush()
        await self.session.refresh(log)
        return log

    async def complete_scan_log(
        self,
        scan_log: System10ScanLog,
        *,
        total_files: int,
        new_files: int,
        updated_files: int,
        deleted_files: int,
        duplicates_found: int,
        duration_seconds: int,
    ) -> System10ScanLog:
        scan_log.total_files = total_files
        scan_log.new_files = new_files
        scan_log.updated_files = updated_files
        scan_log.deleted_files = deleted_files
        scan_log.duplicates_found = duplicates_found
        scan_log.duration_seconds = duration_seconds
        scan_log.status = "completed"
        await self.session.flush()
        await self.session.refresh(scan_log)
        return scan_log

    async def list_scan_logs(self) -> list[System10ScanLog]:
        result = await self.session.execute(
            select(System10ScanLog).order_by(System10ScanLog.executed_at.desc(), System10ScanLog.id.desc())
        )
        return list(result.scalars().all())

    async def get_file_by_path(self, full_path: str) -> System10FileIndex | None:
        result = await self.session.execute(
            select(System10FileIndex).where(System10FileIndex.full_path == full_path)
        )
        return result.scalar_one_or_none()

    async def list_files(self, *, path_prefix: str | None = None, latest_only: bool = False) -> list[System10FileIndex]:
        stmt = select(System10FileIndex).where(System10FileIndex.is_active.is_(True))
        if path_prefix:
            stmt = stmt.where(System10FileIndex.full_path.ilike(f"{path_prefix}%"))
        if latest_only:
            stmt = stmt.where(System10FileIndex.is_latest.is_(True))
        result = await self.session.execute(stmt.order_by(System10FileIndex.updated_at.desc(), System10FileIndex.id.desc()))
        return list(result.scalars().all())

    async def upsert_file(
        self,
        *,
        full_path: str,
        file_name: str,
        folder_path: str,
        file_hash: str,
        file_size: int,
        doc_type: str | None,
        summary: str | None,
        is_latest: bool,
        updated_at,
        embedding: list[float] | None,
    ) -> tuple[System10FileIndex, str]:
        existing = await self.get_file_by_path(full_path)
        if existing is None:
            file_index = System10FileIndex(
                full_path=full_path,
                file_name=file_name,
                folder_path=folder_path,
                file_hash=file_hash,
                file_size=file_size,
                doc_type=doc_type,
                summary=summary,
                is_latest=is_latest,
                updated_at=updated_at,
                embedding=embedding,
                is_active=True,
            )
            self.session.add(file_index)
            await self.session.flush()
            await self.session.refresh(file_index)
            return file_index, "new"

        state = "updated" if existing.file_hash != file_hash else "unchanged"
        existing.file_name = file_name
        existing.folder_path = folder_path
        existing.file_hash = file_hash
        existing.file_size = file_size
        existing.doc_type = doc_type
        existing.summary = summary
        existing.is_latest = is_latest
        existing.updated_at = updated_at
        existing.embedding = embedding
        existing.is_active = True
        await self.session.flush()
        await self.session.refresh(existing)
        return existing, state

    async def deactivate_missing_files(self, *, target_prefixes: list[str], seen_paths: set[str]) -> int:
        result = await self.session.execute(
            select(System10FileIndex).where(System10FileIndex.is_active.is_(True))
        )
        deleted_count = 0
        for file_index in result.scalars().all():
            if any(file_index.full_path.startswith(prefix) for prefix in target_prefixes) and file_index.full_path not in seen_paths:
                file_index.is_active = False
                deleted_count += 1
        await self.session.flush()
        return deleted_count

    async def replace_duplicate_groups(self, items: list[dict[str, object]]) -> None:
        await self.session.execute(delete(System10DuplicateGroup))
        for item in items:
            self.session.add(
                System10DuplicateGroup(
                    file_ids=item["file_ids"],
                    similarity_type=str(item["similarity_type"]),
                    similarity_score=float(item["similarity_score"]),
                    latest_file_id=item.get("latest_file_id"),
                )
            )
        await self.session.flush()

    async def list_duplicate_groups(self) -> list[System10DuplicateGroup]:
        result = await self.session.execute(
            select(System10DuplicateGroup).order_by(System10DuplicateGroup.similarity_score.desc(), System10DuplicateGroup.id.asc())
        )
        return list(result.scalars().all())
