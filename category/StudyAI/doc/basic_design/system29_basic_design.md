# System 29 基本設計

## chunk metadata設計

---

## 1. 設計目的

chunk metadata設計は、要件定義で定めた「RAG設計」の学習を、StudyAI の共通アプリ構造に組み込める単位へ整理する。本設計では、入力、処理・結果、出力、保存、画面、API、Docker実行方針を定義し、詳細設計と製造へ引き継ぐ。

## 2. 配置方針

```text
category/StudyAI/
  src/backend/src/studyai/systems/ai_learning/
    catalog.py
    service.py
    router.py
  src/frontend/src/pages/SystemLearningPage.tsx
  src/scripts/system29_*.py
  src/backend/tests/systems/test_ai_learning_systems.py
  doc/basic_design/system29_basic_design.md
```

- 既存の `system01` から `system16` は変更しない。
- system17からsystem36は共通の `ai_learning` モジュールを使い、system29の入力定義と処理分岐を同モジュールへ置く。
- 共通化できるAIクライアント、設定、ログ、ファイル保存は `src/backend/src/studyai/common/` を利用する。
- フロントエンドは既存の共通画面 `SystemLearningPage.tsx` でsystem29専用の結果表示を行う。

## 3. 全体構成

```text
利用者
  ↓ SystemLearningPage
  ↓ POST /api/system29/execute
  ↓ ai_learning/router.py
  ↓ LearningSystemService._metadata
  ↓ metadata付与・検索前フィルタ・根拠表示
  ↓ data/ai_learning/system29_runs.json
```

## 4. コンポーネント設計

| コンポーネント | 役割 |
|---|---|
| `ai_learning/router.py` | 共通API入口、入力受付、エラー応答を行う |
| `LearningSystemService._metadata` | 文書断片とmetadataを紐付け、検索前フィルタと根拠表示を行う |
| JSON履歴保存 | 最新20件の入力、結果、学習メモを保存・読込する |
| `SystemLearningPage` | JSON入力、入力例、フィルタ判定、検索結果、根拠、履歴を表示する |
| `system29_*` script | CLIまたはローカル検証用の最小実行口を提供する |

## 5. 入出力設計

| 区分 | 内容 |
|---|---|
| 入力 | document, query, metadata, metadata_filter, learning_note |
| 処理 | 必須metadata検証、文書断片ID生成、metadataフィルタ、検索語照合、根拠表示 |
| 出力 | chunks, metadata_json, filter_result, search_results, citation_preview, traceability_fields |
| 保存 | 最新20件の実行履歴をJSONファイルへ保存 |

## 6. API設計

| メソッド | パス | 目的 | 備考 |
|---|---|---|---|
| GET | `/api/system29/metadata` | 既定入力と入力例を取得 | 共通metadata API |
| POST | `/api/system29/execute` | metadata付与、フィルタ、検索、保存を実行 | 共通execute API |
| GET | `/api/system29/runs` | 保存済み実行履歴を取得 | 最新20件 |

- API prefix は `/api/system29` とする。
- metadata付与、検索前フィルタ、検索語照合、根拠表示はStudyAIバックエンドで順番に実行し、外部AI APIや画面内だけの模擬処理は使用しない。
- 失敗時は `error_code`、`message`、`detail` を返す。

## 7. 画面設計

| 領域 | 内容 |
|---|---|
| 入力領域 | document, query, metadata, metadata_filter, learning_note をJSONで入力する |
| 実行領域 | 実行ボタン、設定値、実行状態を表示する |
| 結果領域 | 文書断片、metadata、フィルタ判定、検索結果、根拠、保存状態を表示する |
| 学習メモ領域 | 観察結果、判断理由、後続設計へのメモを記録する |

## 8. データ設計

| データ | 主な項目 |
|---|---|
| `system29_runs.json` | `run_id`, `input`, `result`, `observation`, `created_at` |
| `learning_note` | `observation`, `decision`, `risk_note` |

- 現行実装はUTF-8 JSONへ最新20件を保存し、バックエンド起動時に読み戻す。
- 将来DBへ置き換える場合はsystem別テーブル名に `system29_` prefixを付ける。
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
- metadataフィルタの項目と比較規則
- エラーコード
- Docker 実行方針
- 検証コマンド
