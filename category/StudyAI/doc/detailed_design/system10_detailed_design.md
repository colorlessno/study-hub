# System 10 詳細設計
## 構成管理補助・ドキュメント所在検索システム

---

## 1. 実装ディレクトリ構成

```text
src/studyai/
├── common/mcp/filesystem_client.py
├── common/mcp/filesystem_server.py
└── systems/system10/
    ├── api/router.py
    ├── schemas/indexing.py
    ├── models/index.py
    ├── repositories/index_repository.py
    ├── prompts/file_summary_prompt.py
    └── services/
        ├── mcp_filesystem_client.py
        ├── text_extractor.py
        ├── indexing_service.py
        ├── structure_map_builder.py
        ├── duplicate_detector.py
        └── report_service.py
```

## 2. モジュール詳細

| モジュール | 役割 | 主な関数 |
|---|---|---|
| Router | 6種類のAPI | `scan_files()`, `search_documents()`, `get_folder_map()`, `get_report()`, `get_duplicates()`, `get_scans()` |
| FilesystemMCPSession | JSON-RPCのMCPクライアント | `call_tool()` |
| FilesystemMCPServer | 読取専用MCPツール | `list_files`, `read_file`, `get_metadata` |
| MCPFilesystemClient | system10向けMCP変換 | `list_files()`, `scan_files()` |
| IndexingService | 要約・embedding生成、索引更新、検索、集計 | `scan()`, `search()`, `get_map()`, `get_report()` |
| StructureMapBuilder | フォルダ構造可視化 | `build()` |
| DuplicateDetector | 重複候補抽出 | `find_duplicates()` |

## 3. API 詳細

- `POST /scan`
  - 入力: `scan_targets[]`, `exclude_patterns[]`, `scan_mode`
  - 処理: ファイル収集、本文抽出、summary/embedding 生成、索引更新
- `GET /search`
  - 条件: `q`, `search_mode`, `folder`, `latest_only`
- `GET /map`
  - 応答: フォルダ階層、代表ファイル、最新版候補
- `GET /report`
  - 応答: 所在不明ファイル候補、規約外配置、更新停滞ファイル
- `GET /duplicates`
  - 応答: 重複候補グループ
- `GET /scans`
  - 応答: 実行履歴

## 4. 詳細API I/O 定義

### 4.1 POST `/scan`
**リクエスト**

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `scan_targets[]` | string[] | ○ | MCPサーバーへ渡すスキャン対象。1件以上 |
| `exclude_patterns[]` | string[] |  | 除外する名前またはパターン |
| `scan_mode` | string |  | full / diff / incremental。既定値full |

**レスポンス**

| 項目 | 型 | 説明 |
|---|---|---|
| `scan_id` | integer | 実行ID |
| `status` | string | completed |
| `total_files` | integer | 対象件数 |
| `new_files` | integer | 新規件数 |
| `updated_files` | integer | 更新件数 |
| `deleted_files` | integer | fullスキャンで無効化した件数 |
| `duplicates_found` | integer | 重複グループ数 |
| `scan_duration_seconds` | integer | 処理秒数 |
| `processing_notes[]` | string[] | LLM・埋め込みの実処理方式 |

### 4.2 GET `/search`

| 項目 | 型 | 説明 |
|---|---|---|
| `q` | string | 自然文検索条件 |
| `search_mode` | string | keyword / vector / hybrid |
| `folder` | string | 対象パス絞り込み |
| `latest_only` | boolean | 最新版のみ |
| `results[]` | object[] | `file_id`, `file_name`, `full_path`, `summary`, `doc_type`, `relevance_score`, `updated_at`, `file_size_kb`, `is_latest`, `duplicates` |
| `processing_notes[]` | string[] | 検索方式と代替処理の説明 |

### 4.3 GET `/map` / GET `/report` / GET `/duplicates` / GET `/scans`

| 項目 | 型 | 説明 |
|---|---|---|
| `folder_tree` | object | パス、説明、件数、容量、子ノード |
| `issues[]` | string[] | 構成上の確認事項 |
| `document_map` | object | 文書種類別の所在 |
| `items[]` | object[] | 重複候補またはスキャン履歴 |

## 5. 入力チェック仕様
| 対象 | チェック項目 | ルール |
|---|---|---|
| `POST /scan` | `scan_targets[]` | 1件以上必須、絶対パス、許可ルート配下、実在すること |
| `POST /scan` | `scan_mode` | `full/diff/incremental` のみ |
| `GET /search` | `q` | 空文字不可 |
| `GET /search` | `search_mode` | `keyword/vector/hybrid` のみ |

## 6. エラー応答仕様
共通レスポンス形式:
```json
{"error_code":"string","message":"string","details":{},"trace_id":"string"}
```

