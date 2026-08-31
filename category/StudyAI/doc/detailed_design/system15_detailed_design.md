# System 15 詳細設計
## 電子書籍 セクション別自動要約システム

---

## 1. 実装ディレクトリ構成

```text
category/StudyAI/src/apps/system15_book_summarization_bridge/
├── app/server.js
├── app/public/index.html
├── app/public/main.js
├── app/public/styles.css
├── test/server.test.js
├── test/fake-runner.js
└── package.json

book_summarization_cli/
├── cli/cli_main.py
├── cli/config.toml
└── 各処理段階の成果物ディレクトリ
```

## 2. モジュール詳細

| モジュール | 役割 | 主な関数 |
|---|---|---|
| HTTP連携サービス | 静的画面、入力検証、API、ジョブJSON保存 | `createBookSummarizationBridge()` |
| CLI実行制御 | Python解決、入力準備、CLI起動、終了状態保存 | `executeJob()`, `runProcess()` |
| 入力準備 | PDF変換、画像フォルダーのページ順コピー | `stagePdf()`, `stageImageDirectory()` |
| 設定生成 | 元の`config.toml`を複製し、最大ページ数を反映 | `prepareConfig()` |
| 成果物参照 | CLIの既存保存先から一覧とセクション要約を取得 | `collectArtifacts()`, `collectSections()` |
| ブラウザ画面 | 条件入力、完了応答、ジョブ・セクション・成果物表示 | `index.html`, `main.js` |

## 3. API 詳細

- `GET /health`
- `GET /api/jobs`
- `POST /api/jobs`
  - 一件のCLI処理を完了まで順次実行
  - 入力: キャプチャ、PDF、画像フォルダー、書籍ID、最大ページ数、再開、図表抽出、出力形式、権利確認
  - 処理中に別ジョブを受け付けた場合はHTTP 409
- `GET /api/jobs/{job_id}`
- `GET /api/jobs/{job_id}/sections`
- `GET /api/jobs/{job_id}/artifacts`

## 4. 詳細API I/O 定義

### 4.1 POST `/api/jobs`

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `input_type` | string | ○ | pdf / image_dir / capture |
| `input_path` | string | ○ | 入力元パス |
| `book_id` | string | ○ | 英数字、ハイフン、アンダースコアからなる書籍ID |
| `max_pages` | integer |  | 上限ページ |
| `resume` | boolean |  | 再開実行 |
| `enable_visual_extraction` | boolean |  | 図表解析有効化 |
| `output_formats` | string[] |  | markdown / json |
| `rights_confirmed` | boolean | ○ | 利用権限確認済みの場合のみtrue |

**レスポンス項目**

| 項目 | 型 | 説明 |
|---|---|---|
| `job_id` | string | ジョブID |
| `status` | string | completed / failed |

### 4.2 GET `/api/jobs/{job_id}`

| 項目 | 型 | 説明 |
|---|---|---|
| `job_id` | string | ジョブ識別子 |
| `status` | string | running / completed / failed |
| `current_phase` | string | 実行中フェーズ |
| `processed_pages` / `total_pages` | integer | 進捗 |

### 4.3 GET `/api/jobs/{job_id}/sections`

| 項目 | 型 | 説明 |
|---|---|---|
| `sections[]` | object[] | `section_no`, `title`, `page_from`, `page_to`, `summary_text`, `review_required` |

### 4.4 GET `/api/jobs/{job_id}/artifacts`

| 項目 | 型 | 説明 |
|---|---|---|
| `artifacts[]` | object[] | OCR結果、図表一覧、構造JSON、最終要約 |

## 5. 入力チェック仕様
| 対象 | チェック項目 | ルール |
|---|---|---|
| `POST /api/jobs` | `input_type` | `pdf/image_dir/capture`のみ |
| `POST /api/jobs` | `input_path` | PDFと画像フォルダーでは必須 |
| `POST /api/jobs` | `book_id` | 1〜80文字の許可文字のみ |
| `POST /api/jobs` | `max_pages` | 1〜5000へ正規化 |
| `POST /api/jobs` | `output_formats[]` | markdown / jsonのみ |
| `POST /api/jobs` | `rights_confirmed` | true必須 |
| `GET /api/jobs/{job_id}` 系 | `job_id` | 保存済みジョブのみ |

## 6. エラー応答仕様
エラーレスポンス形式:
```json
{"error":"説明"}
```

| error_code | HTTP | 発生条件 |
|---|---|---|
| 入力エラー | 400 | 種別、パス、書籍ID、権利確認、対象タスクが不正 |
| 順次処理中 | 409 | 先行ジョブが処理中 |
| `JOB_NOT_FOUND` | 404 | 保存済みジョブ不存在 |
| CLIまたは連携処理エラー | 500 | JSON解析や予期しない連携処理失敗 |

