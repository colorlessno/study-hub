# System 10 要件定義

## このテーマでできるようになること

- 要件定義で扱う「AIの役割範囲・RAG要件・ガードレール要件」を説明できる
- 基本設計で扱う「**MCP（filesystem）設計**・**Skills設計**・埋め込みモデル・pgvector・ハイブリッド検索設計」を説明できる
- 詳細設計で扱う「RAG詳細設計・ハイブリッド検索・チャンキング（ファイル単位）」を説明できる
- 実装で扱う「**MCP filesystem実装**・RAGパイプライン実装・pgvector・順次処理・監査ログ」を説明できる
- 検証で扱う「ガードレール検証（権限フィルタリング・機密ファイル除外）」を説明できる
- FastAPI・PostgreSQL・SQLAlchemy・Pythonを横断的に使う構成を説明できる

## 構成管理補助・ドキュメント所在検索システム

---

## システム概要

共有フォルダ・ローカルフォルダ内のドキュメントをインデックス化し、自然文での検索・所在確認・整理状況の可視化を行うシステム。構成管理が破綻したプロジェクト環境でも、必要なドキュメントを素早く見つけられるようにする。MCPのfilesystemサーバーを活用してローカル・共有フォルダへアクセスする。

---

## 現状の課題

- 炎上プロジェクト参画時など、ドキュメントがどこにあるかわからない
- フォルダ構成がバラバラで、どのファイルが最新版かわからない
- 同じドキュメントが複数箇所に存在して混乱する
- ファイル名だけでは内容がわからず、一件ずつ開いて確認する手間がかかる
- 構成管理ルールが周知されておらず、新規参画者が情報を見つけられない

---

## 対象ユーザー

- プロジェクトに途中参画した開発者・PM
- 構成管理担当者
- ドキュメントを探しているプロジェクトメンバー

---

## 機能要件

### 1. フォルダスキャン・インデックス化機能
指定したフォルダ配下のファイルをスキャンしてインデックスを作成する。

**対応ファイル形式**
- テキスト系：PDF・Word（.docx）・Excel（.xlsx）・テキスト（.txt）・Markdown（.md）・PowerPoint（.pptx）
- ソースコード：.py・.js・.ts・.java・.sql・.sh・.yaml・.json・.xml
- その他：ファイル名・更新日・サイズのみインデックス化

**スキャン時の処理**
- ファイル名・パス・更新日・サイズの記録
- 対応形式はテキスト抽出・ベクトル化・LLMによる要約生成
- ファイルハッシュによる重複検出
- 最終更新日・バージョン情報（v1.0・_最新・_旧版などのパターン）の抽出

**スキャン設定**
- スキャン対象フォルダの複数指定
- 除外フォルダ・ファイルパターンの指定（例：node_modules・.git）
- 差分スキャン（前回スキャン以降の変更分のみ）

### 2. MCP連携機能
JSON-RPCのMCPセッションを開始し、filesystemサーバーを経由して許可済みフォルダへアクセスする。教材環境ではDockerの読取専用ボリューム`/mnt/scan/project`だけを許可し、バックエンドプロセスから対象ファイルを直接開かない。

> 📝 **MCPのfilesystemサーバー**
> ローカルPC・共有フォルダへのファイルアクセスをMCP経由で行う仕組み。エージェントが直接ファイルシステムを操作できる。読み取り・一覧取得・検索が主な操作。

**MCP経由で実行できる操作**
- フォルダ・ファイルの一覧取得
- ファイル内容の読み取り
- ファイルの検索（ファイル名パターン）
- ファイルのメタ情報取得（サイズ・更新日）

### 3. 自然文検索機能
「〇〇の設計書はどこにある？」のような自然文でドキュメントを検索する。

**検索方式**
- キーワード検索：ファイル名・要約・内容での部分一致
- ベクトル検索：クエリの意味に近いドキュメントを検索
- ハイブリッド検索：両方を組み合わせてスコアリング

**検索結果の構成**

| 項目 | 説明 |
|------|------|
| ファイル名 | ドキュメントのファイル名 |
| フルパス | ファイルの所在（フォルダパス） |
| 要約 | LLMが生成した3行要約 |
| 関連度スコア | 検索クエリとの類似度 |
| 更新日・サイズ | ファイルの新鮮さの参考情報 |
| 重複情報 | 同一または類似ファイルの有無 |
| 最新版フラグ | 最新版と思われるかどうかの判定 |

