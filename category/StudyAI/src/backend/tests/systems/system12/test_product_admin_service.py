from __future__ import annotations

import asyncio
from types import SimpleNamespace

from studyai.systems.system12.schemas.gift import ChatFeedbackRequest, ProductCreateRequest
from studyai.systems.system12.services.product_admin_service import ProductAdminService


class _ScalarResult:
    def __init__(self, products: list[SimpleNamespace]) -> None:
        self.products = products

    def scalars(self):
        return self

    def all(self) -> list[SimpleNamespace]:
        return self.products


class _FakeSession:
    def __init__(self, products: list[SimpleNamespace]) -> None:
        self.products = products

    async def execute(self, _statement):
        return _ScalarResult(self.products)


def _product(product_id: int, *, active: bool) -> SimpleNamespace:
    return SimpleNamespace(
        id=product_id,
        name=f"教材用商品{product_id}",
        category="花・植物",
        price=4500,
        tags=["花", "誕生日"],
        suitable_scenes=["誕生日"],
        suitable_recipients=["母"],
        formality=3,
        description="教材用の商品",
        image_url=None,
        is_active=active,
    )


def test_product_list_returns_active_and_inactive_products() -> None:
    response = asyncio.run(
        ProductAdminService().list_products(
            _FakeSession([_product(2, active=False), _product(1, active=True)])
        )
    )

    assert [item.product_id for item in response.items] == [2, 1]
    assert response.items[0].name == "教材用商品2"
    assert response.items[0].is_active is False


def test_screen_payload_fields_match_current_api_schema() -> None:
    product = ProductCreateRequest(
        name="母への花ギフト",
        price=4500,
        category="花・植物",
        tags=["花", "誕生日", "母"],
        suitable_scenes=["誕生日"],
        suitable_recipients=["母"],
        is_active=True,
    )
    feedback = ChatFeedbackRequest(
        session_id="session-1",
        liked=False,
        disliked_reasons=["予算を超えている"],
        selected_product_id=3,
    )

    assert product.name == "母への花ギフト"
    assert product.is_active is True
    assert feedback.liked is False
    assert feedback.selected_product_id == 3
