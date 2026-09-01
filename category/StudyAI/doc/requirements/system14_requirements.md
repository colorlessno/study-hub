# System 14 要件定義

## このテーマでできるようになること

- 要件定義で扱う「AIの役割範囲・RAG要件（過去対応参照）・ガードレール要件」を説明できる
- 基本設計で扱う「シングルエージェント設計・LangGraph・埋め込みモデル・pgvector・パイプライン設計」を説明できる
- 詳細設計で扱う「エージェントループ詳細設計・停止条件・状態管理・メモリ設計（短期）・RAG詳細設計」を説明できる
- 実装で扱う「faster-whisper音声文字起こし・ルール分析・Webhook・SMTP・ダッシュボード配信・DB配信ログ」を説明できる
- 検証で扱う「ガードレール検証（個人情報マスキング・リスク検知）」を説明できる
- FastAPI・PostgreSQL・SQLAlchemy・Python・順次処理を横断的に使う構成を説明できる

## 顧客接点データ 全量分析＆インサイト配信エージェント

---

## システム概要

コールログ・チャット履歴・商談録画・問い合わせメールなどの顧客接点データを大量に取り込み、AIエージェントが全量を自動で文字起こし・分類・要約・グルーピングし、部門ごとに必要なインサイトを自動配信するシステム。「顧客の声を全部読みたいが手が回らない」状態を解消し、経営判断から現場の営業トークまで、データドリブンなアクションを支援する。

---

## 実装状況（2026-09-01）

MVP は backend / DB / frontend まで実装済み、Docker 実環境での migration、API スモーク、UI 動線確認まで完了している。

**実装済み**

- `system14` Docker サービス（ポート `18014`）
- Alembic revision `20260421_0016` / `20260422_0017` / `20260901_0019` による System14 テーブル作成
- テスト系データ：CSV / JSON / text 取込、正規化、発話分析、グルーピング、営業スコア、勝敗要因、ダッシュボード集計
- `POST /api/data/upload`、`GET /api/jobs/{job_id}`、`GET /api/dashboard`
- `GET /api/insights/voice-ranking`、`GET /api/insights/sales-score`、`GET /api/insights/win-loss`
- `POST /api/workflows`、`POST /api/agent/chat`、`GET /api/agent/action-proposals`、`GET /api/agent/faq-gaps`
- workflow 完了時の配信ペイロード生成と配信ログ保存（dashboard / webhook / email / ローカル・ダミーCRM）
- Bearer認証付きHTTP POST、外部IDによる重複防止、PostgreSQL永続化を行うローカル・ダミーCRM API
- frontend `/system14` 画面（データ取込、ダッシュボード、分析、エージェント、ダミーCRM、分析フィルタ、workflow 配信設定）

**MVP 外として残るもの**

- 音声・動画の本格的な話者分離と timestamp 保存
- LLM / LangGraph による本格分析パイプライン
- RAG / 過去対応履歴 / FAQ 連携
- Webhook / email の運用設定整備とSalesforce等の実CRM connector
- リスク検知の即時通知
- 大量データ性能検証

MVP外として残る項目は、本節を正として管理する。

---

## 現状の課題

- 顧客接点データ（コール・チャット・録画）が大量に蓄積されているが、全量を分析できていない
- 一部のアナリストや専門担当者しかデータを活用できず、現場に届いていない
- 「顧客が何に困っているか」のランキングを即座に答えられない
- 分析結果がアクションにつながらない（見たい粒度になっていない・担当者に届かない）
- CRMへの入力・レポート作成などのアフターコール作業に時間がかかる
- 営業トークの良し悪しを客観的に評価する手段がない

---

## 対象ユーザー

- 経営者・管理職（意思決定のためのインサイト活用）
- マーケティング・CX担当者（顧客の声の分析）
- 営業担当者・マネージャー（営業トーク改善・勝ち負け分析）
- コンタクトセンター担当者（対応品質評価・アフターコール自動化）
- 製品開発担当者（顧客要望・クレームの把握）

---

## 機能要件

### 1. データ取り込み機能
以下の顧客接点データを取り込む。

**対応データ形式**

