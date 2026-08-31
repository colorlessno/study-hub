# System 04 詳細設計
## 商品・サービス レビュー分析＆インサイト抽出システム

---

## 1. 実装ディレクトリ構成

```text
app/
├── api/routes/analyze.py
├── schemas/analysis.py
├── services/input_normalizer.py
├── services/sentiment_analyzer.py
├── services/topic_extractor.py
├── services/insight_generator.py
├── services/compare_analyzer.py
├── repositories/analysis_repository.py
├── models/analysis.py
├── models/review_result.py
└── prompts/review_analysis_prompt.py
```

## 2. モジュール詳細

| モジュール | 役割 | 主な関数 |
|---|---|---|
| AnalysisRouter | 分析 API 受付 | `analyze()`, `analyze_file()`, `compare()` |
| InputNormalizer | CSV/JSON 入力正規化 | `normalize_reviews()` |
| SentimentAnalyzer | 感情極性と強度判定 | `classify_sentiment()` |
| TopicExtractor | トピック抽出と代表文抽出 | `extract_topics()` |
| InsightGenerator | インサイト・改善提案生成 | `generate_insight()` |
| CompareAnalyzer | 複数商品比較 | `compare_products()` |

## 3. API 詳細

### 3.1 POST `/analyze`
- 入力: 商品名、レビュー配列
- 応答: `summary`, `sentiment_breakdown`, `topics[]`, `insights[]`

### 3.2 POST `/analyze/file`
- 入力: CSV/JSON ファイル
- 正規化後に `/analyze` と同じパイプラインを流す

### 3.3 POST `/compare`
- 入力: 複数商品レビュー集合
- 応答: 商品別評価差、共通課題、差分トピック

### 3.4 GET `/analyses` / GET `/analyses/{analysis_id}`
- 条件: `product_name`, `from_date`, `to_date`
- 詳細はレビュー件数、トピック別代表文、改善提案を返す

## 4. 詳細API I/O 定義

### 4.1 POST `/analyze`
**リクエスト**

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `product_name` | string | ○ | 対象商品名 |
| `reviews[]` | object[] | ○ | `text`, `score`, `date` |

**レスポンス**

| 項目 | 型 | 説明 |
|---|---|---|
| `analysis_id` | integer | 分析ID |
| `total_reviews` | integer | 対象件数 |
| `sentiment_summary` | object | 感情件数・平均値 |
| `topics[]` | object[] | 主要トピック |
| `insights` | object | 改善提案を含む要約 |
| `individual_results[]` | object[] | レビュー別分析結果 |

### 4.2 POST `/analyze/file`

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `file` | binary | ○ | CSVレビュー一覧 |
| `product_name` | string |  | 商品名補助情報 |

### 4.3 POST `/compare`

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `products[]` | object[] | ○ | `product_name`, `reviews[]` |

**レスポンス**

| 項目 | 型 | 説明 |
|---|---|---|
| `comparison_id` | integer | 比較ID |
| `products[]` | object[] | 商品別集計 |
| `diff_points[]` | object[] | 差分トピック |
| `recommendations[]` | object[] | 優先改善案 |

### 4.4 GET `/analyses` / GET `/analyses/{analysis_id}`

| 項目 | 型 | 説明 |
|---|---|---|
| `product_name` | string | 絞り込み |
| `from_date` / `to_date` | string(date) | 期間 |
| `analysis_id` | integer | 詳細対象 |

## 5. 入力チェック仕様
| 対象 | チェック項目 | ルール |
|---|---|---|
| `POST /analyze` | レビュー件数 | 1件以上必須 |
| `POST /analyze` | レビュー本文 | 空文字不可 |
| `POST /analyze/file` | ファイル形式 | CSV のみ |
| `POST /compare` | 比較対象 | 2商品以上必須 |

## 6. エラー応答仕様
共通レスポンス形式:
```json
{"error_code":"string","message":"string","details":{},"trace_id":"string"}
```

| error_code | HTTP | 発生条件 |
|---|---|---|
| `empty_reviews` | 400 | レビュー0件 |
| `invalid_review_file` | 400 | CSV形式不正 |
| `comparison_target_shortage` | 400 | 比較対象不足 |
| `analysis_timeout` | 504 | 分析タイムアウト |
| `invalid_model_output` | 422 | 出力構造不正 |

## 7. バリデーション一覧
| 対象 | ルール | 不正時挙動 |
|---|---|---|
| `sentiment` | `positive/negative/neutral` | 422 を返す |
| `sentiment_score` | -1.0〜1.0 | 422 を返す |
| `intensity` | `強い/普通/弱い` | 要確認扱い |
| `improvements[].priority` | `高/中/低` | 再生成 |

## 8. データベース詳細

### 8.1 `analyses`
- `id`, `product_name`, `total_reviews`, `summary`, `compare_flag`, `created_at`

### 8.2 `review_results`
- `analysis_id`, `sentiment`, `sentiment_score`, `topics`, `review_excerpt`, `source_id`
- 詳細表示に必要な最小限のレビュー抜粋のみ保持する

## 9. AI 処理詳細

### 9.1 感情判定
- `positive / neutral / negative`
- 強度は 1〜5
- 皮肉・婉曲表現は中立へ倒さず、文脈重視で判定

### 9.2 トピック抽出
- 固定ラベル優先、未知ラベルは補助候補として扱う
- 同義トピックは集約して 1 ラベル化する

### 9.3 改善提案
- 提案は「課題」「根拠」「改善アクション」の 3 点セットで生成
- 自由作文のみで終わらせず、必ずレビュー根拠数を付ける

## 10. エラー・品質設計

- レビュー件数がしきい値未満なら `analysis_status = insufficient_data`
- ファイル取込失敗行は `invalid_rows` として件数返却
- 比較分析では商品単位の件数差が大きすぎる場合に警告を返す

## 11. DDL

### 11.1 `analyses`

```sql
CREATE TABLE analyses (
    id                 SERIAL PRIMARY KEY,
    product_name       VARCHAR(255) NOT NULL,
    total_reviews      INTEGER NOT NULL,
    sentiment_summary  JSONB NOT NULL,
    topics             JSONB NOT NULL,
    insights           JSONB NOT NULL,
    compare_flag       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analyses_product_name ON analyses(product_name);
CREATE INDEX idx_analyses_created_at   ON analyses(created_at DESC);
```

### 11.2 `review_results`

```sql
CREATE TABLE review_results (
    id               SERIAL PRIMARY KEY,
    analysis_id      INTEGER NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
    source_id        VARCHAR(100),
    review_score     NUMERIC(2,1),
    review_date      DATE,
    review_excerpt   TEXT,
    sentiment        VARCHAR(20) NOT NULL,
    sentiment_score  NUMERIC(3,2) NOT NULL,
    intensity        VARCHAR(10),
    topics           JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_review_results_sentiment
        CHECK (sentiment IN ('positive', 'negative', 'neutral'))
);

CREATE INDEX idx_review_results_analysis_id ON review_results(analysis_id);
CREATE INDEX idx_review_results_sentiment   ON review_results(sentiment);
```

