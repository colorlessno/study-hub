from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


# ---------- scan ----------

class ScanRequest(BaseModel):
    watch_folders: list[str] = Field(..., min_length=1)
    output_folder: str
    exclude_patterns: list[str] = Field(default_factory=list)
    mode: Literal["preview"] = "preview"


class ActionItem(BaseModel):
    action_id: str
    action_type: str
    source_path: str
    dest_path: str | None = None
    new_name: str | None = None
    reason: str
    confidence: float


class ScanSummary(BaseModel):
    total_actions: int
    moves: int
    renames: int
    archives: int
    skips: int
    duplicates_found: int


class ScanResponse(BaseModel):
    plan_id: str
    scanned_files: int
    actions: list[ActionItem]
    summary: ScanSummary
    planning_method: Literal["llm", "local_rules"]


class SampleWorkspaceResponse(BaseModel):
    watch_folder: str
    output_folder: str
    files: list[str]


# ---------- execute ----------

class ApprovedAction(BaseModel):
    action_id: str
    target_path: str | None = None


class ExecuteRequest(BaseModel):
    plan_id: str
    approved_action_ids: list[str] = Field(..., min_length=1)
    approval_mode: str = "selective"


class ExecutionItemResult(BaseModel):
    action_id: str
    status: str
    error_code: str | None = None
    executed_at: datetime | None = None


class ExecuteResponse(BaseModel):
    execution_id: str
    plan_id: str
    result: str
    success_count: int
    failed_count: int
    item_results: list[ExecutionItemResult]
    rollback_available: bool


# ---------- rollback ----------

class RollbackResponse(BaseModel):
    execution_id: str
    rollback_result: str
    reverted_count: int
    failed_count: int


# ---------- executions ----------

class ExecutionListItem(BaseModel):
    execution_id: str
    plan_id: str
    result: str
    success_count: int
    failed_count: int
    executed_at: datetime
    rollback_available: bool
    rolled_back: bool


class ExecutionListResponse(BaseModel):
    total: int
    items: list[ExecutionListItem]


# ---------- report ----------

class ExecutionItemReport(BaseModel):
    action_type: str
    source_path: str
    target_path: str | None
    status: str
    error_code: str | None
    rollbackable: bool


class ExecutionReportResponse(BaseModel):
    execution_id: str
    plan_id: str
    result: str
    success_count: int
    failed_count: int
    executed_at: datetime
    items: list[ExecutionItemReport]


# ---------- settings ----------

class SettingsRequest(BaseModel):
    watch_folders: list[str] = Field(default_factory=list)
    output_folder: str | None = None
    exclude_patterns: list[str] = Field(default_factory=list)
    mode: Literal["preview"] = "preview"
    schedule: Literal["manual"] | None = "manual"


class SettingsResponse(BaseModel):
    id: int
    watch_folders: list[str]
    output_folder: str | None
    exclude_patterns: list[str]
    mode: str
    schedule: str | None
    updated_at: datetime
