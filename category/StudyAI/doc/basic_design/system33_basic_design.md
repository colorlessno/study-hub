# System 33 基本設計

## 検索評価

---

## 1. 設計目的

検索評価は、要件定義で定めた「検索評価」の学習を、StudyAI の共通アプリ構造に組み込める単位へ整理する。本設計では、入力、処理・結果、出力、保存、画面、API、Docker実行方針を定義し、詳細設計と製造へ引き継ぐ。

## 2. 配置方針

```text
category/StudyAI/
  src/backend/src/studyai/systems/ai_learning/
    catalog.py
    service.py
    router.py
  src/backend/src/studyai/common/config/settings.py
  src/backend/tests/systems/test_ai_learning_systems.py
  src/frontend/src/pages/SystemLearningPage.tsx
  scripts/validate-ai-learning.py
  data/ai_learning/system33_runs.json
  doc/basic_design/system33_basic_design.md
```

- 既存の `system01` から `system16` は変更しない。
- system17以降の共通実行基盤に合わせ、system33の業務ロジックは `src/backend/src/studyai/systems/ai_learning/` に配置する。
- 共通化できるAIクライアント、設定、ログ、ファイル保存は `src/backend/src/studyai/common/` を利用する。
- フロントエンドは既存の StudyAI ルーティングに `/system33` として追加する。
- フロントエンドの実装ファイルは共通画面 `src/frontend/src/pages/SystemLearningPage.tsx` とする。

## 3. 全体構成

```text
利用者
  ↓ SystemLearningPage
  ↓ /api/system33/execute
  ↓ ai_learning/router.py
  ↓ LearningSystemService._retrieval_eval
  ↓ data/ai_learning/system33_runs.json
```

## 4. コンポーネント設計

| コンポーネント | 役割 |
|---|---|
| `ai_learning/router.py` | メタデータ取得、評価実行、履歴取得のAPI入口を提供する |
| `LearningSystemService` | 質問別指標、全体指標、失敗分類、前回との差を算出する |
| `system33_runs.json` | 最新20件の入力、評価結果、学習メモを保存する |
| `SystemLearningPage` | 指標カード、質問別結果、失敗ケース、前回との差、履歴を表示する |
| `validate-ai-learning.py` | Docker内で既定データを実行し、件数・指標・保存を検証する |

## 5. 入出力設計

| 区分 | 内容 |
|---|---|
| 入力 | evaluation_name, chunk_setting, top_k, query_cases, learning_note |
| 処理 | 質問ごとにtop-k命中、Recall、Precision、逆順位、失敗種類を算出し、全体指標と前回との差を集計する |
| 出力 | metrics, case_results, failure_cases, chunk_comparison, storage_status |
| 保存 | data/ai_learning/system33_runs.json |

## 6. API設計

| メソッド | パス | 目的 | 備考 |
|---|---|---|---|
| GET | `/api/system33/metadata` | 既定入力、説明、実行例を取得する | 共通メタデータ形式 |
| POST | `/api/system33/execute` | 検索評価を実行して保存する | `{ "input": {...} }` を受け取る |
| GET | `/api/system33/runs` | 保存済みの実行履歴を取得する | 新しい順、最大20件 |

- API prefix は `/api/system33` とする。
- system33は入力済みの期待根拠と順位付き検索結果を評価するため、外部AI APIや画面内の模擬AI処理を使用しない。
- 失敗時は `error_code`、`message`、`detail` を返す。

## 7. 画面設計

| 領域 | 内容 |
|---|---|
| 入力領域 | evaluation_name, chunk_setting, top_k, query_cases, learning_note をJSONで入力または実行例から選択する |
| 実行領域 | 実行ボタン、設定値、実行状態を表示する |
| 結果領域 | 全体指標、質問別指標、失敗ケース、先頭ケースの検索順位、前回実行との差を表示する |
| 学習メモ領域 | 観察結果、判断理由、後続設計へのメモを記録する |

## 8. データ設計

| データ | 主な項目 |
|---|---|
| `system33_runs.json` | `run_id`, `input`, `result`, `created_at` |
| `result.learning_note` | `observation`, `decision`, `risk_note` |

- JSONファイルへ最新20件を保存し、起動時に読み戻す。
- DBを使う場合は system別テーブル名に `system33_` prefix を付ける。
- 個人情報・機密情報を扱う可能性がある入力の保存前にマスク方針を確認する。

## 9. Docker・ローカル実行方針

- StudyAI 既存の `docker-compose.yml` に統合できる構造を優先する。
- 小さいCLI検証だけで完結する場合も、製造工程で Docker 実行口を検討する。
- Docker build / run を実施しない場合は、検証記録に未実行理由を残す。
- 作成・更新するテストファイルは UTF-8 BOMなしで保存する。

## 10. 後続工程への引き継ぎ

詳細設計では、次を具体化する。

- request / response schema
- 保存形式またはテーブル定義
- 外部AIを使わず検索結果を決定的に評価する処理境界
- エラーコード
- Docker 実行方針
- 検証コマンド
