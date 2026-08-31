# System 06 要件定義

## このテーマでできるようになること

- 要件定義で扱う「AIの役割範囲・Human-in-the-loop要件・RAG要件・ガードレール要件」を説明できる
- 基本設計で扱う「埋め込みモデル・pgvector・LlamaIndex・プロンプトインジェクション対策」を説明できる
- 詳細設計で扱う「RAG詳細設計・Human-in-the-loop割り込みポイント定義・メモリ設計（短期）・JSON出力固定」を説明できる
- 実装で扱う「RAGパイプライン実装・pgvector・メモリ（短期）実装・Webhook通知実装・MLflowトレース」を説明できる
- 検証で扱う「ガードレール検証（強制エスカレーション条件検証）」を説明できる
- FastAPI・PostgreSQL・SQLAlchemy・Pythonを横断的に使う構成を説明できる

## カスタマーサポート 自動応答＆エスカレーションシステム

---

## システム概要

問い合わせ内容をLLMが分類・回答し、解決できない場合は担当者にエスカレーションする判断まで自動で行うシステム。FAQへの回答・注文確認・返金対応などをカバーし、サポート担当者の工数を削減しながら対応品質を均質化する。

---

## 現状の課題

- 同じ内容の問い合わせが繰り返され、担当者の工数を圧迫している
- 担当者によって回答品質・対応速度にばらつきがある
- 夜間・休日の問い合わせに即時対応できない
- エスカレーション判断が属人的で、対応漏れ・遅延が発生する
- 過去の対応事例が属人的に蓄積されていて、ナレッジとして活用できていない

---

## 対象ユーザー

- エンドユーザー（問い合わせ側）
- カスタマーサポート担当者（対応・管理側）
- サポートマネージャー（品質管理・分析側）

---

## 機能要件

### 1. 問い合わせ受付機能
以下の形式で問い合わせを受け付ける。

**テキスト入力**
- 問い合わせ内容をAPIで受け取る
- 最大文字数：5,000文字

**添付情報**
- 注文番号・会員ID等の識別情報
- エラーメッセージ・スクリーンショットのテキスト説明

### 2. 問い合わせ分類機能
LLMが問い合わせ内容を以下の観点で分類する。

**カテゴリ分類**

| カテゴリ | 説明 |
|---------|------|
| 注文・購入 | 注文方法・在庫確認・購入手続き |
| 配送・納期 | 配送状況・納期・住所変更 |
| キャンセル・変更 | 注文キャンセル・内容変更 |
| 返品・交換 | 返品手続き・交換対応 |
| 返金 | 返金手続き・返金状況確認 |
| 不具合・品質 | 商品の不具合・品質クレーム |
| アカウント | ログイン・パスワード・会員情報 |
| 請求・支払い | 請求内容・支払い方法・領収書 |
| その他 | 上記に該当しない内容 |

**優先度判定**

| 優先度 | 判定基準 |
|--------|---------|
| 緊急 | 法的要求・決済トラブル・個人情報漏洩疑い |
| 高 | クレーム・返金要求・当日対応が必要なもの |
| 中 | 一般的な問い合わせ・2〜3日以内対応 |
| 低 | 参考情報・急ぎではない確認 |

### 3. 自動回答機能（RAG）
FAQおよび過去の対応履歴をRAGで参照し、LLMが回答を生成する。

> 📝 FAQドキュメントと過去対応履歴をベクトル化してpgvectorに保存し、問い合わせ内容と類似した情報を検索してプロンプトに差し込む。

**回答の構成**

| 項目 | 説明 |
|------|------|
| 回答本文 | 問い合わせに対する自然文での回答 |
| 根拠FAQ | 回答の根拠となったFAQ番号・タイトル |
| 次のアクション | ユーザーが取るべき手順の案内 |
| 解決確認 | 「この回答で解決しましたか？」の確認 |
| 信頼度 | 回答の確信度（高・中・低） |

**自動回答の判断基準**
- 信頼度が「高」の場合：自動回答を送信
- 信頼度が「中」の場合：回答を生成しつつ担当者レビューフラグを付与
- 信頼度が「低」の場合：自動回答せずエスカレーション

