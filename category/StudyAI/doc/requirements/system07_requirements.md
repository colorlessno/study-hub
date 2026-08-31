# System 07 要件定義

## このテーマでできるようになること

- 要件定義で扱う「AIの役割範囲・RAG要件・ガードレール要件」を説明できる
- 基本設計で扱う「埋め込みモデル・pgvector・LlamaIndex・パイプライン設計」を説明できる
- 詳細設計で扱う「RAG詳細設計・チャンキング・ハイブリッド検索・JSON出力固定」を説明できる
- 実装で扱う「RAGパイプライン実装・pgvector・自動タグ付け実装・重複検出実装・MLflowトレース」を説明できる
- 検証で扱う「ガードレール検証（権限フィルタリング・重複ファイルハッシュ検証）」を説明できる
- FastAPI・PostgreSQL・SQLAlchemy・Pythonを横断的に使う構成を説明できる

## プロジェクト内ドキュメント 自動タグ付け＆類似ドキュメント推薦システム

---

## システム概要

プロジェクト内に蓄積されたドキュメント・議事録・報告書に対して、LLMが自動でタグ・カテゴリを付与し、関連ドキュメントを推薦するシステム。ナレッジの属人化・埋もれを防ぎ、必要な情報に素早くたどり着けるようにする。

---

## 現状の課題

- プロジェクト内ドキュメントが増えるにつれ、目的の情報が見つからない
- タグ付け・分類が担当者任せで統一されていない
- 関連ドキュメントが存在するのに気づかず、二重作業が発生する
- 退職者のナレッジが適切に引き継がれずに埋もれる
- 全文検索では意味的に近いドキュメントがヒットしない

---

## 対象ユーザー

> **デプロイ前提：1デプロイ = 1プロジェクト**
> 本システムは1デプロイインスタンスが1プロジェクトに対応する前提で設計されている。`project_id` によるデータ分離・プロジェクト一覧取得APIは将来対応予定。

- プロジェクトメンバー（ドキュメント検索・閲覧側）
- ドキュメント管理者（登録・管理側）

---

## 機能要件

### 1. ドキュメント登録機能
プロジェクト内ドキュメントをシステムに登録する。

**対応形式**
- PDF・Word（.docx）・テキスト（.txt）・Markdown（.md）・Excel（.xlsx）
- ファイルサイズ上限：1ファイルあたり50MB
- 複数ファイルの一括登録対応

**登録時の自動処理**
- テキスト抽出
- チャンキング（段落・セクション単位）
- ベクトル化してpgvectorに保存
- LLMによる自動タグ付け・カテゴリ分類・要約生成

### 2. 自動タグ付け機能（LLM）
登録されたドキュメントに対してLLMが自動でタグ・カテゴリを付与する。

**自動生成される情報**

| 項目 | 説明 |
|------|------|
| カテゴリ | ドキュメントの大分類（例：技術・設計・進捗管理・テスト） |
| サブカテゴリ | 中分類（例：技術 → 設計書・仕様書・議事録） |
| タグ | キーワードタグ（最大10件） |
| 要約 | ドキュメントの3行要約 |
| 重要度 | 高・中・低（内容の重要性から判定） |
| ドキュメント種別 | 仕様書・議事録・報告書・マニュアル・提案書など |

**タグの統制**
- 既存タグとの類似チェックを行い、表記ゆれを防ぐ
- 新規タグは管理者が承認してから正式タグとして登録

### 3. 類似ドキュメント推薦機能（RAG）
ドキュメント閲覧時・検索時に関連ドキュメントをベクトル検索で推薦する。

**推薦のトリガー**
- ドキュメント閲覧時：閲覧中のドキュメントに類似したドキュメントを推薦
- キーワード検索時：検索クエリに意味的に近いドキュメントを推薦
- タグ選択時：同一タグを持つドキュメントを推薦

**推薦結果の構成**

