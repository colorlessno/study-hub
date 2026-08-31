# System 13 要件定義

## このテーマでできるようになること

- 要件定義で扱う「AIの役割範囲・RAG要件・ガードレール要件」を説明できる
- 基本設計で扱う「埋め込みモデル・pgvector・キーワードとベクトルの複合検索」を説明できる
- 詳細設計で扱う「RAG詳細設計・会話履歴・プロジェクト単位の検索制約」を説明できる
- 実装で扱う「RAG処理・pgvector・DB会話履歴・地雷情報フラグ・監査ログ」を説明できる
- 検証で扱う「ガードレール検証（プロジェクト間データ分離・個人情報保護）」を説明できる
- FastAPI・PostgreSQL・SQLAlchemy・Pythonを横断的に使う構成を説明できる

## プロジェクト参画者向け 初期教育エージェント

---

## システム概要

プロジェクトに新規参画したメンバーに対して、プロジェクト固有のナレッジ（経緯・設計・ルール・用語・リスク情報）を会話形式で提供するエージェント。炎上プロジェクトへの途中参画など、ドキュメントが整備されていない状況でも、蓄積された情報をもとに素早くキャッチアップできるよう支援する。

---

## 現状の課題

- プロジェクトに途中参画した際、過去の経緯・決定事項・地雷情報を把握するのに時間がかかる
- 引き継ぎ担当者が多忙で、新規メンバーへの説明に時間を割けない
- 口頭で引き継がれた情報が記録されておらず、退職・異動で失われる
- ドキュメントが散在していてどれを読めばいいかわからない
- プロジェクト固有の用語・略語・背景を理解するのに時間がかかる

---

## 対象ユーザー

- プロジェクトに新規参画したメンバー（質問側）
- プロジェクトリーダー・ベテランメンバー（ナレッジ登録側）
- PMO・プロジェクト管理者（進捗確認側）

---

## System 03（プロジェクト文書 自然言語Q&A）との違い

| 観点 | System 03 | System 13 |
|------|-----------|-----------|
| 主目的 | 個別の質問に根拠文書を返す | 初期教育・キャッチアップを支援する |
| 扱う情報 | 明文化された文書中心 | 文書に加えて経緯・地雷情報・暗黙知も扱う |
| 出力 | 質問への回答 | 回答に加えて警告・優先学習項目・チェックリスト |
| 緊急性 | その場の疑問解消 | 参画直後の短期間キャッチアップ |
| リスク情報 | 質問に応じて参照 | 初期教育の中で優先して提示する |

---

## 機能要件

### 1. プロジェクトプロファイル管理機能
プロジェクトの基本情報を管理する。

| 項目 | 説明 |
|------|------|
| プロジェクトID | 識別番号 |
| プロジェクト名 | プロジェクトの名称 |
| 概要 | プロジェクトの目的・背景 |
| 開始日・終了予定日 | スケジュール |
| ステータス | 計画中・進行中・炎上中・完了 |
| 技術スタック | 使用している技術・ツール |
| メンバー | 参画メンバーと役割 |
| 関連システム | 連携している外部システム |

### 2. ナレッジ登録機能
プロジェクト固有のナレッジをベクトルDBに蓄積する。

**ナレッジのカテゴリ**

| カテゴリ | 内容例 |
|---------|--------|
| 経緯・背景 | なぜこのプロジェクトが始まったか・過去の意思決定の理由 |
| 設計・アーキテクチャ | システム構成・設計方針・技術選定の理由 |
| ルール・制約 | コーディング規約・デプロイ手順・禁止事項 |
| 用語・略語集 | プロジェクト固有の用語・略語の定義 |
| リスク・地雷情報 | 過去に失敗した箇所・触ってはいけない部分・注意点 |
| 関係者情報 | ステークホルダー・承認フロー・連絡先 |
| 現状・課題 | 現在の進捗・未解決の課題・ボトルネック |
| ドキュメント所在 | 重要ドキュメントがどこにあるか |

**登録方法**
- テキスト直接入力
- ファイルアップロード（PDF・Word・Excel・Markdown・テキスト）

### 3. 会話型Q&A機能（メモリ付き）
会話形式でプロジェクト情報を提供する。

**回答の構成**

| 項目 | 説明 |
|------|------|
| 回答本文 | 質問に対する自然文での回答 |
| 根拠ナレッジ | 回答の根拠となった情報源 |
| 関連情報 | 合わせて知っておくべき情報 |
| 警告 | リスク・地雷情報がある場合の警告 |
| エスカレーション | 回答できない場合の担当者案内 |

**パーソナライズ**
- 参画者の役割（開発者・PM・テスターなど）に応じた情報を優先
- 参画日数に応じた回答粒度の調整

