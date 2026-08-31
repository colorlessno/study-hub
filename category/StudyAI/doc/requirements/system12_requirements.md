# System 12 要件定義

## このテーマでできるようになること

- 要件定義で扱う「オントロジー・意味設計要件、会話条件、検索・推薦、ガードレール要件」を説明できる
- 基本設計で扱う「**マルチエージェント設計**・**オーケストレーター設計**・ツール設計・LangGraph・埋め込みモデル・pgvector」を説明できる
- 詳細設計で扱う「エージェント処理順、分岐条件、状態管理、PostgreSQLによる会話メモリ」を説明できる
- 実装で扱う「LangGraphオーケストレーター、条件抽出、商品検索、NG規則、理由生成、pgvector、監査ログ」を説明できる
- 検証で扱う「条件不足時の追加質問、予算上限、NG規則、有効商品のみの推薦」を説明できる
- FastAPI・PostgreSQL・SQLAlchemy・Pythonを横断的に使う構成を説明できる

## ギフトEC コンシェルジュ＆推薦システム

---

## システム概要

ユーザーが贈り物の相談をすると、会話で条件を引き出し、自社商品DBから適切な候補を推薦し、LLMが推薦理由を生成して返すシステム。オントロジーによる意味設計と会話エージェントを組み合わせ、「ギフト選びの専門スタッフ」をAIで実現する。

---

## 現状の課題

- ギフト選びに迷うユーザーが離脱してしまう
- 「誰に・何のために・予算はいくら」の条件を引き出せず、的外れな商品を勧めてしまう
- 季節・シーン・贈答相手のマナーを考慮した推薦ができない
- 推薦理由を説明できず、ユーザーが選択に自信を持てない
- NGな商品（縁起・アレルギー・好みに合わない）を除外できない

---

## 対象ユーザー

- ギフトECサイトのエンドユーザー（贈り物を探している人）
- ECサイト運営者・MD担当者（商品・オントロジー管理側）

---

## オントロジー設計について

> 📝 **本システムにおけるオントロジー**
> 「商品」「贈答シーン」「贈答相手」「価格帯」「NG条件」といった概念と、その概念同士の意味関係をデータとして持つ構造。「焼き菓子 → 常温保存可 → 手土産向き」「高級酒 → 目上向け → 好み差が大きい」のような意味のつながりを定義することで、AIが文脈に応じた推薦判断をできるようにする。

---

## 機能要件

### 1. 会話型コンシェルジュ機能（マルチエージェント）
会話形式でユーザーから贈り物の条件を引き出す。

**エージェント構成**

```
オーケストレーター
├── 会話エージェント（条件収集・質問生成）
├── 検索エージェント（商品DB検索・フィルタリング）
└── 推薦エージェント（スコアリング・理由生成）
```

**収集する条件**

| 条件 | 質問例 |
|------|--------|
| 贈答相手 | 「誰に贈りますか？（上司・友人・親・義実家など）」 |
| 贈答シーン | 「どんな場面のギフトですか？（お中元・誕生日・出産祝いなど）」 |
| 予算 | 「予算はどのくらいをお考えですか？」 |
| 好み・NG | 「食品や酒類は大丈夫ですか？」 |
| 優先事項 | 「無難さ重視ですか？意外性重視ですか？」 |
| 配送 | 「直送ですか？持参ですか？」 |

**会話のフロー**
- 未入力の条件を検出して自然な質問を生成
- 必須条件が不足している間は一度に一項目だけ質問する
- 条件が揃ったら推薦へ移行
- 「もう少し高いものが良い」などのフィードバックに対応

### 2. オントロジーDB機能
贈答に関する意味知識をDBで管理する。

**オントロジーのデータ構造**

| テーブル | 内容 |
|---------|------|
| scenes | 贈答シーン（お中元・お歳暮・誕生日・出産祝いなど） |
| recipients | 贈答相手（上司・部下・友人・親・義実家など） |
| ng_rules | NGルール（出産祝いに刃物はNG・義実家初訪問には無難なものなど） |
商品側の意味属性、適したシーン、適した相手は`system12_products`のJSONB列で保持する。

**オントロジーの活用方法**
- 不適切商品の除外（NGルール参照）
- 推薦スコアへの重み付け（シーン×相手に適した属性を優遇）
- 推薦理由の根拠として使用

### 3. 商品DB・検索機能
商品マスタをDBで管理し、条件に応じてフィルタリング・検索する。

