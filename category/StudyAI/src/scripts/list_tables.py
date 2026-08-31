import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# 接続先は環境変数 DATABASE_URL で指定する（未指定時はローカル開発用デフォルト）
DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@db:5432/studyai"
)

async def main():
    engine = create_async_engine(DATABASE_URL, echo=False)
    async with engine.connect() as conn:
        r = await conn.execute(text(
            "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"
        ))
        tables = [row[0] for row in r]
    await engine.dispose()
    with open("/tmp/tables.txt", "w") as f:
        f.write("\n".join(tables))

asyncio.run(main())
