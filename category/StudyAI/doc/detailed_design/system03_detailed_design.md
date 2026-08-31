# System 03 詳細設計
## プロジェクト文書 自然言語Q&Aシステム

---

## 1. 実装ディレクトリ構成

```text
app/
├── api/routes/ask.py
├── api/routes/documents.py
├── schemas/ask.py
├── schemas/document.py
├── services/text_extractor.py
├── services/chunk_service.py
├── services/embedding_service.py
├── services/retriever.py
├── services/session_service.py
├── services/analytics_service.py
├── repositories/document_repository.py
├── repositories/question_log_repository.py
├── models/document.py
├── models/session.py
└── prompts/answer_prompt.py
```

## 2. モジュール詳細

| モジュール | 役割 | 主な関数 |
|---|---|---|
| AskRouter | Q&A とフィードバック受付 | `ask()`, `submit_feedback()` |
| DocumentRouter | 文書登録・更新・削除・一覧 | `create_document()`, `update_document()`, `delete_document()` |
| TextExtractor | PDF/docx/md/txt 本文抽出 | `extract_text()` |
| ChunkService | セクション単位分割 | `split_sections()`, `make_chunks()` |
| EmbeddingService | embedding 生成と保存 | `embed_chunks()` |
| Retriever | BM25 + pgvector ハイブリッド検索 | `retrieve_context()` |
| SessionService | 会話履歴と短期メモリ管理 | `load_session()`, `append_history()` |

## 3. API 詳細

### 3.0 GET `/projects`
- 出力: `{ "items": [{"project_id": string, "name": string}] }`
- 処理: `projects` テーブルから全件取得（`is_active = true` のみ）
- 用途: 画面のプロジェクトプルダウンで使用する

### 3.1 POST `/ask`
- 入力: `question`, `session_id`, `project_id`
- 処理:
  1. セッション取得
  2. 文書検索
  3. 根拠 chunk を 3〜8 件選定
  4. 根拠付き回答生成
  5. `question_logs` 保存
- 応答: `answer`, `sources[]`, `confidence`

### 3.2 POST `/ask/feedback`
- 入力: `question_log_id`, `rating`, `comment`
- 用途: 人気質問集計と未回答質問抽出に反映

### 3.3 文書管理 API
- `POST /documents`: 新規登録
- `PUT /documents/{document_id}`: 再抽出・再 embedding
- `DELETE /documents/{document_id}`: 論理削除
- `GET /documents`: 登録済み一覧

### 3.4 分析 API
- `GET /analytics/popular-questions`
- `GET /analytics/unanswered-questions`

## 4. 詳細API I/O 定義

### 4.0 GET `/projects`
**レスポンス**

| 項目 | 型 | 説明 |
|---|---|---|
| `items[].project_id` | string | プロジェクトID |
| `items[].name` | string | プロジェクト名 |

### 4.1 POST `/ask`
**リクエスト**

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `session_id` | string | ○ | 会話セッションID |
| `user_id` | string | ○ | 利用者識別子 |
| `question` | string | ○ | 質問文 |
| `category_filter` | string[] |  | カテゴリ絞り込み |

**レスポンス**

| 項目 | 型 | 説明 |
|---|---|---|
| `answer_id` | integer | 回答ID |
| `answer` | string | 回答本文 |
| `confidence` | string | 高 / 中 / 低 |
| `sources[]` | object[] | `document_name`, `section`, `excerpt` |
| `related_questions` | string[] | 関連質問候補 |

### 4.2 POST `/ask/feedback`
**リクエスト**

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `answer_id` | integer | ○ | 対象回答ID |
| `is_helpful` | boolean | ○ | 有用性評価 |
| `comment` | string |  | 補足コメント |

### 4.3 文書管理 API
**対象API**: `POST /documents`, `PUT /documents/{document_id}`, `DELETE /documents/{document_id}`, `GET /documents`

| 項目 | 型 | 説明 |
|---|---|---|
| `file` | binary | 登録ファイル |
| `category` | string | 文書カテゴリ |
| `version` | string | 版数 |
| `access_roles` | string[] | 参照可能権限 |
| `document_id` | integer | 対象文書ID |

### 4.4 分析 API
**対象API**: `GET /analytics/popular-questions`, `GET /analytics/unanswered-questions`

| 項目 | 型 | 説明 |
|---|---|---|
| `period` | string | 集計期間 |
| `top_questions[]` | object[] | 頻出質問一覧 |
| `unanswered[]` | object[] | 未回答質問と回数 |

## 5. 入力チェック仕様
| 対象 | チェック項目 | ルール |
|---|---|---|
| `GET /projects` | なし | 全件取得のみ。フィルターなし |
| `POST /ask` | 必須項目 | `session_id`, `user_id`, `question` 必須 |
| `POST /ask` | 質問文 | 空文字不可、最大長を超えない |
| 文書管理 API | 登録ファイル | 許可拡張子のみ |
| 文書管理 API | `access_roles` | JSON配列で保持 |
| `POST /ask/feedback` | 対象回答 | `answer_id` 既存確認 |