| データ種別 | 形式 | 取り込み方法 |
|-----------|------|------------|
| 音声通話録音 | MP3・WAV・MP4 | ファイルアップロード・API連携 |
| 商談録画 | MP4（Zoom等） | Zoom連携・ファイルアップロード |
| チャットログ | CSV・JSON・テキスト | ファイルアップロード・API連携 |
| 問い合わせメール | CSV・テキスト | ファイルアップロード |
| コールログテキスト | CSV・JSON | ファイルアップロード |

**取り込み時の前処理**
- 音声・動画ファイル：faster-whisperで話者分離付き文字起こし
- テキストデータ：文字コード統一・ノイズ除去・構造化

### 2. 自動分析パイプライン（AIエージェント）
取り込んだデータをエージェントが自律的に分析する。

**分析フロー**
```
データ取り込み
    ↓
文字起こし・テキスト化
    ↓
ノイズ除去・構造化
    ↓
話者分離（顧客発言 / 担当者発言）
    ↓
感情分析（ポジティブ・ネガティブ・ニュートラル）
    ↓
発言種別分類（要望・質問・クレーム・お褒め）
    ↓
トピック抽出・意味グルーピング
    ↓
要約生成
    ↓
ランキング・集計
    ↓
インサイト・アクション提案生成
    ↓
部門別レポート配信
```

### 3. 顧客の声 ランキング・可視化機能
顧客が何を言っているかをランキング形式で可視化する。

**ランキングの軸**

| 軸 | 説明 |
|----|------|
| 商品・サービス別 | どの商品に対する声が多いか |
| 発言種別 | 要望・クレーム・質問・お褒め別 |
| 感情別 | ポジティブ・ネガティブ別 |
| トピック別 | 何について言及されているか |
| 件数・割合 | ボリューム感の把握 |

**絞り込み条件**
- 期間（日・週・月・カスタム）
- 商品・カテゴリ
- 担当者・チーム
- 感情・発言種別

**意味グルーピング機能**
- 異なる表現でも同じ意味の発言を自動でグルーピング
- グループ名はLLMが自動生成
- グループ内の件数・代表的な発言を表示
- 元の発言テキスト・音声への遡及が可能

### 4. 感情・発言種別分析機能
各会話・発言に対して以下を付与する。

| 分析項目 | 説明 |
|---------|------|
| 感情分類 | ポジティブ・ネガティブ・ニュートラル |
| 感情スコア | -1.0〜1.0 |
| 発言種別 | 要望・質問・クレーム・お褒め・その他 |
| トピック | 何について言及しているか（複数可） |
| 緊急度 | 即時対応が必要かどうか |

### 5. 営業トーク分析・スコアリング機能
商談録画・コールログをもとに営業トークを客観的に評価する。

**評価項目**

| 評価項目 | 説明 |
|---------|------|
| 課題深掘り質問の割合 | 顧客の課題を引き出す質問ができているか |
| 提案の適切さ | 顧客の課題に沿った提案ができているか |
| 次ステップの明確さ | 商談後のアクションを明確にできているか |
| 顧客の発言比率 | 顧客が話せている割合（傾聴できているか） |
| 総合スコア | 上記を総合した100点満点のスコア |

**活用方法**
- 担当者別・チーム別のスコア比較
- トップパフォーマーの質問パターンの可視化・共有
- スコア推移の時系列分析
- 改善提案の自動生成

### 6. 勝ち負け理由分析機能
商談の受注・失注理由をAIが客観的に分析する。

- 受注・失注理由を会話から自動抽出
- 営業要因・製品要因・価格要因などに分類
- ランキング形式で可視化
- 顧客属性（規模・業種・担当者）との掛け合わせ分析

### 7. アフターコール自動化機能
通話・商談後の事務作業を自動化する。

- 会話内容の自動要約・メモ生成
- 次アクション・タスクの自動抽出
- ローカル・ダミーCRMへの自動入力
- Salesforceなどの実CRMへの自動入力は、接続環境が提供された場合の拡張対象とする
- フォローアップメール文案の自動生成

### 8. ワークフロー設定機能（ノーコード）
分析内容・出力形式・配信先をノーコードで設定できる。

**設定できる内容**
- どのデータを取り込むか
- どの分析処理を行うか（分析ステップの組み合わせ）
- どのアウトプットを生成するか
- どの部門・担当者に配信するか
- 配信タイミング（リアルタイム・日次・週次）

