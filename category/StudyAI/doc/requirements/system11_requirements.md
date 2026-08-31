# System 11 要件定義

## このテーマでできるようになること

- 要件定義で扱う「AIの役割範囲・**Human-in-the-loop要件**・ガードレール要件」を説明できる
- 基本設計で扱う「**MCP（filesystem）設計**・整理案生成・Human-in-the-loop・DB状態管理」を説明できる
- 詳細設計で扱う「整理案生成、選択承認、逐次実行、停止条件、ロールバック」を説明できる
- 実装で扱う「**MCP filesystem実装**・ローカルLLM／規則フォールバック・PostgreSQL保存・ロールバック実装」を説明できる
- 検証で扱う「ガードレール検証（実行ファイル除外・完全削除禁止・システムフォルダ除外）」を説明できる
- FastAPI・PostgreSQL・SQLAlchemy・Pythonを横断的に使う構成を説明できる

## ローカルPCファイル自動整理エージェント

---

## システム概要

専用の教材用フォルダを分析し、ファイルの種別・内容・更新日をもとにLLMまたは教材用規則が整理方針を提案するエージェント。利用者が選択して承認した移動・リネーム・保管だけを、MCPのfilesystemサーバー経由で一件ずつ実行する。教材環境ではDockerの`/mnt/organize/work`配下だけを操作し、PC上の任意フォルダは操作しない。

---

## 現状の課題

- ダウンロードフォルダ・デスクトップにファイルが溜まり続けて管理できない
- ファイル名が意味不明で内容がわからない（スクリーンショット・ダウンロードファイル等）
- 同じファイルが複数箇所に重複して存在する
- 古いファイルをいつ削除していいかわからず溜まり続ける
- 手動で整理する時間がなく、後回しにしてしまう

---

## 対象ユーザー

- ローカルPCのファイル管理に困っている個人ユーザー
- 大量のファイルを扱う開発者・デザイナー・ライター

---

## 機能要件

### 1. 監視フォルダ設定機能
整理対象のフォルダを設定する。

**設定項目**

| 項目 | 説明 |
|------|------|
| 監視フォルダ | 整理対象のフォルダパス（複数指定可） |
| 整理先フォルダ | 分類後のファイルを移動するフォルダ |
| 除外パターン | 整理対象外のファイル・フォルダパターン |
| 実行モード | 提案のみ。選択した操作を人間が承認して実行 |
| 実行スケジュール | 手動のみ |

**推奨設定例**
```
監視フォルダ：
  - C:\Users\username\Downloads
  - C:\Users\username\Desktop

整理先フォルダ：
  - C:\Users\username\Organized

除外パターン：
  - *.exe（実行ファイルは移動しない）
  - .git（Gitリポジトリは除外）
  - node_modules
```

### 2. ファイル分析機能（LLM + MCP）
JSON-RPCのMCPセッションを初期化し、filesystemサーバーの一覧、本文、メタ情報ツールを一つずつ呼び出す。テキスト系は先頭300文字をLLMへ渡し、その他はファイル名・拡張子・サイズ・アクセス日を使う。LLMを利用できない場合は教材用規則で整理案を作る。

**分析内容**

| 項目 | 説明 |
|------|------|
| ファイル種別 | ドキュメント・画像・動画・音声・コード・データ・アーカイブ等 |
| 内容の推定 | ファイル名・拡張子・テキスト内容から推定 |
| プロジェクト推定 | どのプロジェクト・業務に関連するか |
| 重要度 | 高・中・低（最終更新日・アクセス頻度・内容から判定） |
| 重複判定 | 同一または類似ファイルの有無 |
| アーカイブ推奨 | 長期間アクセスされていないファイルのアーカイブ提案 |

**対応ファイル形式（内容分析）**
- テキスト系：PDF・Word・テキスト・Markdown・コードファイル
- その他：ファイル名・拡張子・更新日のみで分析

### 3. 整理方針決定機能（LLM）
分析結果をもとにLLMが整理方針を決定する。

**整理アクションの種類**

