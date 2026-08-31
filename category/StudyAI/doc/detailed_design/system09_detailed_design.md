# System 09 詳細設計
## 市場競合調査 エージェント

---

## 1. 実装ディレクトリ構成

```text
src/studyai/systems/system09/
├── api/router.py
├── schemas/research.py
├── models/report.py
├── repositories/report_repository.py
├── graph/
│   ├── graph.py
│   ├── nodes.py
│   └── state.py
├── services/
│   ├── research_service.py
│   ├── research_planner.py
│   ├── query_generator.py
│   ├── report_composer.py
│   └── export_service.py
└── prompts/research_prompt.py

src/studyai/common/search/
├── web_search_tool.py
├── web_fetch_tool.py
└── source_evaluator.py
```

## 2. モジュール詳細

| モジュール | 役割 | 主な関数 |
|---|---|---|
| API Router | 調査 API 入口 | `start_research()`, `list_reports()`, `get_report()`, `export_report()` |
| ResearchService | 調査、一覧、詳細、出力、監査ログ | `run_research()`, `list_reports()`, `get_report()`, `export_report()` |
| ResearchGraphOrchestrator | LangGraphの逐次ステップ制御 | `run()` |
| ResearchPlanner | 調査観点整理 | `build_research_plan()` |
| QueryGenerator | 検索クエリ生成 | `generate_queries()` |
| SourceEvaluator | 採否・重複排除 | `filter_sources()` |
| ReportComposer | レポート整形 | `compose_report()` |
| ExportService | Markdown 出力 | `export_markdown()` |

## 3. API 詳細

### 3.1 POST `/research`
- 入力: 調査種別、対象企業群、目的、自社情報、深度、重点項目
- 処理:
  1. 調査計画立案
  2. クエリ生成
  3. 検索クエリと検索結果を一つずつ順番に情報取得
  4. ソース採否判定
  5. レポート生成
- 応答: `report_id`, `executive_summary`, `comparison_table`, `swot`

### 3.2 GET `/reports`
- フィルタ: `research_type`, `target`, `from_date`, `to_date`

### 3.3 GET `/reports/{report_id}` / GET `/reports/{report_id}/export`
- 詳細は出典一覧、主要発見、企業比較、SWOT を返す
- export は Markdown 形式固定

## 4. 詳細API I/O 定義

### 4.1 POST `/research`
**リクエスト**

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `research_type` | string | ○ | `競合調査` / `市場調査` / `業界調査` / `企業調査` |
| `targets` | string[] | ○ | 対象企業。1〜5件 |
| `purpose` | string |  | 調査目的 |
| `own_company` | object |  | 自社名と強み |
| `depth` | string |  | `overview` / `standard` / `detailed`または`概要` / `標準` / `詳細` |
| `focus_areas` | string[] |  | 比較観点 |

**レスポンス**

| 項目 | 型 | 説明 |
|---|---|---|
| `report_id` | integer | レポートID |
| `research_type` | string | 調査種別 |
| `targets` | string[] | 調査対象 |
| `executed_at` | datetime | 実行日時 |
| `search_count` | integer | 検索回数 |
| `executive_summary` | string | 調査概要 |
| `key_findings` | string[] | 主要な発見 |
| `companies` | object[] | 企業別結果と出典URL |
| `comparison_table` | object | 比較表 |
| `swot` | object | SWOT分析 |
| `trends` | string | 市場動向 |
| `limitations` | string | 制約・未取得情報 |
| `markdown` | string | Markdown本文 |
| `purpose` / `own_company` / `depth` / `focus_areas` | 各型 | 入力条件の再表示 |

### 4.2 GET `/reports` / GET `/reports/{report_id}` / GET `/reports/{report_id}/export`

| 項目 | 型 | 説明 |
|---|---|---|
| `from_date` / `to_date` | string(date) | 一覧絞り込み |
| `report_id` | integer | 詳細対象 |
| `report` | object | 一覧はID・種別・テーマ・対象・作成日時、詳細は調査結果全体 |
| `format` | string | `markdown`固定 |
| `content` | string | Markdown本文 |