**会話メモリ**
- 短期メモリ：セッション内の会話履歴
- 長期メモリ：過去のQ&A履歴をDBに保存

### 4. 緊急キャッチアップ機能
炎上プロジェクト参画時など、即座に状況を把握するための機能。

「今すぐ把握すべきことを教えて」と聞くと、以下を自動生成する。

**緊急キャッチアップレポートの内容**

| 項目 | 説明 |
|------|------|
| プロジェクト概要 | 3行でわかるプロジェクトの現状 |
| 現在の最重要課題 | 今すぐ対処が必要なこと |
| 地雷・リスク情報 | 絶対に知っておくべき注意事項 |
| キーパーソン | 誰に聞けばいいか |
| 重要ドキュメント所在 | まず読むべきドキュメントとその場所 |
| 最初の1週間でやるべきこと | 優先的に取り組むタスク |

### 5. ナレッジ検索機能
蓄積されたナレッジをキーワード・意味検索で探す。

- キーワード検索
- ベクトル検索（意味的な類似検索）
- カテゴリ絞り込み
- 重要度・緊急度でのフィルタリング

### 6. キャッチアップ進捗管理機能
新規参画者のキャッチアップ状況を管理する。

**チェックリスト**
- 役割に応じた必須知識のチェックリストを自動生成
- 確認済み・未確認の管理
- 理解度の自己申告（理解した・要確認・わからない）

**進捗ダッシュボード（管理者向け）**
- 参画者ごとのキャッチアップ進捗
- よく聞かれる質問の一覧
- 回答できなかった質問（ナレッジ整備に活用）

## 非機能要件

| 項目 | 要件 |
|------|------|
| 応答時間 | 1質問あたり30秒以内 |
| セキュリティ | プロジェクト間のナレッジは厳密に分離 |
| 対応言語 | 日本語 |
| セッション | 会話履歴とQ&AログをPostgreSQLへ保存し、同じセッションIDで継続できる |
| 処理順 | 外部AI、検索、保存は一件ずつ順番に処理する |

---

## システム構成

```
参画者（クライアント）
        ↓
    FastAPI（APIサーバー）
        ↓
    プロジェクト・ユーザー認証
    （どのプロジェクトの誰か）
        ↓
    セッション管理
    （短期メモリ：会話履歴）
    （長期メモリ：過去Q&A履歴）
        ↓
    ┌──────────────────────────────────────────┐
    │  RAG：プロジェクトナレッジ検索            │
    │  質問をベクトル化                         │
    │  → プロジェクトIDでフィルター             │
    │  → pgvectorで類似ナレッジを検索          │
    │  → 上位5件をプロンプトに差し込み          │
    └──────────────────────────────────────────┘
        ↓
    LM Studioで選択されたLLM（回答生成・パーソナライズ）
        ↓
    警告フラグチェック
    （リスク・地雷情報が含まれる場合）
        ↓
    出力バリデーション（Pydantic）
        ↓
    PostgreSQL（ログ・セッション・進捗保存）
        ↓
    JSONレスポンス返却
```

---

## API仕様

プロジェクトID、利用者ID、役割は画面で入力する。ナレッジ登録または初回利用時に、対象プロジェクトと利用者のスナップショットを作成する。

### POST /ask
質問を送信して回答を受け取る。

**リクエスト（JSON）**
```json
{
  "session_id": "sess_abc123",
  "project_id": "proj_001",
  "user_id": "emp_001",
  "question": "認証モジュールを修正する際に気をつけることはありますか？"
}
```

**レスポンス（JSON）**
```json
{
  "answer_id": 1,
  "session_id": "sess_abc123",
  "question": "認証モジュールを修正する際に気をつけることはありますか？",
  "answer": "認証モジュールはプロジェクト発足当初から技術的負債が蓄積されており、特に注意が必要です。JWTの有効期限処理に既知のバグがあり（Issue #234）、修正時に副作用が出やすい状況です。",
  "confidence": "高",
  "sources": [
    {
      "title": "認証モジュールの既知問題リスト",
      "category": "リスク・地雷情報",
      "excerpt": "JWT有効期限処理に既知バグあり。Issue #234参照。修正時は必ずQAチームに事前連絡すること。",
      "importance": "high"
    }
  ],
  "warning": "⚠️ このモジュールには地雷情報があります。修正前に必ず田中（QAリーダー）に連絡してください。",
  "related_info": [
    "デプロイ前にステージング環境で必ず認証テストを実行すること",
    "本番デプロイは毎週水曜日のメンテナンス時間帯のみ可能"
  ],
  "escalation": null
}
```

