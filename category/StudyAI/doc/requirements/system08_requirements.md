# System 08 要件定義

## このテーマでできるようになること

- 要件定義で扱う「AIの役割範囲・ガードレール要件」を説明できる
- 基本設計で扱う「**シングルエージェント設計**・**ツール設計（Web検索）**・LangGraph・LangChain」を説明できる
- 詳細設計で扱う「**エージェントループ詳細設計**・**停止条件の定義**・**状態管理（State）**・システムプロンプト設計」を説明できる
- 実装で扱う「**エージェントループ実装（LangGraph）**・**ツール関数実装**・**Web検索ツール実装**・MLflowトレース」を説明できる
- 検証で扱う「ガードレール検証（検索上限・タイムアウト）」を説明できる
- FastAPI・PostgreSQL・SQLAlchemy・Pythonを横断的に使う構成を説明できる

## 未体験作業 タスク洗い出し＆優先順位付けエージェント

---

## システム概要

未体験の作業・プロジェクト・技術分野を入力すると、エージェントがWeb検索で情報収集し、必要なタスクの洗い出し・分類・優先順位付けを自動で行うシステム。「何から手をつければいいかわからない」状態を解消し、未体験領域への参入コストを下げる。

---

## 現状の課題

- 未体験の業務・技術分野に参入する際、何から始めればいいかわからない
- タスクの洗い出しが不完全で、後から抜け漏れが発覚する
- 優先順位の判断が主観的になりがちで、重要なことを後回しにしてしまう
- 情報収集に時間がかかり、行動開始が遅れる
- 炎上プロジェクト参画時など、即座に状況を把握して動く必要がある場面で特に有効

---

## 対象ユーザー

- 新規プロジェクトに参画する開発者・PM
- 未体験の作業を担当することになったメンバー
- 新規事業・新規技術領域を探索する担当者
- 炎上プロジェクトに途中参画するメンバー

---

## 機能要件

### 1. テーマ入力機能
洗い出し対象のテーマを入力する。

**入力項目**

| 項目 | 説明 | 必須 |
|------|------|------|
| テーマ | 業務・プロジェクト・技術領域の名称 | ✅ |
| 背景・目的 | なぜこれをやるのか | 任意 |
| 現状 | 現在わかっていること・手元にある情報 | 任意 |
| 制約条件 | 期限・予算・人員・技術スタック等 | 任意 |
| 役割 | 自分の立場（PM・開発者・営業など） | 任意 |
| 深さ | 洗い出しの粒度（概要レベル・詳細レベル） | 任意 |

**入力例**
```json
{
  "theme": "炎上中のWebシステム開発プロジェクトに途中参画する",
  "background": "リリース2ヶ月前に参画。テスト工程が遅延している。",
  "current_status": "既存メンバーは3名。ドキュメントが整備されていない。",
  "constraints": "リリース日は変更不可。追加予算なし。",
  "role": "追加アサインされた開発者",
  "depth": "詳細レベル"
}
```

### 2. Web検索＆情報収集機能（エージェント）
エージェントがWeb検索を使って必要な情報を収集する。

**検索対象の情報**
- 業務・技術領域のベストプラクティス
- 一般的なタスク・工程の情報
- よくある失敗パターン・注意点
- 参考になるフレームワーク・手順

**エージェントの動作フロー**
```
テーマ受付
    ↓
検索クエリを複数生成
    ↓
Web検索（複数回）
    ↓
検索結果を評価・取捨選択
    ↓
追加調査が必要か判断
    ↓（必要なら追加検索）
十分な情報が集まったら分析へ
```

**停止条件**
- 十分な情報が収集できた場合
- 検索回数が上限（10回）に達した場合
- タイムアウト（5分）に達した場合

### 3. タスク洗い出し機能（LLM）
収集した情報と入力内容をもとに、LLMが必要なタスクを洗い出す。

**タスクの構成**

| 項目 | 説明 |
|------|------|
| タスクID | 識別番号 |
| タスク名 | 何をするか |
| 説明 | 具体的な作業内容 |
| カテゴリ | タスクの種別（後述） |
| 優先度 | 最高・高・中・低 |
| 緊急度 | 高・中・低 |
| 重要度 | 高・中・低 |
| 依存関係 | このタスクの前に完了すべきタスクID |
| 想定工数 | 時間・日数の目安 |
| 担当者イメージ | どのスキルを持つ人が担当すべきか |
| 注意事項 | よくある失敗・注意点 |
| 参考情報 | 参考にしたWeb情報のURL・タイトル |