### 4. エスカレーション機能
以下の条件でエスカレーションを実行する。

**自動エスカレーション条件**
- 信頼度が「低」の場合
- 優先度が「緊急」の場合
- 返金・法的要求が含まれる場合
- ユーザーが「担当者と話したい」と要求した場合
- 同一ユーザーから3回以上同一問題で問い合わせがある場合

**エスカレーション時の処理**
- 担当者にWebhook（Slack等）で通知
- 問い合わせ内容・分類・優先度・推奨対応をセットで通知
- 担当者アサインの記録

### 5. 会話管理機能（メモリ）
同一問い合わせセッション内での会話コンテキストを保持する。

- 直前のやり取りを参照して文脈を維持
- 「それについてもう少し詳しく」のような参照に対応
- セッションは24時間で自動終了

### 6. FAQナレッジ管理機能
- FAQをベクトルDBに登録・更新・削除
- CSVでの一括インポート
- よく使われたFAQのランキング取得
- 自動回答できなかった質問の一覧取得（FAQ整備に活用）

### 7. 対応履歴・統計機能
- 問い合わせ一覧・対応履歴の取得
- カテゴリ別・優先度別の件数集計
- 自動解決率・エスカレーション率の統計
- 平均対応時間・解決時間の統計
- 担当者別の対応件数・解決率

---

## 非機能要件

| 項目 | 要件 |
|------|------|
| 応答時間 | 自動回答：30秒以内 |
| セキュリティ | 個人情報（氏名・メールアドレス・注文番号）はマスキングしてDBに保存 |
| 対応言語 | 日本語・英語 |
| 可用性 | 24時間365日稼働（夜間・休日も自動回答） |

---

## システム構成

```
ユーザー（クライアント）
        ↓
    FastAPI（APIサーバー）
        ↓
    セッション管理（会話履歴）
        ↓
    LLM（分類・優先度判定）
    ※ Qwen3-27B / LM Studio
        ↓
    ┌─────────────────────────────────┐
    │  RAG：FAQ・過去対応履歴検索       │
    │  問い合わせをベクトル化           │
    │  → pgvectorで類似情報を検索     │
    │  → 上位5件をプロンプトに差し込み  │
    └─────────────────────────────────┘
        ↓
    自動回答判断
    ┌─────────────────────┐
    │ 信頼度 高 → 自動回答  │
    │ 信頼度 中 → レビュー待 │
    │ 信頼度 低 → エスカレ  │
    └─────────────────────┘
        ↓
    エスカレーション時 → Webhook通知
        ↓
    PostgreSQL（問い合わせ・回答・ログ保存）
        ↓
    JSONレスポンス返却
```

---

## API仕様

### POST /inquiries
問い合わせを送信して自動回答を受け取る。

**リクエスト（JSON）**
```json
{
  "session_id": "sess_abc123",
  "user_id": "user_001",
  "message": "先日注文した商品がまだ届きません。注文番号はORD-2024-001です。",
  "order_id": "ORD-2024-001"
}
```

**レスポンス（JSON）**
```json
{
  "inquiry_id": 1,
  "session_id": "sess_abc123",
  "classification": {
    "category": "配送・納期",
    "priority": "中",
    "confidence": "高"
  },
  "response": {
    "type": "auto",
    "message": "ご注文ORD-2024-001の配送状況を確認いたしました。現在、配送業者への引き渡しが完了しており、通常2〜3営業日以内にお届けの予定です。お急ぎの場合は、配送業者の追跡番号「TRACK-123456」でリアルタイムの配送状況をご確認いただけます。",
    "sources": ["FAQ-023: 配送状況の確認方法"],
    "next_actions": ["配送業者サイトで追跡番号TRACK-123456を入力して状況を確認する"],
    "is_resolved_question": "この回答でご不明点は解決しましたか？"
  },
  "escalated": false
}
```