### GET /catchup-report
緊急キャッチアップレポートを取得する。

**クエリパラメータ**
```
project_id: プロジェクトID
user_id:    参画者ID
role:       役割（developer・pm・tester等）
```

**レスポンス（JSON）**
```json
{
  "project_id": "proj_001",
  "generated_at": "2024-04-01T10:00:00",
  "overview": "ECサイトリニューアルプロジェクト。リリース2ヶ月前でテスト工程が3週間遅延中。",
  "critical_issues": [
    "テストが完了していない機能が12件残っている",
    "決済モジュールに未解決バグが3件ある"
  ],
  "landmines": [
    "認証モジュールのJWT処理に既知バグあり（Issue #234）。修正時は必ずQAに事前連絡",
    "本番DBの直接操作は禁止。必ずステージングで確認後にリリース手順に従うこと",
    "顧客Aは仕様変更に非常に敏感。変更時は必ず書面での承認を取ること"
  ],
  "key_persons": [
    {"name": "田中", "role": "QAリーダー", "contact": "testers-channel"},
    {"name": "佐藤", "role": "インフラ担当", "contact": "infra-channel"}
  ],
  "important_docs": [
    {"title": "システム設計書v2.1", "category": "設計・アーキテクチャ"},
    {"title": "テスト計画書", "category": "ルール・制約"}
  ],
  "first_week_tasks": [
    "設計書を読んでシステム全体像を把握する",
    "未完了テストケース一覧を確認して担当を決める",
    "田中・佐藤と1on1を実施して現状をヒアリングする"
  ]
}
```

### POST /knowledge
ナレッジを登録する。

**リクエスト（JSON）**
```json
{
  "project_id": "proj_001",
  "category": "リスク・地雷情報",
  "title": "認証モジュールの既知問題",
  "content": "JWT有効期限処理に既知バグあり（Issue #234）。修正時は必ずQAチームに事前連絡すること。本番環境での副作用が過去2回発生している。",
  "importance": "high",
  "is_landmine": true,
  "registered_by": "emp_005",
  "source_type": "official"
}
```

### POST /knowledge/file
ファイルをアップロードしてナレッジとして登録する。

### GET /knowledge
ナレッジ一覧を取得する。

### GET /users/{user_id}/checklist
キャッチアップチェックリストを取得する。

### PATCH /users/{user_id}/checklist/{item_id}
チェックリストの項目を更新する。

### GET /admin/dashboard
管理者向けダッシュボードを取得する。

---

## データモデル

### system13_projectsテーブル
```sql
CREATE TABLE system13_projects (
    id              VARCHAR(50) PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    overview        TEXT,
    start_date      DATE,
    end_date        DATE,
    status          VARCHAR(20),    -- 計画中・進行中・炎上中・完了
    tech_stack      JSONB,
    members         JSONB,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

### system13_knowledgeテーブル
```sql
CREATE TABLE system13_knowledge (
    id             SERIAL PRIMARY KEY,
    project_id     VARCHAR(50) NOT NULL REFERENCES system13_projects(id) ON DELETE CASCADE,
    category       VARCHAR(50),
    title          VARCHAR(255) NOT NULL,
    content        TEXT NOT NULL,
    importance     VARCHAR(10) NOT NULL DEFAULT 'medium',
    is_landmine    BOOLEAN DEFAULT FALSE,  -- 地雷情報フラグ
    registered_by  VARCHAR(100),
    source_type    VARCHAR(20) NOT NULL DEFAULT 'official',
    embedding      VECTOR(768),     -- pgvector
    is_active      BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMP DEFAULT NOW(),
    updated_at     TIMESTAMP DEFAULT NOW()
);
```

### system13_membersテーブル
```sql
CREATE TABLE system13_members (
    id           SERIAL PRIMARY KEY,
    project_id   VARCHAR(50) NOT NULL REFERENCES system13_projects(id) ON DELETE CASCADE,
    user_id      VARCHAR(50),
    name         VARCHAR(100),
    role         VARCHAR(50),
    joined_at    DATE,
    created_at   TIMESTAMP DEFAULT NOW()
);
```

### system13_sessionsテーブル
```sql
CREATE TABLE system13_sessions (
    session_id  VARCHAR(50) PRIMARY KEY,
    project_id  VARCHAR(50) NOT NULL REFERENCES system13_projects(id) ON DELETE CASCADE,
    user_id     VARCHAR(50) NOT NULL,
    history     JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);