**タスクカテゴリ**

| カテゴリ | 説明 |
|---------|------|
| 情報収集・現状把握 | まず状況を把握するためのタスク |
| 計画・設計 | 方針決定・設計に関するタスク |
| 環境構築・準備 | 作業環境・ツールの準備 |
| 実装・開発 | 実際の開発・制作作業 |
| テスト・検証 | 品質確認・動作確認 |
| コミュニケーション | 関係者との調整・報告 |
| ドキュメント | 文書化・引き継ぎ |
| リスク管理 | リスクの特定・対策 |

### 4. 優先順位付け機能
アイゼンハワーマトリクスをベースに優先順位を付ける。

> 📝 **アイゼンハワーマトリクス**
> タスクを「緊急度」と「重要度」の2軸で4象限に分類する優先順位付けフレームワーク。
> - 第1象限（緊急×重要）：即座に対応
> - 第2象限（非緊急×重要）：計画して対応
> - 第3象限（緊急×非重要）：委譲または効率化
> - 第4象限（非緊急×非重要）：排除または後回し

**優先順位の出力**
- 象限別のタスク分類
- 推奨着手順序（1番から順番に）
- 最初の1週間でやるべきタスクのリスト
- 1番から順に実行するタスクの一覧

### 5. 結果出力機能
洗い出し結果を以下の形式で出力する。

- **JSON**：APIレスポンスとして返す
- **Markdown**：人が読みやすい形式で返す
- **CSV**：タスク管理ツールへのインポート用

### 6. 結果保存・再利用機能
- 洗い出し結果をPostgreSQLに保存する
- 過去の洗い出し結果を取得・参照できる
- 類似テーマの過去結果を推薦する
- タスクの完了・未完了を管理できる

---

## 非機能要件

| 項目 | 要件 |
|------|------|
| 応答時間 | Web検索込みで5分以内 |
| Web検索 | 1回の洗い出しあたり最大10回まで |
| セキュリティ | 入力内容に機密情報が含まれる場合の注意喚起 |
| 対応言語 | 日本語・英語 |

---

## システム構成

```
クライアント（curl / 画面）
        ↓
    FastAPI（APIサーバー）
        ↓
    入力受付・前処理
        ↓
    ┌─────────────────────────────────────┐
    │  エージェントループ（LangGraph）      │
    │                                     │
    │  State：{theme, search_results,     │
    │           tasks, step_count}        │
    │                                     │
    │  ① 検索クエリ生成（LLM）            │
    │  ② Web検索実行（web_search tool）   │
    │  ③ 結果評価・追加検索判断（LLM）    │
    │  ④ 十分な情報が集まったら終了       │
    │     （上限10回 or タイムアウト）     │
    └─────────────────────────────────────┘
        ↓
    LLM（タスク洗い出し・優先順位付け）
    ※ Qwen3-27B / LM Studio
        ↓
    出力バリデーション（Pydantic）
        ↓
    PostgreSQL（結果保存）
        ↓
    JSON / Markdown / CSV 返却
```

---

## API仕様

### POST /analyze
テーマを入力してタスク洗い出しを実行する。

**リクエスト（JSON）**
```json
{
  "theme": "炎上中のWebシステム開発プロジェクトに途中参画する",
  "background": "リリース2ヶ月前に参画。テスト工程が遅延している。",
  "current_status": "既存メンバーは3名。ドキュメントが整備されていない。",
  "constraints": "リリース日は変更不可。追加予算なし。",
  "role": "追加アサインされた開発者",
  "depth": "詳細レベル",
  "output_format": "json"
}
```