| 項目 | 説明 |
|------|------|
| ドキュメント名 | ファイル名・タイトル |
| 類似度スコア | 0.0〜1.0 |
| 要約 | 3行要約 |
| タグ | 付与されたタグ一覧 |
| 登録日・更新日 | ドキュメントの新鮮さの参考情報 |
| 登録者 | 誰が登録したか |

### 4. 全文・意味検索機能
キーワードおよび意味的な類似度でドキュメントを検索する。

**検索方式**
- キーワード検索：ドキュメント名・タグ・要約での部分一致
- ベクトル検索：クエリの意味に近いドキュメントを検索
- ハイブリッド検索：両方を組み合わせてスコアリング

**検索フィルター**
- カテゴリ・サブカテゴリ
- タグ
- 登録日・更新日
- 登録者
- ドキュメント種別
- 重要度

### 5. タグ管理機能
タグの一覧管理・統合・削除を行う。

- タグ一覧の取得（使用頻度順）
- タグの統合（表記ゆれの解消）
- タグの削除・無効化
- タグ別のドキュメント一覧取得

### 6. アクセス統計機能
- ドキュメントの閲覧数・検索ヒット数の集計
- よく検索されるキーワードのランキング
- 閲覧されていないドキュメントの一覧（陳腐化チェック）
- 登録者別のドキュメント登録数

---

## 非機能要件

| 項目 | 要件 |
|------|------|
| 応答時間 | タグ付け・要約生成：60秒以内 / 検索：5秒以内 |
| ドキュメント件数 | 最大10,000ファイル |
| セキュリティ | ロール（`access_roles`）によるドキュメントアクセス制御。マルチプロジェクト対応は将来対応予定 |
| 対応言語 | 日本語・英語 |

---

## システム構成

```
クライアント（curl / 画面）
        ↓
    FastAPI（APIサーバー）
        ↓
---（登録フロー）---
    ファイル受付・テキスト抽出
    （PyMuPDF / python-docx / openpyxl）
        ↓
    チャンキング（段落・セクション単位）
        ↓
    埋め込みモデルでベクトル化
    → pgvectorに保存
        ↓
    LLM（タグ付け・カテゴリ分類・要約生成）
    ※ Qwen3-27B / LM Studio
        ↓
    出力バリデーション（Pydantic）
        ↓
    PostgreSQL（ドキュメント情報・タグ保存）

---（検索・推薦フロー）---
    検索クエリ受付
        ↓
    クエリをベクトル化
        ↓
    pgvectorで類似ドキュメント検索
    ＋ キーワード検索
    → ハイブリッドスコアリング
        ↓
    推薦結果返却
```

---

## API仕様

### POST /documents
ドキュメントを登録する。

**リクエスト**
```
Content-Type: multipart/form-data
file:         アップロードファイル
registered_by: 登録者ID
access_roles:  アクセス可能な権限（JSON配列）
```

**レスポンス（JSON）**
```json
{
  "document_id": 1,
  "file_name": "2024年度_システム設計書_v1.2.docx",
  "auto_tags": {
    "category": "技術",
    "sub_category": "設計書",
    "document_type": "仕様書",
    "importance": "高",
    "tags": ["システム設計", "アーキテクチャ", "API設計", "DB設計", "FastAPI"],
    "summary": "2024年度に開発するシステムの基本設計書。APIサーバー・DB・フロントエンドの構成と各モジュールの仕様を定義している。"
  }
}
```

### POST /documents/bulk
複数ドキュメントを一括登録する。

### GET /documents
ドキュメント一覧を取得する。

**クエリパラメータ**
```
keyword:       キーワード検索
category:      カテゴリ
tags:          タグ（カンマ区切り）
document_type: ドキュメント種別
importance:    重要度
registered_by: 登録者
from_date:     登録開始日
to_date:       登録終了日
search_mode:   keyword / vector / hybrid（デフォルト: hybrid）
```

### GET /documents/{document_id}
ドキュメント詳細を取得する。

### GET /documents/{document_id}/similar
類似ドキュメントを取得する。