**商品マスタの項目**

| 項目 | 説明 |
|------|------|
| 商品ID | 識別番号 |
| 商品名 | 商品の名称 |
| カテゴリ | 食品・酒・スイーツ・雑貨・体験など |
| 価格 | 税込み価格 |
| 属性 | 常温保存可・要冷蔵・アルコール含む・甘い・辛いなど |
| 向いているシーン | お中元・誕生日・出産祝いなど |
| 向いている相手 | 上司・友人・親など |
| フォーマル度 | 1〜5（1：カジュアル・5：フォーマル） |
| 説明文 | 商品の説明 |
| 画像URL | 商品画像 |

**検索・フィルタリング**
- 価格帯フィルター
- カテゴリフィルター
- 有効商品のみを検索
- オントロジーによるNG商品の除外
- pgvectorによる意味的な類似検索

### 4. 推薦・スコアリング機能
フィルタリングした商品候補をスコアリングして上位3〜5件を選定する。

**スコアリング要素**

| 要素 | 重み |
|------|------|
| シーン適合度 | 30% |
| 相手適合度 | 25% |
| 予算適合度 | 20% |
| フォーマル度適合度 | 15% |
| 人気度（閲覧数・購入数） | 10% |

### 5. 推薦理由生成機能（LLM）
LLMが各候補の推薦理由・注意点・向く相手を自然文で生成する。

**生成内容**

| 項目 | 説明 |
|------|------|
| 推薦理由 | なぜこの商品を勧めるか |
| 向いている人 | どんな相手・シーンに特に良いか |
| 注意点 | 贈る際に気をつけること |
| ラッピング提案 | 包装・のしの提案 |

### 6. フィードバック保存機能
推薦結果に対する評価、理由、選択商品IDを推薦ログへ保存し、商品別推薦回数と評価件数の集計に使用する。条件変更による再推薦は、新しい会話メッセージとして一件ずつ送信する。

### 7. 会話履歴管理機能（メモリ）
同一セッション内での会話コンテキストを保持する。

- 収集済みの条件を記憶
- 推薦済みの商品IDを記憶
- セッション内容はPostgreSQLへ保存し、同じ`session_id`で再利用する

### 8. 商品・オントロジー管理機能（管理者向け）
- 商品マスタの登録、一覧、更新、有効・無効の切り替え
- シーンとNGルールの登録
- 推薦ログの確認・分析

---

## 非機能要件

| 項目 | 要件 |
|------|------|
| 応答時間 | 会話応答：15秒以内 / 推薦生成：30秒以内 |
| 処理順 | 会話、検索候補、規則、推薦候補、外部AI処理を一件ずつ順番に処理する |
| 対応言語 | 日本語 |
| セキュリティ | 利用者APIと管理者APIをロールで分離し、操作を監査ログへ記録する |

外部AI処理は条件抽出10秒、検索用Embedding 5秒、理由生成10秒を上限として順番に呼び出す。上限超過または通信失敗時は、同じ入力を教材内の語句抽出、キーワード検索、定型理由生成で処理し、会話全体を停止させない。

---

## システム構成

```
ユーザー（クライアント）
        ↓
    FastAPI（APIサーバー）
        ↓
    セッション管理（会話履歴・収集済み条件）
        ↓
    ┌──────────────────────────────────────────┐
    │  マルチエージェント（LangGraph）           │
    │                                          │
    │  オーケストレーター                        │
    │  ├── 会話エージェント                     │
    │  │   （条件収集・質問生成）               │
    │  │   ※ LM Studioで選択された会話モデル │
    │  │                                       │
    │  ├── 検索エージェント                     │
    │  │   （商品DB検索・オントロジー参照）      │
    │  │   → pgvectorで類似商品検索            │
    │  │   → NGルールで不適切商品を除外         │
    │  │                                       │
    │  └── 推薦エージェント                     │
    │      （スコアリング・理由生成）            │
    │      ※ LM Studioで選択された会話モデル │
    └──────────────────────────────────────────┘
        ↓
    出力バリデーション（Pydantic）
        ↓
    PostgreSQL（セッション・ログ保存）
        ↓
    JSONレスポンス返却
```

---

## API仕様

### POST /chat
会話メッセージを送信して応答を受け取る。

**リクエスト（JSON）**
```json
{
  "session_id": "sess_abc123",
  "message": "父の日のギフトを探しています"
}
```

