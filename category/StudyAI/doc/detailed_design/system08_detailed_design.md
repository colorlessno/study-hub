# System 08 詳細設計
## 未体験作業 タスク洗い出し＆優先順位付けエージェント

---

## 1. 実装ディレクトリ構成

```text
src/studyai/systems/system08/
├── api/router.py
├── schemas/analysis.py
├── models/analysis.py
├── repositories/analysis_repository.py
├── graph/
│   ├── graph.py
│   ├── nodes.py
│   └── state.py
├── services/
│   ├── analysis_service.py
│   ├── query_planner.py
│   ├── search_evaluator.py
│   ├── task_generator.py
│   ├── priority_scorer.py
│   └── export_service.py
└── prompts/task_agent_prompt.py
```

## 2. モジュール詳細

| モジュール | 役割 | 主な関数 |
|---|---|---|
| API Router | 分析 API | `start_analysis()`, `list_analyses()`, `get_analysis()`, `update_task_status()`, `export_analysis()` |
| AnalysisService | ユースケース制御、入力値検証、監査ログ | `start_analysis()`, `list_analyses()`, `get_analysis()`, `update_task_status()`, `export_analysis()` |
| AnalysisGraphOrchestrator | LangGraph の逐次ステップ制御 | `run()` |
| QueryPlanner | 追加調査クエリ生成 | `plan_queries()` |
| SearchEvaluator | 情報充足度判定 | `need_more_search()` |
| TaskGenerator | タスク洗い出し | `generate_tasks()` |
| PriorityScorer | 緊急度・重要度算出 | `score_tasks()` |
| ExportService | JSON/Markdown/CSV 出力 | `export_json()`, `export_markdown()`, `export_csv()` |
| AnalysisRepository | 分析・タスクの永続化 | `create_analysis()`, `replace_tasks()`, `complete_analysis()`, `update_task_status()` |

## 3. API 詳細

### 3.1 POST `/analyze`
- 入力: テーマ、背景、現状、制約、役割、分析深度、出力形式
- 処理:
  1. 初期理解
  2. 検索クエリ生成
  3. 検索先を一つずつ順番に情報収集
  4. タスク抽出
  5. 優先順位付け
- 応答: 永続化完了後の `analysis_id`, `tasks[]`, `priority_summary`, `markdown`, 件数・見積時間、`status=completed`

### 3.2 GET `/analyses/{analysis_id}` / GET `/analyses`
- 詳細はタスク一覧、優先度、依存関係、根拠を返す

### 3.3 PATCH `/analyses/{analysis_id}/tasks/{task_id}`
- 更新対象: `status`, `note`

### 3.4 GET `/analyses/{analysis_id}/export`
- `format=markdown|json|csv`

## 4. 詳細API I/O 定義

### 4.1 POST `/analyze`
**リクエスト**

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `theme` | string | ○ | 分析対象作業。1文字以上 |
| `background` | string |  | 背景 |
| `current_status` | string |  | 現状 |
| `constraints` | string |  | 制約条件 |
| `role` | string |  | 想定する担当者の役割 |
| `depth` | string |  | `概要レベル` / `標準レベル` / `詳細レベル`。既定値は`詳細レベル` |
| `output_format` | string |  | `json`。分析結果自体にはMarkdownも生成する |

**レスポンス**

| 項目 | 型 | 説明 |
|---|---|---|
| `analysis_id` | integer | 分析ID |
| `theme` | string | 分析対象作業 |
| `search_count` | integer | 実施した検索回数 |
| `search_queries[]` | string[] | 使用した検索クエリ |
| `status` | string | 永続化完了時は`completed` |
| `tasks[]` | object[] | 洗い出しタスク |
| `priority_summary` | object | 4象限、推奨順、最初の1週間のタスク番号 |
| `markdown` | string | Markdown形式の分析結果 |
| `total_tasks` | integer | タスク件数 |
| `total_estimated_hours` | number | 見積時間合計 |
| `created_at` | datetime | 作成日時 |

### 4.2 GET `/analyses/{analysis_id}` / GET `/analyses`

| 項目 | 型 | 説明 |
|---|---|---|
| `analysis_id` | integer | 詳細対象 |
| `status` | string | 実行状態 |
| `priority_summary` | object | 4象限、推奨順、最初の1週間のタスク番号 |
| `tasks[]` | object[] | タスク一覧 |

### 4.3 PATCH `/analyses/{analysis_id}/tasks/{task_id}`

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `status` | string | ○ | todo / doing / done |
| `note` | string |  | 補足メモ |

### 4.4 GET `/analyses/{analysis_id}/export`

| 項目 | 型 | 説明 |
|---|---|---|
| `format` | string | `markdown` / `csv` / `json` |
| `content` | string | 指定形式の出力本文 |