**レスポンス（JSON）**
```json
{
  "document_id": 1,
  "similar_documents": [
    {
      "document_id": 5,
      "file_name": "2023年度_システム設計書_v2.0.docx",
      "similarity_score": 0.92,
      "summary": "前年度のシステム設計書。現行システムのアーキテクチャが記載されている。",
      "tags": ["システム設計", "アーキテクチャ", "API設計"],
      "registered_at": "2023-10-01",
      "registered_by": "yamada"
    },
    {
      "document_id": 12,
      "file_name": "API設計ガイドライン.md",
      "similarity_score": 0.87,
      "summary": "プロジェクト内APIの設計ガイドライン。命名規則・エラーハンドリング・認証方式を定義している。",
      "tags": ["API設計", "ガイドライン", "命名規則"],
      "registered_at": "2024-01-15",
      "registered_by": "suzuki"
    }
  ]
}
```

### PUT /documents/{document_id}/tags
タグを手動で編集する。

**リクエスト（JSON）**
```json
{
  "tags": ["システム設計", "アーキテクチャ", "FastAPI", "PostgreSQL"],
  "category": "技術",
  "sub_category": "設計書"
}
```

### GET /tags
タグ一覧を取得する（使用頻度順）。

### POST /tags/merge
タグを統合する（表記ゆれの解消）。

**リクエスト（JSON）**
```json
{
  "source_tags": ["DB設計", "データベース設計", "DB"],
  "target_tag": "DB設計"
}
```

### GET /stats/access
アクセス統計を取得する。

### GET /stats/unused-documents
閲覧されていないドキュメントの一覧を取得する。

---

## データモデル

### system07_documentsテーブル
```sql
CREATE TABLE system07_documents (
    id             SERIAL PRIMARY KEY,
    file_name      VARCHAR(255) NOT NULL,
    title          VARCHAR(255),
    file_hash      VARCHAR(64) UNIQUE NOT NULL,
    file_size      BIGINT,
    category       VARCHAR(50),
    sub_category   VARCHAR(50),
    document_type  VARCHAR(50),
    importance     VARCHAR(10),        -- 高・中・低
    summary        TEXT,
    registered_by  VARCHAR(100) NOT NULL,
    access_roles   JSONB NOT NULL DEFAULT '[]'::jsonb,
    view_count     INTEGER NOT NULL DEFAULT 0,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP DEFAULT NOW(),
    updated_at     TIMESTAMP DEFAULT NOW()
);
```

### system07_document_chunksテーブル
```sql
CREATE TABLE system07_document_chunks (
    id          SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES system07_documents(id) ON DELETE CASCADE,
    chunk_no    INTEGER NOT NULL,
    chunk_text  TEXT NOT NULL,
    section     VARCHAR(255),
    embedding   VECTOR(768),           -- pgvector
    created_at  TIMESTAMP DEFAULT NOW()
);
```

### system07_tagsテーブル
```sql
CREATE TABLE system07_tags (
    id               SERIAL PRIMARY KEY,
    normalized_name  VARCHAR(100) UNIQUE NOT NULL,
    synonyms         JSONB NOT NULL DEFAULT '[]'::jsonb,
    use_count        INTEGER NOT NULL DEFAULT 0,
    merged_to_tag_id INTEGER REFERENCES system07_tags(id),
    created_at       TIMESTAMP DEFAULT NOW()
);
```

### system07_document_tagsテーブル（中間テーブル）
```sql
CREATE TABLE system07_document_tags (
    document_id INTEGER REFERENCES system07_documents(id) ON DELETE CASCADE,
    tag_id      INTEGER REFERENCES system07_tags(id) ON DELETE CASCADE,
    is_auto     BOOLEAN NOT NULL DEFAULT TRUE,  -- 自動付与かどうか
    created_at  TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (document_id, tag_id)
);
```

