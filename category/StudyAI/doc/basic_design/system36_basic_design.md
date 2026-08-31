# System 36 基本設計

## Trace保存

---

## 1. 設計目的

実行済みAI処理の条件と結果を一つのTraceへまとめ、マスク後の記録をJSONへ保存する。利用者はStudyAI画面から完全なTrace、不足項目があるTrace、機密値をマスクするTraceを実行し、一覧から詳細を再表示する。

## 2. 配置方針

- テーマ定義と入力例は `src/backend/src/studyai/systems/ai_learning/catalog.py` に置く。
- Trace作成、マスク、ハッシュ生成、JSON保存は `src/backend/src/studyai/systems/ai_learning/service.py` に置く。
- APIは共通の `router.py` が `/api/system36` を提供する。
- 画面は共通の `SystemLearningPage.tsx` にsystem36専用の結果表示を持たせる。
- 保存先は `src/backend/data/ai_learning/system36_runs.json` とする。

## 3. 全体構成

```text
利用者
  ↓ SystemLearningPage
  ↓ POST /api/system36/execute
  ↓ LearningSystemService
  ↓ 入力検証 → マスク → Trace番号・ハッシュ生成
  ↓ system36_runs.jsonへ最新20件保存
  ↓ GET /api/system36/runs
  ↓ 一覧からTrace詳細を再表示
```

## 4. コンポーネント設計

| コンポーネント | 役割 |
|---|---|
| `catalog.py` | 既定値と3種類の入力例を定義する |
| `LearningSystemService` | 入力検証、マスク、Trace番号・ハッシュ生成、最新20件の保存・読戻しを行う |
| `router.py` | metadata、execute、runsのAPIを提供する |
| `SystemLearningPage.tsx` | 入力、Trace詳細、評価との対応、不足項目、マスク結果、履歴を表示する |
| `validate-ai-learning.py` | 既定値のTrace構造と保存状態を検証する |

## 5. 入出力設計

| 区分 | 内容 |
|---|---|
| 入力 | trace_name, user_input, retrieved_context, model_config, prompt, prompt_version, output, evaluation, masking_policy, retention_note |
| 処理 | 型検証、機密値の再帰的置換、必須項目判定、Trace番号とハッシュ生成、JSON保存 |
| 出力 | trace_record, evaluation_link, missing_fields, replay_ready, masking, integrity_hash, storage_status |
| 保存 | `data/ai_learning/system36_runs.json`の最新20件 |

## 6. API設計

| メソッド | パス | 目的 | 備考 |
|---|---|---|---|
| GET | `/api/system36/metadata` | 既定値と入力例を取得する | 共通metadata形式 |
| POST | `/api/system36/execute` | Traceを作成して保存する | `input`にTrace対象を渡す |
| GET | `/api/system36/runs` | 保存済みTraceを新しい順に取得する | 最大20件 |

入力形式が不正な場合はHTTP 400と`system36_input_invalid`を返す。

## 7. 画面設計

| 領域 | 内容 |
|---|---|
| 入力領域 | 3種類の入力例、JSON編集欄、実行、既定値へ戻す |
| 概要領域 | Trace番号、再実行情報、マスク件数、保存状態 |
| 詳細領域 | Trace項目、評価との対応、不足項目、マスク項目、再実行条件、ハッシュ |
| 履歴領域 | 保存済みTraceの記録日時と詳細再表示 |

## 8. データ設計

| データ | 主な項目 |
|---|---|
| 実行履歴 | run_id, system_id, input, result, observation, created_at |
| Trace | trace_id, schema_version, trace_record, integrity_hash, missing_fields, replay_ready, masking, storage_status |
| 評価との対応 | evaluation_id, status, score |

- 保存前に文字列、配列、オブジェクトを再帰的に調べ、指定語を置換する。
- マスク対象語そのものは保存しない。
- 一時ファイルへUTF-8で書き込み、置換後に本ファイルへ差し替える。

## 9. Docker・ローカル実行方針

- StudyAI既存のbackendとfrontendを利用する。
- backendの`data`フォルダーをホストへマウントし、コンテナ再作成後もTrace履歴を保持する。
- 外部AIとは通信せず、実行済みAI処理の記録を入力として扱う。
- テストでは一時フォルダーを保存先にし、実データを変更しない。

## 10. セキュリティ方針

- 画面へ入力したマスク対象語はTrace結果と保存履歴に残さない。
- マスク後の値だけでTrace番号とハッシュを作る。
- 本番用途の暗号化、権限制御、保持期限、削除処理は対象外として明示する。