**レスポンス（JSON）**
```json
{
  "analysis_id": 1,
  "theme": "炎上中のWebシステム開発プロジェクトに途中参画する",
  "search_count": 7,
  "search_queries": [
    "炎上プロジェクト 途中参画 対応方法",
    "システム開発 テスト遅延 リカバリ計画",
    "ドキュメント不足 プロジェクト 対処法"
  ],
  "tasks": [
    {
      "task_id": 1,
      "task_no": 1,
      "name": "現状把握ミーティングの実施",
      "description": "既存メンバー3名と1on1またはグループで現状を把握する。進捗・課題・リスクを確認する。",
      "category": "情報収集・現状把握",
      "priority": "high",
      "urgency": "high",
      "importance": "high",
      "quadrant": "第1象限",
      "dependencies": [],
      "estimated_hours": 3,
      "assignee_skill": "PM・開発者",
      "cautions": "感情的になっているメンバーへの配慮が必要。責任追及ではなく現状把握に徹する。",
      "references": [
        {
          "title": "炎上プロジェクトの立て直し方",
          "url": "https://example.com/article1"
        }
      ],
      "confidence": "high",
      "status": "todo",
      "note": null
    },
    {
      "task_id": 2,
      "task_no": 2,
      "name": "テスト進捗の定量的な把握",
      "description": "テストケース総数・完了数・未完了数・バグ件数を数値で把握する。残工数を算出する。",
      "category": "情報収集・現状把握",
      "priority": "high",
      "urgency": "high",
      "importance": "high",
      "quadrant": "第1象限",
      "dependencies": [1],
      "estimated_hours": 2,
      "assignee_skill": "テストエンジニア・開発者",
      "cautions": "テスト管理ツールがない場合はExcelで即座に作成する。",
      "references": [],
      "confidence": "high",
      "status": "todo",
      "note": null
    }
  ],
  "priority_summary": {
    "quadrant_1": [1, 2, 3],
    "quadrant_2": [4, 5],
    "quadrant_3": [6],
    "quadrant_4": [],
    "recommended_order": [1, 2, 3, 4, 6, 5],
    "first_week_tasks": [1, 2, 3]
  },
  "markdown": "# 炎上中のWebシステム開発プロジェクトに途中参画する\n\n## 概要\n...",
  "total_tasks": 8,
  "total_estimated_hours": 42,
  "status": "completed",
  "created_at": "2026-04-15T10:00:00"
}
```

### GET /analyses/{analysis_id}
過去の洗い出し結果を取得する。

### GET /analyses
洗い出し結果一覧を取得する。

### PATCH /analyses/{analysis_id}/tasks/{task_id}
タスクの進行状態と補足メモを更新する。

**リクエスト（JSON）**
```json
{
  "status": "done",
  "note": "既存メンバー全員と1on1完了。課題リストを作成した。"
}
```

### GET /analyses/{analysis_id}/export
結果を`markdown`、`csv`、`json`のいずれかでエクスポートする。応答の`content`に本文を返す。

---

## データモデル

