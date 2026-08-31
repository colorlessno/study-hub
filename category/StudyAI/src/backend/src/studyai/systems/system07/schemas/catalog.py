from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class AutoTagResult(BaseModel):
    category: str
    sub_category: str
    document_type: str
    importance: str
    tags: list[str]
    summary: str


class DocumentUploadResponse(BaseModel):
    document_id: int
    file_name: str
    auto_tags: AutoTagResult


class BulkDocumentUploadResponse(BaseModel):
    items: list[DocumentUploadResponse]


class DocumentListItemResponse(BaseModel):
    document_id: int
    file_name: str
    category: str | None = None
    sub_category: str | None = None
    document_type: str | None = None
    importance: str | None = None
    summary: str | None = None
    registered_by: str
    created_at: datetime
    updated_at: datetime
    tags: list[str] = Field(default_factory=list)


class DocumentListResponse(BaseModel):
    total: int
    items: list[DocumentListItemResponse]


class DocumentDetailResponse(DocumentListItemResponse):
    file_size: int | None = None
    access_roles: list[str] = Field(default_factory=list)
    view_count: int = 0


class SimilarDocumentItem(BaseModel):
    document_id: int
    file_name: str
    similarity_score: float
    summary: str | None = None
    tags: list[str] = Field(default_factory=list)
    registered_at: datetime
    registered_by: str


class SimilarDocumentsResponse(BaseModel):
    document_id: int
    similar_documents: list[SimilarDocumentItem]


class UpdateTagsRequest(BaseModel):
    tags: list[str]
    category: str | None = None
    sub_category: str | None = None
    importance: str | None = None


class UpdateTagsResponse(BaseModel):
    document_id: int
    tags: list[str]
    category: str | None = None
    sub_category: str | None = None
    importance: str | None = None


class TagItem(BaseModel):
    name: str
    synonyms: list[str] = Field(default_factory=list)
    use_count: int = 0


class TagListResponse(BaseModel):
    items: list[TagItem]


class TagMergeRequest(BaseModel):
    source_tags: list[str]
    target_tag: str


class TagMergeResponse(BaseModel):
    merged_count: int
    target_tag: str


class AccessStatsDocument(BaseModel):
    document_id: int
    file_name: str
    access_count: int


class AccessStatsResponse(BaseModel):
    items: list[AccessStatsDocument]


class UnusedDocumentItem(BaseModel):
    document_id: int
    file_name: str
    last_accessed_at: datetime | None = None


class UnusedDocumentsResponse(BaseModel):
    items: list[UnusedDocumentItem]