## 5. 入力チェック仕様
| 対象 | チェック項目 | ルール |
|---|---|---|
| `POST /analyze` | `theme` | 1文字以上 |
| `POST /analyze` | `depth` | `概要レベル` / `標準レベル` / `詳細レベル` |
| `PATCH /analyses/{analysis_id}/tasks/{task_id}` | タスク状態 | 許可値のみ |
| `GET /analyses/{analysis_id}/export` | 出力形式 | 許可形式のみ |

## 6. エラー応答仕様
共通レスポンス形式:
```json
{"error_code":"string","message":"string","details":{},"trace_id":"string"}
```

| error_code | HTTP | 発生条件 |
|---|---|---|
| `analysis_not_found` | 404 | 分析不存在 |
| `invalid_task_status` | 400 | 状態値不正 |
| `invalid_export_format` | 400 | 出力形式不正 |
| `model_timeout` | 502 | LLM呼び出しがタイムアウト |

## 7. バリデーション一覧
| 対象 | ルール | 不正時挙動 |
|---|---|---|
| `priority` | `high/medium/low` 等の許可値のみ | 422 を返す |
| `tasks[]` | 1件以上 | 422 を返す |
| `status` | `todo/doing/done` 等のみ | 400 を返す |

## 8. データベース詳細

### 8.1 `system08_analyses`
- 入力: `theme`, `background`, `current_status`, `constraints`, `role`, `depth`, `output_format`
- 検索・生成結果: `search_count`, `search_queries`, `sources_json`, `summary`, `priority_summary`, `markdown`, `total_tasks`, `total_estimated_hours`
- 管理: `status`, `created_at`, `updated_at`

### 8.2 `system08_tasks`
- `analysis_id`, `task_no`, `name`, `description`, `category`, `priority`, `urgency`, `importance`, `quadrant`, `dependencies`, `estimated_hours`, `assignee_skill`, `cautions`, `references`, `confidence`, `evidence`, `status`, `note`

## 9. AI 処理詳細

- タスクは「やること」が主語になる文で出力する
- 優先度は `high / medium / low`
- `quadrant` は `緊急かつ重要` など 4 象限で保持する
- 検索根拠のないタスクは禁止し、各タスクに `evidence` を持たせる

## 10. 状態遷移・運用設計

- `system08_analyses.status`: 作成時`created`、全ステップと永続化の完了時`completed`
- `system08_tasks.status`: `todo -> doing -> done`
- エクスポートは保存済み分析から本文を生成し、分析状態は変更しない
- 再分析時は旧タスクを履歴として残し、新しい分析結果を別レコードで作成する

## 11. DDL

### 11.1 `system08_analyses`

```sql
CREATE TABLE system08_analyses (
    id                    SERIAL PRIMARY KEY,
    theme                 TEXT NOT NULL,
    background            TEXT,
    current_status        TEXT,
    constraints           TEXT,
    role                  VARCHAR(100),
    depth                 VARCHAR(20),
    output_format         VARCHAR(20) NOT NULL DEFAULT 'json',
    search_count          INTEGER NOT NULL DEFAULT 0,
    search_queries        JSONB NOT NULL DEFAULT '[]'::jsonb,
    sources_json          JSONB NOT NULL DEFAULT '[]'::jsonb,
    summary               TEXT,
    priority_summary      JSONB NOT NULL DEFAULT '{}'::jsonb,
    markdown              TEXT,
    total_tasks           INTEGER NOT NULL DEFAULT 0,
    total_estimated_hours NUMERIC(8,1) NOT NULL DEFAULT 0,
    status                VARCHAR(20) NOT NULL DEFAULT 'created',
    created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system08_analyses_created_at ON system08_analyses(created_at);
CREATE INDEX idx_system08_analyses_status ON system08_analyses(status);
```

### 11.2 `system08_tasks`

```sql
CREATE TABLE system08_tasks (
    id            SERIAL PRIMARY KEY,
    analysis_id   INTEGER NOT NULL REFERENCES system08_analyses(id) ON DELETE CASCADE,
    task_no       INTEGER NOT NULL,
    name          VARCHAR(255) NOT NULL,
    description   TEXT NOT NULL,
    category      VARCHAR(50),
    priority      VARCHAR(10) NOT NULL,
    urgency       VARCHAR(10),
    importance    VARCHAR(10),
    quadrant      VARCHAR(20),
    dependencies  JSONB NOT NULL DEFAULT '[]'::jsonb,
    estimated_hours NUMERIC(8,1),
    assignee_skill VARCHAR(255),
    cautions      TEXT,
    references    JSONB NOT NULL DEFAULT '[]'::jsonb,
    confidence    VARCHAR(10),
    evidence      JSONB NOT NULL DEFAULT '[]'::jsonb,
    note          TEXT,
    status        VARCHAR(20) NOT NULL DEFAULT 'todo',
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system08_tasks_analysis_id ON system08_tasks(analysis_id);
CREATE INDEX idx_system08_tasks_priority ON system08_tasks(priority);
CREATE INDEX idx_system08_tasks_status ON system08_tasks(status);
```