### system08_analysesテーブル
```sql
CREATE TABLE system08_analyses (
    id                    SERIAL PRIMARY KEY,
    theme                 TEXT NOT NULL,
    background            TEXT,
    current_status        TEXT,
    constraints           TEXT,
    role                  VARCHAR(100),
    depth                 VARCHAR(20),
    output_format         VARCHAR(20) NOT NULL DEFAULT 'json',
    search_count          INTEGER NOT NULL DEFAULT 0,
    search_queries        JSONB NOT NULL DEFAULT '[]'::jsonb,
    sources_json          JSONB NOT NULL DEFAULT '[]'::jsonb,
    summary               TEXT,
    priority_summary      JSONB NOT NULL DEFAULT '{}'::jsonb,
    markdown              TEXT,
    total_tasks           INTEGER NOT NULL DEFAULT 0,
    total_estimated_hours NUMERIC(8,1) NOT NULL DEFAULT 0,
    status                VARCHAR(20) NOT NULL DEFAULT 'created',
    created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### system08_tasksテーブル
```sql
CREATE TABLE system08_tasks (
    id              SERIAL PRIMARY KEY,
    analysis_id     INTEGER NOT NULL REFERENCES system08_analyses(id) ON DELETE CASCADE,
    task_no         INTEGER NOT NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT NOT NULL,
    category        VARCHAR(50),
    priority        VARCHAR(10) NOT NULL,
    urgency         VARCHAR(10),
    importance      VARCHAR(10),
    quadrant        VARCHAR(20),
    dependencies    JSONB NOT NULL DEFAULT '[]'::jsonb,
    estimated_hours NUMERIC(8,1),
    assignee_skill  VARCHAR(255),
    cautions        TEXT,
    references      JSONB NOT NULL DEFAULT '[]'::jsonb,
    confidence      VARCHAR(10),
    evidence        JSONB NOT NULL DEFAULT '[]'::jsonb,
    status          VARCHAR(20) NOT NULL DEFAULT 'todo',
    note            TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

## プロンプト仕様

### 検索クエリ生成プロンプト
```
あなたはリサーチ専門のAIです。
以下のテーマについてタスク洗い出しに必要な情報を収集するため、
効果的な検索クエリを5件生成してください。

テーマ：{theme}
背景：{background}
現状：{current_status}
役割：{role}

ルール：
1. 異なる観点から検索できるよう、多様なクエリを生成すること
2. 日本語・英語を混在させてもよい
3. ベストプラクティス・失敗パターン・具体的な手順を網羅すること
4. 必ず指定のJSONフォーマットで返すこと
```

### タスク洗い出しプロンプト
```
あなたは業務分析・プロジェクト管理の専門家AIです。
以下のテーマと収集した情報をもとに、必要なタスクを網羅的に洗い出し、
アイゼンハワーマトリクスで優先順位を付けてください。

テーマ：{theme}
背景：{background}
現状：{current_status}
制約：{constraints}
役割：{role}
粒度：{depth}

収集した参考情報：
{search_results}

ルール：
1. タスクの抜け漏れがないよう網羅的に洗い出すこと
2. 依存関係を明確にすること
3. 緊急度と重要度を独立して評価すること
4. よくある失敗・注意点を必ず含めること
5. 想定工数は現実的な値にすること
6. 必ず指定のJSONフォーマットで返すこと
```

---

## ガードレール設計

- JSON形式が壊れていた場合：最大3回まで再試行
- Web検索が10回を超えた場合：強制終了して収集済み情報で分析
- タイムアウト（5分）に達した場合：収集済み情報で分析して返す
- 機密情報が入力に含まれる可能性を検出した場合：注意喚起メッセージを付与
- Web検索結果に不適切なコンテンツが含まれる場合：除外して処理

---

## 技術スタック

| 用途 | 技術 |
|------|------|
| APIサーバー | FastAPI |
| エージェントフレームワーク | LangGraph |
| LLM | Qwen3-27B（Q4量子化）/ LM Studio経由 |
| Web検索 | DuckDuckGo Search API（無料）または SerpAPI |
| 出力バリデーション | Pydantic |
| DB | PostgreSQL |
| ORM | SQLAlchemy |
| トレース・ログ | MLflow |

---

## 対応する知識マップ項目

| 工程 | 習得できる知識マップ項目 |
|------|----------------------|
| 工程1：要件定義 | AIの役割範囲・ガードレール要件 |
| 工程2：基本設計 | **シングルエージェント設計**・**ツール設計（Web検索）**・LangGraph・LangChain |
| 工程3：詳細設計 | **エージェントループ詳細設計**・**停止条件の定義**・**状態管理（State）**・システムプロンプト設計 |
| 工程4：実装 | **エージェントループ実装（LangGraph）**・**ツール関数実装**・**Web検索ツール実装**・MLflowトレース |
| 工程5：検証 | ガードレール検証（検索上限・タイムアウト） |
| 横断 | FastAPI・PostgreSQL・SQLAlchemy・Python |

---

## 対象外（スコープ外）

- 画面UI（フロントエンド）
- タスク管理ツール（Jira・Notionなど）との自動連携
- チームメンバーへのタスクアサイン機能
- ガントチャート生成
- リアルタイムの進捗追跡

## 学習完了の目安

- [ ] 工程1：要件定義：AIの役割範囲・ガードレール要件
- [ ] 工程2：基本設計：**シングルエージェント設計**・**ツール設計（Web検索）**・LangGraph・LangChain
- [ ] 工程3：詳細設計：**エージェントループ詳細設計**・**停止条件の定義**・**状態管理（State）**・システムプロンプト設計
- [ ] 工程4：実装：**エージェントループ実装（LangGraph）**・**ツール関数実装**・**Web検索ツール実装**・MLflowトレース
- [ ] 工程5：検証：ガードレール検証（検索上限・タイムアウト）
- [ ] 横断：FastAPI・PostgreSQL・SQLAlchemy・Python