| error_code | HTTP | 発生条件 |
|---|---|---|
| `path_out_of_scope` | 403 | 許可外パス |
| `scan_target_not_found` | 422 | 対象が存在しない |
| `filesystem_mcp_failed` | 422 | MCP初期化、ツール確認、ツール呼出しが失敗 |
| `search_query_empty` | 400 | クエリ空 |
| `invalid_scan_mode` | 422 | 未対応のスキャン方式 |
| `invalid_search_mode` | 422 | 未対応の検索方式 |

## 7. バリデーション一覧
| 対象 | ルール | 不正時挙動 |
|---|---|---|
| `scan_targets` | 絶対パスかつ`/mnt/scan/project`配下 | 403または422を返す |
| `latest_only` | boolean のみ | 400 を返す |
| `similarity_score` | 0.0〜1.0 | 再計算 |

## 8. データベース詳細

### 8.1 `system10_file_index`
- `file_name`, `full_path`, `folder_path`, `file_hash`, `file_size`, `doc_type`, `summary`, `is_latest`, `updated_at`, `scanned_at`, `embedding`, `is_active`

### 8.2 `system10_scan_logs`
- `scan_targets`, `scan_mode`, `total_files`, `new_files`, `updated_files`, `deleted_files`, `duplicates_found`, `duration_seconds`, `status`, `executed_at`

### 8.3 `system10_duplicate_groups`
- `file_ids`, `similarity_type`, `similarity_score`, `latest_file_id`, `created_at`

## 9. AI 処理詳細

- LLM要約は文書種類、120文字以内の要約、最新版候補をJSONで返す
- LLMが失敗した後は残りのファイルもローカル規則で一つずつ分類する
- embeddingは768次元とし、外部処理が失敗した後は残りのファイルもローカルベクトルで一つずつ索引化する
- 自然文検索はキーワードスコアとembedding類似度をモード別に計算する

## 10. 運用設計

- スキャンはフルスキャンと差分スキャンを分ける
- `full`だけが索引から消えたファイルを無効化し、`diff/incremental`は既存索引を維持する
- 重複検知はSHA-256による完全一致を扱い、更新日時とIDから最新版候補を選ぶ
- MCPツールは同時起動せず、一覧、各本文、各メタ情報を順番に呼び出す

## 11. DDL

### 11.1 `file_index`

```sql
CREATE TABLE system10_file_index (
    id          SERIAL PRIMARY KEY,
    file_name   VARCHAR(500) NOT NULL,
    full_path   TEXT NOT NULL UNIQUE,
    folder_path TEXT,
    file_hash   VARCHAR(64),
    file_size   BIGINT,
    doc_type    VARCHAR(50),
    summary     TEXT,
    is_latest   BOOLEAN,
    updated_at  TIMESTAMP,
    scanned_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    embedding   VECTOR(768),
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_system10_file_index_folder_path ON system10_file_index(folder_path);
CREATE INDEX idx_system10_file_index_doc_type ON system10_file_index(doc_type);
CREATE INDEX idx_system10_file_index_is_latest ON system10_file_index(is_latest);
CREATE INDEX idx_system10_file_index_is_active ON system10_file_index(is_active);
CREATE INDEX idx_system10_file_index_embedding ON system10_file_index USING ivfflat (embedding vector_cosine_ops);
```

### 11.2 `scan_logs`

```sql
CREATE TABLE system10_scan_logs (
    id               SERIAL PRIMARY KEY,
    scan_targets     JSONB NOT NULL DEFAULT '[]'::jsonb,
    scan_mode        VARCHAR(20) NOT NULL,
    total_files      INTEGER NOT NULL DEFAULT 0,
    new_files        INTEGER NOT NULL DEFAULT 0,
    updated_files    INTEGER NOT NULL DEFAULT 0,
    deleted_files    INTEGER NOT NULL DEFAULT 0,
    duplicates_found INTEGER NOT NULL DEFAULT 0,
    duration_seconds INTEGER,
    status           VARCHAR(20) NOT NULL DEFAULT 'queued',
    executed_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system10_scan_logs_executed_at ON system10_scan_logs(executed_at);
```

### 11.3 `duplicate_groups`

```sql
CREATE TABLE system10_duplicate_groups (
    id               SERIAL PRIMARY KEY,
    file_ids         JSONB NOT NULL DEFAULT '[]'::jsonb,
    similarity_type  VARCHAR(20) NOT NULL,
    similarity_score NUMERIC(3,2) NOT NULL,
    latest_file_id   INTEGER,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system10_duplicate_groups_similarity ON system10_duplicate_groups(similarity_score);
```

