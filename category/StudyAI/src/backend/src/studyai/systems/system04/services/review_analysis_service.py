from __future__ import annotations

from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.audit.logger import get_audit_logger
from studyai.systems.system04.repositories.analysis_repository import AnalysisRepository
from studyai.systems.system04.schemas.analysis import (
    AnalysisDetailResponse,
    AnalysisListItem,
    AnalysisListResponse,
    AnalyzeRequest,
    AnalyzeResponse,
    CompareRequest,
    CompareResponse,
    CompareProductSummaryResponse,
    CompareDiffPointResponse,
    ImprovementItemResponse,
    IndividualResultResponse,
    InsightsResponse,
    RepresentativeReviewsResponse,
    SentimentSummaryResponse,
    TopicSummaryResponse,
)
from studyai.systems.system04.services.compare_analyzer import CompareAnalyzer
from studyai.systems.system04.services.input_normalizer import InputNormalizer
from studyai.systems.system04.services.insight_generator import InsightGenerator
from studyai.systems.system04.services.sentiment_analyzer import SentimentAnalyzer
from studyai.systems.system04.services.topic_extractor import TopicExtractor


class ReviewAnalysisService:
    def __init__(self) -> None:
        self.input_normalizer = InputNormalizer()
        self.sentiment_analyzer = SentimentAnalyzer()
        self.topic_extractor = TopicExtractor()
        self.insight_generator = InsightGenerator()
        self.compare_analyzer = CompareAnalyzer()
        self.audit_logger = get_audit_logger()

    async def analyze(
        self,
        session: AsyncSession,
        *,
        body: AnalyzeRequest,
        trace_id: str,
        user_id: str | None,
    ) -> AnalyzeResponse:
        normalized_reviews = self.input_normalizer.normalize_reviews(
            product_name=body.product_name,
            reviews=body.reviews,
        )
        analyzed = self._analyze_reviews(normalized_reviews)
        topics = self.topic_extractor.summarize_topics(analyzed)
        insights = self.insight_generator.generate_insight(
            product_name=body.product_name,
            analyzed_reviews=analyzed,
            topics=topics,
        )
        sentiment_summary = self._aggregate_sentiment_summary(analyzed)
        repository = AnalysisRepository(session)
        analysis = await repository.create_analysis(
            product_name=body.product_name,
            total_reviews=len(analyzed),
            sentiment_summary=sentiment_summary,
            topics=topics,
            insights=insights,
        )
        await repository.create_review_results(analysis.id, analyzed)
        await session.commit()
        self.audit_logger.log(
            action="system04.analyze",
            trace_id=trace_id,
            user_id=user_id,
            resource_type="system04_analysis",
            resource_id=analysis.id,
            details={"product_name": body.product_name, "total_reviews": len(analyzed)},
        )
        saved = await repository.get_analysis(analysis.id)
        return self._to_analyze_response(saved)

    async def analyze_file(
        self,
        session: AsyncSession,
        *,
        file_name: str,
        file_bytes: bytes,
        product_name: str | None,
        trace_id: str,
        user_id: str | None,
    ) -> AnalyzeResponse:
        resolved_product_name, reviews = self.input_normalizer.parse_file(
            file_name=file_name,
            content=file_bytes,
            product_name=product_name,
        )
        body = AnalyzeRequest(
            product_name=resolved_product_name,
            reviews=reviews,
        )
        return await self.analyze(
            session,
            body=body,
            trace_id=trace_id,
            user_id=user_id,
        )

    async def compare(
        self,
        session: AsyncSession,
        *,
        body: CompareRequest,
        trace_id: str,
        user_id: str | None,
    ) -> CompareResponse:
        repository = AnalysisRepository(session)
        product_summaries = []
        all_reviews: list[dict] = []
        for product in body.products:
            normalized = self.input_normalizer.normalize_reviews(
                product_name=product.product_name,
                reviews=product.reviews,
            )
            analyzed = self._analyze_reviews(normalized)
            topics = self.topic_extractor.summarize_topics(analyzed)
            insights = self.insight_generator.generate_insight(
                product_name=product.product_name,
                analyzed_reviews=analyzed,
                topics=topics,
            )
            sentiment_summary = self._aggregate_sentiment_summary(analyzed)
            strengths = [topic["topic"] for topic in topics if topic["positive_count"] > topic["negative_count"]][:3]
            weaknesses = [topic["topic"] for topic in topics if topic["negative_count"] >= topic["positive_count"]][:3]
            product_summaries.append(
                {
                    "product_name": product.product_name,
                    "total_reviews": len(analyzed),
                    "sentiment_summary": sentiment_summary,
                    "topics": topics,
                    "insights": insights,
                    "strengths": strengths,
                    "weaknesses": weaknesses,
                }
            )
            all_reviews.extend(analyzed)

        comparison_payload = self.compare_analyzer.compare_products(product_summaries=product_summaries)
        analysis = await repository.create_analysis(
            product_name=" / ".join(product.product_name for product in body.products),
            total_reviews=sum(item["total_reviews"] for item in product_summaries),
            sentiment_summary=self._aggregate_compare_sentiment(product_summaries),
            topics=[],
            insights={"comparison": comparison_payload["diff_points"]},
            compare_flag=True,
            comparison_payload=comparison_payload,
        )
        await repository.create_review_results(analysis.id, all_reviews)
        await session.commit()
        self.audit_logger.log(
            action="system04.compare",
            trace_id=trace_id,
            user_id=user_id,
            resource_type="system04_analysis",
            resource_id=analysis.id,
            details={"products": [product.product_name for product in body.products]},
        )
        saved = await repository.get_analysis(analysis.id)
        return CompareResponse(
            comparison_id=saved.id,
            products=[
                CompareProductSummaryResponse(
                    product_name=item["product_name"],
                    total_reviews=item["total_reviews"],
                    sentiment_summary=SentimentSummaryResponse(**item["sentiment_summary"]),
                    strengths=item["strengths"],
                    weaknesses=item["weaknesses"],
                )
                for item in comparison_payload["products"]
            ],
            diff_points=[
                CompareDiffPointResponse(**item)
                for item in comparison_payload["diff_points"]
            ],
            recommendations=[
                ImprovementItemResponse(**item)
                for item in comparison_payload["recommendations"]
            ],
            created_at=saved.created_at,
        )

    async def list_analyses(
        self,
        session: AsyncSession,
        *,
        product_name: str | None,
        from_date: str | None,
        to_date: str | None,
    ) -> AnalysisListResponse:
        repository = AnalysisRepository(session)
        rows = await repository.list_analyses(
            product_name=product_name,
            from_date=self._parse_optional_date(from_date),
            to_date=self._parse_optional_date(to_date),
        )
        return AnalysisListResponse(
            total=len(rows),
            items=[
                AnalysisListItem(
                    analysis_id=row.id,
                    product_name=row.product_name,
                    total_reviews=row.total_reviews,
                    compare_flag=row.compare_flag,
                    created_at=row.created_at,
                )
                for row in rows
            ],
        )

    async def get_analysis(self, session: AsyncSession, *, analysis_id: int) -> AnalysisDetailResponse:
        analysis = await AnalysisRepository(session).get_analysis(analysis_id)
        base = self._to_analyze_response(analysis)
        return AnalysisDetailResponse(
            **base.model_dump(),
            compare_flag=analysis.compare_flag,
            comparison_payload=analysis.comparison_payload,
        )

    def _analyze_reviews(self, reviews: list[dict]) -> list[dict]:
        analyzed: list[dict] = []
        for review in reviews:
            sentiment = self.sentiment_analyzer.classify_sentiment(
                text=review["text"],
                score=review.get("review_score"),
            )
            topics = self.topic_extractor.extract_topics(review["text"])
            analyzed.append(
                {
                    **review,
                    **sentiment,
                    "topics": topics,
                }
            )
        return analyzed

    @staticmethod
    def _aggregate_sentiment_summary(analyzed_reviews: list[dict]) -> dict:
        total = len(analyzed_reviews)
        average_score = 0.0
        if total:
            average_score = round(sum(item["sentiment_score"] for item in analyzed_reviews) / total, 2)
        return {
            "positive": sum(1 for item in analyzed_reviews if item["sentiment"] == "positive"),
            "negative": sum(1 for item in analyzed_reviews if item["sentiment"] == "negative"),
            "neutral": sum(1 for item in analyzed_reviews if item["sentiment"] == "neutral"),
            "average_score": average_score,
        }

    @staticmethod
    def _aggregate_compare_sentiment(product_summaries: list[dict]) -> dict:
        if not product_summaries:
            return {"positive": 0, "negative": 0, "neutral": 0, "average_score": 0.0}
        return {
            "positive": sum(item["sentiment_summary"]["positive"] for item in product_summaries),
            "negative": sum(item["sentiment_summary"]["negative"] for item in product_summaries),
            "neutral": sum(item["sentiment_summary"]["neutral"] for item in product_summaries),
            "average_score": round(
                sum(item["sentiment_summary"]["average_score"] for item in product_summaries) / len(product_summaries),
                2,
            ),
        }

    def _to_analyze_response(self, analysis) -> AnalyzeResponse:
        insights = analysis.insights
        representative_reviews = insights.get("representative_reviews", {})
        return AnalyzeResponse(
            analysis_id=analysis.id,
            product_name=analysis.product_name,
            total_reviews=analysis.total_reviews,
            sentiment_summary=SentimentSummaryResponse(**analysis.sentiment_summary),
            topics=[TopicSummaryResponse(**topic) for topic in analysis.topics],
            insights=InsightsResponse(
                positive_summary=insights.get("positive_summary", ""),
                negative_summary=insights.get("negative_summary", ""),
                keywords=insights.get("keywords", {}),
                improvements=[ImprovementItemResponse(**item) for item in insights.get("improvements", [])],
                representative_reviews=RepresentativeReviewsResponse(
                    positive=representative_reviews.get("positive", []),
                    negative=representative_reviews.get("negative", []),
                ),
                trend_analysis=insights.get("trend_analysis"),
            ),
            individual_results=[
                IndividualResultResponse(
                    source_id=item.source_id,
                    text=item.review_excerpt,
                    sentiment=item.sentiment,
                    sentiment_score=float(item.sentiment_score),
                    intensity=item.intensity,
                    topics=item.topics,
                    review_score=float(item.review_score) if item.review_score is not None else None,
                    review_date=item.review_date,
                )
                for item in analysis.review_results
            ],
            created_at=analysis.created_at,
        )

    @staticmethod
    def _parse_optional_date(raw_value: str | None) -> date | None:
        if raw_value in (None, ""):
            return None
        return date.fromisoformat(raw_value)