### 4. 重複・類似ドキュメント検出機能
- ファイルハッシュによる完全一致の重複検出
- ベクトル類似度による内容が似ているドキュメントの検出
- 類似ファイルのグループ化・一覧表示
- どれが最新版かの推定（更新日・ファイル名のバージョン情報から判定）

### 5. 構成マップ生成機能
フォルダ構成と各ファイルの役割を可視化したマップを生成する。

**生成内容**
- フォルダツリー構造
- 各フォルダ・ファイルの役割説明（LLMが推定）
- ファイル数・総サイズの集計
- 更新が止まっているフォルダ・古いドキュメントの特定
- 構成上の問題点の指摘（同一ドキュメントの分散・命名規則の不統一など）

### 6. ドキュメント所在レポート機能
プロジェクト参画直後に使える「このプロジェクトのドキュメントはどこに何があるか」レポートを自動生成する。

**レポート内容**
- プロジェクト概要（フォルダ構成から推定）
- ドキュメント種別ごとの所在一覧
  - 要件定義書・設計書・仕様書
  - テスト計画・テスト結果
  - 議事録・打ち合わせ記録
  - 手順書・マニュアル
  - ソースコード
- 最近更新されたドキュメントのリスト
- 重複・類似ドキュメントの一覧
- 構成上の問題点・改善提案

### 7. インデックス管理機能
- インデックスの更新（差分スキャン）
- インデックスの再構築（全件スキャン）
- スキャン履歴・更新ログの確認
- 除外設定の管理

---

## 非機能要件

| 項目 | 要件 |
|------|------|
| スキャン速度 | 1,000ファイルあたり10分以内 |
| 検索速度 | 5秒以内 |
| 対応ファイル数 | 教材画面では少数ファイルを対象とし、対象を一件ずつ順番に処理する |
| セキュリティ | ファイル内容はローカルDB内にのみ保存。外部送信なし |
| 対応言語 | 日本語・英語 |

---

## システム構成

```
クライアント（curl / 画面）
        ↓
    FastAPI（APIサーバー）
        ↓
---（スキャン・インデックス化フロー）---
    MCPのfilesystemサーバー（JSON-RPC / stdio）
    （初期化、ツール確認、一覧取得、読取、メタ情報取得）
        ↓
    ファイル種別判定
        ↓
    テキスト抽出
    （PyMuPDF / python-docx / openpyxl）
        ↓
    LLM（要約生成・ドキュメント種別判定）
    ※ Qwen3-27B / LM Studio
        ↓
    埋め込みモデルでベクトル化
        ↓
    PostgreSQL + pgvector（インデックス保存）

---（検索フロー）---
    自然文クエリ受付
        ↓
    クエリをベクトル化
        ↓
    pgvectorで類似ドキュメント検索
    ＋ キーワード検索
    → ハイブリッドスコアリング
        ↓
    検索結果返却

---（構成マップ・レポート生成フロー）---
    インデックスデータ集計
        ↓
    LLM（構成マップ・レポート生成）
        ↓
    Markdown / JSON 返却
```

---

## API仕様

### POST /scan
フォルダをスキャンしてインデックスを作成・更新する。

**リクエスト（JSON）**
```json
{
  "scan_targets": [
    "C:/projects/project_alpha",
    "//fileserver/shared/project_alpha"
  ],
  "exclude_patterns": ["node_modules", ".git", "*.log", "tmp"],
  "scan_mode": "diff"
}
```

**レスポンス（JSON）**
```json
{
  "scan_id": 1,
  "status": "completed",
  "total_files": 1523,
  "new_files": 45,
  "updated_files": 12,
  "deleted_files": 3,
  "duplicates_found": 8,
  "scan_duration_seconds": 240,
  "processing_notes": ["ファイル分類と要約に設定済みLLMを使用しました。"]
}
```

### GET /search
ドキュメントを検索する。

**クエリパラメータ**
```
q:           検索クエリ（自然文・キーワード）
search_mode: keyword / vector / hybrid（デフォルト: hybrid）
folder:      検索対象フォルダを絞り込む
latest_only: 最新版候補だけに絞り込む
```