### 9. 部門別インサイト配信機能
分析結果を各部門が必要とする粒度・形式で自動配信する。

| 配信先部門 | 配信内容 |
|-----------|---------|
| 経営層 | 顧客満足度トレンド・重要課題サマリー・改善提案 |
| マーケティング | 顧客の声ランキング・ネガポジ分析・VOCレポート |
| 営業 | 営業トークスコア・受注失注分析・改善提案 |
| 製品開発 | 機能要望ランキング・クレーム内容・改善優先度 |
| コンタクトセンター | 対応品質評価・コールリーズン分析・アフターコール自動化 |

**配信方法**
- Webhook（Slack等）
- メール
- ダッシュボード表示
- ローカル・ダミーCRM連携
- 実CRM連携（接続環境が提供された場合）

### 10. リスク検知・アラート機能
コンプライアンスリスク・緊急対応が必要な案件を自動検知して通知する。

- 炎上リスク・法的リスクを含む発言の検知
- 緊急度の高いクレームの即時通知
- 特定キーワード・フレーズの監視

### 11. チャット型 分析AIエージェント機能
ダッシュボードだけでは把握しきれない内容を、自然文でAIエージェントに質問して即座に回答を得る機能。「何をすればいいかわからない」状態を解消し、次のアクションを提示する。

**機能概要**
- 自然文で質問を投げると、システム内に蓄積された構造化データを参照して回答を生成
- 過去の対応履歴・分析結果・スコアデータをRAGで検索して根拠付きで回答
- ダッシュボードでは気づきにくい個別の改善ポイントを掘り下げられる

**質問例と回答例**

| 質問例 | 回答内容 |
|--------|---------|
| 「川井さんのコール対応の良い点と改善点をまとめて」 | 過去コールの評価データを参照し、強み（挨拶・傾聴）と改善点（提案不足・状況確認不足）を具体的に提示 |
| 「配送確認のコールで対応品質が低い原因は何？」 | 該当コールの分析データを横断的に参照し、全オペレーターに共通する課題を抽出して提示 |
| 「今月クレームが増えた商品Xに対してどう対応すべきか？」 | 過去の類似クレーム対応の成功事例を参照し、推奨対応手順・トークスクリプトを生成 |
| 「ネガティブな声が多いトピックで、過去にうまく対応できたケースを教えて」 | 類似トピックの過去対応を検索し、解決に至った対応パターンを提示 |

**回答の構成**

| 項目 | 説明 |
|------|------|
| 回答本文 | 質問に対する分析結果・推奨アクション |
| 根拠データ | 参照した過去の対応データ・分析結果（件数・スコア・具体例） |
| 推奨アクション | 次に取るべき具体的な行動 |
| 関連情報 | 合わせて確認すべきデータへのリンク |

**活用場面**
- マネージャーがメンバーへフィードバックする前の事前確認
- 現場担当者が苦手なコールリーズンへの対応方法を調べるとき
- 経営・管理職が特定の課題を深掘りしたいとき

### 12. 改善アクション提案＆不足FAQ検出機能
分析結果をもとに、次に取るべき改善アクションと不足しているFAQをAIが自動提案する。

**改善アクション提案**
- 商品・サービスごとの具体的な改善アイデアを自動生成
- 優先度付きで提示（クレーム件数・影響範囲をもとに判定）
- 過去の類似改善事例と照合した実現可能性の評価

**不足FAQ検出**
- 既存FAQをAIが読み込み、よくある問い合わせに対応できていないFAQを検出
- 不足FAQの文案を自動生成
- 商品・カテゴリ別に不足FAQをランキング形式で提示

---

## 非機能要件

| 項目 | 要件 |
|------|------|
| 処理速度 | アップロード要求をサーバープロセス共通の先入れ順で1件ずつ処理し、結果を保存してから応答する |
| 対応データ量 | 月次数万件のデータに対応 |
| セキュリティ | 顧客情報・通話内容はローカルDBへ保存する。外部送信は利用者が明示的に設定したWebhook・メールに限定し、ダミーCRMはループバック接続だけを使用する |
| 対応言語 | 日本語・英語 |
| 動作環境 | ローカル環境（完全オフライン）またはオンプレミス |

---

## システム構成