| アクション | 説明 |
|-----------|------|
| 分類移動 | カテゴリ別のフォルダに移動 |
| リネーム | 内容を反映した意味のあるファイル名に変更 |
| アーカイブ | 古いファイルをアーカイブフォルダに移動 |
| 重複削除提案 | 重複ファイルの削除を提案（実行は人間が承認） |
| スキップ | 整理対象外と判断してそのまま残す |

**自動分類フォルダ構成例**
```
Organized/
├── Documents/
│   ├── 2024/
│   │   ├── 契約書/
│   │   ├── 議事録/
│   │   └── 報告書/
│   └── 2023/
├── Images/
│   ├── スクリーンショット/
│   └── 写真/
├── Code/
│   ├── Python/
│   └── JavaScript/
├── Data/
│   ├── CSV/
│   └── Excel/
└── Archive/
    └── 2023以前/
```

### 4. 実行前プレビュー・承認機能（Human-in-the-loop）
整理アクションを実行前にユーザーに提示し、承認を得てから実行する。

**プレビュー内容**
- 実行予定のアクション一覧
- 移動元・移動先のパス
- リネーム前後のファイル名
- アーカイブ・削除対象のファイル一覧
- 推定される影響（移動ファイル数・削除容量など）

**承認モード**
- 件別選択承認（選択した操作だけを一つずつ順番に実行）

### 5. 実行機能（MCP）
同じJSON-RPCのMCP filesystemサーバー経由でファイル操作を実行する。移動先フォルダはMCPツールが必要な親フォルダを作成する。

**実行できる操作**
- ファイルの移動
- ファイルのリネーム
- フォルダの作成
- ファイルの保管（Archiveフォルダへの移動。圧縮は行わない）

**実行できない操作（安全のため禁止）**
- ファイルの完全削除（ゴミ箱への移動のみ提案）
- システムフォルダへの操作
- 実行ファイル（.exe・.bat等）の移動

**安全実行ルール**
- 実行はファイル単位で行い、各ファイルの成功 / 失敗 / スキップを個別に記録する
- 移動先に同名ファイルが存在する場合は上書きせず、`競合` として停止する
- 他プロセスが使用中のファイルは `ロック中` としてスキップし、実行結果に残す
- シンボリックリンク・ジャンクション・ショートカットは自動操作対象外とする
- パスは Windows の絶対パスとして正規化し、監視フォルダ配下かどうかを判定してから実行する

### 6. 実行ログ・ロールバック機能
- 実行したすべての操作をログに記録する
- 直前の整理操作を元に戻せる（ロールバック）
- ロールバックは直近10回分まで対応
- 部分成功時は成功した操作のみをロールバック対象にする
- 失敗・スキップされたファイルはロールバック対象に含めない

### 7. 手動設定・実行履歴機能
- 監視フォルダ、整理先、除外パターン、`preview`、`manual`をPostgreSQLへ保存する
- 自動実行は行わず、画面から整理案を作成し、選択確認後に実行する
- 実行結果をファイル単位で保存し、履歴と詳細レポートから確認する

---

## 非機能要件

| 項目 | 要件 |
|------|------|
| 処理方式 | 教材環境では最大500ファイルを対象とし、一件ずつ順番に処理する |
| 安全性 | 操作前に必ずバックアップログを記録。完全削除は行わない |
| セキュリティ | ファイル内容はローカル処理のみ。外部送信なし |
| 対応OS | Windows 11 |
| 動作環境 | 完全ローカル（インターネット接続不要） |
| 実行単位 | 実行結果はファイル単位で記録し、部分失敗を許容する |

---

## システム構成

```
画面またはAPIからの手動実行
        ↓
    FastAPI（ローカルAPIサーバー）
        ↓
    MCPのfilesystemサーバー（JSON-RPC / stdio）
    （初期化、ツール確認、一覧、本文、メタ情報を順次取得）
        ↓
    ファイル分析
    （テキスト抽出・メタ情報収集）
        ↓
    LLM（整理方針決定）
    ※ Qwen3-27B / LM Studio
        ↓
    整理プラン生成
        ↓
    ┌─────────────────────────────┐
    │  Human-in-the-loop         │
    │  プレビュー提示 → 承認待ち  │
    │  承認されたら実行           │
    └─────────────────────────────┘
        ↓
    MCPのfilesystemサーバー
    （選択したファイルの移動・リネーム・保管を順次実行）
        ↓
    実行ログ保存・ロールバック情報記録
        ↓
    整理結果レポート生成
```