**エスカレーション時のレスポンス（JSON）**
```json
{
  "inquiry_id": 2,
  "session_id": "sess_def456",
  "classification": {
    "category": "返金",
    "priority": "高",
    "confidence": "低"
  },
  "response": {
    "type": "escalated",
    "message": "ご不便をおかけし、誠に申し訳ございません。お問い合わせの内容を担当者に引き継ぎました。担当者より改めてご連絡いたします。通常、1営業日以内にご連絡差し上げます。",
    "escalation_reason": "返金要求のため担当者対応が必要"
  },
  "escalated": true,
  "escalation_id": 1
}
```

### POST /inquiries/{inquiry_id}/feedback
問い合わせへのフィードバックを送信する。

**リクエスト（JSON）**
```json
{
  "is_resolved": true,
  "rating": 5,
  "comment": "すぐに解決できました"
}
```

### PATCH /inquiries/{inquiry_id}/status
担当者が対応状況を更新する。

**リクエスト（JSON）**
```json
{
  "status": "closed",
  "assignee": "tanaka@example.com",
  "resolution": "配送状況を確認し、追跡番号を案内した"
}
```

`status`はAPI値として`open`（未対応）、`answered`（回答済み）、`escalated`（担当者へ引き継ぎ）、`closed`（完了）を使用し、画面では日本語名を表示する。

### POST /faq
FAQを登録する。

**リクエスト（JSON）**
```json
{
  "faq_no": "FAQ-023",
  "title": "配送状況の確認方法",
  "question": "注文した商品の配送状況を確認したい",
  "answer": "ご注文後にお送りするメール内の追跡番号を使って、配送業者のサイトでご確認いただけます。",
  "category": "配送・納期"
}
```

### POST /faq/import
CSVでFAQを一括インポートする。

### GET /inquiries
問い合わせ一覧を取得する。

**クエリパラメータ**
```
category:   カテゴリ
priority:   優先度
status:     対応状況
escalated:  エスカレーション済みのみ
from_date:  開始日
to_date:    終了日
```

### GET /stats/summary
統計サマリーを取得する。

---

## データモデル

### system06_inquiriesテーブル
```sql
CREATE TABLE system06_inquiries (
    id                SERIAL PRIMARY KEY,
    session_id        VARCHAR(50) REFERENCES system06_sessions(session_id) ON DELETE SET NULL,
    user_id           VARCHAR(50),
    channel           VARCHAR(20) DEFAULT 'form',
    order_id          VARCHAR(100),
    member_id         VARCHAR(100),
    message_masked    TEXT,              -- 個人情報マスキング済み
    category          VARCHAR(50),
    priority          VARCHAR(10),
    confidence        VARCHAR(10),       -- 高・中・低
    response_type     VARCHAR(20),       -- auto・escalated・review
    response_message  TEXT,
    response_sources  JSONB DEFAULT '[]'::jsonb,
    next_actions      JSONB DEFAULT '[]'::jsonb,
    is_resolved       BOOLEAN,
    rating            INTEGER,
    feedback_comment  TEXT,
    status            VARCHAR(20) DEFAULT 'open',
    assignee          VARCHAR(255),
    resolution        TEXT,
    escalated         BOOLEAN DEFAULT FALSE,
    escalation_id     INTEGER,
    created_at        TIMESTAMP DEFAULT NOW(),
    updated_at        TIMESTAMP DEFAULT NOW()
);
```

### system06_faqsテーブル
```sql
CREATE TABLE system06_faqs (
    id          SERIAL PRIMARY KEY,
    faq_no      VARCHAR(30) UNIQUE,
    title       VARCHAR(255) NOT NULL,
    question    TEXT NOT NULL,
    answer      TEXT NOT NULL,
    category    VARCHAR(50),
    use_count   INTEGER DEFAULT 0,
    is_active   BOOLEAN DEFAULT TRUE,
    embedding   VECTOR(768),            -- pgvector
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);
```

### system06_sessionsテーブル
```sql
CREATE TABLE system06_sessions (
    session_id  VARCHAR(50) PRIMARY KEY,
    user_id     VARCHAR(50),
    history_json JSONB DEFAULT '[]'::jsonb,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);
```