### system07_access_logsテーブル
```sql
CREATE TABLE system07_access_logs (
    id          SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES system07_documents(id) ON DELETE CASCADE,
    user_id     VARCHAR(100) NOT NULL,
    action      VARCHAR(20) NOT NULL,  -- view・search・recommend
    query       TEXT,                  -- 検索クエリ（検索時のみ）
    accessed_at TIMESTAMP DEFAULT NOW()
);
```

---

## プロンプト仕様

### タグ付け・分類・要約生成プロンプト
```
あなたはプロジェクト内ドキュメント管理の専門家AIです。
以下のドキュメント内容を分析し、タグ付け・カテゴリ分類・要約を生成してください。

既存タグ一覧（表記ゆれ防止のため参照すること）：
{existing_tags}

ドキュメント内容：
{document_text}

ルール：
1. カテゴリは「技術・設計・進捗管理・テスト・運用・顧客調整・その他」から選ぶこと
2. タグは最大10件、既存タグと重複しないよう確認すること
3. 要約は3行以内で、ドキュメントの目的・内容・対象者を含めること
4. 重要度はドキュメントの影響範囲・更新頻度・利用頻度から判定すること
5. 必ず指定のJSONフォーマットで返すこと
```

---

## ガードレール設計

- JSON形式が壊れていた場合：最大3回まで再試行
- 同一ファイル（ファイルハッシュで判定）の重複登録を防止
- 権限外のドキュメントが検索・閲覧されないようにフィルタリング
- 新規タグが既存タグと類似している場合：管理者に確認を促すフラグを付与
- ドキュメントが50,000文字を超える場合：チャンキングして処理

---

## 技術スタック

| 用途 | 技術 |
|------|------|
| APIサーバー | FastAPI |
| LLM | Qwen3-27B（Q4量子化）/ LM Studio経由 |
| 埋め込みモデル | nomic-embed-text（ローカル）/ LM Studio経由 |
| ベクトルDB | pgvector（PostgreSQL拡張） |
| RAGフレームワーク | LlamaIndex |
| テキスト抽出 | PyMuPDF / python-docx / openpyxl |
| 出力バリデーション | Pydantic |
| DB | PostgreSQL |
| ORM | SQLAlchemy |
| トレース・ログ | MLflow |

---

## 対応する知識マップ項目

| 工程 | 習得できる知識マップ項目 |
|------|----------------------|
| 工程1：要件定義 | AIの役割範囲・RAG要件・ガードレール要件 |
| 工程2：基本設計 | 埋め込みモデル・pgvector・LlamaIndex・パイプライン設計 |
| 工程3：詳細設計 | RAG詳細設計・チャンキング・ハイブリッド検索・JSON出力固定 |
| 工程4：実装 | RAGパイプライン実装・pgvector・自動タグ付け実装・重複検出実装・MLflowトレース |
| 工程5：検証 | ガードレール検証（権限フィルタリング・重複ファイルハッシュ検証） |
| 横断 | FastAPI・PostgreSQL・SQLAlchemy・Python |

---

## 対象外（スコープ外）

- 画面UI（フロントエンド）
- ファイルサーバー・SharePointとの自動同期
- ドキュメントの編集・バージョン管理
- 電子署名・承認ワークフロー
- 外部公開・社外共有機能
- 複数プロジェクトの同一インスタンス運用（本システムは1デプロイ = 1プロジェクト前提。将来対応予定）

## 学習完了の目安

- [ ] 工程1：要件定義：AIの役割範囲・RAG要件・ガードレール要件
- [ ] 工程2：基本設計：埋め込みモデル・pgvector・LlamaIndex・パイプライン設計
- [ ] 工程3：詳細設計：RAG詳細設計・チャンキング・ハイブリッド検索・JSON出力固定
- [ ] 工程4：実装：RAGパイプライン実装・pgvector・自動タグ付け実装・重複検出実装・MLflowトレース
- [ ] 工程5：検証：ガードレール検証（権限フィルタリング・重複ファイルハッシュ検証）
- [ ] 横断：FastAPI・PostgreSQL・SQLAlchemy・Python