```
データソース
（音声録音・録画・チャット・メール）
        ↓
    FastAPI（データ受付APIサーバー）
        ↓
    ┌──────────────────────────────────────────┐
    │  AIエージェントパイプライン（LangGraph）    │
    │                                          │
    │  ① 文字起こし（faster-whisper）          │
    │  ② ノイズ除去・構造化                    │
    │  ③ 話者分離・発言抽出                    │
    │  ④ 感情分析・発言種別分類（LLM）          │
    │  ⑤ トピック抽出・意味グルーピング（LLM）  │
    │  ⑥ 要約生成（LLM）                      │
    │  ⑦ インサイト・アクション提案生成（LLM）  │
    └──────────────────────────────────────────┘
        ↓
    PostgreSQL（分析結果・ログ保存）
        ↓
    ワークフローエンジン
    （部門別配信設定に基づいて配信）
        ↓
    Webhook / メール / ローカル・ダミーCRM / ダッシュボード
```

---

## API仕様

### POST /data/upload
データをアップロードし、サーバープロセス共通の受付順に、正規化、匿名化、分析、グルーピング、DB保存を一件ずつ順番に実行する。応答の`status`はDBへ保存した最終状態と一致させ、途中で失敗した場合は`failed`を返す。

**リクエスト**
```
Content-Type: multipart/form-data
file:        データファイル
data_type:   audio / video / chat / email / call_log
source:      データの出所（例：zoom・callcenter・chat_support）
metadata:    追加情報（JSON：担当者ID・商品名・日付等）
```

**レスポンス（JSON）**
```json
{
  "job_id": "job_abc123",
  "status": "completed",
  "estimated_minutes": 0,
  "data_type": "audio",
  "file_count": 1
}
```

### GET /jobs/{job_id}
分析ジョブの進捗を確認する。

### GET /insights/voice-ranking
顧客の声ランキングを取得する。

**クエリパラメータ**
```
from_date:    開始日
to_date:      終了日
product:      商品・カテゴリ
call_reason:  コール理由・問い合わせ種別
sentiment:    ポジティブ・ネガティブ・ニュートラル
type:         要望・クレーム・質問・お褒め
limit:        取得件数（デフォルト: 20）
```

**レスポンス（JSON）**
```json
{
  "period": "2024-03-01〜2024-03-31",
  "total_data_count": 4823,
  "ranking": [
    {
      "rank": 1,
      "group_label": "騒音・動作音が大きい",
      "count": 234,
      "sentiment": "ネガティブ",
      "type": "クレーム",
      "products": ["クイックボイル1.0", "ミキサーX200"],
      "representative_text": "使用中の動作音がとても大きく、夜間は使えない",
      "source_ids": ["call_001", "call_045", "chat_023"]
    }
  ]
}
```

### GET /insights/sales-score
営業トークスコアを取得する。

**クエリパラメータ**
```
from_date:   開始日
to_date:     終了日
staff_id:    担当者ID（省略時は全員）
```

**レスポンス（JSON）**
```json
{
  "period": "2024-03-01〜2024-03-31",
  "scores": [
    {
      "staff_id": "sales_001",
      "staff_name": "中村",
      "overall_score": 87,
      "breakdown": {
        "issue_exploration": 90,
        "proposal_quality": 85,
        "next_step_clarity": 88,
        "listening_ratio": 0.42
      },
      "top_questions": [
        {"question_type": "課題深掘り", "count": 12, "example": "その課題はいつ頃から発生していますか？"}
      ]
    }
  ]
}
```

### GET /insights/win-loss
受注・失注分析を取得する。

### POST /workflows
ワークフローを設定する。

**リクエスト（JSON）**
```json
{
  "name": "製品開発向け週次レポート",
  "trigger": "weekly",
  "data_sources": ["callcenter", "chat_support"],
  "analysis_steps": ["sentiment", "topic_extraction", "grouping", "ranking"],
  "output_type": "voice_ranking",
  "filters": {
    "type": ["要望", "クレーム"]
  },
  "delivery": {
    "method": "webhook",
    "endpoint": "https://hooks.slack.com/xxx",
    "recipients": ["product_dev_channel"]
  }
}
```

### GET /dashboard
ダッシュボードデータを取得する。

### POST /agent/chat
チャット型分析AIエージェントに質問を送信する。