## 5. 入力チェック仕様
| 対象 | チェック項目 | ルール |
|---|---|---|
| `POST /research` | `research_type` | 許可された4種のみ |
| `POST /research` | `targets` | 1〜5件 |
| `POST /research` | `depth` | 許可値のみ |
| `GET /reports` | 期間条件 | 前後関係を確認 |
| `GET /reports/{report_id}/export` | 出力形式 | 許可形式のみ |

## 6. エラー応答仕様
共通レスポンス形式:
```json
{"error_code":"string","message":"string","details":{},"trace_id":"string"}
```

| error_code | HTTP | 発生条件 |
|---|---|---|
| `invalid_research_type` | 400 | 調査種別不正 |
| `invalid_targets` / `too_many_targets` | 400 | 対象が0件または6件以上 |
| `invalid_depth` | 400 | 深度不正 |
| `invalid_report_filters` | 400 | 一覧の日付などが不正 |
| `report_not_found` | 404 | レポート不存在 |
| `invalid_export_format` | 400 | Markdown以外を指定 |

## 7. バリデーション一覧
| 対象 | ルール | 不正時挙動 |
|---|---|---|
| `report.sections` | 必須セクションを持つ | 再生成 |
| `comparison_items[]` | 1件以上 | 再生成 |
| `confidence` | 0.0〜1.0 またはラベル許可値 | 422 を返す |

## 8. データベース詳細

### 8.1 `system09_reports`
- 入力条件: `research_type`, `theme`, `targets`, `purpose`, `own_company`, `depth`, `focus_areas`
- 調査結果: `search_count`, `executive_summary`, `key_findings`, `companies`, `comparison_table`, `swot`, `trends`, `limitations`, `markdown`
- 検索記録・管理: `sources_json`, `query_log_json`, `target_normalized_key`, `created_at`

### 8.2 補助保持
- `sources_json`: 出典 URL と採用理由
- `query_log_json`: 発行クエリと取得件数

## 9. AI 処理詳細

- 出力は「要約」「比較」「出典」の 3 層に分ける
- 出典のない主張は禁止
- 類似情報は企業単位・論点単位でまとめる

## 10. エラー・品質設計

- 採用可能なWeb情報がない場合は入力対象からフォールバック情報を作り、limitationsに制約を明示する
- 同一ドメインの重複出典は 1 件に集約する
- 取得失敗したクエリは`query_log_json`へ結果0件と理由を記録する

## 11. DDL

### 11.1 `system09_reports`

```sql
CREATE TABLE system09_reports (
    id               SERIAL PRIMARY KEY,
    research_type    VARCHAR(50) NOT NULL,
    theme            VARCHAR(255) NOT NULL,
    targets          JSONB NOT NULL DEFAULT '[]'::jsonb,
    purpose          TEXT,
    own_company      JSONB NOT NULL DEFAULT '{}'::jsonb,
    depth            VARCHAR(20) NOT NULL DEFAULT 'standard',
    focus_areas      JSONB NOT NULL DEFAULT '[]'::jsonb,
    search_count     INTEGER NOT NULL DEFAULT 0,
    executive_summary TEXT,
    key_findings     JSONB NOT NULL DEFAULT '[]'::jsonb,
    companies        JSONB NOT NULL DEFAULT '[]'::jsonb,
    comparison_table JSONB NOT NULL DEFAULT '[]'::jsonb,
    swot             JSONB NOT NULL DEFAULT '{}'::jsonb,
    trends           TEXT,
    limitations      TEXT,
    markdown         TEXT,
    sources_json     JSONB NOT NULL DEFAULT '[]'::jsonb,
    query_log_json   JSONB NOT NULL DEFAULT '[]'::jsonb,
    target_normalized_key VARCHAR(500) NOT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system09_reports_research_type ON system09_reports(research_type);
CREATE INDEX idx_system09_reports_created_at ON system09_reports(created_at);
CREATE INDEX idx_system09_reports_target_key ON system09_reports(target_normalized_key);
```