## 6. エラー応答仕様
共通レスポンス形式:
```json
{"error_code":"string","message":"string","details":{},"trace_id":"string"}
```

| error_code | HTTP | 発生条件 |
|---|---|---|
| `no_relevant_document` | 404 | 根拠文書なし |
| `forbidden_document` | 403 | 権限外文書参照 |
| `invalid_document_file` | 400 | 文書形式不正 |
| `feedback_target_not_found` | 404 | 対象回答なし |
| `invalid_model_output` | 422 | 応答スキーマ不整合 |

## 7. バリデーション一覧
| 対象 | ルール | 不正時挙動 |
|---|---|---|
| `confidence` | `高/中/低` | 422 を返す |
| `sources[]` | 高信頼回答では 1件以上必須 | 再生成 |
| `access_roles` | 空配列不可 | 保存拒否 |
| `is_helpful` | boolean のみ | 400 を返す |

## 8. データベース詳細

### 8.1 `documents`
- `id`, `project_id`, `title`, `category`, `status`, `source_hash`, `created_at`

### 8.2 `document_chunks`
- `document_id`, `chunk_no`, `section_title`, `chunk_text`, `embedding`
- インデックス: `ivfflat(document_chunks.embedding)`

### 8.3 `sessions` / `question_logs`
- `sessions`: `session_id`, `project_id`, `short_memory`, `updated_at`
- `question_logs`: `question`, `answer`, `sources`, `rating`, `feedback_comment`

## 9. AI 処理詳細

### 9.1 回答生成ルール
- 根拠が不足する場合は推測せず「該当情報なし」で返す
- 回答末尾に必ず参照文書名を含める
- 会話履歴は直近 5 発話までをコンテキストに含める

### 9.2 検索スコア
- `hybrid_score = keyword_score * 0.4 + vector_score * 0.6`
- 同一文書からの採用は最大 3 chunk まで

## 10. エラー・運用設計

- 文書更新時は旧 chunk を `inactive` にしてから新 chunk を登録する
- 回答失敗時も `question_logs` には失敗理由を残す
- `unanswered-questions` は低評価回答と根拠不足回答を集約して生成する

## 11. DDL

### 11.0 `projects`

```sql
CREATE TABLE projects (
    id         VARCHAR(50) PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_is_active ON projects(is_active);
```

### 11.1 `documents`

```sql
CREATE TABLE documents (
    id           SERIAL PRIMARY KEY,
    project_id   VARCHAR(50) NOT NULL REFERENCES projects(id),
    file_name    VARCHAR(255) NOT NULL,
    title        VARCHAR(255),
    category     VARCHAR(50) NOT NULL,
    version      VARCHAR(50),
    access_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_hash  VARCHAR(64) NOT NULL UNIQUE,
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_project_id ON documents(project_id);
CREATE INDEX idx_documents_category   ON documents(category);
CREATE INDEX idx_documents_is_active  ON documents(is_active);
```

### 11.2 `document_chunks`

```sql
CREATE TABLE document_chunks (
    id           SERIAL PRIMARY KEY,
    document_id  INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_no     INTEGER NOT NULL,
    section_title VARCHAR(255),
    chunk_text   TEXT NOT NULL,
    embedding    VECTOR(1536),
    is_active    BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (document_id, chunk_no)
);

CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX idx_document_chunks_embedding   ON document_chunks USING ivfflat (embedding vector_cosine_ops);
```

### 11.3 `sessions`

```sql
CREATE TABLE sessions (
    session_id   VARCHAR(50) PRIMARY KEY,
    project_id   VARCHAR(50) NOT NULL,
    user_id      VARCHAR(50),
    short_memory JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 11.4 `question_logs`

```sql
CREATE TABLE question_logs (
    id               SERIAL PRIMARY KEY,
    session_id       VARCHAR(50) NOT NULL REFERENCES sessions(session_id),
    project_id       VARCHAR(50) NOT NULL,
    question         TEXT NOT NULL,
    answer           TEXT,
    sources          JSONB NOT NULL DEFAULT '[]'::jsonb,
    confidence       VARCHAR(10),
    rating           INTEGER,
    feedback_comment TEXT,
    answer_status    VARCHAR(20) NOT NULL DEFAULT 'answered',
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_question_logs_rating CHECK (rating IS NULL OR rating BETWEEN 1 AND 5)
);

CREATE INDEX idx_question_logs_project_id  ON question_logs(project_id);
CREATE INDEX idx_question_logs_created_at  ON question_logs(created_at DESC);
CREATE INDEX idx_question_logs_status      ON question_logs(answer_status);
```