**リクエスト（JSON）**
```json
{
  "session_id": "sess_abc123",
  "question": "川井さんの配送確認コールの良い点と改善点をまとめてください",
  "filters": {
    "staff_id": "staff_kawai",
    "call_reason": "配送確認",
    "from_date": "2024-03-01",
    "to_date": "2024-03-31"
  }
}
```

**レスポンス（JSON）**
```json
{
  "answer_id": 1,
  "question": "川井さんの配送確認コールの良い点と改善点をまとめてください",
  "answer": "川井さんの配送確認コール（3月：42件）を分析しました。良い点として、冒頭の挨拶・名乗りが全件で適切に行われており、顧客の話を遮らない傾聴姿勢が評価されています。改善点として、購入時期・使用環境などの詳細状況の確認が不足しており（確認実施率38%）、追加提案やアップセルの機会が活かせていません。",
  "recommended_actions": [
    "詳細状況確認のチェックリストをトーク前に確認する習慣をつける",
    "福田さん（同コールリーズンでスコア高）のトーク録音を参考にする"
  ],
  "evidence": {
    "total_calls": 42,
    "avg_score": 3.2,
    "top_performer_score": 4.6,
    "reference_calls": ["call_001", "call_023", "call_041"]
  },
  "related_links": [
    {"label": "配送確認コールの全体分析", "endpoint": "/insights/voice-ranking?call_reason=配送確認"},
    {"label": "川井さんのスコア推移", "endpoint": "/insights/sales-score?staff_id=staff_kawai"}
  ]
}
```

### GET /agent/action-proposals
改善アクション提案を取得する。

**クエリパラメータ**
```
product:    商品・カテゴリ
priority:   優先度（高・中・低）
from_date:  開始日
to_date:    終了日
```

### GET /agent/faq-gaps
不足FAQの検出結果を取得する。

**クエリパラメータ**
```
product:  商品・カテゴリ
limit:    取得件数（デフォルト: 10）
```

**レスポンス（JSON）**
```json
{
  "product": "クイックボイル1.0",
  "faq_gaps": [
    {
      "rank": 1,
      "call_reason": "吹きこぼれ防止の方法",
      "inquiry_count": 67,
      "existing_faq": null,
      "suggested_faq": {
        "question": "吹きこぼれを防ぐにはどうすればいいですか？",
        "answer": "水量を最大ラインの8割以下に抑えてご使用ください。また、沸騰後は自動的に保温モードに切り替わります。"
      }
    }
  ]
}
```

---

### POST /dummy-crm/activities
ローカル・ダミーCRMへ顧客対応履歴を登録する。`Authorization: Bearer <token>`を必須とし、同じ`external_id`の再送では新規行を増やさず既存行を更新する。

### GET /dummy-crm/activities
ローカル・ダミーCRMへ登録済みの顧客対応履歴を更新日時の降順で取得する。

### GET /dummy-crm/activities/{activity_id}
顧客対応履歴を1件取得する。

### PATCH /dummy-crm/activities/{activity_id}
担当者、次アクション、緊急度、対応状態などを更新する。

---

## データモデル

### system14_data_jobsテーブル
```sql
CREATE TABLE system14_data_jobs (
    id            VARCHAR(50) PRIMARY KEY,
    data_type     VARCHAR(20),
    source        VARCHAR(50),
    file_path     TEXT,
    metadata      JSONB,
    status        VARCHAR(20) DEFAULT 'queued',
    progress      INTEGER DEFAULT 0,
    error_message TEXT,
    created_at    TIMESTAMP DEFAULT NOW(),
    completed_at  TIMESTAMP
);
```

### system14_conversationsテーブル
```sql
CREATE TABLE system14_conversations (
    id            SERIAL PRIMARY KEY,
    job_id        VARCHAR(50) REFERENCES system14_data_jobs(id),
    data_type     VARCHAR(20),
    source        VARCHAR(50),
    transcript    TEXT,
    metadata      JSONB,
    occurred_at   TIMESTAMP,
    created_at    TIMESTAMP DEFAULT NOW()
);
```