### system06_escalationsテーブル
```sql
CREATE TABLE system06_escalations (
    id               SERIAL PRIMARY KEY,
    inquiry_id       INTEGER REFERENCES system06_inquiries(id) ON DELETE CASCADE,
    reason           TEXT NOT NULL,
    recommendation   TEXT,
    assignee         VARCHAR(255),
    notified_at      TIMESTAMP,
    handled_at       TIMESTAMP,
    created_at       TIMESTAMP DEFAULT NOW()
);
```

---

## プロンプト仕様

### 分類・回答生成プロンプト
```
あなたはカスタマーサポートの専門家AIです。
以下の問い合わせを分析し、分類・回答を生成してください。

参照FAQ・過去対応履歴：
{retrieved_knowledge}

会話履歴：
{conversation_history}

問い合わせ内容：
{message}

ルール：
1. FAQや過去対応履歴を根拠に回答すること
2. 根拠がない場合は信頼度を「低」にしてエスカレーションを推奨すること
3. 返金・法的要求・個人情報漏洩に関わる内容は必ずエスカレーションすること
4. 回答は丁寧かつ簡潔にすること
5. ユーザーの感情（不満・怒り）に寄り添った文章にすること
6. 必ず指定のJSONフォーマットで返すこと
```

---

## ガードレール設計

- JSON形式が壊れていた場合：最大3回まで再試行
- 優先度「緊急」の場合：即時Webhook通知
- 返金・法的要求が含まれる場合：強制エスカレーション
- 個人情報（氏名・メール・電話・クレジットカード番号）はDB保存前にマスキング
- セッション24時間経過で自動終了
- 同一ユーザーから3回以上同一問題の問い合わせ：自動エスカレーション

---

## 技術スタック

| 用途 | 技術 |
|------|------|
| APIサーバー | FastAPI |
| LLM | Qwen3-27B（Q4量子化）/ LM Studio経由 |
| 埋め込みモデル | nomic-embed-text（ローカル）/ LM Studio経由 |
| ベクトルDB | pgvector（PostgreSQL拡張） |
| RAGフレームワーク | LlamaIndex |
| 出力バリデーション | Pydantic |
| DB | PostgreSQL |
| ORM | SQLAlchemy |
| 通知 | httpx（Webhook送信） |
| トレース・ログ | MLflow |

---

## 対応する知識マップ項目

| 工程 | 習得できる知識マップ項目 |
|------|----------------------|
| 工程1：要件定義 | AIの役割範囲・Human-in-the-loop要件・RAG要件・ガードレール要件 |
| 工程2：基本設計 | 埋め込みモデル・pgvector・LlamaIndex・プロンプトインジェクション対策 |
| 工程3：詳細設計 | RAG詳細設計・Human-in-the-loop割り込みポイント定義・メモリ設計（短期）・JSON出力固定 |
| 工程4：実装 | RAGパイプライン実装・pgvector・メモリ（短期）実装・Webhook通知実装・MLflowトレース |
| 工程5：検証 | ガードレール検証（強制エスカレーション条件検証） |
| 横断 | FastAPI・PostgreSQL・SQLAlchemy・Python |

---

## 対象外（スコープ外）

- 画面UI（フロントエンド）
- メール・チャット（LINE・Slack等）との直接連携
- 自動返信メールの送信（回答は人間が確認してから送信）
- 音声対応（電話サポート）
- 決済・返金処理の実行（判断のみ。実行は人間が行う）

## 学習完了の目安

- [ ] 工程1：要件定義：AIの役割範囲・Human-in-the-loop要件・RAG要件・ガードレール要件
- [ ] 工程2：基本設計：埋め込みモデル・pgvector・LlamaIndex・プロンプトインジェクション対策
- [ ] 工程3：詳細設計：RAG詳細設計・Human-in-the-loop割り込みポイント定義・メモリ設計（短期）・JSON出力固定
- [ ] 工程4：実装：RAGパイプライン実装・pgvector・メモリ（短期）実装・Webhook通知実装・MLflowトレース
- [ ] 工程5：検証：ガードレール検証（強制エスカレーション条件検証）
- [ ] 横断：FastAPI・PostgreSQL・SQLAlchemy・Python
