# System 02 詳細設計
## 契約書・文書 リスク審査システム

---

## 1. 実装ディレクトリ構成

```text
src/backend/src/studyai/systems/system02/
├── api/router.py
├── schemas/review.py
├── services/document_parser.py
├── services/chunk_service.py
├── services/risk_review_engine.py
├── services/compare_review_engine.py
├── services/issue_aggregator.py
├── services/review_service.py
├── repositories/review_repository.py
├── models/review.py
├── prompts/review_prompt.py
└── utils/mlflow_tracer.py

src/frontend/src/pages/System02Page.tsx
```

## 2. モジュール詳細

| モジュール | 役割 | 主な関数 |
|---|---|---|
| ReviewRouter | `/review` `/compare` `/reviews*` の受付 | `review()`, `compare()`, `list_reviews()`, `compare_reviews()` |
| DocumentParser | PDF/docx/txtの本文抽出とPDFページ数取得 | `extract_text()`, `count_pages()`, `normalize_contract_text()` |
| ChunkService | 条番号・見出し単位の分割 | `split_by_clause()`, `align_for_compare()` |
| RiskReviewEngine | 単一文書審査 | `run_review()` |
| CompareReviewEngine | 2 文書比較審査 | `run_compare()` |
| IssueAggregator | issue の重複排除と要約統合 | `merge_issues()`, `build_summary()` |
| ReviewRepository | 審査結果保存・検索 | `create_review()`, `create_issues()`, `list_reviews()`, `get_review()` |
| MLflowTracer | 原文を含めない実行トレース | `record()` |

## 3. API 詳細

### 3.1 POST `/review`
- 入力: 単一ファイル、`perspective`
- 検証: ファイル種別、20MB、PDF50ページ、抽出後9万文字、空本文、定義済み視点
- 応答: `summary`, `recommendation`, `issues[]`

### 3.2 POST `/compare`
- 入力: 比較対象 2 文書、`perspective`
- 処理: `ChunkService.align_for_compare()` で条番号・見出し対応を生成
- 応答: 追加リスク、変更点、比較サマリ

### 3.3 GET `/reviews` / GET `/reviews/{review_id}` / GET `/reviews/compare`
- 一覧は `document_type`, `overall_risk`, `from_date`, `to_date` を受ける
- 詳細は保存済みサマリーと指摘を返す。ただし原文・原文抜粋は返さない
- 比較APIは異なる `review_id_a`, `review_id_b` を受け、追加・解消issueと総合リスク・推奨度差分を返す

## 4. 詳細API I/O 定義

### 4.1 POST `/review`
**リクエスト**

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `file` | binary | ○ | PDF / Word / text |
| `perspective` | string | ○ | 当事者ロールまたは中立 |

**レスポンス**

| 項目 | 型 | 説明 |
|---|---|---|
| `review_id` | integer | 審査結果ID |
| `document_type` | string | 契約類型 |
| `perspective` | string | 審査視点 |
| `summary` | object | `overall_risk`, `recommendation`, `top_priorities` |
| `issues[]` | object[] | `type`, `severity`, `article`, `description`, `suggested_text` |

### 4.2 POST `/compare`
**リクエスト**

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `file_a` | binary | ○ | 自社ひな形 |
| `file_b` | binary | ○ | 相手方提示版 |
| `perspective` | string | ○ | 審査視点 |

**レスポンス**

| 項目 | 型 | 説明 |
|---|---|---|
| `comparison_id` | integer | 比較結果ID |
| `review_a` / `review_b` | object | 各審査結果要約 |
| `diff_issues[]` | object[] | 追加・解消リスク |
| `recommendation_diff` | object | 推奨度変化 |

### 4.3 GET `/reviews` / GET `/reviews/{review_id}` / GET `/reviews/compare`
**クエリ項目**

| 項目 | 型 | 説明 |
|---|---|---|
| `document_type` | string | 文書種別絞り込み |
| `overall_risk` | string | 総合リスク |
| `from_date` / `to_date` | string(date) | 期間絞り込み |
| `review_id_a` / `review_id_b` | integer | 比較対象 |

## 5. 入力チェック仕様
| 対象 | チェック項目 | ルール |
|---|---|---|
| `POST /review` | ファイル形式 | PDF / Word / text のみ |
| `POST /review` | ファイルサイズ | 20MB以内 |
| `POST /review` | PDFページ数 | 50ページ以内 |
| `POST /review` | 抽出本文 | 空でなく9万文字以内 |
| `POST /review` | `perspective` | 定義済み当事者ロールのみ |
| `POST /compare` | 比較ファイル | `file_a`と`file_b`の両方必須、PDFは合計100ページ以内 |
| `GET /reviews/compare` | 比較ID | 異なる2件を指定 |

## 6. エラー応答仕様
共通レスポンス形式:
```json
{"error_code":"string","message":"string","details":{},"trace_id":"string"}
```

