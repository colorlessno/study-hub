from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ScanRequest(BaseModel):
    scan_targets: list[str]
    exclude_patterns: list[str] = Field(default_factory=list)
    scan_mode: str = "full"


class ScanResponse(BaseModel):
    scan_id: int
    status: str
    total_files: int
    new_files: int
    updated_files: int
    deleted_files: int
    duplicates_found: int
    scan_duration_seconds: int
    processing_notes: list[str] = Field(default_factory=list)


class SearchDuplicateHit(BaseModel):
    file_name: str
    full_path: str
    similarity: float


class SearchHit(BaseModel):
    file_id: int
    file_name: str
    full_path: str
    summary: str | None = None
    doc_type: str | None = None
    relevance_score: float
    updated_at: datetime | None = None
    file_size_kb: int | None = None
    is_latest: bool | None = None
    duplicates: list[SearchDuplicateHit] = Field(default_factory=list)


class SearchResponse(BaseModel):
    query: str
    total_hits: int
    results: list[SearchHit]
    processing_notes: list[str] = Field(default_factory=list)


class FolderMapNode(BaseModel):
    path: str
    description: str
    file_count: int
    size_mb: float | None = None
    children: list["FolderMapNode"] = Field(default_factory=list)


class FolderMapResponse(BaseModel):
    folder_tree: FolderMapNode
    issues: list[str] = Field(default_factory=list)


class ReportResponse(BaseModel):
    report_id: int
    generated_at: datetime
    overview: str
    document_map: dict[str, list[dict[str, str]]]
    recent_updates: list[dict[str, str]]
    duplicates: list[dict[str, object]]
    issues: list[str]
    markdown: str


class DuplicateFileItem(BaseModel):
    file_id: int
    file_name: str
    full_path: str
    is_latest: bool


class DuplicateGroupItem(BaseModel):
    file_ids: list[int]
    files: list[DuplicateFileItem] = Field(default_factory=list)
    similarity_type: str
    similarity_score: float
    latest_file_id: int | None = None


class DuplicateGroupResponse(BaseModel):
    items: list[DuplicateGroupItem]


class ScanLogItem(BaseModel):
    scan_id: int
    scan_targets: list[str]
    scan_mode: str
    total_files: int
    new_files: int
    updated_files: int
    deleted_files: int
    duplicates_found: int
    duration_seconds: int | None = None
    status: str
    executed_at: datetime


class ScanLogsResponse(BaseModel):
    items: list[ScanLogItem]
