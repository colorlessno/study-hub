# System 24 詳細設計

## 複数モデルの比較

## 実装ファイル

```text
src/backend/src/studyai/common/ai/llm_client.py
src/backend/src/studyai/common/config/settings.py
src/backend/src/studyai/systems/ai_learning/catalog.py
src/backend/src/studyai/systems/ai_learning/service.py
src/backend/src/studyai/systems/ai_learning/router.py
src/frontend/src/pages/SystemLearningPage.tsx
src/backend/tests/systems/test_ai_learning_systems.py
scripts/validate-ai-learning.py
src/scripts/system24_demo.py
```

system17～36の共通API、共通サービス、共通画面を使う。system24専用Router、Repository、Pageは作らない。

## API

### GET `/api/system24/metadata`

タイトル、カテゴリ、既定入力、観察ポイント、実モデル用と明示的なモック用の入力例を返す。

### POST `/api/system24/execute`

requestの`input`:

```json
{
  "prompt": "返品条件を説明してください。",
  "models": [
    {
      "id": "quality-local",
      "model": "qwen3-27b-q4",
      "label": "品質重視ローカルモデル",
      "input_cost_per_million": 0,
      "output_cost_per_million": 0,
      "operational_note": "LM Studioへ読み込んでから実行する",
      "mock_response": "返品は7日以内で未使用の場合に受け付けます。"
    }
  ],
  "evaluation_rubric": {
    "required_terms": ["7日以内", "未使用"],
    "max_length": 180,
    "coverage_weight": 0.8,
    "conciseness_weight": 0.2
  },
  "priority": "balanced",
  "temperature": 0.2,
  "mode": "model",
  "learning_note": {
    "observation": "",
    "decision": "",
    "risk_note": ""
  }
}
```

`mode=model`は非同期実行入口から各モデルへ通信する。`mode=mock`は`mock_response`を使用し、通信を行わない。実モデルの失敗時はエラーを返し、モックへ切り替えない。

responseの`result`:

| 項目 | 内容 |
|---|---|
| `comparison_mode` | `model`または`mock` |
| `fixed_conditions` | 共通の指示、Temperature、評価基準 |
| `model_results` | 回答、実測時間、トークン数、推定費用、品質点、運用条件 |
| `priority` | 選定で優先した条件 |
| `selected_model_id` | 採用候補の比較ID |
| `selected_model` | 採用候補の実モデル名 |
| `selection_reason` | 採用理由 |
| `rejected_models` | 不採用モデルごとの理由 |
| `learning_note` | 観察結果、採用判断、残る注意点 |
| `saved` | JSONへ保存したか |
| `storage_status` | 保存状態の説明 |

### GET `/api/system24/runs`

保存済み実行履歴を新しい順に返す。バックエンド起動時にはJSONから最新20件を読み戻す。

## 入力検証

- `prompt`は1～8000文字。
- `models`は2～5件。文字列入力との互換性を維持し、内部ではモデル設定へ正規化する。
- `id`と`model`は重複不可。
- 入出力単価は0以上。
- `required_terms`は1～20件で、空文字を禁止する。
- `max_length`は1～4000。
- 評価の重みは0以上で合計1。
- `temperature`は0～2。
- `priority`は`quality`、`latency`、`cost`、`balanced`。
- `mode`は`model`または`mock`。

検証違反はRouterでHTTP 400と`system24_input_invalid`へ変換する。

## 実モデル呼出し

`models`を入力順に反復し、`LLMClient.generate_text_with_metadata(prompt, temperature, model=...)`を一件ずつ呼ぶ。各応答を`await`して結果へ追加した後にだけ次のモデルへ進み、同時送信や並列処理は行わない。送信先はStudyAIのAIプロバイダー設定で決まり、OpenAI互換`/chat/completions`を使用する。応答本文、応答モデル名、入力トークン数、出力トークン数を受け取る。各呼出しの前後を`perf_counter()`で測り、ミリ秒へ変換する。

## 品質点

```text
coverage_ratio = 回答に含まれた必須語句数 / 必須語句総数
conciseness_score = min(1, max_length / 回答文字数)
quality_score = (coverage_ratio * coverage_weight
               + conciseness_score * conciseness_weight) * 100
```

必須語句は大文字小文字を区別せず検索する。品質点は教材用の固定評価であり、人手評価の代替ではない。

## 推定費用

```text
estimated_cost =
  (input_tokens * input_cost_per_million
   + output_tokens * output_cost_per_million) / 1_000_000
```

APIがトークン数を返さない場合は`null`とする。単価0のローカルモデルは0になる。

## 選定

- `quality`: 品質点が最大。
- `latency`: 実測応答時間が最小。
- `cost`: 既知の推定費用が最小。
- `balanced`: 品質60点、最速モデルとの比20点、最安モデルとの比20点で計算した総合点が最大。

採用候補には選定理由を付け、残りのモデルには優先条件で候補を上回らなかったことを不採用理由として記録する。

## 保存

保存先は`data/ai_learning/system24_runs.json`。一時ファイルへUTF-8で書き、置換して保存する。最新20件を保持する。保存先未指定の単体テストではメモリ履歴だけを使い、画面には未保存であることを表示する。

## 画面表示

- 比較方法、優先条件、採用候補、保存状態。
- 固定した指示、必須語句、回答長、Temperature。
- モデル別の指定モデル、応答モデル、回答、品質点、網羅率、実測時間、トークン数、推定費用、総合点、運用条件。
- 採用理由、不採用理由、学習メモ、評価上の注意。

## 確認項目

- Fake clientへ異なるモデル名が2件送られる。
- 必須語句を多く含む回答の品質点が高くなる。
- 指定単価とトークン数から推定費用が計算される。
- 明示的なモックは実モデルとは異なる表示になる。
- 結果と学習メモがJSONへ保存され、再生成したServiceから読み戻せる。