```

### system13_question_logsテーブル
```sql
CREATE TABLE system13_question_logs (
    id           SERIAL PRIMARY KEY,
    session_id   VARCHAR(50),
    project_id   VARCHAR(50),
    user_id      VARCHAR(50),
    question     TEXT,
    answer       TEXT,
    sources      JSONB NOT NULL DEFAULT '[]'::jsonb,
    related_info JSONB NOT NULL DEFAULT '[]'::jsonb,
    confidence   VARCHAR(10),
    escalation   JSONB,
    has_warning  BOOLEAN DEFAULT FALSE,
    is_answered  BOOLEAN,
    created_at   TIMESTAMP DEFAULT NOW()
);
```

### system13_checklist_itemsテーブル
```sql
CREATE TABLE system13_checklist_items (
    id           SERIAL PRIMARY KEY,
    project_id   VARCHAR(50),
    user_id      VARCHAR(50),
    role         VARCHAR(50),
    title        TEXT,
    category     VARCHAR(50),
    status       VARCHAR(20) DEFAULT 'pending',  -- pending・in_progress・completed
    due_days     INTEGER,
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW()
);
```

---

## プロンプト仕様

### システムプロンプト
```
あなたはプロジェクト初期教育支援の専門家AIです。
新規参画メンバーが素早くプロジェクトをキャッチアップできるよう、
的確かつ正確な情報を提供してください。

プロジェクト情報：
- プロジェクト名：{project_name}
- 参画者の役割：{role}
- 参画日数：{days_since_joined}日目

参照ナレッジ：
{retrieved_knowledge}

会話履歴：
{conversation_history}

ルール：
1. 参照ナレッジの内容のみを根拠に回答すること
2. 地雷・リスク情報が含まれる場合は必ず警告を付与すること
3. ナレッジに記載がない場合は「記録がないため、{key_person}に確認してください」と案内すること
4. 参画者の役割に応じて必要な情報を優先して提供すること
5. 推測・憶測で回答しないこと
6. 必ず指定のJSONフォーマットで返すこと
```

---

## ガードレール設計

- AI処理が失敗または30秒を超えた場合：登録済みナレッジから代替結果を返す
- 地雷・リスク情報（is_landmine=true）が検索結果に含まれる場合：必ず警告フラグを付与
- 他プロジェクトのナレッジが参照されないようにproject_idで厳密にフィルタリング
- 他のメンバーの個人評価・給与等に関する質問：回答を拒否
- セッション履歴とQ&AログはPostgreSQLに保存する

---

## 技術スタック

| 用途 | 技術 |
|------|------|
| APIサーバー | FastAPI |
| LLM | LM Studioで選択したモデル |
| 埋め込みモデル | nomic-embed-text（ローカル）/ LM Studio経由 |
| ベクトルDB | pgvector（PostgreSQL拡張） |
| RAG検索 | キーワードスコア + pgvector類似度 |
| テキスト抽出 | PyMuPDF / python-docx |
| 出力バリデーション | Pydantic |
| DB | PostgreSQL |
| ORM | SQLAlchemy |
| トレース・ログ | 共通監査ログとDBログ |

---

## 対応する知識マップ項目

| 工程 | 習得できる知識マップ項目 |
|------|----------------------|
| 工程1：要件定義 | AIの役割範囲・RAG要件・ガードレール要件 |
| 工程2：基本設計 | 埋め込みモデル・pgvector・キーワードとベクトルの複合検索 |
| 工程3：詳細設計 | RAG詳細設計・チャンキング・メモリ設計（短期・長期）・コンテキストウィンドウ制約 |
| 工程4：実装 | RAG処理・pgvector・DB会話履歴・地雷情報フラグ・監査ログ |
| 工程5：検証 | ガードレール検証（プロジェクト間データ分離・個人情報保護） |
| 横断 | FastAPI・PostgreSQL・SQLAlchemy・Python |

---

## 対象外（スコープ外）

- プロジェクトマスターの任意編集UI
- GitHubのIssue・PRとの自動連携
- Slack・Teamsへの直接連携
- ナレッジの自動生成（議事録からの自動抽出は対象外）
- プロジェクト管理ツール（Jira・Notionなど）との自動同期

## 学習完了の目安

- [ ] 工程1：要件定義：AIの役割範囲・RAG要件・ガードレール要件
- [ ] 工程2：基本設計：埋め込みモデル・pgvector・キーワードとベクトルの複合検索
- [ ] 工程3：詳細設計：RAG詳細設計・チャンキング・メモリ設計（短期・長期）・コンテキストウィンドウ制約
- [ ] 工程4：実装：RAG処理・pgvector・DB会話履歴・地雷情報フラグ・監査ログ
- [ ] 工程5：検証：ガードレール検証（プロジェクト間データ分離・個人情報保護）
- [ ] 横断：FastAPI・PostgreSQL・SQLAlchemy・Python
