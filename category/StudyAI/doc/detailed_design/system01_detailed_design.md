# System 01 詳細設計
## 請求書・領収書 データ抽出システム

---

## 1. 実装ディレクトリ構成

```text
app/
├── api/routes/extract.py
├── schemas/extract.py
├── services/extract_service.py
├── services/file_processor.py
├── services/bulk_service.py
├── services/csv_exporter.py
├── clients/llm_client.py
├── clients/vlm_client.py
├── repositories/document_repository.py
├── repositories/job_repository.py
├── repositories/log_repository.py
├── models/document.py
├── models/job.py
├── prompts/extract_prompt.py
└── utils/mlflow_tracer.py
```

## 2. モジュール詳細

| モジュール | ファイル | 役割 | 主な関数 |
|---|---|---|---|
| ExtractRouter | `api/routes/extract.py` | 同期抽出・一括受付・訂正・一覧 API | `extract()`, `extract_bulk()`, `get_bulk_result()`, `correct_document()` |
| ExtractService | `services/extract_service.py` | 単票抽出の制御 | `run_single_extract()`, `validate_result()`, `save_result()` |
| FileProcessor | `services/file_processor.py` | PDF/画像の判定と前処理 | `detect_input_type()`, `extract_text_pdf()`, `prepare_vlm_image()` |
| BulkService | `services/bulk_service.py` | 一括ジョブの投入と進捗更新 | `enqueue_job()`, `process_job()`, `summarize_job()` |
| LLMClient / VLMClient | `clients/*.py` | LM Studio 呼び出し | `chat_completion()`, `vision_completion()` |
| DocumentRepository | `repositories/document_repository.py` | `documents` / `document_items` CRUD | `create_document()`, `update_document()`, `search_documents()` |
| JobRepository | `repositories/job_repository.py` | 一括ジョブ管理 | `create_job()`, `update_job_status()`, `upsert_job_result()` |
| LogRepository | `repositories/log_repository.py` | 処理ログ記録 | `insert_processing_log()` |

## 3. API 詳細

### 3.1 POST `/extract`
- 入力: `multipart/form-data` の `file`
- 検証: 拡張子、10MB 上限、単一ファイル、PDF/PNG/JPG/JPEG のみ
- 処理順:
  1. `FileProcessor` が入力種別を判定
  2. テキスト PDF は LLM、画像系は VLM を選択
  3. Pydantic で出力スキーマ検証
  4. `documents` / `document_items` 保存
- 応答: 抽出 JSON、`confidence_score`、`requires_review`

### 3.2 POST `/extract/bulk`
- 入力: `files[]`（1〜5件）
- 検証: 件数、総サイズ、各ファイル形式
- 処理: 受付時は `extract_jobs` を `queued` で作成し、バックグラウンド処理へ移譲
- 応答: `job_id`、`status`、`results_endpoint`

### 3.3 GET `/extract/bulk/{job_id}`
- 応答: `queued / running / completed / partial / failed`
- `results[]` にはファイル単位の成功/失敗、`document_id`、`error_code` を返す

### 3.4 PATCH `/documents/{document_id}/correct`
- 入力: 修正対象項目
- 更新規則:
  - `bank_info` は全置換
  - `items` は既存行全削除後に再 INSERT
  - スカラー項目は送信分のみ更新
- 確認完了時は`review_status`を`確認済み`へ更新
- 更新後に `confidence_score`、`missing_fields`、`requires_review` を再計算

### 3.5 GET `/documents` / GET `/documents/export`
- 一覧は `date_from`、`date_to`、`supplier`、`min_amount`、`max_amount`、`document_type`、`requires_review`、`review_status` を受ける
- CSV 出力は一覧と同じ検索条件を受け、`review_status`省略時は確認済みデータだけを出力する

## 4. 詳細API I/O 定義

### 4.1 POST `/extract`
**リクエスト**

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `file` | binary | ○ | PDF / PNG / JPG / JPEG |

**レスポンス**

| 項目 | 型 | 説明 |
|---|---|---|
| `document_id` | integer | 保存済み文書ID |
| `document_type` | string | 請求書 / 領収書 / 納品書 |
| `items` | object[] | 明細一覧 |
| `subtotal` / `tax_8` / `tax_10` / `total` | number | 金額項目 |
| `confidence_score` | number | 抽出信頼度 |
| `requires_review` | boolean | 要確認フラグ |
| `missing_fields` | string[] | 欠落項目 |

### 4.2 POST `/extract/bulk`
**リクエスト**

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `files[]` | binary[] | ○ | 1〜5件 |

**レスポンス**

| 項目 | 型 | 説明 |
|---|---|---|
| `job_id` | string | 一括ジョブID |
| `total_files` | integer | 受付件数 |
| `status` | string | `queued` |
| `results_endpoint` | string | 結果参照先 |

### 4.3 GET `/extract/bulk/{job_id}`
**レスポンス**

