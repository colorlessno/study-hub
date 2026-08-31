# System 26 詳細設計

## 量子化方式の比較

## 配置

```text
src/backend/src/studyai/systems/ai_learning/
  catalog.py
  service.py
  router.py
src/backend/src/studyai/common/
  config/settings.py
  llm/client.py
src/frontend/src/pages/SystemLearningPage.tsx
src/backend/tests/systems/test_ai_learning_systems.py
scripts/validate-ai-learning.py
data/ai_learning/system26_runs.json
```

system17からsystem36までは共通のAPI、サービス、画面を使い、system26固有の入力、処理、表示だけをカテゴリ`quantization`として分岐する。

## 入力形式

```json
{
  "prompt": "同じ指示",
  "quantization_profiles": [
    {
      "id": "q4",
      "model": "LM Studioのモデル名",
      "label": "Q4",
      "quantization": "4bit",
      "mock_response": "明示的なモックで使う回答"
    }
  ],
  "runtime_metrics": [
    {
      "profile_id": "q4",
      "memory_mb": 8000,
      "mock_elapsed_ms": 500,
      "environment_note": "同一PC・同一コンテキスト長"
    }
  ],
  "evaluation_rubric": {
    "required_terms": ["必須語句"],
    "max_length": 180,
    "coverage_weight": 0.8,
    "conciseness_weight": 0.2
  },
  "selection_priority": "balanced",
  "temperature": 0.2,
  "mode": "model",
  "learning_note": {
    "observation": "",
    "decision": "",
    "risk_note": ""
  }
}
```

## 入力検証

| 項目 | 条件 |
|---|---|
| `prompt` | 1文字以上8000文字以下 |
| `quantization_profiles` | 1件以上5件以下の配列 |
| `id` | 空でなく、プロファイル内で重複しない |
| `model` | 空でなく、プロファイル内で重複しない |
| `runtime_metrics` | 各プロファイルに1件ずつ存在する |
| `memory_mb` | 0より大きい数値 |
| `mock_elapsed_ms` | mock時は0より大きい数値 |
| `required_terms` | 1件以上20件以下、空文字なし |
| `max_length` | 1以上4000以下 |
| 評価の重み | 0以上で合計1 |
| `temperature` | 0以上2以下 |
| `selection_priority` | `memory`、`speed`、`quality`、`balanced` |
| `mode` | `model`または`mock` |

未定義の`profile_id`を持つ測定値もエラーにする。

## API

### GET `/api/system26/metadata`

タイトル、カテゴリ、既定入力、画面説明、入力サンプルを返す。

### POST `/api/system26/execute`

```json
{
  "input": {
    "mode": "model"
  }
}
```

入力は既定値へ再帰的に重ねる。`mode`が`model`の場合は非同期実行入口からモデル通信を行う。`mock`の場合は同期処理でも実行できる。

### GET `/api/system26/runs`

メモリ上またはJSONから読み込んだ最新20件の実行履歴を返す。

## 実モデル比較

各プロファイルを入力順に一件ずつ処理し、直前の応答完了後に次へ進む。同時送信や並列処理は行わない。

1. `perf_counter`で開始時刻を記録する。
2. `generate_text_with_metadata(prompt, temperature, model=profile.model)`を呼ぶ。
3. 応答取得後に経過時間をミリ秒へ変換する。
4. 回答、要求モデル、応答モデル、トークン数、応答時間を記録する。
5. 次のプロファイルを同じ条件で実行する。

通信エラーを捕捉してモック結果へ置き換えない。呼出元の共通エラー処理へ渡す。

## 明示的なモック

各プロファイルの`mock_response`と`mock_elapsed_ms`を使う。応答モデルは「明示的なモック」と表示する。品質評価、比較、保存は実モデル比較と同じ処理を使う。

## 品質点

```text
coverage_ratio = 回答に含まれた必須語句数 / 必須語句数
conciseness_score = min(1, max_length / max(1, 回答文字数))
quality_score =
  (coverage_ratio × coverage_weight
   + conciseness_score × conciseness_weight) × 100
```

大文字と小文字を区別せず必須語句を照合し、小数第2位まで表示する。

## 比較点と候補選択

```text
memory_score = 最小メモリ使用量 / 対象のメモリ使用量 × 100
speed_score = 最短応答時間 / 対象の応答時間 × 100
balanced_score = quality_score × 0.50
               + memory_score × 0.25
               + speed_score × 0.25
```

- `memory`: `memory_mb`が最小の方式
- `speed`: `elapsed_ms`が最小の方式
- `quality`: `quality_score`が最大の方式
- `balanced`: `balanced_score`が最大の方式

メモリ最小、最速、品質最高は優先条件と別に`runtime_summary`へ残す。

## 出力形式

```json
{
  "comparison_mode": "model",
  "comparison_mode_label": "実モデルへの通信",
  "fixed_conditions": {},
  "profile_results": [],
  "selection_priority": "balanced",
  "selected_profile_id": "q5",
  "selected_profile": "Q5",
  "selection_reason": "選択理由",
  "runtime_summary": {},
  "tradeoff_note": "比較結果の説明",
  "learning_note": {},
  "notes": [],
  "saved": true,
  "storage_status": "JSONファイルへ保存済み"
}
```

## 保存処理

- 設定`system26_run_file`の既定値は`./data/ai_learning/system26_runs.json`とする。
- 実行履歴は新しい順で最大20件保持する。
- `ensure_ascii=false`のUTF-8 JSONとして、拡張子`.tmp`の一時ファイルへ書く。
- 書き込み後に一時ファイルを保存先へ置換する。
- 起動時に保存ファイルが存在すれば読み込む。
- JSONが配列でない、要素がオブジェクトでない、またはJSONとして壊れている場合は読み込みエラーにする。

## 画面表示

| 表示領域 | 内容 |
|---|---|
| 実行条件 | 比較方法、優先条件、固定した指示、Temperature、評価基準 |
| 比較表 | 指定モデル、応答モデル、量子化方式、メモリ、時間、品質点、総合点、回答 |
| 用途別結果 | メモリ最小、最速、品質最高 |
| 判断 | 採用候補、選択理由、トレードオフ |
| 学習メモ | 観察結果、採用判断、残る注意点 |
| 注意 | メモリ値、品質点、比較条件、モックの扱い |
| 履歴 | 保存済みの比較条件と結果 |

## テスト観点

- 実モデルモードで、全プロファイルへ同じ指示とTemperature、指定した別々のモデル名を送る。
- API応答の時間を計測し、入力されたメモリ使用量とともに結果へ含める。
- 固定評価で回答の違いが品質点へ反映される。
- 優先条件が`quality`なら品質点が高い方式、`memory`ならメモリ使用量が小さい方式を選ぶ。
- mockを明示した場合だけ、模擬回答と模擬応答時間を使う。
- 実行結果がJSONへ保存され、新しいサービスインスタンスでも読み戻せる。
- 不正なモデル設定、測定値、評価基準を拒否する。
