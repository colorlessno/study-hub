# System 13 詳細設計
## プロジェクト参画者向け 初期教育エージェント

---

## 1. 実装ディレクトリ構成

```text
src/studyai/systems/system13/
├── api/router.py
├── schemas/education.py
├── models/education.py
├── services/ask_service.py
├── services/catchup_report_service.py
├── services/checklist_service.py
├── services/admin_dashboard_service.py
├── services/knowledge_ingestion_service.py
├── services/knowledge_retriever.py
├── repositories/
└── prompts/onboarding_prompt.py
```

## 2. モジュール詳細

| モジュール | 役割 | 主な関数 |
|---|---|---|
| AskRouter | 初期教育 Q&A | `ask()` |
| KnowledgeRouter | ナレッジ登録 | `create_knowledge()`, `create_knowledge_from_file()`, `list_knowledge()` |
| CatchupReportService | 緊急キャッチアップレポート生成 | `build_report()` |
| ChecklistService | 学習進捗管理 | `get_checklist()`, `update_item()` |
| AdminDashboardService | 質問傾向・未回答可視化 | `build_dashboard()` |

## 3. API 詳細

- `POST /ask`
  - 入力: `session_id`, `user_id`, `project_id`, `role`, `question`
  - 応答: `answer_id`, `session_id`, `question`, `answer`, `confidence`, `sources`, `warning`, `related_info`, `escalation`
- `GET /catchup-report`
  - 入力: `user_id`, `project_id`
  - 応答: 直近で先に読むべき事項、未消化トピック、注意点
- `POST /knowledge`
- `POST /knowledge/file`
- `GET /knowledge`
- `GET /users/{user_id}/checklist`
- `PATCH /users/{user_id}/checklist/{item_id}`
- `GET /admin/dashboard`

## 4. 詳細API I/O 定義

### 4.1 POST `/ask`

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `session_id` | string | ○ | セッションID |
| `project_id` | string | ○ | プロジェクト識別子 |
| `user_id` | string | ○ | 参画者ID |
| `question` | string | ○ | 質問文 |

**レスポンス項目**

| 項目 | 型 | 説明 |
|---|---|---|
| `answer_id` | integer | 回答ID |
| `answer` | string | 回答本文 |
| `confidence` | string | 高 / 中 / 低 |
| `sources[]` | object[] | 根拠ナレッジ |
| `warning` | string | 地雷・注意喚起 |
| `related_info[]` | string[] | 関連情報 |

### 4.2 GET `/catchup-report`

| 項目 | 型 | 説明 |
|---|---|---|
| `project_id` | string | 対象プロジェクト |
| `user_id` | string | 利用者 |
| `role` | string | 開発者 / PM / テスター |
| `overview` | string | 現状要約 |
| `critical_issues[]` | string[] | 最重要課題 |
| `landmines[]` | string[] | 地雷情報 |

### 4.3 ナレッジ API
**対象API**: `POST /knowledge`, `POST /knowledge/file`, `GET /knowledge`

| 項目 | 型 | 説明 |
|---|---|---|
| `project_id` | string | プロジェクト識別子 |
| `category` | string | ナレッジカテゴリ |
| `title` | string | タイトル |
| `content` / `file` | string / binary | 登録本文またはファイル |
| `importance` | string | high / medium / low |
| `is_landmine` | boolean | 地雷情報フラグ |

### 4.4 チェックリスト / 管理 API
**対象API**: `GET /users/{user_id}/checklist`, `PATCH /users/{user_id}/checklist/{item_id}`, `GET /admin/dashboard`

| 項目 | 型 | 説明 |
|---|---|---|
| `user_id`, `item_id` | string / integer | 更新対象 |
| `status` | string | pending / in_progress / completed |
| `dashboard` | object | 未回答質問、進捗低位者、頻出質問 |

## 5. 入力チェック仕様
| 対象 | チェック項目 | ルール |
|---|---|---|
| `POST /ask` | `session_id`,`project_id`,`user_id`,`question` | 必須 |
| `GET /catchup-report` | `project_id`,`user_id` | 必須 |
| ナレッジ API | `content` または `file` | いずれか必須 |
| チェックリスト API | `status` | 許可状態のみ |

## 6. エラー応答仕様
共通レスポンス形式:
```json
{"error_code":"string","message":"string","details":{},"trace_id":"string"}
```

| error_code | HTTP | 発生条件 |
|---|---|---|
| `project_not_found` | 404 | プロジェクト不存在 |
| `cross_project_access_denied` | 403 | 他プロジェクト参照 |
| `knowledge_not_found` | 404 | ナレッジ不存在 |
| `checklist_item_not_found` | 404 | 項目不存在 |
| `insufficient_knowledge` | 409 | 回答材料不足 |

## 7. バリデーション一覧
| 対象 | ルール | 不正時挙動 |
|---|---|---|
| `importance` | `high/medium/low` のみ | 保存拒否 |
| `status` | `pending/in_progress/completed` のみ | 保存拒否 |
| `has_warning` | boolean のみ | 422 を返す |
| `project_id` | フィルタ必須 | 処理中止 |