| 項目 | 型 | 説明 |
|---|---|---|
| `job_id` | string | ジョブID |
| `status` | string | `queued` / `running` / `completed` / `partial` / `failed` |
| `succeeded` / `failed` | integer | 件数集計 |
| `results[]` | object[] | `file_name`, `status`, `document_id`, `error`, `message` |

### 4.4 PATCH `/documents/{document_id}/correct`
**リクエスト**

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `document_type` | string |  | 文書種別 |
| `issue_date` | string(date) |  | 発行日 |
| `supplier_name` | string |  | 取引先名 |
| `bank_info` | object |  | 全置換 |
| `items` | object[] |  | 全削除後再登録 |
| `review_status` | string |  | `未確認` / `確認済み` |

**レスポンス**

| 項目 | 型 | 説明 |
|---|---|---|
| `document_id` | integer | 更新対象ID |
| `updated_at` | string(datetime) | 更新日時 |
| `confidence_score` | number | 再計算後スコア |
| `requires_review` | boolean | 再判定結果 |
| `review_status` | string | 更新後の確認状態 |
| `missing_fields` | string[] | 再計算結果 |

### 4.5 GET `/documents` / GET `/documents/export`
**クエリ項目**

| 項目 | 型 | 説明 |
|---|---|---|
| `date_from` / `date_to` | string(date) | 発行日範囲 |
| `supplier` | string | 部分一致 |
| `min_amount` / `max_amount` | number | 金額範囲 |
| `document_type` | string | 文書種別 |
| `requires_review` | boolean | 要確認のみ |
| `review_status` | string | `未確認` / `確認済み`。CSV出力では省略時に`確認済み` |

## 5. 入力チェック仕様
| 対象 | チェック項目 | ルール |
|---|---|---|
| `POST /extract` | ファイル形式 | PDF / PNG / JPG / JPEG のみ |
| `POST /extract` | ファイルサイズ | 10MB 以下 |
| `POST /extract/bulk` | 件数 | 1〜5件 |
| `PATCH /documents/{document_id}/correct` | 更新項目 | `items` は全置換、`bank_info` は全置換、スカラーは送信分のみ |
| `GET /documents` | 検索条件 | 日付範囲の前後関係と数値範囲を確認 |

## 6. エラー応答仕様
共通レスポンス形式:
```json
{"error_code":"string","message":"string","details":{},"trace_id":"string"}
```

| error_code | HTTP | 発生条件 |
|---|---|---|
| `unsupported_file_type` | 400 | 非対応ファイル |
| `file_too_large` | 413 | 容量超過 |
| `duplicate_file` | 409 | 物理重複 |
| `model_timeout` | 504 | LLM / VLM タイムアウト |
| `invalid_model_output` | 422 | 出力スキーマ不整合 |
| `db_error` | 500 | 永続化失敗 |

## 7. バリデーション一覧
| 対象 | ルール | 不正時挙動 |
|---|---|---|
| 金額項目 | 0以上 | 422 を返す |
| `confidence_score` | 0.00〜1.00 | 再計算または 422 |
| `invoice_number` | `T` + 13桁を許容 | 要確認フラグ付与 |
| `items[].amount` | 数量・単価と矛盾しない | 要確認フラグ付与 |
| `review_status` | `未確認` / `確認済み` | 保存拒否 |

## 8. データベース詳細

### 8.1 `documents`
| カラム | 型 | 必須 | 備考 |
|---|---|---|---|
| `id` | serial | ○ | PK |
| `file_name` | varchar(255) | ○ | 原ファイル名 |
| `file_hash` | varchar(64) | ○ | 物理重複判定 |
| `document_type` | varchar(20) |  | 請求書/領収書/納品書 |
| `issue_date` | date |  | 発行日 |
| `supplier_name` | varchar(255) |  | 取引先名 |
| `total` | numeric(12,0) |  | 合計金額 |
| `bank_info` | jsonb |  | 銀行情報 |
| `confidence_score` | numeric(3,2) | ○ | 0.00〜1.00 |
| `requires_review` | boolean | ○ | 初期値 false |
| `review_status` | varchar(20) | ○ | `未確認` / `確認済み` |

### 8.2 `document_items`
- `document_id` 外部キー
- `name`、`quantity`、`unit_price`、`amount`
- 訂正時は `document_id` 単位で全削除・再登録

### 8.3 一括・ログテーブル
- `extract_jobs`: `id`, `status`, `requested_count`, `completed_count`, `created_at`
- `extract_job_results`: `job_id`, `file_name`, `status`, `document_id`, `error_code`
- `processing_logs`: `file_name`, `status`, `error_msg`, `processed_at`

## 9. AI 処理詳細

### 9.1 プロンプト入力
- 入力本文または画像
- 文書種別候補
- 必須項目一覧
- Few-shot 3 件

### 9.2 出力スキーマ
- `document_type`
- `issue_date`
- `supplier_name`
- `items[]`
- `subtotal`, `tax_8`, `tax_10`, `total`
- `payment_due`, `bank_info`, `invoice_number`