### system14_utterancesテーブル（発言単位）
```sql
CREATE TABLE system14_utterances (
    id              SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES system14_conversations(id),
    speaker         VARCHAR(20),    -- customer・staff
    text            TEXT,
    sentiment       VARCHAR(20),
    sentiment_score NUMERIC(3,2),
    utterance_type  VARCHAR(20),    -- 要望・質問・クレーム・お褒め・その他
    topics          JSONB,
    start_sec       NUMERIC(8,2),
    end_sec         NUMERIC(8,2),
    created_at      TIMESTAMP DEFAULT NOW()
);
```

### system14_insight_groupsテーブル（意味グルーピング）
```sql
CREATE TABLE system14_insight_groups (
    id             SERIAL PRIMARY KEY,
    label          VARCHAR(255),
    sentiment      VARCHAR(20),
    utterance_type VARCHAR(20),
    count          INTEGER,
    products       JSONB,
    period_from    DATE,
    period_to      DATE,
    utterance_ids  JSONB,
    created_at     TIMESTAMP DEFAULT NOW()
);
```

### system14_sales_scoresテーブル
```sql
CREATE TABLE system14_sales_scores (
    id                  SERIAL PRIMARY KEY,
    conversation_id     INTEGER REFERENCES system14_conversations(id),
    staff_id            VARCHAR(50),
    overall_score       INTEGER,
    issue_exploration   INTEGER,
    proposal_quality    INTEGER,
    next_step_clarity   INTEGER,
    listening_ratio     NUMERIC(3,2),
    top_questions       JSONB,
    created_at          TIMESTAMP DEFAULT NOW()
);
```

