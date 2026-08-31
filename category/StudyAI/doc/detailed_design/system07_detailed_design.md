# System 07 詳細設計
## プロジェクト内ドキュメント 自動タグ付け＆類似ドキュメント推薦システム

---

## 1. 実装ディレクトリ構成

> **デプロイ前提：1デプロイ = 1プロジェクト**
> 本システムは1デプロイインスタンスが1プロジェクトに対応する前提で設計されている。`project_id` によるデータ分離・プロジェクト一覧取得APIは将来対応予定。アクセス制御は現在 `access_roles`（ロールベース）のみで実現する。

```text
src/studyai/systems/system07/
├── api/router.py
├── schemas/catalog.py
├── models/catalog.py
├── repositories/
│   ├── catalog_repository.py
│   └── tag_repository.py
├── services/
│   ├── catalog_service.py
│   ├── tagging_engine.py
│   ├── similarity_engine.py
│   ├── chunk_service.py
│   ├── text_extractor.py
│   ├── tag_admin_service.py
│   └── analytics_service.py
└── prompts/tagging_prompt.py
```

## 2. モジュール詳細

| モジュール | 役割 | 主な関数 |
|---|---|---|
| Router / CatalogService | 文書登録・検索・詳細・類似推薦・重複判定 | `upload_document()`, `upload_documents_bulk()`, `list_documents()`, `get_document_detail()`, `get_similar_documents()` |
| TaggingEngine | タグ付け、カテゴリ分類、要約 | `analyze_document()` |
| SimilarityEngine | 類似検索 | `find_similar()` |
| ChunkService / TextExtractor | 本文抽出とチャンク生成 | `make_chunks()`, `extract_text()` |
| TagAdminService | タグ更新・統合 | `update_tags()`, `merge_tags()` |
| AnalyticsService | 利用状況集計 | `get_access_stats()`, `get_unused_documents()` |

## 3. API 詳細

### 3.1 文書 API
- `POST /documents`
- `POST /documents/bulk`
- `GET /documents`
- `GET /documents/{document_id}`
- `GET /documents/{document_id}/similar`

### 3.2 タグ API
- `PUT /documents/{document_id}/tags`
  - 入力: `tags[]`, `category`, `sub_category`, `importance`
  - 既存タグとの差分更新を行う
- `GET /tags`
- `POST /tags/merge`

### 3.3 統計 API
- `GET /stats/access`
- `GET /stats/unused-documents`

## 4. 詳細API I/O 定義

### 4.1 文書 API
**対象API**: `POST /documents`, `POST /documents/bulk`, `GET /documents`, `GET /documents/{document_id}`, `GET /documents/{document_id}/similar`

| 項目 | 型 | 説明 |
|---|---|---|
| `file` / `files[]` | binary / binary[] | 登録ファイル |
| `registered_by` | string | 登録者ID |
| `access_roles` | string | アクセス可能ロールのJSON配列またはカンマ区切り |
| `keyword`, `category`, `tags`, `document_type`, `importance`, `registered_by` | string | 文書一覧の検索条件 |
| `search_mode` | string | keyword / vector / hybrid |
| `document_id` | integer | 文書識別子 |
| `similar_documents[]` | object[] | 類似文書候補と類似度 |

### 4.2 タグ API
**対象API**: `PUT /documents/{document_id}/tags`, `GET /tags`, `POST /tags/merge`

| 項目 | 型 | 説明 |
|---|---|---|
| `tags` | string[] | 文書タグ全置換 |
| `source_tags` | string[] | マージ元タグ群 |
| `target_tag` | string | マージ先タグ |
| `items[]` | object[] | タグ名、同義語、利用数 |

### 4.3 統計 API
**対象API**: `GET /stats/access`, `GET /stats/unused-documents`

| 項目 | 型 | 説明 |
|---|---|---|
| `from_date` / `to_date` | string(date) | 集計期間 |
| `items[]` | object[] | 文書別アクセス件数または未使用候補文書 |

## 5. 入力チェック仕様
| 対象 | チェック項目 | ルール |
|---|---|---|
| 文書 API | 登録ファイル | 許可形式のみ |
| 文書 API | 一括登録件数 | 上限件数以内 |
| タグ API | タグ配列 | 空配列不可 |
| `POST /tags/merge` | タグ指定 | `source_tags` と `target_tag` の両方必須 |

## 6. エラー応答仕様
共通レスポンス形式:
```json
{"error_code":"string","message":"string","details":{},"trace_id":"string"}
```

| error_code | HTTP | 発生条件 |
|---|---|---|
| `document_not_found` | 404 | 文書不存在 |
| `duplicate_document` | 409 | 重複登録 |
| `invalid_tag_merge` | 400 | タグ統合条件不正 |
| `index_update_failed` | 500 | 索引更新失敗 |

