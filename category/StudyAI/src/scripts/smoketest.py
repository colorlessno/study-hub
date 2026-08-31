import asyncio
import os
import sys
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# 接続先は環境変数 DATABASE_URL で指定する（未指定時はローカル開発用デフォルト）
DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@db:5432/studyai"
)

SYSTEM_TABLES = {
    "system01": ["documents", "document_items", "extract_jobs"],
    "system02": ["system02_contract_reviews", "system02_contract_issues"],
    "system03": ["system03_documents", "system03_sessions", "system03_question_logs"],
    "system04": ["system04_analyses", "system04_review_results"],
    "system05": ["system05_patients", "system05_treatment_records", "system05_appointments"],
    "system06": ["system06_inquiries", "system06_faqs", "system06_sessions"],
    "system07": ["system07_documents", "system07_tags"],
    "system08": ["system08_analyses", "system08_tasks"],
    "system09": ["system09_reports"],
    "system10": ["system10_file_index", "system10_scan_logs"],
    "system11": ["plans", "executions", "organizer_settings"],
    "system12": ["system12_sessions", "system12_products"],
    "system13": ["system13_members", "system13_projects", "system13_knowledge"],
    "system16": ["system16_match_results", "system16_skill_aliases"],
}

async def main():
    engine = create_async_engine(DATABASE_URL, echo=False)
    results = {}
    async with engine.connect() as conn:
        for system, tables in SYSTEM_TABLES.items():
            for table in tables:
                try:
                    r = await conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = r.scalar()
                    results[f"{system}.{table}"] = f"OK (rows={count})"
                except Exception as e:
                    await conn.rollback()
                    results[f"{system}.{table}"] = f"ERROR: {e}"
    await engine.dispose()

    ok = [k for k, v in results.items() if v.startswith("OK")]
    ng = [k for k, v in results.items() if not v.startswith("OK")]

    lines = []
    lines.append(f"=== Smoke Test Results ===")
    lines.append(f"PASS: {len(ok)} / {len(results)}")
    for k in ok:
        lines.append(f"  PASS {k}: {results[k]}")
    if ng:
        lines.append(f"FAIL: {len(ng)}")
        for k in ng:
            lines.append(f"  FAIL {k}: {results[k]}")

    output = "\n".join(lines)
    with open("/tmp/smoketest_result.txt", "w") as f:
        f.write(output)
    sys.exit(1 if ng else 0)

asyncio.run(main())
