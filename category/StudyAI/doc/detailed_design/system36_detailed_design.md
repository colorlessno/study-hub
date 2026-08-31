# System 36 詳細設計
## 実行Traceの保存

## 1. 実装ファイル

```text
src/backend/src/studyai/common/config/settings.py
src/backend/src/studyai/systems/ai_learning/catalog.py
src/backend/src/studyai/systems/ai_learning/service.py
src/backend/src/studyai/systems/ai_learning/router.py
src/backend/data/ai_learning/system36_runs.json
src/backend/tests/systems/test_ai_learning_systems.py
src/frontend/src/pages/SystemLearningPage.tsx
scripts/validate-ai-learning.py
src/scripts/system36_demo.py
```

system36はsystem17からsystem36までの共通APIと画面を利用し、Traceの入力例、保存処理、専用の結果表示だけをsystem36向けに定義する。

## 2. 処理の流れ

```text
利用者が入力例を選ぶ
  ↓
POST /api/system36/execute
  ↓
入力構造を検証する
  ↓
指定された機密値を再帰的にマスクする
  ↓
マスク後のTraceからTrace番号と改変確認用ハッシュを作る
  ↓
不足項目、評価との対応、再実行条件を判定する
  ↓
system36_runs.jsonへ最新20件を保存する
  ↓
画面へTrace詳細と保存状態を返す
  ↓
GET /api/system36/runsで保存履歴を再表示する
```

## 3. 入力設計

| 項目 | 型 | 必須 | 内容 |
|---|---|---|---|
| trace_name | string | 必須 | Traceを一覧で識別する名称 |
| user_input | string | 必須 | AI処理へ渡した利用者入力 |
| retrieved_context | array | 必須 | 回答根拠として取得した内容 |
| model_config | object | 必須 | provider、model、temperature、max_tokensなど |
| prompt | string | 必須 | 実行時のPrompt本文 |
| prompt_version | string | 必須 | Promptの版 |
| output | string | 必須 | 記録済みのモデル出力 |
| evaluation | object | 必須 | evaluation_id、status、score、note |
| masking_policy | object | 任意 | enabled、replacement、terms |
| retention_note | string | 任意 | 学習用の保存方針 |

retrieved_contextが配列でない場合、model_config、evaluation、masking_policyがオブジェクトでない場合は入力エラーとする。masking_policy.termsは空でない文字列の配列だけを受け付ける。

## 4. マスク設計

masking_policy.enabledがtrueの場合、Trace対象の文字列、配列、オブジェクトを再帰的に調べる。termsに指定した値をreplacementへ置換する。

保存対象には次だけを残す。

- マスク後のTrace項目
- マスクの有効・無効
- 置換文字列
- マスク件数
- マスクされた項目名

termsに指定した元の値は結果、実行履歴、JSONファイルへ保存しない。マスク後のTraceを使ってTrace番号と改変確認用ハッシュを生成する。

## 5. Trace番号とハッシュ

Trace番号はマスク後のTraceをキー順に並べたJSONからSHA-256を計算し、先頭12桁を使用する。

```text
trace-<SHA-256先頭12桁>
```

改変確認用ハッシュにはSHA-256の64桁全体を返す。同じ記録内容から同じ値を得られるよう、記録日時はハッシュ計算に含めない。記録日時は保存直前にUTCのISO 8601形式で追加する。

## 6. 結果設計

| 項目 | 内容 |
|---|---|
| trace_id | Trace番号 |
| schema_version | Trace形式の版 |
| trace_name | Trace名 |
| trace_record | マスク後のTrace項目と記録日時 |
| integrity_hash | 改変確認用SHA-256 |
| missing_fields | 不足した内部項目名 |
| missing_field_labels | 不足した日本語表示名 |
| replay_ready | 必須項目が揃っているか |
| replay_note | 再実行時に必要な対応 |
| evaluation_link | 評価番号、評価状態、評価点 |
| masking | マスク件数、対象項目、元の対象語を保存したか |
| retention_note | 保存方針 |
| saved | JSONへ保存したか |
| storage_status | 保存状態の説明 |
| recorded_at | 記録日時 |

マスク済みTraceで完全な再実行を行う場合は、許可された別の保管先から元の値を補う必要があることをreplay_noteへ表示する。

## 7. API設計

### GET /api/system36/metadata

既定入力、画面説明、次の3入力例を返す。

- 再実行できるTrace
- 不足項目があるTrace
- 機密値をマスクするTrace

### POST /api/system36/execute

request:

```json
{
  "input": {
    "trace_name": "返品期限回答の記録",
    "user_input": "返品期限は？",
    "retrieved_context": ["返品条件は7日以内"],
    "model_config": {"model": "mock-model", "temperature": 0.2},
    "prompt": "根拠に基づいて回答してください。",
    "prompt_version": "support-v1",
    "output": "7日以内です。",
    "evaluation": {"evaluation_id": "answer-eval-001", "status": "passed", "score": 1.0},
    "masking_policy": {"enabled": true, "replacement": "[MASKED]", "terms": []}
  }
}
```

入力形式が不正な場合はHTTP 400とsystem36_input_invalidを返す。

### GET /api/system36/runs

JSONから読み込んだ最新20件を新しい順に返す。画面は選択した履歴のマスク済み入力とTrace結果を再表示する。

## 8. 保存設計

保存先は設定値system36_run_fileで指定する。既定値はdata/ai_learning/system36_runs.jsonとする。

```text
一時ファイルへUTF-8で書き込む
  ↓
書き込み完了後にsystem36_runs.jsonへ置き換える
```

バックエンド起動時に保存ファイルを読み、先頭20件をメモリへ復元する。形式が配列でない場合、または配列内にオブジェクト以外を含む場合は起動時エラーとする。

## 9. 画面設計

| 領域 | 表示・操作 |
|---|---|
| 入力例 | 完全、不足、マスクの3種類を選択する |
| 実験条件 | Trace対象とマスク方針をJSONで編集する |
| 結果概要 | Trace番号、再実行情報、マスク件数、保存状態 |
| Trace詳細 | 日本語項目名と記録内容 |
| 評価との対応 | 評価番号、評価状態、評価点 |
| 確認情報 | 不足項目、マスク項目、再実行条件、保存方針、ハッシュ |
| 実行履歴 | 記録日時と結果再表示ボタン |

## 10. テスト設計

| テスト | 確認内容 |
|---|---|
| 完全なTrace | 必須項目、評価との対応、保存状態、記録日時 |
| 保存と読戻し | 新しいserviceで同じTraceを取得できる |
| 不足項目 | Prompt本文・版、評価の不足を判定する |
| マスク | 画面結果と保存ファイルに元の対象語が残らない |
| 不正入力 | 配列、オブジェクト、マスク対象語の型を拒否する |
| validator | 既定値のTrace番号、評価、不足なし、保存状態を検証する |

確認コマンドは次のとおり。

```bat
cd /d C:\work\work20260617\category\StudyAI
docker compose -p studyhub-studyai -f docker-compose.yml run --rm backend-test
docker compose -p studyhub-studyai -f docker-compose.yml run --rm --no-deps frontend npm run build
python scripts\validate-ai-learning.py system36 --show-output
```

## 11. 対象外

- AIモデルへの推論要求
- 保存済みTraceの更新、削除、全文検索
- 本番用途の暗号化、権限制御、保持期限管理
- マスク前の値を復元する機能