**レスポンス（JSON）**
```json
{
  "query": "システム設計書はどこにある？",
  "total_hits": 8,
  "results": [
    {
      "file_id": 123,
      "file_name": "システム基本設計書_v2.1.docx",
      "full_path": "C:/projects/project_alpha/docs/design/システム基本設計書_v2.1.docx",
      "summary": "ECシステムのAPIサーバー・DB・フロントエンドの基本設計を定義する文書。2024年3月に最終更新。",
      "doc_type": "設計書",
      "relevance_score": 0.94,
      "updated_at": "2024-03-15",
      "file_size_kb": 245,
      "is_latest": true,
      "duplicates": [
        {
          "file_name": "システム基本設計書_v2.0.docx",
          "full_path": "C:/projects/project_alpha/docs/archive/システム基本設計書_v2.0.docx",
          "similarity": 0.91
        }
      ]
    }
  ]
}
```

### GET /map
構成マップを取得する。

**クエリパラメータ**
```
folder: 対象フォルダ（省略時は全スキャン対象）
```

**レスポンス（JSON）**
```json
{
  "folder_tree": {
    "path": "C:/projects/project_alpha",
    "description": "ECシステム開発プロジェクトのルートフォルダ",
    "file_count": 234,
    "size_mb": 1240,
    "children": [
      {
        "path": "docs",
        "description": "プロジェクトドキュメント一式",
        "file_count": 89,
        "children": [
          {
            "path": "docs/design",
            "description": "基本設計・詳細設計書",
            "file_count": 12
          }
        ]
      }
    ]
  },
  "issues": [
    "docs/oldフォルダに6ヶ月以上更新されていないファイルが23件あります",
    "システム基本設計書が2箇所に存在します（重複）",
    "命名規則が統一されていないファイルが15件あります"
  ]
}
```

### GET /report
ドキュメント所在レポートを生成する。

**クエリパラメータ**
```
folder: 対象フォルダ
```

**レスポンス（JSON）**
```json
{
  "report_id": 1,
  "generated_at": "2024-04-01T10:00:00",
  "overview": "ECシステム開発プロジェクト。2023年4月開始。総ファイル数1,523件。",
  "document_map": {
    "要件定義書": [
      {"file_name": "要件定義書_v1.3.docx", "path": "docs/requirements/"}
    ],
    "設計書": [
      {"file_name": "システム基本設計書_v2.1.docx", "path": "docs/design/"},
      {"file_name": "DB設計書_v1.0.xlsx", "path": "docs/design/"}
    ],
    "議事録": [
      {"file_name": "議事録_20240401.docx", "path": "docs/minutes/"}
    ]
  },
  "recent_updates": [
    {"file_name": "テスト結果報告書.xlsx", "updated_at": "2024-03-30", "path": "docs/test/"}
  ],
  "duplicates": [
    {
      "group": ["システム基本設計書_v2.0.docx", "システム基本設計書_v2.1.docx"],
      "recommendation": "v2.1が最新版と推定されます。v2.0はarchiveフォルダへ移動を推奨します。"
    }
  ],
  "issues": ["..."],
  "markdown": "# プロジェクトドキュメント所在レポート\n..."
}
```

### GET /duplicates
重複・類似ドキュメントの一覧を取得する。

### GET /scans
スキャン履歴を取得する。

---

## データモデル

### system10_file_indexテーブル
```sql
CREATE TABLE system10_file_index (
    id            SERIAL PRIMARY KEY,
    file_name     VARCHAR(500) NOT NULL,
    full_path     TEXT NOT NULL,
    folder_path   TEXT,
    file_hash     VARCHAR(64),
    file_size     BIGINT,
    doc_type      VARCHAR(50),     -- 設計書・議事録・仕様書・ソースコードなど
    summary       TEXT,
    is_latest     BOOLEAN,         -- 最新版と推定されるか
    updated_at    TIMESTAMP,
    scanned_at    TIMESTAMP DEFAULT NOW(),
    embedding     VECTOR(768),     -- pgvector
    is_active     BOOLEAN DEFAULT TRUE
);
```

### system10_scan_logsテーブル
```sql
CREATE TABLE system10_scan_logs (
    id               SERIAL PRIMARY KEY,
    scan_targets     JSONB,
    scan_mode        VARCHAR(20),
    total_files      INTEGER,
    new_files        INTEGER,
    updated_files    INTEGER,
    deleted_files    INTEGER,
    duplicates_found INTEGER,
    duration_seconds INTEGER,
    status           VARCHAR(20),
    executed_at      TIMESTAMP DEFAULT NOW()
);
```

