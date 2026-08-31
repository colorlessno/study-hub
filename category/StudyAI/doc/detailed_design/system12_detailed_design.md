# System 12 詳細設計
## ギフトEC コンシェルジュ＆推薦システム

---

## 1. 実装ディレクトリ構成

```text
category/StudyAI/src/backend/src/studyai/
├── system12_main.py
└── systems/system12/
    ├── api/router.py
    ├── graph/{graph.py,nodes.py,state.py}
    ├── models/gift.py
    ├── prompts/gift_prompt.py
    ├── repositories/{analytics_repository.py,ontology_repository.py,product_repository.py,session_repository.py}
    ├── schemas/gift.py
    └── services/{analytics_service.py,chat_service.py,conversation_agent.py,ontology_rule_engine.py,product_admin_service.py,recommendation_agent.py,search_agent.py,session_memory_service.py}
```

## 2. モジュール詳細

| モジュール | 役割 | 主な関数 |
|---|---|---|
| ChatRouter | 会話 API | `chat()`, `submit_feedback()` |
| ConversationAgent | 条件ヒアリング | `extract_conditions()`, `build_followup_question()` |
| SearchAgent | 商品候補検索 | `search_candidates()` |
| OntologyRuleEngine | NG 条件除外 | `apply_rules()` |
| RecommendationAgent | 上位3候補の理由生成 | `build_recommendations()` |
| SessionMemoryService | 会話条件・履歴保持 | `load_session()`, `store_user_message()`, `merge_conditions()`, `store_recommendations()` |
| ProductAdminService | 商品・オントロジー管理 | `create_product()`, `update_product()` |
| AnalyticsService | 推薦ログ集計 | `get_recommendation_analytics()` |

## 3. API 詳細

### 3.1 POST `/chat`
- 入力: `session_id`, `message`
- 応答:
  - `response_type = question`: 条件不足時
  - `response_type = recommendation`: 条件充足時

### 3.2 POST `/chat/feedback`
- 推薦に対する `liked`, `disliked_reasons`, `selected_product_id` を受ける

### 3.3 管理 API
- `POST /products`
- `GET /products`
- `PUT /products/{product_id}`
- `POST /ontology/scenes`
- `POST /ontology/ng-rules`
- `GET /analytics/recommendations`

## 4. 詳細API I/O 定義

### 4.1 POST `/chat`
**リクエスト**

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `session_id` | string | ○ | 会話セッション |
| `message` | string | ○ | 利用者発話 |

**レスポンス**

| 項目 | 型 | 説明 |
|---|---|---|
| `response_type` | string | question / recommendation |
| `message` | string | 応答本文 |
| `collected_conditions` | object | 抽出済み条件 |
| `recommendations[]` | object[] | 商品候補と理由 |

### 4.2 POST `/chat/feedback`

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `session_id` | string | ○ | 対象セッション |
| `liked` | boolean | ○ | 推薦評価 |
| `disliked_reasons` | string[] |  | 不満理由 |
| `selected_product_id` | integer |  | 選択商品 |

### 4.3 管理 API
**対象API**: `POST /products`, `GET /products`, `PUT /products/{product_id}`, `POST /ontology/scenes`, `POST /ontology/ng-rules`, `GET /analytics/recommendations`

| 項目 | 型 | 説明 |
|---|---|---|
| `name`, `price`, `category` | mixed | 商品基本情報 |
| `tags` | string[] | 商品特徴 |
| `scene_name`, `recipient_name`, `ng_attribute`, `severity` | mixed | オントロジー定義 |
| `analytics` | object | セッション数、商品別推薦回数、肯定・否定件数 |

## 5. 入力チェック仕様
| 対象 | チェック項目 | ルール |
|---|---|---|
| `POST /chat` | `session_id`,`message` | 必須 |
| `POST /chat/feedback` | フィードバック | `liked` 必須 |
| 管理 API | 商品情報 | `name`,`price` 必須 |
| 管理 API | オントロジー定義 | 必須キーを保持 |

## 6. エラー応答仕様
共通レスポンス形式:
```json
{"error_code":"string","message":"string","details":{},"trace_id":"string"}
```

| error_code | HTTP | 発生条件 |
|---|---|---|
| `validation_error` | 422 | Pydantic入力検証違反 |
| `forbidden` | 403 | 管理ロール不足 |
| `not_found` | 404 | 更新対象の商品が存在しない |
| `invalid_severity` | 400 | `warn`、`block`以外の判定方法 |