## 7. バリデーション一覧
| 対象 | ルール | 不正時挙動 |
|---|---|---|
| `input_type` | `pdf/image_dir/capture` のみ | 400 を返す |
| `status` | 許可状態のみ | 422 を返す |
| `page_from/page_to` | `page_from <= page_to` | 再計算 |
| `confidence_score` | 0.0〜1.0 | 再計算 |

## 8. 保存データ詳細

現行のStudyHub連携層はデータベースを使用しない。ジョブ状態は`.runtime/jobs/{job_id}/job.json`へ保存し、ページ、セクション、図表、要約は`book_summarization_cli`の成果物を正本とする。以下はCLI側の論理データである。

### 8.1 `summarization_jobs`
- `job_id`, `input_type`, `input_path`, `status`, `current_phase`, `total_pages`, `processed_pages`, `output_dir`, `completed_at`

### 8.2 `pages`
- `job_id`, `page_no`, `image_path`, `ocr_text_path`, `ocr_confidence`, `toc_candidate`, `phase_status`

### 8.3 `sections`
- `job_id`, `section_no`, `title`, `page_from`, `page_to`, `summary_text`, `confidence_score`, `review_required`

### 8.4 `visuals`
- `job_id`, `section_id`, `page_no`, `bbox`, `caption`, `description`, `image_path`

## 9. AI 処理詳細

- OCR は VLM と Tesseract の統合結果を採用する
- 要約は本文と図表説明を合わせて生成する
- 根拠セクション外の内容は要約に混ぜない

## 10. ジョブ状態設計

- `queued -> running -> completed`または`failed`をジョブJSONへ保存する
- CLI処理中の段階は`current_phase`、標準出力・標準エラーは`log`へ保存する
- `artifacts` ではページ画像、OCR 結果、節構造 JSON、要約 Markdown を返す

## 11. 将来DB化する場合の参考DDL（現行連携層では未使用）

この節のDDLは要件定義にある論理モデルをDB化する場合の参考であり、現行のStudyHub連携サービスは実行も作成も参照もしない。

### 11.1 `summarization_jobs`

```sql
CREATE TABLE summarization_jobs (
    job_id         VARCHAR(50) PRIMARY KEY,
    input_type     VARCHAR(20) NOT NULL,
    input_path     TEXT,
    status         VARCHAR(20) NOT NULL,
    current_phase  VARCHAR(30),
    total_pages    INTEGER,
    processed_pages INTEGER NOT NULL DEFAULT 0,
    output_dir     TEXT,
    failed_phase   VARCHAR(30),
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at   TIMESTAMP,
    CONSTRAINT chk_summarization_jobs_status
        CHECK (status IN ('queued', 'preprocessing', 'ocr', 'structuring', 'summarizing', 'completed', 'failed'))
);

CREATE INDEX idx_summarization_jobs_created_at ON summarization_jobs(created_at DESC);
```

### 11.2 `pages`

```sql
CREATE TABLE pages (
    id             SERIAL PRIMARY KEY,
    job_id         VARCHAR(50) NOT NULL REFERENCES summarization_jobs(job_id) ON DELETE CASCADE,
    page_no        INTEGER NOT NULL,
    image_path     TEXT,
    ocr_text_path  TEXT,
    toc_candidate  VARCHAR(255),
    ocr_confidence NUMERIC(4,3),
    phase_status   VARCHAR(30),
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (job_id, page_no)
);

CREATE INDEX idx_pages_job_id ON pages(job_id);
```

### 11.3 `sections`

```sql
CREATE TABLE sections (
    id            SERIAL PRIMARY KEY,
    job_id        VARCHAR(50) NOT NULL REFERENCES summarization_jobs(job_id) ON DELETE CASCADE,
    section_no    INTEGER NOT NULL,
    title         VARCHAR(255) NOT NULL,
    page_from     INTEGER,
    page_to       INTEGER,
    summary_text  TEXT,
    confidence_score NUMERIC(4,3),
    review_required BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (job_id, section_no)
);

CREATE INDEX idx_sections_job_id ON sections(job_id);
```

### 11.4 `visuals`

```sql
CREATE TABLE visuals (
    id          SERIAL PRIMARY KEY,
    job_id      VARCHAR(50) NOT NULL REFERENCES summarization_jobs(job_id) ON DELETE CASCADE,
    section_id  INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    page_no     INTEGER,
    bbox        JSONB NOT NULL DEFAULT '{}'::jsonb,
    caption     TEXT,
    description TEXT,
    image_path  TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_visuals_job_id      ON visuals(job_id);
CREATE INDEX idx_visuals_section_id ON visuals(section_id);
```