---

## API仕様

### POST /scan
監視フォルダをスキャンして整理プランを生成する。

**リクエスト（JSON）**
```json
{
  "watch_folders": [
    "/mnt/organize/work/inbox"
  ],
  "output_folder": "/mnt/organize/work/organized",
  "exclude_patterns": ["*.log"],
  "mode": "preview"
}
```

**レスポンス（JSON）**
```json
{
  "plan_id": "plan-a1b2c3d4e5f6",
  "scanned_files": 5,
  "actions": [
    {
      "action_id": "action-1",
      "action_type": "move",
      "source_path": "/mnt/organize/work/inbox/project-plan.md",
      "dest_path": "/mnt/organize/work/organized/Documents/project-plan.md",
      "reason": "文書ファイルをDocumentsへ移動します。",
      "confidence": 1.0
    },
    {
      "action_id": "action-2",
      "action_type": "rename",
      "source_path": "/mnt/organize/work/inbox/meeting notes.txt",
      "new_name": "meeting-notes.txt",
      "reason": "空白を含む名前を読みやすい名前へ変更します。",
      "confidence": 1.0
    }
  ],
  "summary": {
    "total_actions": 5,
    "moves": 2,
    "renames": 1,
    "archives": 1,
    "skips": 1,
    "duplicates_found": 0
  },
  "planning_method": "local_rules"
}
```

### POST /execute
整理プランを実行する。

**リクエスト（JSON）**
```json
{
  "plan_id": "plan-a1b2c3d4e5f6",
  "approved_action_ids": ["action-1", "action-2"],
  "approval_mode": "selective"
}
```

**レスポンス（JSON）**
```json
{
  "execution_id": "exec-a1b2c3d4e5f6",
  "plan_id": "plan-a1b2c3d4e5f6",
  "result": "success",
  "success_count": 2,
  "failed_count": 0,
  "item_results": [
    {
      "action_id": "action-1",
      "status": "success",
      "error_code": null,
      "executed_at": "2024-04-01T10:30:00"
    }
  ],
  "rollback_available": true
}
```

### POST /rollback/{execution_id}
直前の整理操作を元に戻す。

### GET /executions
実行履歴一覧を取得する。

### GET /executions/{execution_id}/report
整理結果レポートを取得する。

### POST /settings
監視フォルダ・整理先・除外パターン・`preview`・`manual`設定を保存する。

---

## データモデル

