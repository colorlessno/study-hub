import sys
from datetime import datetime
from decimal import Decimal
from types import ModuleType

import pytest
from pydantic import ValidationError

from studyai.systems.system01.schemas.extract import CorrectionRequest, DocumentListItemResponse, DocumentListResponse, ExtractResultPayload
from studyai.systems.system01.services.csv_exporter import CSVExporter
from studyai.systems.system01.services.extract_service import ExtractService
from studyai.systems.system01.utils.mlflow_tracer import ExtractionTrace, MLflowTracer


def test_calculate_derived_values_marks_missing_required_fields():
    service = ExtractService()
    payload = ExtractResultPayload(
        document_type="請求書",
        supplier_name="株式会社テスト",
        total=Decimal("1000"),
    )
    derived = service._calculate_derived_values(payload)

    assert derived["requires_review"] is True
    assert "issue_date" in derived["missing_fields"]
    assert derived["confidence_score"] < Decimal("0.70")


def test_correction_accepts_only_designed_review_status():
    assert CorrectionRequest(review_status="確認済み").review_status == "確認済み"
    with pytest.raises(ValidationError):
        CorrectionRequest(review_status="承認待ち")


def test_csv_export_contains_review_status_and_designed_fields():
    response = DocumentListResponse(
        total=1,
        page=1,
        per_page=20,
        items=[
            DocumentListItemResponse(
                document_id=1,
                file_name="invoice.pdf",
                document_type="請求書",
                issue_date="2026-08-31",
                supplier_name="株式会社テスト",
                total=1100,
                tax_8=0,
                tax_10=100,
                payment_due="2026-09-30",
                invoice_number="T1234567890123",
                confidence_score=Decimal("0.95"),
                requires_review=False,
                review_status="確認済み",
                missing_fields=[],
                created_at=datetime(2026, 8, 31, 9, 0, 0),
            )
        ],
    )

    csv_text = CSVExporter().export(response)

    assert "確認状態" in csv_text
    assert "欠損フィールド" in csv_text
    assert "確認済み" in csv_text


def test_mlflow_tracer_records_the_designed_experiment(monkeypatch):
    calls: dict[str, object] = {}
    fake_mlflow = ModuleType("mlflow")
    fake_mlflow.set_tracking_uri = lambda value: calls.update(tracking_uri=value)
    fake_mlflow.set_experiment = lambda value: calls.update(experiment=value)
    fake_mlflow.log_params = lambda value: calls.update(params=value)
    fake_mlflow.log_metrics = lambda value: calls.update(metrics=value)
    fake_mlflow.set_tags = lambda value: calls.update(tags=value)
    fake_mlflow.log_text = lambda value, path: calls.update(artifact=(value, path))

    class FakeRun:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

    fake_mlflow.start_run = lambda **kwargs: (calls.update(run=kwargs), FakeRun())[1]
    monkeypatch.setitem(sys.modules, "mlflow", fake_mlflow)

    tracer = MLflowTracer()
    tracer._record_sync(
        ExtractionTrace(
            file_name="invoice.pdf",
            file_type="pdf_text",
            model_used="qwen3.5-27b",
            latency_ms=1250,
            status="success",
            trace_id="trace-system01",
            confidence_score=Decimal("0.92"),
            requires_review=False,
            input_tokens=1250,
            output_tokens=380,
            job_id="job_12345678",
        )
    )

    assert calls["experiment"] == "system01_invoice_extraction"
    assert calls["params"] == {
        "file_type": "pdf_text",
        "model_used": "qwen3.5-27b",
        "prompt_version": "v1.0",
    }
    assert calls["metrics"] == {
        "latency_ms": 1250,
        "retry_count": 0.0,
        "confidence_score": 0.92,
        "input_tokens": 1250.0,
        "output_tokens": 380.0,
    }
    assert calls["tags"] == {
        "status": "success",
        "trace_id": "trace-system01",
        "requires_review": "false",
        "job_id": "job_12345678",
    }


def test_mlflow_tracer_saves_validation_failure_output(monkeypatch):
    calls: dict[str, object] = {}
    fake_mlflow = ModuleType("mlflow")
    fake_mlflow.set_tracking_uri = lambda value: None
    fake_mlflow.set_experiment = lambda value: None
    fake_mlflow.log_params = lambda value: None
    fake_mlflow.log_metrics = lambda value: None
    fake_mlflow.set_tags = lambda value: None
    fake_mlflow.log_text = lambda value, path: calls.update(artifact=(value, path))

    class FakeRun:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, traceback):
            return False

    fake_mlflow.start_run = lambda **kwargs: FakeRun()
    monkeypatch.setitem(sys.modules, "mlflow", fake_mlflow)

    MLflowTracer()._record_sync(
        ExtractionTrace(
            file_name="broken.json",
            file_type="pdf_text",
            model_used="qwen3.5-27b",
            latency_ms=300,
            status="failed",
            trace_id="trace-invalid-output",
            validation_failure_raw_output='{"total":"invalid"}',
        )
    )

    assert calls["artifact"] == (
        '{"total":"invalid"}',
        "validation_failure_raw_output.json",
    )
