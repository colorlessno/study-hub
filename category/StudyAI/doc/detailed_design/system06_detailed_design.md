# System 06 詳細設計
## カスタマーサポート 自動応答＆エスカレーションシステム

---

## 1. 実装ディレクトリ構成

```text
src/studyai/systems/system06/
├── api/router.py
├── schemas/support.py
├── models/support.py
├── repositories/
│   ├── inquiry_repository.py
│   ├── faq_repository.py
│   ├── escalation_repository.py
│   └── session_repository.py
├── services/
│   ├── inquiry_service.py
│   ├── inquiry_classifier.py
│   ├── faq_retriever.py
│   ├── response_generator.py
│   ├── escalation_service.py
│   ├── faq_admin_service.py
│   ├── stats_service.py
│   └── pii_masker.py
└── prompts/support_prompt.py
```

## 2. モジュール詳細

| モジュール | 役割 | 主な関数 |
|---|---|---|
| Router / InquiryService | 問い合わせ受付、評価、一覧、状態更新 | `create_inquiry()`, `submit_feedback()`, `list_inquiries()`, `update_status()` |
| InquiryClassifier | 分類と優先度判定 | `classify()` |
| FAQRetriever | FAQ と過去回答検索 | `retrieve()` |
| ResponseGenerator | 回答文生成 | `generate_response()` |
| EscalationService | 担当者エスカレーション判定・記録 | `should_escalate()`, `create_escalation()` |
| FAQAdminService | FAQ 登録・一括取込 | `create_faq()`, `import_faqs()` |
| StatsService | 問い合わせ・FAQ統計 | `get_summary()` |
| PIIMasker | 電話番号・メールアドレス等のマスキング | `mask()` |

## 3. API 詳細

### 3.1 POST `/inquiries`
- 入力: `session_id`, `user_id`, `message`, `order_id?`, `member_id?`, `channel?`, `context_note?`
- 処理:
  1. 個人情報をマスキングしてセッションを記録
  2. 分類と優先度を判定
  3. エスカレーション要否を先に判定
  4. 自動回答対象だけFAQ検索と回答生成を順番に実行
  5. 問い合わせ、回答、根拠、次の操作を保存
- 応答: `inquiry_id`, `session_id`, `classification`, `response`, `escalated`, `escalation_id?`

### 3.2 POST `/inquiries/{inquiry_id}/feedback`
- 入力: `is_resolved`, `rating`, `comment`
- FAQ ヒット精度と未回答質問集計に利用する

### 3.3 PATCH `/inquiries/{inquiry_id}/status`
- 状態: `open`, `answered`, `escalated`, `closed`
- 人手対応時の担当者、対応メモを保持する

### 3.4 FAQ / 統計 API
- `POST /faq`
- `POST /faq/import`
- `GET /inquiries`
- `GET /stats/summary`

## 4. 詳細API I/O 定義

### 4.1 POST `/inquiries`
**リクエスト**

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `session_id` | string | ○ | 会話セッション識別子 |
| `user_id` | string | ○ | 利用者識別子 |
| `message` | string | ○ | 問い合わせ本文 |
| `order_id` | string |  | 注文識別子 |
| `member_id` | string |  | 会員識別子 |
| `channel` | string |  | mail / chat / form。既定はform |
| `context_note` | string |  | 回答生成時の補足情報 |

**レスポンス**

| 項目 | 型 | 説明 |
|---|---|---|
| `inquiry_id` | integer | 問い合わせID |
| `session_id` | string | 会話セッション識別子 |
| `classification` | object | category / priority / confidence |
| `response` | object | type / message / sources / next_actions / is_resolved_question / escalation_reason |
| `escalated` | boolean | エスカレーション要否 |
| `escalation_id` | integer/null | エスカレーション記録ID |

### 4.2 POST `/inquiries/{inquiry_id}/feedback`

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `is_resolved` | boolean | ○ | 問い合わせが解決したか |
| `rating` | integer |  | 1〜5の評価 |
| `comment` | string |  | 補足コメント |

### 4.3 PATCH `/inquiries/{inquiry_id}/status`

| 項目 | 型 | 必須 | 説明 |
|---|---|---|---|
| `status` | string | ○ | open / answered / escalated / closed |
| `assignee` | string |  | 担当者 |
| `resolution` | string |  | 対応内容 |

### 4.4 FAQ / 統計 API
**対象API**: `POST /faq`, `POST /faq/import`, `GET /inquiries`, `GET /stats/summary`

| 項目 | 型 | 説明 |
|---|---|---|
| `faq_no`, `title`, `question`, `answer`, `category` | string | FAQ 登録 |
| `file` | binary | FAQ一括取込 |
| `from_date` / `to_date` | string(date) | 問い合わせ検索期間 |
| `summary` | object | 件数、解決率、エスカレーション率 |

## 5. 入力チェック仕様
| 対象 | チェック項目 | ルール |
|---|---|---|
| `POST /inquiries` | `message` | 空文字不可 |
| `POST /inquiries` | `channel` | 許可チャネルのみ |
| `POST /inquiries/{inquiry_id}/feedback` | フィードバック値 | boolean 必須 |
| `PATCH /inquiries/{inquiry_id}/status` | 状態遷移 | 定義済み遷移のみ |
| FAQ API | 取込ファイル | 許可形式のみ |