### plansテーブル
```sql
CREATE TABLE plans (
    plan_id        VARCHAR(50) PRIMARY KEY,
    summary        TEXT,
    actions_json   JSONB NOT NULL DEFAULT '[]'::jsonb,
    watch_folders  JSONB NOT NULL DEFAULT '[]'::jsonb,
    output_folder  TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'created',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### executionsテーブル
```sql
CREATE TABLE executions (
    execution_id  VARCHAR(50) PRIMARY KEY,
    plan_id       VARCHAR(50) NOT NULL REFERENCES plans(plan_id),
    result        VARCHAR(20) NOT NULL,
    rollback_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    success_count INTEGER NOT NULL DEFAULT 0,
    failed_count  INTEGER NOT NULL DEFAULT 0,
    executed_at   TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### execution_itemsテーブル
```sql
CREATE TABLE execution_items (
    id            SERIAL PRIMARY KEY,
    execution_id  VARCHAR(50) NOT NULL REFERENCES executions(execution_id) ON DELETE CASCADE,
    action_type   VARCHAR(20) NOT NULL,
    source_path   TEXT NOT NULL,
    target_path   TEXT,
    status        VARCHAR(20) NOT NULL,
    error_code    VARCHAR(50),
    rollbackable  BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMP DEFAULT NOW()
);
```

### organizer_settingsテーブル
```sql
CREATE TABLE organizer_settings (
    id               SERIAL PRIMARY KEY,
    watch_folders    JSONB NOT NULL DEFAULT '[]'::jsonb,
    output_folder    TEXT,
    exclude_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
    mode             VARCHAR(20) NOT NULL DEFAULT 'preview',
    schedule         VARCHAR(50),
    updated_at       TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## プロンプト仕様

### 整理方針決定プロンプト
```
あなたはファイル整理の専門家AIです。
以下のファイル情報をもとに、最適な整理方針を決定してください。

整理先フォルダ構成：
{output_folder_structure}

ファイル情報：
{file_info_list}

ルール：
1. ファイルの内容・用途に応じて適切なフォルダに分類すること
2. ファイル名が意味不明な場合は内容を反映した名前に変更すること
3. 2年以上アクセスのないファイルはアーカイブを推奨すること
4. 実行ファイル（.exe・.bat等）は移動しないこと
5. 確信が持てない場合はconfidenceを低くしてスキップを推奨すること
6. 必ず指定のJSONフォーマットで返すこと
```

---

## ガードレール設計

- 実行ファイル（.exe・.bat・.msi等）は操作対象外
- システムフォルダ（C:\Windows・C:\Program Files等）は操作対象外
- ファイルの完全削除は行わない（ゴミ箱への移動のみ提案）
- 実行前に必ずプレビューを生成してユーザー承認を得る
- すべての操作をロールバックデータとともにログに記録
- confidenceが0.7未満のアクションはデフォルトでスキップ
- LLM応答が利用できない、または形式が不正な場合は教材用規則へ切り替える
- MCPツールは一つずつ順番に呼び出し、複数ファイルを同時処理しない

---

## 技術スタック

| 用途 | 技術 |
|------|------|
| APIサーバー | FastAPI |
| ファイルシステムアクセス | MCP filesystem サーバー |
| LLM | Qwen3-27B（Q4量子化）/ LM Studio経由（完全ローカル） |
| テキスト抽出 | PyMuPDF / python-docx |
| 出力バリデーション | Pydantic |
| DB | PostgreSQL |
| ORM | SQLAlchemy |
| 実行制御 | Human-in-the-loopによる選択承認・逐次処理 |
| ログ | PostgreSQLのplan、execution、item履歴 |

---

## 対応する知識マップ項目

| 工程 | 習得できる知識マップ項目 |
|------|----------------------|
| 工程1：要件定義 | AIの役割範囲・**Human-in-the-loop要件**・ガードレール要件 |
| 工程2：基本設計 | **MCP（filesystem）設計**・整理案生成・Human-in-the-loop・DB状態管理 |
| 工程3：詳細設計 | 整理案生成・停止条件・選択承認・逐次実行・ロールバック |
| 工程4：実装 | **MCP filesystem実装**・ローカルLLM／規則フォールバック・PostgreSQL保存・ロールバック実装 |
| 工程5：検証 | ガードレール検証（実行ファイル除外・完全削除禁止・システムフォルダ除外） |
| 横断 | FastAPI・PostgreSQL・SQLAlchemy・Python |

---

## 対象外（スコープ外）

- クラウドストレージ（OneDrive・Google Drive等）の整理
- ファイルの完全削除
- 画像・動画の内容解析（ファイル名・メタ情報のみで判断）
- ネットワークドライブの整理（ローカルフォルダのみ）

## 学習完了の目安

- [ ] 工程1：要件定義：AIの役割範囲・**Human-in-the-loop要件**・ガードレール要件
- [ ] 工程2：基本設計：**MCP（filesystem）設計**・整理案生成・Human-in-the-loop・DB状態管理
- [ ] 工程3：詳細設計：整理案生成・停止条件・選択承認・逐次実行・ロールバック
- [ ] 工程4：実装：**MCP filesystem実装**・ローカルLLM／規則フォールバック・PostgreSQL保存・ロールバック実装
- [ ] 工程5：検証：ガードレール検証（実行ファイル除外・完全削除禁止・システムフォルダ除外）
- [ ] 横断：FastAPI・PostgreSQL・SQLAlchemy・Python