**レスポンス（JSON）- 条件収集中**
```json
{
  "session_id": "sess_abc123",
  "response_type": "question",
  "message": "お父様へのギフトですね。予算はどのくらいをお考えですか？",
  "collected_conditions": {
    "scene": "父の日",
    "recipient": "父親"
  },
  "missing_conditions": ["budget", "preference", "ng_items"]
}
```

**レスポンス（JSON）- 推薦結果**
```json
{
  "session_id": "sess_abc123",
  "response_type": "recommendation",
  "message": "条件に合うギフトを3つご提案します。",
  "recommendations": [
    {
      "rank": 1,
      "product_id": 101,
      "product_name": "老舗和菓子 詰め合わせ（5,000円）",
      "price": 5000,
      "image_url": "https://example.com/product101.jpg",
      "reason": "目上の方への父の日ギフトとして定番の和菓子詰め合わせです。常温保存可能で日持ちもよく、相手を選ばない無難な一品です。",
      "suitable_for": "フォーマルな場面でも使える安心感のある贈り物です。",
      "cautions": "甘いものが苦手な場合はご確認ください。",
      "wrapping": "熨斗（父の日）をお付けすることをお勧めします。",
      "score": 0.94
    },
    {
      "rank": 2,
      "product_id": 205,
      "product_name": "クラフトビール 飲み比べセット（4,500円）",
      "price": 4500,
      "image_url": "https://example.com/product205.jpg",
      "reason": "お酒好きのお父様への父の日ギフトとして人気のクラフトビールセットです。普段とは違う特別感を演出できます。",
      "suitable_for": "お酒を楽しまれるお父様に特におすすめです。",
      "cautions": "アルコールが飲めない場合はご注意ください。",
      "wrapping": "ギフトボックス入りで見た目も華やかです。",
      "score": 0.88
    }
  ],
  "collected_conditions": {
    "scene": "父の日",
    "recipient": "父親",
    "budget": "5000円以内",
    "preference": "無難さ重視",
    "ng_items": "なし"
  }
}
```

### POST /chat/feedback
推薦結果へのフィードバックを保存する。

**リクエスト（JSON）**
```json
{
  "session_id": "sess_abc123",
  "liked": false,
  "disliked_reasons": ["予算に合わない"],
  "selected_product_id": 101
}
```

### POST /products
商品を登録する（管理者向け）。

### PUT /products/{product_id}
商品を更新する（管理者向け）。

### POST /ontology/scenes
贈答シーンを登録する（管理者向け）。

### POST /ontology/ng-rules
NGルールを登録する（管理者向け）。

### GET /analytics/recommendations
推薦ログを取得する（管理者向け）。

---

## データモデル

### productsテーブル
```sql
CREATE TABLE system12_products (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    category      VARCHAR(50),
    price         NUMERIC(10,0),
    tags          JSONB NOT NULL DEFAULT '[]'::jsonb,
    attributes    JSONB,          -- 商品属性（常温保存可・アルコール含むなど）
    suitable_scenes JSONB,        -- 向いているシーン
    suitable_recipients JSONB,    -- 向いている相手
    formality     INTEGER,        -- フォーマル度（1〜5）
    description   TEXT,
    image_url     VARCHAR(500),
    view_count    INTEGER DEFAULT 0,
    purchase_count INTEGER DEFAULT 0,
    embedding     VECTOR(768),    -- pgvector
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);
```

