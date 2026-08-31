# System 21 基本設計

## Temperature比較

---

## 1. 設計目的

Temperature比較は、要件定義で定めた「生成比較」の学習を、StudyAI の共通アプリ構造に組み込める単位へ整理する。本設計では、入力、処理・結果、出力、保存、画面、API、Docker実行方針を定義し、詳細設計と製造へ引き継ぐ。

## 2. 配置方針

```text
category/StudyAI/
  src/backend/src/studyai/
    common/ai/llm_client.py
    common/config/settings.py
    systems/ai_learning/
      catalog.py
      service.py
      router.py
  src/frontend/src/pages/SystemLearningPage.tsx
  src/scripts/system21_demo.py
  src/backend/tests/systems/test_ai_learning_systems.py
  doc/basic_design/system21_basic_design.md
```

- 既存の `system01` から `system16` は変更しない。
- `system17`から`system36`は共通の`ai_learning`へ配置し、catalogのsystem IDで処理と画面を切り替える。
- AIクライアントと設定は`src/backend/src/studyai/common/`を利用する。
- フロントエンドは既存のStudyAIルーティングから`SystemLearningPage`をsystem21として表示する。
- system21の結果だけを`data/ai_learning/system21_runs.json`へ保存する。

## 3. 全体構成

```text
利用者
  ↓ SystemLearningPage
  ↓ /api/system21/metadata・execute・runs
  ↓ ai_learning/router.py
  ↓ LearningSystemService
  ↓ LLMClient または明示的なモック
  ↓ data/ai_learning/system21_runs.json
```

## 4. コンポーネント設計

| コンポーネント | 役割 |
|---|---|
| `ai_learning/router.py` | system21のAPI入口、入力エラーの応答、履歴取得を行う |
| `LearningSystemService` | Temperatureごと・試行ごとに一件ずつ順番にLM Studioへ生成を依頼するか、利用者が明示的に選んだモックを同じ順序で実行する |
| `LLMClient` | OpenAI互換APIの`/chat/completions`へTemperature付きの生成要求を送る |
| JSONファイル保存 | 実験結果、比較結果、学習メモをUTF-8のJSONファイルへ保存・取得する |
| `SystemLearningPage` | 実験条件、回答比較表、設定判断、学習メモ、実行履歴を表示する |
| `system21_demo.py` | 共通の非同期実行口からsystem21を実行する |

## 5. 入出力設計

| 区分 | 内容 |
|---|---|
| 入力 | prompt, temperatures, trial_count, mode, task_type, learning_note |
| 処理 | mode=modelではOpenAI互換APIへ設定別に生成を依頼し、mode=mockでは明示的な模擬結果を作る |
| 出力 | runs, diff_summary, recommendation, learning_note, storage_status |
| 保存 | `data/ai_learning/system21_runs.json`へ直近20件の実行入力・回答・比較結果・学習メモを保存 |

## 6. API設計

| メソッド | パス | 目的 | 備考 |
|---|---|---|---|
| GET | `/api/system21/metadata` | 既定の実験条件と入力例を取得 | 画面初期表示で使用 |
| POST | `/api/system21/execute` | Temperature比較を実行 | modelでは実モデル通信、mockでは明示的な模擬結果 |
| GET | `/api/system21/runs` | 保存済みの直近20件を取得 | 再表示に使用 |

- API prefix は `/api/system21` とする。
- 外部AI APIを使えない場合は、利用者がmode=mockを選んだ場合だけ同じレスポンス構造の模擬結果を返す。
- mode=modelで通信に失敗した場合は、暗黙にモックへ切り替えない。
- 失敗時は `error_code`、`message`、`detail` を返す。

## 7. 画面設計

| 領域 | 内容 |
|---|---|
| 入力領域 | prompt, temperatures, trial_count, mode, task_type, learning_note を入力または入力例から選択する |
| 実行領域 | 実行ボタン、設定値、実行状態を表示する |
| 結果領域 | 回答、モデル名、トークン数、Temperature別の差分・再現性指標、推奨設定、保存状態を表示する |
| 学習メモ領域 | 観察結果、判断理由、注意点を入力し、実行結果と同時に保存して表示する |

## 8. データ設計

| データ | 主な項目 |
|---|---|
| `system21_runs` | `id`, `input_json`, `config_json`, `result_json`, `created_at` |
| `system21_notes` | `run_id`, `observation`, `decision`, `risk_note` |

- 初期製造では `data/ai_learning/system21_runs.json` を使用し、直近20件を保持する。
- 保存時は一時ファイルへUTF-8で書き、置換して更新途中の破損を避ける。
- DBを使う場合は system別テーブル名に `system21_` prefix を付ける。
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
- モックAIと実AIを切り替える設定
- エラーコード
- Docker 実行方針
- 検証コマンド