## 7. バリデーション一覧
| 対象 | ルール | 不正時挙動 |
|---|---|---|
| `response_type` | `question/recommendation` のみ | 422 を返す |
| `price` | 0以上 | 保存拒否 |
| `recommendations[]` | 上位件数上限内 | 再生成 |

## 8. データベース詳細

### 8.1 `system12_products`
- `name`, `price`, `category`, `tags`, `attributes`, `suitable_scenes`, `suitable_recipients`, `embedding`, `is_active`

### 8.2 `system12_scenes` / `system12_recipients` / `system12_ng_rules`
- `scenes`: 贈答シーン定義
- `recipients`: 相手属性定義
- `ng_rules`: シーン・相手・価格帯に対する除外条件

### 8.3 `system12_sessions` / `system12_recommendation_logs`
- `sessions`: 収集済み条件、会話履歴、除外条件
- `recommendation_logs`: 提案候補、score、feedback

## 9. AI 処理詳細

- 抽出条件: `scene`, `recipient`, `budget`, `preference`, `ng_items`
- 推薦理由は商品属性と条件を必ず 1 対 1 で対応付ける
- NG 商品はスコアリング対象に含めない
- 条件抽出は10秒、検索用Embeddingは5秒、理由生成は10秒で打ち切り、語句抽出、キーワード検索、定型理由生成へ個別に切り替える

## 10. 状態・運用設計

- 条件が不十分な限り recommendation へ進ませない
- 同じ`session_id`の条件、履歴、推薦済みIDをPostgreSQLから読み戻す
- analytics は商品別推薦回数と選択商品の肯定・否定件数を集計する
- 商品、NG規則、推薦候補、外部AI処理は一件ずつ順番に処理する

## 11. DDL

### 11.1 `system12_products`

```sql
CREATE TABLE system12_products (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    category            VARCHAR(50),
    price               NUMERIC(10,0) NOT NULL,
    tags                JSONB NOT NULL DEFAULT '[]'::jsonb,
    attributes          JSONB NOT NULL DEFAULT '{}'::jsonb,
    suitable_scenes     JSONB NOT NULL DEFAULT '[]'::jsonb,
    suitable_recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
    formality           INTEGER,
    description         TEXT,
    image_url           VARCHAR(500),
    view_count          INTEGER NOT NULL DEFAULT 0,
    purchase_count      INTEGER NOT NULL DEFAULT 0,
    embedding           VECTOR(768),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system12_products_category  ON system12_products(category);
CREATE INDEX idx_system12_products_active    ON system12_products(is_active);
CREATE INDEX idx_system12_products_embedding ON system12_products USING ivfflat (embedding vector_cosine_ops);
```

### 11.2 `system12_scenes`

```sql
CREATE TABLE system12_scenes (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    formality   INTEGER,
    timing      VARCHAR(100),
    description TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 11.3 `system12_recipients`

```sql
CREATE TABLE system12_recipients (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    formality   INTEGER,
    description TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 11.4 `system12_ng_rules`

```sql
CREATE TABLE system12_ng_rules (
    id           SERIAL PRIMARY KEY,
    scene_id     INTEGER REFERENCES system12_scenes(id) ON DELETE CASCADE,
    recipient_id INTEGER REFERENCES system12_recipients(id) ON DELETE CASCADE,
    ng_attribute VARCHAR(100) NOT NULL,
    reason       TEXT,
    severity     VARCHAR(10) NOT NULL DEFAULT 'warn',
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 11.5 `system12_sessions`

```sql
CREATE TABLE system12_sessions (
    session_id           VARCHAR(50) PRIMARY KEY,
    collected_conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
    recommended_ids      JSONB NOT NULL DEFAULT '[]'::jsonb,
    history              JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 11.6 `system12_recommendation_logs`

```sql
CREATE TABLE system12_recommendation_logs (
    id          SERIAL PRIMARY KEY,
    session_id  VARCHAR(50) NOT NULL REFERENCES system12_sessions(session_id) ON DELETE CASCADE,
    conditions  JSONB NOT NULL DEFAULT '{}'::jsonb,
    recommended JSONB NOT NULL DEFAULT '[]'::jsonb,
    feedback    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system12_recommendation_logs_session ON system12_recommendation_logs(session_id);
```