## 7. バリデーション一覧
| 対象 | ルール | 不正時挙動 |
|---|---|---|
| `access_roles` | 配列形式で保持 | 保存拒否 |
| `tags` | 正規化済み文字列のみ | 保存拒否 |
| 類似度 | 0.0〜1.0 | 再計算 |

## 8. データベース詳細

### 8.1 `system07_documents`
- `file_name`, `title`, `file_hash`, `file_size`, `category`, `sub_category`, `document_type`, `importance`, `summary`
- `registered_by`, `access_roles`, `view_count`, `is_active`, `created_at`, `updated_at`

### 8.2 `system07_document_chunks`
- `document_id`, `chunk_no`, `chunk_text`, `section`, `embedding`

### 8.3 `system07_tags` / `system07_document_tags`
- `system07_tags`: 正規タグ名、同義語、利用数、統合先タグ
- `system07_document_tags`: 文書とタグの中間テーブル、自動付与区分

### 8.4 `system07_access_logs`
- `document_id`, `user_id`, `action`, `query`, `accessed_at`

## 9. AI 処理詳細

- 自動付与対象: `category`, `sub_category`, `document_type`, `importance`, `tags`, `summary`
- 要約は 3 行以内
- 既存タグと近似度が高い新規タグは「候補」として返し、自動採用しない

## 10. 検索・統合設計

- 類似検索は `system07_document_chunks.embedding` で実施
- 同一 hash は重複候補として優先表示
- タグ統合時は `system07_document_tags` の参照先を統合先へ一括更新する

## 11. DDL

### 11.1 `system07_documents`

```sql
CREATE TABLE system07_documents (
    id            SERIAL PRIMARY KEY,
    file_name     VARCHAR(255) NOT NULL,
    title         VARCHAR(255),
    file_hash     VARCHAR(64) NOT NULL UNIQUE,
    file_size     BIGINT,
    category      VARCHAR(50),
    sub_category  VARCHAR(50),
    document_type VARCHAR(50),
    importance    VARCHAR(10),
    summary       TEXT,
    registered_by VARCHAR(100) NOT NULL,
    access_roles  JSONB NOT NULL DEFAULT '[]'::jsonb,
    view_count    INTEGER NOT NULL DEFAULT 0,
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system07_documents_category ON system07_documents(category);
CREATE INDEX idx_system07_documents_document_type ON system07_documents(document_type);
CREATE INDEX idx_system07_documents_importance ON system07_documents(importance);
CREATE INDEX idx_system07_documents_is_active ON system07_documents(is_active);
```

### 11.2 `system07_document_chunks`

```sql
CREATE TABLE system07_document_chunks (
    id          SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES system07_documents(id) ON DELETE CASCADE,
    chunk_no    INTEGER NOT NULL,
    chunk_text  TEXT NOT NULL,
    section     VARCHAR(255),
    embedding   VECTOR(768),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (document_id, chunk_no)
);

CREATE INDEX idx_system07_document_chunks_document_id ON system07_document_chunks(document_id);
CREATE INDEX idx_system07_document_chunks_embedding ON system07_document_chunks USING ivfflat (embedding vector_cosine_ops);
```

### 11.3 `system07_tags`

```sql
CREATE TABLE system07_tags (
    id             SERIAL PRIMARY KEY,
    normalized_name VARCHAR(100) NOT NULL UNIQUE,
    synonyms       JSONB NOT NULL DEFAULT '[]'::jsonb,
    use_count      INTEGER NOT NULL DEFAULT 0,
    merged_to_tag_id INTEGER REFERENCES system07_tags(id),
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 11.4 `system07_document_tags`

```sql
CREATE TABLE system07_document_tags (
    document_id INTEGER NOT NULL REFERENCES system07_documents(id) ON DELETE CASCADE,
    tag_id      INTEGER NOT NULL REFERENCES system07_tags(id) ON DELETE CASCADE,
    is_auto     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (document_id, tag_id)
);

CREATE INDEX idx_system07_document_tags_tag_id ON system07_document_tags(tag_id);
```

### 11.5 `system07_access_logs`

```sql
CREATE TABLE system07_access_logs (
    id          SERIAL PRIMARY KEY,
    document_id INTEGER NOT NULL REFERENCES system07_documents(id) ON DELETE CASCADE,
    user_id     VARCHAR(100) NOT NULL,
    action      VARCHAR(20) NOT NULL,
    query       TEXT,
    accessed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system07_access_logs_document_id ON system07_access_logs(document_id);
CREATE INDEX idx_system07_access_logs_accessed_at ON system07_access_logs(accessed_at);
```