### system14_workflowsテーブル
```sql
CREATE TABLE system14_workflows (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255),
    trigger         VARCHAR(20),    -- realtime・daily・weekly・manual
    data_sources    JSONB,
    analysis_steps  JSONB,
    output_type     VARCHAR(50),
    filters         JSONB,
    delivery        JSONB,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

### system14_dummy_crm_activitiesテーブル
```sql
CREATE TABLE system14_dummy_crm_activities (
    id              SERIAL PRIMARY KEY,
    external_id     VARCHAR(120) UNIQUE NOT NULL,
    customer_id     VARCHAR(100),
    customer_name   VARCHAR(200),
    contact_type    VARCHAR(50) NOT NULL,
    summary         TEXT NOT NULL,
    sentiment       VARCHAR(20),
    urgency         VARCHAR(20) NOT NULL,
    assigned_to     VARCHAR(100),
    next_action     TEXT,
    follow_up_at    TIMESTAMP,
    status          VARCHAR(20) NOT NULL,
    source_payload  JSONB NOT NULL,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

---

## プロンプト仕様

### 感情分析・発言種別分類プロンプト
```
あなたは顧客対話分析の専門家AIです。
以下の発言を分析し、感情・発言種別・トピックを判定してください。

話者：{speaker}（顧客 / 担当者）
発言内容：
{utterance_text}

ルール：
1. 感情はpositive / negative / neutralの3種類
2. 感情スコアは-1.0〜1.0
3. 発言種別は要望・質問・クレーム・お褒め・その他から選ぶ
4. トピックは発言内容から動的に判定（最大3件）
5. 必ず指定のJSONフォーマットで返すこと
```

### 意味グルーピングプロンプト
```
あなたは顧客インサイト分析の専門家AIです。
以下の要約リストを意味的にグルーピングし、グループ名を生成してください。

要約リスト：
{summary_list}

ルール：
1. 同じ意味・関心事を持つ発言をグループにまとめること
2. グループ名は顧客目線で具体的かつ簡潔にすること（20文字以内）
3. 1グループに最低3件以上の発言が含まれること
4. 必ず指定のJSONフォーマットで返すこと
```

### チャット型分析AIエージェント プロンプト
```
あなたは顧客接点データ分析の専門家AIです。
システム内に蓄積された分析データを参照し、質問に対して根拠付きで回答してください。

参照データ：
{retrieved_data}

会話履歴：
{conversation_history}

質問：
{question}

ルール：
1. 参照データの内容のみを根拠に回答すること
2. 具体的な数値・件数・スコアを必ず含めること
3. 改善点には必ず具体的なアクションをセットで提示すること
4. データに基づかない推測は「推測ですが」と明示すること
5. 他のオペレーターの成功事例を参照できる場合は積極的に提示すること
6. 必ず指定のJSONフォーマットで返すこと
```

### 改善アクション提案プロンプト
```
あなたは製品改善コンサルタントAIです。
以下の顧客の声分析結果をもとに、具体的な改善アクションを提案してください。

商品名：{product_name}
分析期間：{period}
クレーム・要望の分析結果：
{analysis_data}

過去の類似改善事例：
{past_improvements}

ルール：
1. 改善アクションは具体的・実行可能なものにすること
2. 優先度（高・中・低）を根拠とともに付けること
3. 過去の類似改善事例がある場合は参照して提示すること
4. 必ず指定のJSONフォーマットで返すこと
```

### 部門別アクション提案プロンプト
```
あなたは経営コンサルタントAIです。
以下の顧客の声分析結果をもとに、部門別のアクション提案を生成してください。

対象部門：{department}
分析期間：{period}
分析結果：
{analysis_summary}

ルール：
1. アクション提案は具体的・実行可能なものにすること
2. 優先度（高・中・低）を付けること
3. 根拠となるデータを必ず引用すること
4. 必ず指定のJSONフォーマットで返すこと
```

---

## ガードレール設計

- JSON形式が壊れていた場合：最大3回まで再試行
- 顧客の個人情報（氏名・電話番号・住所）はDB保存前にマスキング
- リスク・コンプライアンス関連の発言を検知した場合：即時アラート通知
- データは1ファイルずつ受付要求内で順番に処理し、完了・失敗状態をDBに保存する
- 処理失敗時はジョブを再キューに戻してリトライ（最大3回）
- 音声ファイルは文字起こし後に削除

---

## 技術スタック

| 用途 | 技術 |
|------|------|
| APIサーバー | FastAPI |
| エージェントフレームワーク | LangGraph |
| LLM | LM Studioで選択したモデル（分析AIを使う場合） |
| 音声文字起こし | faster-whisper（ローカル） |
| 埋め込みモデル | nomic-embed-text（ローカル）/ LM Studio経由 |
| ベクトルDB | pgvector（PostgreSQL拡張） |
| 出力バリデーション | Pydantic |
| DB | PostgreSQL |
| ORM | SQLAlchemy |
| 取込実行 | FastAPIリクエスト内でファイルを1件ずつ順次処理 |
| ローカル・ダミーCRM連携 | httpx（Bearer認証付きREST API）、FastAPI、PostgreSQL |
| 実CRM連携 | 接続環境が提供された場合にhttpxコネクターを追加する |
| トレース・ログ | 共通監査ログ、ジョブ、ワークフロー配信ログ |

---

## 対応する知識マップ項目

| 工程 | 習得できる知識マップ項目 |
|------|----------------------|
| 工程1：要件定義 | AIの役割範囲・RAG要件（過去対応参照）・ガードレール要件 |
| 工程2：基本設計 | シングルエージェント設計・LangGraph・埋め込みモデル・pgvector・パイプライン設計 |
| 工程3：詳細設計 | エージェントループ詳細設計・停止条件・状態管理・メモリ設計（短期）・RAG詳細設計 |
| 工程4：実装 | faster-whisper音声文字起こし・ルール分析・Webhook・SMTP・ダッシュボード配信・DB配信ログ |
| 工程5：検証 | ガードレール検証（個人情報マスキング・リスク検知） |
| 横断 | FastAPI・PostgreSQL・SQLAlchemy・Python・順次処理 |

---

## 対象外（スコープ外）

- 画面UI（フロントエンド・ダッシュボード画面）
- 電話システム（CTI）との直接連携
- リアルタイム通話中の分析（通話後のバッチ処理で対応）
- 多言語対応（日英以外）
- 自動応答ボット機能

## 学習完了の目安

- [ ] 工程1：要件定義：AIの役割範囲・RAG要件（過去対応参照）・ガードレール要件
- [ ] 工程2：基本設計：シングルエージェント設計・LangGraph・埋め込みモデル・pgvector・パイプライン設計
- [ ] 工程3：詳細設計：エージェントループ詳細設計・停止条件・状態管理・メモリ設計（短期）・RAG詳細設計
- [ ] 工程4：実装：faster-whisper音声文字起こし・ルール分析・Webhook・SMTP・ダッシュボード配信・DB配信ログ
- [ ] 工程5：検証：ガードレール検証（個人情報マスキング・リスク検知）
- [ ] 横断：FastAPI・PostgreSQL・SQLAlchemy・Python・順次処理
