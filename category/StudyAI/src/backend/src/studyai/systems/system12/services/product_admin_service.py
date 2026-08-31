from __future__ import annotations

import asyncio
import json

from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.ai.embedding_client import EmbeddingClient
from studyai.common.audit.logger import get_audit_logger
from studyai.common.errors.models import ValidationAppError
from studyai.systems.system12.models.gift import System12Product
from studyai.systems.system12.repositories.ontology_repository import OntologyRepository
from studyai.systems.system12.repositories.product_repository import ProductRepository
from studyai.systems.system12.schemas.gift import (
    NgRuleCreateRequest,
    NgRuleResponse,
    ProductCreateRequest,
    ProductListResponse,
    ProductResponse,
    ProductUpdateRequest,
    SceneCreateRequest,
    SceneResponse,
)


class ProductAdminService:
    VALID_SEVERITIES = {"warn", "block"}

    def __init__(self) -> None:
        self.embedding_client = EmbeddingClient()
        self.audit_logger = get_audit_logger()

    async def create_product(
        self,
        session: AsyncSession,
        *,
        body: ProductCreateRequest,
        trace_id: str,
        user_id: str | None,
    ) -> ProductResponse:
        embedding = await self._embed_product(body.model_dump())
        product = await ProductRepository(session).create_product(
            name=body.name,
            category=body.category,
            price=body.price,
            tags=body.tags,
            attributes=body.attributes,
            suitable_scenes=body.suitable_scenes,
            suitable_recipients=body.suitable_recipients,
            formality=body.formality,
            description=body.description,
            image_url=body.image_url,
            embedding=embedding,
            is_active=body.is_active,
        )
        await session.commit()
        self.audit_logger.log(
            action="system12.product.created",
            trace_id=trace_id,
            user_id=user_id,
            resource_type="system12_product",
            resource_id=product.id,
            details={"name": product.name},
        )
        return self._to_product_response(product)

    async def list_products(self, session: AsyncSession) -> ProductListResponse:
        products = await ProductRepository(session).list_all_products()
        return ProductListResponse(items=[self._to_product_response(product) for product in products])

    async def update_product(
        self,
        session: AsyncSession,
        *,
        product_id: int,
        body: ProductUpdateRequest,
        trace_id: str,
        user_id: str | None,
    ) -> ProductResponse:
        repository = ProductRepository(session)
        product = await repository.get_product(product_id)
        changed_embedding = False
        update_data = body.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(product, key, value)
            if key in {"name", "category", "tags", "attributes", "description", "suitable_scenes", "suitable_recipients"}:
                changed_embedding = True
        if changed_embedding:
            product.embedding = await self._embed_product(
                {
                    "name": product.name,
                    "category": product.category,
                    "tags": product.tags,
                    "attributes": product.attributes,
                    "description": product.description,
                    "suitable_scenes": product.suitable_scenes,
                    "suitable_recipients": product.suitable_recipients,
                }
            )
        await session.commit()
        self.audit_logger.log(
            action="system12.product.updated",
            trace_id=trace_id,
            user_id=user_id,
            resource_type="system12_product",
            resource_id=product.id,
            details={"fields": sorted(update_data.keys())},
        )
        return self._to_product_response(product)

    async def create_scene(self, session: AsyncSession, *, body: SceneCreateRequest) -> SceneResponse:
        scene = await OntologyRepository(session).get_or_create_scene(
            name=body.name,
            formality=body.formality,
            timing=body.timing,
            description=body.description,
        )
        await session.commit()
        return SceneResponse(
            scene_id=scene.id,
            name=scene.name,
            formality=scene.formality,
            timing=scene.timing,
            description=scene.description,
        )

    async def create_ng_rule(self, session: AsyncSession, *, body: NgRuleCreateRequest) -> NgRuleResponse:
        if body.severity not in self.VALID_SEVERITIES:
            raise ValidationAppError("invalid_severity", "severity must be warn or block.")
        repository = OntologyRepository(session)
        scene = None
        recipient = None
        if body.scene_name:
            scene = await repository.get_or_create_scene(name=body.scene_name)
        if body.recipient_name:
            recipient = await repository.get_or_create_recipient(name=body.recipient_name)
        rule = await repository.create_ng_rule(
            scene_id=scene.id if scene else None,
            recipient_id=recipient.id if recipient else None,
            ng_attribute=body.ng_attribute,
            reason=body.reason,
            severity=body.severity,
        )
        await session.commit()
        return NgRuleResponse(
            rule_id=rule.id,
            scene_name=scene.name if scene else None,
            recipient_name=recipient.name if recipient else None,
            ng_attribute=rule.ng_attribute,
            reason=rule.reason,
            severity=rule.severity,
        )

    async def _embed_product(self, payload: dict) -> list[float] | None:
        text = "\n".join(
            [
                str(payload.get("name") or ""),
                str(payload.get("category") or ""),
                " ".join(payload.get("tags") or []),
                json.dumps(payload.get("attributes") or {}, ensure_ascii=False),
                str(payload.get("description") or ""),
                " ".join(payload.get("suitable_scenes") or []),
                " ".join(payload.get("suitable_recipients") or []),
            ]
        ).strip()
        if not text:
            return None
        try:
            async with asyncio.timeout(5):
                return (await self.embedding_client.embed([text]))[0]
        except Exception:
            return None

    @staticmethod
    def _to_product_response(product: System12Product) -> ProductResponse:
        return ProductResponse(
            product_id=product.id,
            name=product.name,
            category=product.category,
            price=float(product.price),
            tags=list(product.tags or []),
            suitable_scenes=list(product.suitable_scenes or []),
            suitable_recipients=list(product.suitable_recipients or []),
            formality=product.formality,
            description=product.description,
            image_url=product.image_url,
            is_active=product.is_active,
        )
