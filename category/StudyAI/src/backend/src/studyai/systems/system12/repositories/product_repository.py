from __future__ import annotations

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from studyai.common.errors.models import NotFoundAppError
from studyai.systems.system12.models.gift import System12Product


class ProductRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_product(self, **values) -> System12Product:
        product = System12Product(**values)
        self.session.add(product)
        await self.session.flush()
        await self.session.refresh(product)
        return product

    async def get_product(self, product_id: int) -> System12Product:
        result = await self.session.execute(
            select(System12Product).where(System12Product.id == product_id)
        )
        product = result.scalar_one_or_none()
        if product is None:
            raise NotFoundAppError("product_not_found", "The product was not found.")
        return product

    async def list_active_products(self) -> list[System12Product]:
        result = await self.session.execute(
            select(System12Product)
            .where(System12Product.is_active.is_(True))
            .order_by(desc(System12Product.updated_at), desc(System12Product.id))
        )
        return list(result.scalars().all())

    async def list_all_products(self) -> list[System12Product]:
        result = await self.session.execute(
            select(System12Product).order_by(desc(System12Product.updated_at), desc(System12Product.id))
        )
        return list(result.scalars().all())