### 9.3 フォールバック
- 単票のLLM/VLMタイムアウト・JSON検証失敗は再試行せず、APIエラーとして返す
- 一括処理のLLM/VLMタイムアウト・JSON検証失敗は受付順に1件ずつ最大3回再試行し、それでも失敗したファイルだけを`failed`として記録する
- 必須項目欠落時は保存するが `missing_fields` に列挙し、信頼度が0.7未満の場合は`requires_review = true`にする

## 10. エラー・ログ設計

| 条件 | HTTP | 内部コード |
|---|---|---|
| 対応外ファイル形式 | 400 | `UNSUPPORTED_FILE_TYPE` |
| ファイルサイズ超過 | 400 | `FILE_TOO_LARGE` |
| 物理重複 | 409 | `DUPLICATE_FILE` |
| LLM/VLM タイムアウト | 504 | `MODEL_TIMEOUT` |
| 出力検証失敗 | 422 | `INVALID_MODEL_OUTPUT` |

- すべての API で `trace_id` を採番して `processing_logs` と MLflow に記録する

## 11. 実装時確認項目

- 画像 PDF の DPI 既定値は初回性能試験で固定する
- VLM 入力サイズは設定値で制御し、コード埋め込みしない
- モデル呼び出しは設定で変更できない逐次処理とし、常に1件ずつ実行する

## 12. DDL

### 12.1 `documents`

```sql
CREATE TABLE documents (
    id                           SERIAL PRIMARY KEY,
    file_name                    VARCHAR(255) NOT NULL,
    file_hash                    VARCHAR(64) NOT NULL UNIQUE,
    document_type                VARCHAR(20),
    issue_date                   DATE,
    supplier_name                VARCHAR(255),
    supplier_address             TEXT,
    recipient_name               VARCHAR(255),
    subtotal                     NUMERIC(12,0),
    tax_8                        NUMERIC(12,0),
    tax_10                       NUMERIC(12,0),
    total                        NUMERIC(12,0),
    payment_due                  DATE,
    bank_info                    JSONB,
    invoice_number               VARCHAR(20),
    confidence_score             NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    requires_review              BOOLEAN NOT NULL DEFAULT FALSE,
    review_status                VARCHAR(20) NOT NULL DEFAULT '未確認',
    business_duplicate_suspected BOOLEAN NOT NULL DEFAULT FALSE,
    missing_fields               JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at                   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                   TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_documents_review_status
        CHECK (review_status IN ('未確認', '確認済み')),
    CONSTRAINT chk_documents_confidence
        CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

CREATE INDEX idx_documents_issue_date      ON documents(issue_date);
CREATE INDEX idx_documents_supplier_name   ON documents(supplier_name varchar_pattern_ops);
CREATE INDEX idx_documents_total           ON documents(total);
CREATE INDEX idx_documents_created_at      ON documents(created_at DESC);
CREATE INDEX idx_documents_requires_review ON documents(requires_review) WHERE requires_review = TRUE;
```

### 12.2 `document_items`

```sql
CREATE TABLE document_items (
    id          SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    name        VARCHAR(255),
    quantity    NUMERIC(10,2),
    unit_price  NUMERIC(12,0),
    amount      NUMERIC(12,0)
);

CREATE INDEX idx_document_items_document_id ON document_items(document_id);
```

### 12.3 `extract_jobs`

```sql
CREATE TABLE extract_jobs (
    id           VARCHAR(50) PRIMARY KEY,
    status       VARCHAR(20) NOT NULL,
    total_files  INTEGER NOT NULL,
    succeeded    INTEGER NOT NULL DEFAULT 0,
    failed       INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    CONSTRAINT chk_extract_jobs_status
        CHECK (status IN ('queued', 'running', 'completed', 'partial', 'failed'))
);
```

### 12.4 `extract_job_results`

```sql
CREATE TABLE extract_job_results (
    id          SERIAL PRIMARY KEY,
    job_id      VARCHAR(50) NOT NULL REFERENCES extract_jobs(id) ON DELETE CASCADE,
    file_name   VARCHAR(255) NOT NULL,
    status      VARCHAR(20) NOT NULL,
    document_id INTEGER REFERENCES documents(id),
    error_code  VARCHAR(50),
    message     TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_extract_job_results_status
        CHECK (status IN ('success', 'failed'))
);

CREATE INDEX idx_extract_job_results_job_id ON extract_job_results(job_id);
```

### 12.5 `processing_logs`

```sql
CREATE TABLE processing_logs (
    id           SERIAL PRIMARY KEY,
    file_name    VARCHAR(255) NOT NULL,
    status       VARCHAR(20) NOT NULL,
    error_msg    TEXT,
    processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_processing_logs_status
        CHECK (status IN ('success', 'error', 'corrected'))
);

CREATE INDEX idx_processing_logs_processed_at ON processing_logs(processed_at DESC);
CREATE INDEX idx_processing_logs_status       ON processing_logs(status);
```

