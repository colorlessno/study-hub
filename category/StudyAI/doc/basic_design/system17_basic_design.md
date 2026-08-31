# System 17 基本設計

## Tokenizer観察

---

## 1. 設計目的

Tokenizer観察は、要件定義で定めた「観察」の学習を、StudyAI の共通アプリ構造に組み込める単位へ整理する。本設計では、入力、処理・結果、出力、保存、画面、API、Docker実行方針を定義し、詳細設計と製造へ引き継ぐ。

## 2. 配置方針

```text
category/StudyAI/
  src/backend/src/studyai/systems/ai_learning/
    catalog.py
    service.py
    router.py
  src/frontend/src/pages/SystemLearningPage.tsx
  src/scripts/system17_demo.py
  src/backend/tests/systems/test_ai_learning_systems.py
  doc/basic_design/system17_basic_design.md
```

- 既存の `system01` から `system16` は変更しない。
- system17からsystem36の小さな学習実験は `src/backend/src/studyai/systems/ai_learning/` の共通APIとサービスで扱い、`catalog.py`の定義で処理を分ける。
- フロントエンドは既存のStudyAIルーティングから共通の`SystemLearningPage`を開き、system17専用の入力補助と結果表示を切り替える。
- CLI確認では`src/scripts/system17_demo.py`から同じサーバー側サービスを呼ぶ。

## 3. 全体構成

```text
利用者
  ↓ SystemLearningPage
  ↓ /api/system17/metadata・execute・runs
  ↓ ai_learning router
  ↓ LearningSystemService
  ↓ 簡易分割処理
  ↓ 実行履歴をJSONへ保存
```

## 4. コンポーネント設計

| コンポーネント | 役割 |
|---|---|
| `ai_learning/router.py` | メタデータ、実行、実行履歴のAPI入口を提供する |
| `LearningSystemService` | 文字数、概算token数、分割位置、上限超過、注意点を算出し、実行履歴を保持する |
| `ai_learning/catalog.py` | 既定値と選択可能なサンプル文を定義する |
| `SystemLearningPage` | サンプル選択、JSON入力、分割結果、上限警告、注意点、実行履歴を表示する |
| `system17_demo.py` | CLIから同じ処理を確認する最小実行口を提供する |

## 5. 入出力設計

| 区分 | 内容 |
|---|---|
| 入力 | text, context_limit |
| 処理 | LearningSystemService が文字数・概算token数・分割位置・上限超え・注意点を算出する |
| 出力 | char_count, estimated_tokens, token_segments, over_limit, notes |
| 保存 | ホスト側データ領域のJSONに直近20件の実行履歴 |

## 6. API設計

| メソッド | パス | 目的 | 備考 |
|---|---|---|---|
| GET | `/api/system17/metadata` | 既定値、サンプル文、画面表示用情報を取得する | サンプル選択に使用 |
| POST | `/api/system17/execute` | 入力した文章を分割して結果を返す | 実行履歴へ追加 |
| GET | `/api/system17/runs` | 直近20件の実行履歴を取得する | 過去結果の再表示に使用 |

- API prefix は `/api/system17` とする。
- 外部AI APIが使えない場合は、モックまたはサンプルデータで同じレスポンス構造を返す。
- 失敗時は `error_code`、`message`、`detail` を返す。

## 7. 画面設計

| 領域 | 内容 |
|---|---|
| 入力領域 | サンプル文を選択し、textとcontext_limitを確認・編集する |
| 実行領域 | 実行ボタン、設定値、実行状態を表示する |
| 結果領域 | 文字数、推定トークン数、分割結果、上限超過、注意点メモを表示する |
| 履歴領域 | 過去の入力と結果を再表示する |

## 8. データ設計

| データ | 主な項目 |
|---|---|
| 実行履歴 | `run_id`, `system_id`, `input`, `result`, `observation`, `created_at` |

- 実行履歴は`data/ai_learning/system17_runs.json`へ新しい順で直近20件を保存し、起動時に読み戻す。
- DBを使う場合は system別テーブル名に `system17_` prefix を付ける。
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