### scenesテーブル
```sql
CREATE TABLE system12_scenes (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) UNIQUE NOT NULL,
    formality   INTEGER,            -- フォーマル度（1〜5）
    timing      VARCHAR(100),       -- 時期（6月中旬・誕生日当日など）
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### recipientsテーブル
```sql
CREATE TABLE system12_recipients (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(100) UNIQUE NOT NULL,
    formality   INTEGER,            -- 関係の格式度（1〜5）
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### ng_rulesテーブル
```sql
CREATE TABLE system12_ng_rules (
    id           SERIAL PRIMARY KEY,
    scene_id     INTEGER REFERENCES system12_scenes(id) ON DELETE CASCADE,
    recipient_id INTEGER REFERENCES system12_recipients(id) ON DELETE CASCADE,
    ng_attribute VARCHAR(100),      -- NGとなる商品属性
    reason       TEXT,              -- なぜNGなのか
    severity     VARCHAR(10) NOT NULL DEFAULT 'warn',
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### sessionsテーブル
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

### recommendation_logsテーブル
```sql
CREATE TABLE system12_recommendation_logs (
    id            SERIAL PRIMARY KEY,
    session_id    VARCHAR(50) NOT NULL REFERENCES system12_sessions(session_id) ON DELETE CASCADE,
    conditions    JSONB NOT NULL DEFAULT '{}'::jsonb,
    recommended   JSONB NOT NULL DEFAULT '[]'::jsonb,
    feedback      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## プロンプト仕様

### 会話エージェント（条件収集）プロンプト
```
あなたはギフト専門のコンシェルジュAIです。
ユーザーが最適なギフトを見つけられるよう、自然な会話で必要な条件を引き出してください。

収集済みの条件：
{collected_conditions}

未収集の条件：
{missing_conditions}

会話履歴：
{conversation_history}

ルール：
1. 一度に1つだけ質問すること
2. 自然で親しみやすい言葉遣いにすること
3. すでに収集した条件は再度聞かないこと
4. 条件が揃ったら推薦フェーズに移行すること
5. 必ず指定のJSONフォーマットで返すこと
```

### 推薦理由生成プロンプト
```
あなたはギフト専門のコンシェルジュAIです。
以下の条件と候補商品に対して、推薦理由・注意点・ラッピング提案を生成してください。

贈答条件：
{conditions}

オントロジー情報（シーン・相手のルール）：
{ontology_info}

推薦候補商品：
{products}

ルール：
1. 推薦理由はオントロジー情報を根拠にすること
2. 贈る相手・シーンに合った言葉遣いにすること
3. 注意点は押しつけがましくなく、さりげなく伝えること
4. 必ず指定のJSONフォーマットで返すこと
```

---

## ガードレール設計

- AI応答がJSONでない場合は、教材用の語句抽出と理由生成へ切り替える
- 無効な商品と予算超過の商品は推薦対象から除外する
- `block`のNGルールに該当する商品は除外し、`warn`は注意点へ表示する
- 相手、用途、予算が不足している間は一度に一項目だけ追加質問する
- 複数の商品と規則は一件ずつ順番に評価する

---

## 技術スタック

| 用途 | 技術 |
|------|------|
| APIサーバー | FastAPI |
| エージェントフレームワーク | LangGraph |
| LLM | LM Studioで選択された会話モデル |
| 埋め込みモデル | nomic-embed-text（ローカル）/ LM Studio経由 |
| ベクトルDB | pgvector（PostgreSQL拡張） |
| 出力バリデーション | Pydantic |
| DB | PostgreSQL |
| ORM | SQLAlchemy |
| トレース・ログ | LangGraphステップログ、共通監査ログ |

---

## 対応する知識マップ項目

| 工程 | 習得できる知識マップ項目 |
|------|----------------------|
| 工程1：要件定義 | オントロジー・意味設計要件、会話条件、検索・推薦、ガードレール要件 |
| 工程2：基本設計 | **マルチエージェント設計**・**オーケストレーター設計**・ツール設計・LangGraph・埋め込みモデル・pgvector |
| 工程3：詳細設計 | エージェント処理順、分岐条件、状態管理、PostgreSQL会話メモリ |
| 工程4：実装 | LangGraphオーケストレーター、商品検索、NG規則、pgvector、監査ログ |
| 工程5：検証 | 条件不足時の追加質問、予算上限、NG規則、有効商品のみの推薦 |
| 横断 | FastAPI・PostgreSQL・SQLAlchemy・Python |

---

## 対象外（スコープ外）

- 決済・購入機能
- 在庫管理・受注管理
- 配送手配
- ラッピング・のし手配の自動化

## 学習完了の目安

- [ ] 工程1：要件定義：オントロジー・意味設計要件、会話条件、検索・推薦、ガードレール要件
- [ ] 工程2：基本設計：**マルチエージェント設計**・**オーケストレーター設計**・ツール設計・LangGraph・埋め込みモデル・pgvector
- [ ] 工程3：詳細設計：エージェント処理順、分岐条件、状態管理、PostgreSQL会話メモリ
- [ ] 工程4：実装：LangGraphオーケストレーター、商品検索、NG規則、pgvector、監査ログ
- [ ] 工程5：検証：条件不足時の追加質問、予算上限、NG規則、有効商品のみの推薦
- [ ] 横断：FastAPI・PostgreSQL・SQLAlchemy・Python