| error_code | HTTP | 発生条件 |
|---|---|---|
| `unsupported_file_type` | 422 | 非対応文書形式 |
| `invalid_perspective` | 422 | 視点値不正 |
| `empty_document` | 422 | 抽出本文なし |
| `file_too_large` | 422 | 20MB超過 |
| `document_page_limit_exceeded` | 422 | ページ数超過 |
| `review_timeout` | 504 | 審査タイムアウト |
| `invalid_model_output` | 422 | 出力 JSON 不整合 |

## 7. バリデーション一覧
| 対象 | ルール | 不正時挙動 |
|---|---|---|
| `severity` | `critical/high/medium/low` | 422 を返す |
| `type` | `unfavorable/missing/legal_check` | 422 を返す |
| `document_type` | 定義済み6種類 | 再生成 |
| LLM JSON | Pydanticの生成結果スキーマに適合 | 最大3回まで順次再試行後、422を返す |

## 8. データベース詳細

### 8.1 `system02_contract_reviews`
| カラム | 型 | 備考 |
|---|---|---|
| `id` | serial | PK |
| `review_type` | varchar(20) | single / compare |
| `file_name` | varchar(255) | 表示用ファイル名 |
| `document_type` | varchar(50) | 契約種別 |
| `perspective` | varchar(30) | 審査視点 |
| `overall_risk` | varchar(20) | 総合リスク |
| `recommendation` | varchar(30) | AI一次審査結果 |
| `summary` | jsonb | 全体要約 |
| `total_issues` | integer | 指摘件数 |
| `file_hash` | varchar(64) | 単票/比較元A |
| `file_hash_b` | varchar(64) | 比較時のみ |
| `compare_payload` | jsonb | A/Bのサマリー。原文は含めない |
| `created_at` | timestamp | 作成日時 |

### 8.2 `system02_contract_issues`
- `review_id` FK
- `issue_type`, `severity`, `article`, `description`, `risk_explanation`, `suggested_text`
- 既存DB互換用のnullableな`original_text`列は残すが、新規保存時は常にnullとする
- `position_start`, `position_end`を任意保持し、将来のハイライト表示に備える

## 9. AI 処理詳細

### 9.1 出力ルール
- `severity`は`critical / high / medium / low`
- 単一審査の`type`は`unfavorable / missing / legal_check`
- 比較審査の`type`は`added / removed / changed`
- `article`が取れない場合はnullを返す
- 指摘は重要度の高いものから最大3件とし、説明と修正案を簡潔に返す
- 思考過程は出力せず、Pydanticで検証できる審査結果JSONだけを返す
- 推奨度は低リスク=`そのまま締結可`、中リスク=`要修正後締結`、高リスク=`締結不推奨`
- 確定的な法的判断を避け、専門家確認を促す

### 9.2 フォールバック
- 文書構造抽出失敗時は3,000文字単位の分割へ切り替える
- 出力検証失敗時はissueを空で返さず、同じ処理を一つずつ最大3回まで再試行する
- 各LLM処理は90秒で打ち切り、`review_timeout`を返す

## 10. エラー・監査設計

- 審査結果と比較対象ハッシュを`trace_id`で監査ログ・MLflowに関連付ける
- 法的助言確定ではない旨を API レスポンスと画面に固定表示する
- 保存するのは審査結果とハッシュであり、原文ファイル・本文・原文抜粋はDB、MLflow、監査ログへ保存しない
- MLflowのローカルSQLiteにはモデル名、処理時間、chunk数、issue数、トークン数、再試行回数、成否を記録する

## 11. DDL

### 11.1 `system02_contract_reviews`

```sql
CREATE TABLE system02_contract_reviews (
    id             SERIAL PRIMARY KEY,
    review_type    VARCHAR(20) NOT NULL,
    file_name      VARCHAR(255),
    file_hash      VARCHAR(64),
    file_hash_b    VARCHAR(64),
    document_type  VARCHAR(50),
    perspective    VARCHAR(30),
    overall_risk   VARCHAR(20),
    recommendation VARCHAR(30),
    summary        JSONB NOT NULL,
    total_issues   INTEGER NOT NULL DEFAULT 0,
    compare_payload JSONB NOT NULL,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system02_contract_reviews_created_at ON system02_contract_reviews(created_at DESC);
CREATE INDEX idx_system02_contract_reviews_document_type ON system02_contract_reviews(document_type);
CREATE INDEX idx_system02_contract_reviews_recommendation ON system02_contract_reviews(recommendation);
```

### 11.2 `system02_contract_issues`

```sql
CREATE TABLE system02_contract_issues (
    id             SERIAL PRIMARY KEY,
    review_id      INTEGER NOT NULL REFERENCES system02_contract_reviews(id) ON DELETE CASCADE,
    issue_type     VARCHAR(30) NOT NULL,
    severity       VARCHAR(10) NOT NULL,
    article        VARCHAR(100),
    description    TEXT NOT NULL,
    risk_explanation TEXT,
    suggested_text TEXT,
    original_text  TEXT NULL,
    position_start INTEGER,
    position_end   INTEGER,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system02_contract_issues_review_id ON system02_contract_issues(review_id);
CREATE INDEX idx_system02_contract_issues_severity ON system02_contract_issues(severity);
CREATE INDEX idx_system02_contract_issues_type ON system02_contract_issues(issue_type);
```

