# System 21 詳細設計
## Temperature比較

## 実装範囲

system21は、StudyAI共通の学習実験APIと画面を使い、同じ指示を複数のTemperatureで繰り返し生成します。実モデルを選んだ場合はLM StudioのOpenAI互換APIへ一件ずつ順番に通信し、モックを選んだ場合は画面と比較手順を確認する明示的な模擬結果を同じ順序で返します。

```text
src/backend/src/studyai/common/ai/llm_client.py
src/backend/src/studyai/systems/ai_learning/catalog.py
src/backend/src/studyai/systems/ai_learning/service.py
src/backend/src/studyai/systems/ai_learning/router.py
src/frontend/src/pages/SystemLearningPage.tsx
src/scripts/system21_demo.py
src/backend/tests/systems/test_ai_learning_systems.py
data/ai_learning/system21_runs.json
```

## 入力

| 項目 | 型 | 条件 |
|---|---|---|
| `prompt` | string | 空白以外の指示 |
| `temperatures` | number[] | 重複しない2件以上、各値は0以上2以下 |
| `trial_count` | integer | 1以上5以下 |
| `mode` | string | `model`または`mock` |
| `task_type` | string | `fixed`または`creative` |
| `learning_note` | object | `observation`、`decision`、`risk_note`を保持 |

不正な入力は`system21_input_invalid`として400を返します。`mode=model`でモデル通信に失敗した場合は暗黙にモックへ切り替えず、共通の外部サービスエラーを返します。

## API

### GET `/api/system21/metadata`

既定の実験条件、定型業務・発想業務・明示的なモックの入力例、画面の説明を返します。

### POST `/api/system21/execute`

```json
{
  "input": {
    "prompt": "返品を希望する顧客への返信文を作成してください。",
    "temperatures": [0.1, 0.7],
    "trial_count": 3,
    "mode": "model",
    "task_type": "fixed",
    "learning_note": {
      "observation": "",
      "decision": "",
      "risk_note": ""
    }
  }
}
```

`mode=model`では、Temperatureの配列順、次に試行番号順で処理し、直前の応答完了後に`/chat/completions`へ次の同じpromptを送ります。同時送信や並列実行は行いません。要求のTemperature以外は同じ条件にします。応答本文、モデル名、入力トークン数、出力トークン数を試行結果へ記録します。

`mode=mock`では外部通信を行わず、低いTemperatureは同じ文章、高いTemperatureは試行ごとに異なる文章を返します。すべての結果に「明示的なモック」と記録します。

### GET `/api/system21/runs`

保存済みの直近20件を新しい順に返します。

## 比較結果

| 項目 | 内容 |
|---|---|
| `generation_mode` | 実モデルまたは明示的なモック |
| `runs` | Temperature、試行番号、回答、モデル名、トークン数 |
| `diff_summary.count` | 全回答件数 |
| `diff_summary.unique_response_count` | 全体の異なる回答数 |
| `diff_summary.per_temperature` | Temperature別の試行回数、異なる回答数、平均文字数、再現性の簡易比率 |
| `recommendation` | 定型業務または発想業務に対応した設定判断 |
| `learning_note` | 観察結果、判断理由、注意点 |
| `storage_status` | JSONファイルへの保存状態 |

再現性の簡易比率は、同じTemperature内で同一回答が増えるほど1へ近づく学習用指標です。品質そのものを示す指標ではありません。

## 保存

実行入力、全回答、比較結果、学習メモ、作成日時を`data/ai_learning/system21_runs.json`へUTF-8で保存します。直近20件を保持し、一時ファイルへ書いてから置換します。保存先は`Settings.system21_run_file`で変更できます。

## 画面

- 入力例から定型業務、発想業務、明示的なモックを選べる。
- JSON入力で実験条件と学習メモを編集できる。
- 生成方法、回答件数、異なる回答数、保存状態を表示する。
- 試行ごとの回答とTemperature別の比較表を表示する。
- 設定判断、学習メモ、実モデルとモックを区別する注意を表示する。
- 実行履歴から保存した入力と結果を再表示できる。

## 確認項目

- 実モデルではTemperature別・試行回数分のモデル通信が行われる。
- 比較中のpromptと試行回数が固定される。
- モックは明示的に選んだ場合だけ使用される。
- 不正入力とモデル通信失敗が別のエラーとして扱われる。
- 結果と学習メモが保存され、再起動後も再表示できる。
