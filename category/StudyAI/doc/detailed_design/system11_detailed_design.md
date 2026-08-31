# System 11 詳細設計
## ローカルPCファイル自動整理エージェント

---

## 1. 実装ディレクトリ構成

```text
src/studyai/
├── common/mcp/
│   ├── filesystem_client.py
│   └── filesystem_server.py
└── systems/system11/
    ├── api/router.py
    ├── schemas/organizer.py
    ├── models/organizer.py
    ├── repositories/organizer_repository.py
    ├── prompts/organize_prompt.py
    └── services/
        ├── organizer_service.py
        ├── scan_service.py
        ├── plan_generator.py
        ├── execution_service.py
        ├── rollback_service.py
        ├── path_safety_service.py
        ├── sample_workspace_service.py
        └── settings_service.py
```

## 2. モジュール詳細

| モジュール | 役割 | 主な関数 |
|---|---|---|
| OrganizerRouter | 教材初期化・整理案・実行・復元・履歴・設定API | `reset_sample_workspace()`, `scan()`, `execute()`, `rollback()` |
| FilesystemMCPSession | JSON-RPCのMCPクライアント | `call_tool()` |
| FilesystemMCPServer | 読取・移動MCPツール | `list_files`, `read_file`, `get_metadata`, `move_file` |
| ScanService | MCP経由の対象ファイル収集 | `collect_files()` |
| PlanGenerator | 整理案生成 | `generate_plan()` |
| ExecutionService | MCP経由のmove / rename / archive逐次実行 | `execute_actions()` |
| RollbackService | MCP経由の逆順巻き戻し | `rollback_items()` |
| PathSafetyService | パス正規化・危険判定 | `normalize()`, `validate_scope()` |
| SettingsService | 監視設定保存 | `save_settings()` |

## 3. API 詳細

- `POST /scan`
  - 入力: `watch_folders[]`, `output_folder`, `exclude_patterns[]`, `mode=preview`
  - 応答: 整理案、移動候補、リネーム候補、アーカイブ候補
- `POST /execute`
  - 入力: `plan_id`, `approved_action_ids[]`, `approval_mode=selective`
  - 実行前に絶対パス検証、競合検査、ロック検査を行う
- `POST /rollback/{execution_id}`
  - `executions.rollback_data` を参照して巻き戻す
- `GET /executions`
- `GET /executions/{execution_id}/report`
- `POST /settings`

## 4. 詳細API I/O 定義

### 4.1 POST `/scan`
**リクエスト**

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `watch_folders[]` | string[] | ○ | 監視対象 |
| `exclude_patterns[]` | string[] |  | 除外条件 |
| `output_folder` | string | ○ | 整理先フォルダ |
| `mode` | string |  | previewのみ |

**レスポンス**

| 項目 | 型 | 説明 |
|---|---|---|
| `plan_id` | string | 整理案ID |
| `summary` | string | 整理方針要約 |
| `actions[]` | object[] | move / rename / archive / keep |
| `scanned_files` | integer | MCPで読み取った件数 |
| `planning_method` | string | llm / local_rules |

### 4.2 POST `/execute`

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `plan_id` | string | ○ | 承認済み整理案 |
| `approved_action_ids[]` | string[] | ○ | plan内の実行対象ID |
| `approval_mode` | string |  | selective |

**レスポンス**

| 項目 | 型 | 説明 |
|---|---|---|
| `execution_id` | string | 実行ID |
| `result` | string | success / partial / failed |
| `success_count` / `failed_count` | integer | 成功・失敗件数 |
| `item_results[]` | object[] | action_id, status, error_code, executed_at |
| `rollback_available` | boolean | 復元可能な成功操作の有無 |

### 4.3 POST `/rollback/{execution_id}` / GET `/executions` / GET `/executions/{execution_id}/report` / POST `/settings`

| 項目 | 型 | 説明 |
|---|---|---|
| `execution_id` | string | 巻き戻し対象 |
| `rollback_result` | string | 巻き戻し結果 |
| `executions[]` | object[] | 実行履歴 |
| `watch_folders[]`, `output_folder`, `exclude_patterns[]`, `mode`, `schedule` | mixed | `preview`・`manual`の既定設定 |

## 5. 入力チェック仕様
| 対象 | チェック項目 | ルール |
|---|---|---|
| `POST /scan` | `watch_folders[]` | 1件以上必須 |
| `POST /scan` | `mode` | `preview` のみ |
| `POST /execute` | `plan_id` | 既存計画のみ |
| `POST /execute` | plan内の対象パス | 監視フォルダ配下または出力フォルダ配下のみ |
| `POST /execute` | 選択済み操作 | 同一移動先の重複不可 |
| `POST /rollback/{execution_id}` | 対象実行 | 既存 execution のみ |

## 6. エラー応答仕様
共通レスポンス形式:
```json
{"error_code":"string","message":"string","details":{},"trace_id":"string"}
```

