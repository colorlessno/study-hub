# System 31 基本設計

## 評価用ground truth作成

---

## 1. 設計目的

評価用ground truth作成は、要件定義で定めた「評価データ作成」の学習を、StudyAI の共通アプリ構造に組み込める単位へ整理する。本設計では、入力、処理・結果、出力、保存、画面、API、Docker実行方針を定義し、詳細設計と製造へ引き継ぐ。

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
  src/scripts/system31_demo.py
  scripts/validate-ai-learning.py
  doc/learning_notes/system31_ground_truth_creation/README.md
```

- system17からsystem36は`ai_learning`共通APIと画面を使い、テーマ固有の入力、処理、結果表示を分ける。
- system31は外部AIを呼び出さず、利用者が作成した正解データを検証して保存する。
- 保存先は`data/ai_learning/system31_runs.json`とし、最新20件を保持する。
- 他テーマの要件、実装、保存履歴は変更しない。

## 3. 全体構成

```text
利用者
  ↓ SystemLearningPage（system31）
  ↓ /api/system31/metadata・execute・runs
  ↓ ai_learning router
  ↓ LearningSystemService._ground_truth
  ↓ 根拠追跡・評価観点検証・レビュー判定
  ↓ data/ai_learning/system31_runs.json
```

## 4. コンポーネント設計

| コンポーネント | 役割 |
|---|---|
| `ai_learning/router.py` | system31のmetadata、execute、runs APIを提供する |
| `LearningSystemService` | 質問・正解・根拠・評価観点・レビューを検証し、正解データを作成・保存する |
| `settings.py` | system31専用のJSON保存先を定義する |
| `SystemLearningPage` | 入力例、JSON入力、正解データ、品質確認、レビュー履歴、保存履歴を表示する |
| `system31_demo.py` | 共通CLIからsystem31を実行する |
| `validate-ai-learning.py` | 既定入力の構造、根拠、重み、承認状態を検証する |

## 5. 入出力設計

| 区分 | 内容 |
|---|---|
| 入力 | dataset_name, source_document, question, expected_answer, evidence, evaluation_viewpoints, review, learning_note |
| 処理 | 根拠文書・引用文照合、評価観点の重み確認、レビュー内容確認、利用可否判定 |
| 出力 | ground_truth_case, quality_checks, validation_issues, review_history, dataset_record, learning_note |
| 保存 | `data/ai_learning/system31_runs.json`へ最新20件 |

## 6. API設計

| メソッド | パス | 目的 | 備考 |
|---|---|---|---|
| GET | `/api/system31/metadata` | 画面名、既定入力、入力例を取得する | 共通応答形式 |
| POST | `/api/system31/execute` | 正解データを検証し、結果を保存する | `input`へJSONを指定 |
| GET | `/api/system31/runs` | 保存済みの実行履歴を取得する | 新しい順、最大20件 |

- API prefix は `/api/system31` とする。
- system31は外部AI APIを使用せず、指定された原文と引用文を決定的に照合する。
- 失敗時は `error_code`、`message`、`detail` を返す。

## 7. 画面設計

| 領域 | 内容 |
|---|---|
| 入力領域 | 入力例、既定値へ戻す、JSON入力、実行を表示する |
| 概要領域 | データセット、ケース番号、確認状態、利用可否、重み合計、保存状態を表示する |
| 正解データ領域 | 質問、期待する回答、根拠文書、引用文を表示する |
| 検証領域 | 根拠追跡、評価観点、品質確認、不足項目を表示する |
| レビュー領域 | 状態、確認者、確認記録を表示する |
| 学習メモ領域 | 観察結果、設計判断、残る注意点を表示する |
| 履歴領域 | 保存した結果を選択して再表示する |

## 8. データ設計

| データ | 主な項目 |
|---|---|
| `system31_runs.json` | `run_id`, `system_id`, `input`, `result`, `observation`, `created_at` |
| `ground_truth_case` | `case_id`, `dataset_name`, `source_document_id`, `question`, `expected_answer`, `evidence`, `tags` |
| `evaluation_viewpoints` | `viewpoint_id`, `label`, `description`, `weight` |
| `review_history` | `status`, `status_label`, `reviewer`, `comment` |

- StudyAIの通常起動ではJSONへ保存する。テストで保存先を指定しない場合だけインメモリとする。
- JSON更新は一時ファイルへUTF-8で書き込み、置換する。
- 個人情報・機密情報を扱う可能性がある入力の保存前にマスク方針を確認する。

## 9. Docker・ローカル実行方針

- StudyAI 既存の `docker-compose.yml` に統合できる構造を優先する。
- `docker compose up -d backend frontend`で既存のStudyAI構成へ統合する。
- `rtk docker compose exec -T backend python -m pytest ... -k system31`で対象テストを実行する。
- `rtk docker compose exec -T backend python scripts/validate-ai-learning.py --system system31`で教材を検証する。
- 作成・更新するテストファイルは UTF-8 BOMなしで保存する。

## 10. 後続工程への引き継ぎ

詳細設計では、次を具体化する。

- request / responseの項目と検証規則
- JSON保存と再読込
- 根拠照合、重み合計、レビュー状態、利用可否の判定
- エラー条件
- 画面表示項目
- Dockerと検証コマンド
