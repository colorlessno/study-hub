# System 16 詳細設計
## 案件マッチングシステム（プロジェクト・スキルシート）

---

## 1. 実装ディレクトリ構成

```text
app/
├── api/routes/match.py
├── api/routes/skillsheet.py
├── api/routes/knowledge.py
├── schemas/match.py
├── services/skillsheet_parser.py
├── services/skill_normalizer.py
├── services/requirement_structurer.py
├── services/candidate_profiler.py
├── services/match_scorer.py
├── services/past_case_retriever.py
├── services/report_generator.py
├── repositories/match_repository.py
└── prompts/match_prompt.py
```

## 2. モジュール詳細

| モジュール | 役割 | 主な関数 |
|---|---|---|
| MatchRouter | マッチング API | `match_text()`, `match_file()`, `match_bulk()`, `list_matches()`, `export_matches()`, `get_match()` |
| SkillsheetParser | Excel スキルシート構造化 | `parse_skillsheet()` |
| SkillNormalizer | 同義語辞書による正規化 | `normalize_skill_names()`, `normalize_roles()` |
| RequirementStructurer | 案件要件構造化 | `parse_requirement()` |
| CandidateProfiler | 候補者要約生成 | `build_candidate_profile()` |
| MatchScorer | スコア算出 | `score_match()` |
| PastCaseRetriever | 過去事例検索 | `retrieve_cases()` |
| ReportGenerator | 理由・懸念点・確認ポイント生成 | `generate_report()` |
| PrivacyGuard | 保存前の個人情報マスキングと候補ID匿名化 | `mask_candidate_data()`, `anonymize_candidate_id()` |
| MLflowTracer | 評価モード、結果、処理時間の記録 | `record()` |

## 3. API 詳細

- `POST /match`
- `POST /match/file`
- `POST /match/bulk`
- `POST /skillsheet/parse`
- `POST /knowledge/past-case`
- `GET /matches`
- `GET /matches/export`
- `GET /matches/{match_id}`

## 4. 詳細API I/O 定義

### 4.1 POST `/match`

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `requirement_text` | string | ○ | 案件要件本文 |
| `candidate_text` | string | ○ | 候補者構造化テキスト |

**レスポンス項目**

| 項目 | 型 | 説明 |
|---|---|---|
| `match_id` | integer | 評価ID |
| `score` | number | 総合スコア |
| `level` | string | S / A / B / C |
| `parse_confidence` | number | 解析信頼度 |
| `review_required` | boolean | 人確認要否 |
| `review_reasons` | string[] | 要レビュー理由 |
| `score_breakdown` | object | 技術、工程、ドメイン、役割合致度 |
| `report` | object | 合致理由、強み、懸念点、確認事項 |
| `similar_cases[]` | object[] | 類似事例 |

### 4.2 POST `/match/file` / POST `/match/bulk`

| 項目 | 型 | 説明 |
|---|---|---|
| `requirement_file` | binary | 要件ファイル |
| `candidate_file` / `candidate_files[]` | binary / binary[] | スキルシート |
| `layout_type` | string | 標準A / 標準B / review_required |
| `bulk_id` | integer | 一括評価識別子 |
| `results[]` | object[] | 候補者別評価結果 |

- `candidate_files[]` は選択順に一件ずつ評価し、全件を保存してから `bulk_id` と `results[]` を返す。

### 4.3 POST `/skillsheet/parse`

| 項目 | 型 | 説明 |
|---|---|---|
| `skillsheet_file` | binary | Excelスキルシート |
| `layout_type` | string | 検出レイアウト |
| `parse_confidence` | number | 解析信頼度 |
| `unresolved_skills[]` | string[] | 正規化未解決語 |
| `parsed_result` | object | 案件一覧、スキル集計、工程経験 |

### 4.4 POST `/knowledge/past-case` / GET `/matches` / GET `/matches/export` / GET `/matches/{match_id}`

| 項目 | 型 | 説明 |
|---|---|---|
| `requirement_summary` | string | 過去案件要約 |
| `candidate_profile` | string | 候補者要約 |
| `result`, `notes` | string | 結果と補足 |
| `matches[]` | object[] | 過去評価一覧 |
| CSV | text/csv | 評価履歴の出力 |
| `match_detail` | object | 評価詳細 |

## 5. 入力チェック仕様
| 対象 | チェック項目 | ルール |
|---|---|---|
| `POST /match` | `requirement_text`,`candidate_text` | 必須 |
| `POST /match/file` | ファイル形式 | 要件は文書、候補は `xlsx` |
| `POST /match/bulk` | 件数 | 1件以上を順次処理 |
| `POST /skillsheet/parse` | スキルシート形式 | `xlsx` のみ |
| `POST /skillsheet/parse` | レイアウト | 標準A/B以外は `review_required` |
| `POST /knowledge/past-case` | 要約項目 | `requirement_summary` 必須 |