| error_code | HTTP | 発生条件 |
|---|---|---|
| `unsafe_path_detected` | 403 | 監視対象外パス |
| `plan_not_found` | 404 | 計画不存在 |
| `name_conflict` | 409 | 移動先名衝突 |
| `file_locked` | 409 | 使用中ファイル |
| `symlink_not_supported` | 400 | リンク系ファイル指定 |
| `execution_failed` | 500 | 実行失敗 |
| `rollback_failed` | 500 | 巻き戻し失敗 |

## 7. バリデーション一覧
| 対象 | ルール | 不正時挙動 |
|---|---|---|
| `actions[]` | `move/rename/archive/keep` のみ | 実行拒否 |
| `rollback_data` | 前後パスを完全保持 | 実行拒否 |
| `mode` | previewのみ | 422を返す |
| `source_path` / `target_path` | 正規化後に同一でない | 実行拒否 |
| `target_path` | 絶対パス・許可配下のみ | 403 を返す |

## 8. データベース詳細

### 8.1 `plans`
- `plan_id`, `summary`, `actions_json`, `status`, `created_at`

### 8.2 `executions`
- `execution_id`, `plan_id`, `result`, `rollback_data`, `executed_at`

### 8.3 `execution_items`
- `execution_id`, `action_type`, `source_path`, `target_path`, `status`, `error_code`, `rollbackable`

### 8.4 `organizer_settings`
- `watch_folders`, `exclude_patterns`, `mode`, `updated_at`

## 9. AI 処理詳細

- 整理案は `move / rename / archive / keep` のみ
- 危険操作は提案しても自動実行しない
- 理由文は「なぜその整理案か」をファイル名・更新日・配置規則から説明する
- LLMが利用できない場合は教材用規則で案を作り、生成方法を応答へ含める

## 10. 安全設計

- 実行対象パスは監視フォルダ配下に限定
- 削除は行わない
- ロールバック情報は move 前 path、move 後 path、rename 前後名を完全保持する
- パスは `GetFullPath` 相当で正規化し、末尾区切りと大小文字差分を吸収して判定する
- リンク系ファイルは解析対象に含めても実行対象にはしない
- 競合検査は実行直前に再評価し、競合時は対象 action のみ失敗扱いにする
- 部分失敗時も残り action を継続し、`executions.result = partial` を許容する
- ロールバックは `execution_items.rollbackable = true` の成功 action に限定する
- 一覧、本文、メタ情報、移動、名前変更、復元はMCPツールを一つずつ呼び出す

## 11. DDL

### 11.1 `plans`

```sql
CREATE TABLE plans (
    plan_id      VARCHAR(50) PRIMARY KEY,
    summary      TEXT,
    actions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    watch_folders JSONB NOT NULL DEFAULT '[]'::jsonb,
    output_folder TEXT,
    status       VARCHAR(20) NOT NULL DEFAULT 'created',
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_plans_status CHECK (status IN ('created', 'approved', 'executed', 'cancelled'))
);

CREATE INDEX idx_plans_created_at ON plans(created_at DESC);
```

### 11.2 `executions`

```sql
CREATE TABLE executions (
    execution_id   VARCHAR(50) PRIMARY KEY,
    plan_id        VARCHAR(50) NOT NULL REFERENCES plans(plan_id),
    result         VARCHAR(20) NOT NULL,
    rollback_data  JSONB NOT NULL DEFAULT '[]'::jsonb,
    success_count  INTEGER NOT NULL DEFAULT 0,
    failed_count   INTEGER NOT NULL DEFAULT 0,
    executed_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_executions_result CHECK (result IN ('success', 'partial', 'failed', 'rolled_back'))
);

CREATE INDEX idx_executions_plan_id     ON executions(plan_id);
CREATE INDEX idx_executions_executed_at ON executions(executed_at DESC);
```

### 11.3 `execution_items`

```sql
CREATE TABLE execution_items (
    id            SERIAL PRIMARY KEY,
    execution_id  VARCHAR(50) NOT NULL REFERENCES executions(execution_id) ON DELETE CASCADE,
    action_type   VARCHAR(20) NOT NULL,
    source_path   TEXT NOT NULL,
    target_path   TEXT,
    status        VARCHAR(20) NOT NULL,
    error_code    VARCHAR(50),
    rollbackable  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_execution_items_action_type CHECK (action_type IN ('move', 'rename', 'archive', 'keep')),
    CONSTRAINT chk_execution_items_status CHECK (status IN ('success', 'failed', 'skipped', 'conflict', 'locked', 'skipped_by_policy'))
);

CREATE INDEX idx_execution_items_execution_id ON execution_items(execution_id);
CREATE INDEX idx_execution_items_status       ON execution_items(status);
```

### 11.4 `organizer_settings`

```sql
CREATE TABLE organizer_settings (
    id               SERIAL PRIMARY KEY,
    watch_folders    JSONB NOT NULL DEFAULT '[]'::jsonb,
    exclude_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
    mode             VARCHAR(20) NOT NULL DEFAULT 'preview',
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_settings_mode CHECK (mode IN ('preview', 'execute'))
);
```