### system10_duplicate_groupsテーブル
```sql
CREATE TABLE system10_duplicate_groups (
    id              SERIAL PRIMARY KEY,
    file_ids        JSONB,          -- 重複・類似ファイルのIDリスト
    similarity_type VARCHAR(20),    -- exact（完全一致）・similar（類似）
    similarity_score NUMERIC(3,2),
    latest_file_id  INTEGER,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

---

## プロンプト仕様

### ファイル要約・種別判定プロンプト
```
あなたはプロジェクトドキュメント管理の専門家AIです。
以下のファイル内容を分析し、要約とドキュメント種別を判定してください。

ファイル名：{file_name}
ファイル内容：
{file_content}

ルール：
1. 要約は3行以内で、ドキュメントの目的・内容・対象者を含めること
2. ドキュメント種別は「要件定義書・設計書・仕様書・議事録・報告書・マニュアル・テスト文書・ソースコード・その他」から選ぶこと
3. 最新版かどうかはファイル名のバージョン情報・更新日から推定すること
4. 必ず指定のJSONフォーマットで返すこと
```

### 構成マップ・レポート生成プロンプト
```
あなたはプロジェクト構成管理の専門家AIです。
以下のフォルダ・ファイル情報をもとに、構成上の問題点と改善提案を含む
ドキュメント所在レポートを生成してください。

フォルダ構成・ファイル情報：
{index_data}

ルール：
1. 新規参画者が読むことを想定して、わかりやすく説明すること
2. 問題点は具体的に指摘し、改善提案とセットで示すこと
3. どのドキュメントが最新版かを明確にすること
4. 必ず指定のJSONフォーマットで返すこと
```

---

## ガードレール設計

- スキャン対象外のシステムフォルダ（C:\Windows等）は除外
- ファイル内容はローカルDB内にのみ保存し、外部に送信しない
- 機密情報が含まれる可能性のあるファイル（パスワードファイル等）はスキャン対象から除外
- LLM・埋め込みモデルの応答が不正または制限時間超過の場合は、以後の対象を教材内のローカル規則・ローカルベクトルで一件ずつ処理する
- ファイル一覧、本文、メタ情報はMCPツールを一つずつ呼び出し、同時並列に処理しない

---

## 技術スタック

| 用途 | 技術 |
|------|------|
| APIサーバー | FastAPI |
| ファイルシステムアクセス | MCP filesystem サーバー |
| LLM | Qwen3-27B（Q4量子化）/ LM Studio経由 |
| 埋め込みモデル | nomic-embed-text（ローカル）/ LM Studio経由 |
| ベクトルDB | pgvector（PostgreSQL拡張） |
| テキスト抽出 | PyMuPDF / python-docx / openpyxl / python-pptx |
| 出力バリデーション | Pydantic |
| DB | PostgreSQL |
| ORM | SQLAlchemy |
| 実行制御 | FastAPIからの同期実行・対象ファイルの順次処理 |
| トレース・ログ | 共通監査ログ・スキャン履歴 |

---

## 対応する知識マップ項目

| 工程 | 習得できる知識マップ項目 |
|------|----------------------|
| 工程1：要件定義 | AIの役割範囲・RAG要件・ガードレール要件 |
| 工程2：基本設計 | **MCP（filesystem）設計**・**Skills設計**・埋め込みモデル・pgvector・ハイブリッド検索設計 |
| 工程3：詳細設計 | RAG詳細設計・ハイブリッド検索・チャンキング（ファイル単位） |
| 工程4：実装 | **MCP filesystem実装**・RAGパイプライン実装・pgvector・順次処理・監査ログ |
| 工程5：検証 | ガードレール検証（権限フィルタリング・機密ファイル除外） |
| 横断 | FastAPI・PostgreSQL・SQLAlchemy・Python |

---

## 対象外（スコープ外）

- ファイルの編集・移動・削除（読み取り専用）
- クラウドストレージ（OneDrive・Google Drive等）との連携
- リアルタイムのファイル変更検知（定期スキャンで対応）
- ファイルのバージョン管理・差分表示

## 学習完了の目安

- [ ] 工程1：要件定義：AIの役割範囲・RAG要件・ガードレール要件
- [ ] 工程2：基本設計：**MCP（filesystem）設計**・**Skills設計**・埋め込みモデル・pgvector・ハイブリッド検索設計
- [ ] 工程3：詳細設計：RAG詳細設計・ハイブリッド検索・チャンキング（ファイル単位）
- [ ] 工程4：実装：**MCP filesystem実装**・RAGパイプライン実装・pgvector・順次処理・監査ログ
- [ ] 工程5：検証：ガードレール検証（権限フィルタリング・機密ファイル除外）
- [ ] 横断：FastAPI・PostgreSQL・SQLAlchemy・Python