## 6. エラー応答仕様
共通レスポンス形式:
```json
{"error_code":"string","message":"string","details":{},"trace_id":"string"}
```

| error_code | HTTP | 発生条件 |
|---|---|---|
| `invalid_skillsheet_format` | 400 | スキルシート形式不正 |
| `unsupported_skillsheet_layout` | 422 | 非対応レイアウト |
| `requirement_parse_failed` | 422 | 要件構造化失敗 |
| `candidate_parse_failed` | 422 | 候補者構造化失敗 |
| `match_timeout` | 504 | 評価タイムアウト |
| `past_case_save_failed` | 500 | 過去事例保存失敗 |

## 7. バリデーション一覧
| 対象 | ルール | 不正時挙動 |
|---|---|---|
| `score` | 0〜100 | 422 を返す |
| `level` | `S/A/B/C` のみ | 422 を返す |
| `parse_confidence` | 0.0〜1.0 | 422 を返す |
| `score_breakdown` | 評価軸を必須保持 | 再生成 |
| `review_reasons` | `review_required=true` の場合は1件以上 | 422 を返す |
| `similar_cases[]` | 配列形式 | 422 を返す |

## 8. データベース詳細

### 8.1 `match_results`
- `requirement_text`, `candidate_data_masked`, `score`, `level`, `parse_confidence`, `review_required`, `review_reasons`, `score_breakdown`, `report`, `similar_cases`, `bulk_id`, `candidate_id`, `created_at`

### 8.2 `past_knowledge`
- `requirement_summary`, `candidate_profile`, `result`, `notes`, `embedding`

### 8.3 `skill_aliases`
- `canonical_name`, `alias_name`, `category`, `created_at`

## 9. AI 処理詳細

- 要件書から `must`, `want`, `process`, `role`, `period` を抽出する
- 候補者側は経験年数、工程、技術要素、制約を正規化する
- 正規化は `skill_aliases` の辞書を先に適用し、未解決語だけ LLM 判定へ回す
- レポートには `合致理由`, `懸念点`, `確認ポイント` を必須にする

## 10. スコアリング設計

- `technical_skills = 35`, `process_experience = 25`, `domain_experience = 20`, `role_experience = 20` を満点とする
- `score = technical_skills + process_experience + domain_experience + role_experience`
- 必須スキル充足率が 60% 未満の場合、総合レベルは最大 `B` とする
- `parse_confidence < 0.75`、必須工程未検出、未解決スキル3件超のいずれかで `review_required = true`
- 一括評価では candidate ごとの `score_breakdown` を保持する

## 11. DDL

### 11.1 `match_results`

```sql
CREATE TABLE system16_match_results (
    id                    SERIAL PRIMARY KEY,
    requirement_text      TEXT NOT NULL,
    candidate_data_masked JSONB NOT NULL DEFAULT '{}'::jsonb,
    score                 NUMERIC(5,2) NOT NULL,
    level                 VARCHAR(20),
    parse_confidence      NUMERIC(4,3),
    review_required       BOOLEAN NOT NULL DEFAULT FALSE,
    review_reasons        JSONB NOT NULL DEFAULT '[]'::jsonb,
    score_breakdown       JSONB NOT NULL DEFAULT '{}'::jsonb,
    report                JSONB NOT NULL DEFAULT '{}'::jsonb,
    similar_cases         JSONB NOT NULL DEFAULT '[]'::jsonb,
    bulk_id               INTEGER,
    candidate_id          VARCHAR(100),
    created_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system16_match_results_created_at ON system16_match_results(created_at DESC);
CREATE INDEX idx_system16_match_results_score ON system16_match_results(score DESC);
CREATE INDEX idx_system16_match_results_bulk_id ON system16_match_results(bulk_id);
CREATE INDEX idx_system16_match_results_review_required ON system16_match_results(review_required);
```

### 11.2 `past_knowledge`

```sql
CREATE TABLE system16_past_knowledge (
    id                  SERIAL PRIMARY KEY,
    requirement_summary TEXT NOT NULL,
    candidate_profile   TEXT,
    result              VARCHAR(50),
    notes               TEXT,
    embedding           VECTOR(768),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system16_past_knowledge_result ON system16_past_knowledge(result);
CREATE INDEX idx_system16_past_knowledge_embedding ON system16_past_knowledge USING ivfflat (embedding vector_cosine_ops);
```

### 11.3 `skill_aliases`

```sql
CREATE TABLE system16_skill_aliases (
    id             SERIAL PRIMARY KEY,
    canonical_name VARCHAR(100) NOT NULL,
    alias_name     VARCHAR(100) NOT NULL,
    category       VARCHAR(30),
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (alias_name, category)
);

CREATE INDEX idx_system16_skill_aliases_canonical_name ON system16_skill_aliases(canonical_name);
CREATE INDEX idx_system16_skill_aliases_category ON system16_skill_aliases(category);
```