## 6. エラー応答仕様
共通レスポンス形式:
```json
{"error_code":"string","message":"string","details":{},"trace_id":"string"}
```

| error_code | HTTP | 発生条件 |
|---|---|---|
| `inquiry_not_found` | 404 | 問い合わせ不存在 |
| `invalid_status_transition` | 409 | 状態遷移不正 |
| `faq_import_failed` | 400 | FAQ取込失敗 |
| `auto_answer_failed` | 500 | 自動回答生成失敗 |

## 7. バリデーション一覧
| 対象 | ルール | 不正時挙動 |
|---|---|---|
| `channel` | `mail/chat/form` 等の許可値のみ | 400 を返す |
| `status` | `open/answered/escalated/closed` を許可 | 400 を返す |
| FAQ項目 | `question`,`answer` 必須 | 保存拒否 |

## 8. データベース詳細

### 8.1 `system06_inquiries`
- `id`, `session_id`, `user_id`, `channel`, `order_id`, `member_id`, `message_masked`, `category`, `priority`, `confidence`
- `response_type`, `response_message`, `response_sources`, `next_actions`, `is_resolved`, `rating`, `feedback_comment`
- `status`, `assignee`, `resolution`, `escalated`, `escalation_id`, `created_at`, `updated_at`

### 8.2 `system06_faqs`
- `faq_no`, `title`, `question`, `answer`, `category`, `embedding`, `is_active`, `use_count`, `created_at`, `updated_at`

### 8.3 `system06_sessions`
- 連続会話対応用の `session_id`, `user_id`, `history_json`, `created_at`, `updated_at`

### 8.4 `system06_escalations`
- `inquiry_id`, `assignee`, `reason`, `recommendation`, `notified_at`, `handled_at`, `created_at`

## 9. AI 処理詳細

- 分類ラベルは固定語彙
- 優先度は `high / medium / low`
- FAQ 根拠が弱い場合は自動回答せずエスカレーション優先
- 回答文は敬体、1 問い合わせ 1 主回答を原則にする

## 10. エラー・運用設計

- FAQ 一括取込で失敗した行は行番号付きで返す
- 問い合わせ受付失敗でも原文はロストさせず、最低限 `inquiries` に原文保存する
- `stats/summary` は件数、分類分布、エスカレーション率、解決率を返す

## 11. DDL

実際のAlembic migrationでは、外部キー参照元となる`system06_sessions`を`system06_inquiries`より先に作成し、以降を一つずつ順番に作成する。
### 11.1 `system06_inquiries`

```sql
CREATE TABLE system06_inquiries (
    id             SERIAL PRIMARY KEY,
    session_id     VARCHAR(50) REFERENCES system06_sessions(session_id) ON DELETE SET NULL,
    user_id        VARCHAR(50),
    channel        VARCHAR(20) NOT NULL DEFAULT 'form',
    order_id       VARCHAR(100),
    member_id      VARCHAR(100),
    message_masked TEXT NOT NULL,
    category       VARCHAR(50),
    priority       VARCHAR(10),
    confidence     VARCHAR(10),
    response_type  VARCHAR(20),
    response_message TEXT,
    response_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
    next_actions   JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_resolved    BOOLEAN,
    rating         INTEGER,
    feedback_comment TEXT,
    status         VARCHAR(20) NOT NULL DEFAULT 'open',
    assignee       VARCHAR(255),
    resolution     TEXT,
    escalated      BOOLEAN NOT NULL DEFAULT FALSE,
    escalation_id INTEGER,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system06_inquiries_created_at ON system06_inquiries(created_at);
CREATE INDEX idx_system06_inquiries_status     ON system06_inquiries(status);
CREATE INDEX idx_system06_inquiries_category   ON system06_inquiries(category);
CREATE INDEX idx_system06_inquiries_user_category ON system06_inquiries(user_id, category);
```

### 11.2 `system06_faqs`

```sql
CREATE TABLE system06_faqs (
    id         SERIAL PRIMARY KEY,
    faq_no     VARCHAR(30) UNIQUE,
    title      VARCHAR(255) NOT NULL,
    question   TEXT NOT NULL,
    answer     TEXT NOT NULL,
    category   VARCHAR(50),
    embedding  VECTOR(768),
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    use_count  INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system06_faqs_category  ON system06_faqs(category);
CREATE INDEX idx_system06_faqs_use_count ON system06_faqs(use_count);
CREATE INDEX idx_system06_faqs_embedding ON system06_faqs USING ivfflat (embedding vector_cosine_ops);
```

### 11.3 `system06_sessions`

```sql
CREATE TABLE system06_sessions (
    session_id       VARCHAR(50) PRIMARY KEY,
    user_id          VARCHAR(50),
    history_json     JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 11.4 `system06_escalations`

```sql
CREATE TABLE system06_escalations (
    id          SERIAL PRIMARY KEY,
    inquiry_id  INTEGER NOT NULL REFERENCES system06_inquiries(id) ON DELETE CASCADE,
    assignee    VARCHAR(255),
    reason      TEXT NOT NULL,
    recommendation TEXT,
    notified_at TIMESTAMP,
    handled_at  TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_system06_escalations_inquiry ON system06_escalations(inquiry_id);
CREATE INDEX idx_system06_escalations_assignee ON system06_escalations(assignee);
```

