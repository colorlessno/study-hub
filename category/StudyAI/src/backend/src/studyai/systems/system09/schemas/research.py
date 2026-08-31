from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field


class OwnCompanyInfo(BaseModel):
    name: str
    strengths: str | None = None


class ResearchRequest(BaseModel):
    research_type: str
    targets: list[str] = Field(default_factory=list)
    purpose: str | None = None
    own_company: OwnCompanyInfo | None = None
    depth: str = "standard"
    focus_areas: list[str] = Field(default_factory=list)


class CompanyReport(BaseModel):
    name: str
    overview: str | None = None
    products: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    recent_news: list[str] = Field(default_factory=list)
    sources: list[str] = Field(default_factory=list)


class ComparisonTable(BaseModel):
    headers: list[str] = Field(default_factory=list)
    rows: list[list[str]] = Field(default_factory=list)


class SWOTReport(BaseModel):
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    opportunities: list[str] = Field(default_factory=list)
    threats: list[str] = Field(default_factory=list)


class ResearchResponse(BaseModel):
    report_id: int
    research_type: str
    targets: list[str]
    executed_at: datetime
    search_count: int
    executive_summary: str
    key_findings: list[str]
    companies: list[CompanyReport]
    comparison_table: ComparisonTable
    swot: SWOTReport
    trends: str
    limitations: str
    markdown: str
    purpose: str | None = None
    own_company: OwnCompanyInfo | None = None
    depth: str
    focus_areas: list[str]


class ReportListItem(BaseModel):
    report_id: int
    research_type: str
    theme: str
    targets: list[str]
    created_at: datetime


class ReportListResponse(BaseModel):
    total: int
    items: list[ReportListItem]


class ReportDetailResponse(ResearchResponse):
    pass


class ReportExportResponse(BaseModel):
    report_id: int
    format: str
    content: str


class SearchResultItem(BaseModel):
    title: str
    url: str
    snippet: str
    source_type: str
    published_at: str | None = None


class ReportFilterParams(BaseModel):
    research_type: str | None = None
    target: str | None = None
    from_date: date | None = None
    to_date: date | None = None