## 8. データベース詳細

### 8.1 `system13_projects`
- `id`, `name`, `overview`, `start_date`, `end_date`, `status`, `tech_stack`, `members`

### 8.2 `system13_knowledge`
- `project_id`, `category`, `title`, `content`, `importance`, `is_landmine`, `registered_by`, `embedding`, `is_active`

### 8.3 `system13_members`
- `id`, `user_id`, `project_id`, `name`, `role`, `joined_at`

### 8.4 `system13_sessions` / `system13_question_logs` / `system13_checklist_items`
- Q&A 履歴、confidence、warning 有無、回答可否、学習進捗を保持する

## 9. AI 処理詳細

- 回答は「まず何を知るべきか」を優先する
- warning は「運用上まだ確認が必要な点」のみ返す
- catchup report は重要度高・更新日新しい順で構成する

## 10. 運用設計

- プロジェクトごとに検索対象ナレッジを分離する
- checklist 更新は利用者の操作を一件ずつ処理する
- 管理画面では未回答質問を FAQ 候補として再利用する

## 11. DDL

### 11.1 `system13_projects`

```sql
CREATE TABLE system13_projects (
    id          VARCHAR(50) PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    overview    TEXT,
    start_date  DATE,
    end_date    DATE,
    status      VARCHAR(20),
    tech_stack  JSONB NOT NULL DEFAULT '[]'::jsonb,
    members     JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 11.2 `system13_knowledge`

```sql
CREATE TABLE system13_knowledge (
    id             SERIAL PRIMARY KEY,
    project_id     VARCHAR(50) NOT NULL REFERENCES system13_projects(id) ON DELETE CASCADE,
    category       VARCHAR(50),
    title          VARCHAR(255),
    content        TEXT NOT NULL,
    importance     VARCHAR(10) NOT NULL DEFAULT 'medium',
    is_landmine    BOOLEAN NOT NULL DEFAULT FALSE,
    registered_by  VARCHAR(100),
    source_type    VARCHAR(20) NOT NULL DEFAULT 'official',
    embedding      VECTOR(768),
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_knowledge_importance CHECK (importance IN ('high', 'medium', 'low'))
);

CREATE INDEX idx_system13_knowledge_project_id ON system13_knowledge(project_id);
CREATE INDEX idx_system13_knowledge_category   ON system13_knowledge(category);
CREATE INDEX idx_system13_knowledge_embedding  ON system13_knowledge USING ivfflat (embedding vector_cosine_ops);
```

### 11.3 `system13_members`

```sql
CREATE TABLE system13_members (
    id          SERIAL PRIMARY KEY,
    user_id     VARCHAR(50) NOT NULL,
    project_id  VARCHAR(50) NOT NULL REFERENCES system13_projects(id) ON DELETE CASCADE,
    name        VARCHAR(100),
    role        VARCHAR(50),
    joined_at   DATE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, project_id)
);
```

### 11.4 `system13_sessions`

```sql
CREATE TABLE system13_sessions (
    session_id  VARCHAR(50) PRIMARY KEY,
    project_id  VARCHAR(50) NOT NULL REFERENCES system13_projects(id) ON DELETE CASCADE,
    user_id     VARCHAR(50) NOT NULL,
    history     JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 11.5 `system13_question_logs`

```sql
CREATE TABLE system13_question_logs (
    id           SERIAL PRIMARY KEY,
    session_id   VARCHAR(50) NOT NULL REFERENCES system13_sessions(session_id) ON DELETE CASCADE,
    project_id   VARCHAR(50) NOT NULL,
    user_id      VARCHAR(50) NOT NULL,
    question     TEXT NOT NULL,
    answer       TEXT,
    sources      JSONB NOT NULL DEFAULT '[]'::jsonb,
    related_info JSONB NOT NULL DEFAULT '[]'::jsonb,
    confidence   VARCHAR(10),
    escalation   JSONB,
    has_warning  BOOLEAN NOT NULL DEFAULT FALSE,
    is_answered  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system13_question_logs_project_id ON system13_question_logs(project_id);
CREATE INDEX idx_system13_question_logs_created_at ON system13_question_logs(created_at);
```

### 11.6 `system13_checklist_items`

```sql
CREATE TABLE system13_checklist_items (
    id           SERIAL PRIMARY KEY,
    project_id   VARCHAR(50) NOT NULL REFERENCES system13_projects(id) ON DELETE CASCADE,
    user_id      VARCHAR(50) NOT NULL,
    role         VARCHAR(50),
    title        TEXT NOT NULL,
    category     VARCHAR(50),
    status       VARCHAR(20) NOT NULL DEFAULT 'pending',
    due_days     INTEGER,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system13_checklist_user_project ON system13_checklist_items(user_id, project_id);
```
