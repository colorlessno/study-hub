# System 35 詳細設計

## Prompt A/B比較

## 実装範囲

system35は、StudyAI共通のカタログ、実行API、履歴API、学習画面を使用する。専用のルーターや専用ページは作らず、次のファイルで構成する。

| ファイル | 役割 |
|---|---|
| `ai_learning/catalog.py` | 既定入力と三つの実行例 |
| `ai_learning/service.py` | 入力検証、A/B採点、差分集計、JSON保存 |
| `SystemLearningPage.tsx` | 比較結果と採点根拠の表示 |
| `system35_runs.json` | 最大20件の実行履歴 |

## API

| メソッド | パス | 内容 |
|---|---|---|
| `GET` | `/api/ai-learning/system35` | テーマ情報、既定入力、実行例を返す |
| `POST` | `/api/ai-learning/system35/runs` | A/B比較を実行して保存する |
| `GET` | `/api/ai-learning/system35/runs` | 保存済み実行履歴を新しい順に返す |

実行APIの入力はJSONオブジェクトとする。画面から送られなかった最上位項目はカタログの既定入力で補う。入れ子のオブジェクトと配列は項目単位で結合せず、送信された値で置き換える。

## 入力データ

```json
{
  "experiment_name": "カスタマーサポートPrompt比較",
  "prompt_a": "質問に短く答えてください。",
  "prompt_b": "提示された根拠を明示し、質問に必要な情報を漏れなく簡潔に答えてください。",
  "fixed_conditions": {
    "model": "recorded-support-model",
    "temperature": 0.2,
    "max_tokens": 160,
    "dataset_version": "support-eval-v1"
  },
  "scoring_weights": {
    "correctness": 0.35,
    "groundedness": 0.25,
    "completeness": 0.25,
    "conciseness": 0.15
  },
  "evaluation_cases": [
    {
      "case_id": "case-returns",
      "question": "商品の返品期限と条件は？",
      "required_terms": ["7日以内", "未使用"],
      "evidence_terms": ["返品規約"],
      "forbidden_terms": ["30日以内"],
      "max_answer_chars": 70,
      "output_a": "返品は7日以内です。",
      "output_b": "返品規約によると、商品到着後7日以内で、未使用品に限り返品できます。"
    }
  ],
  "adoption_record": {
    "selected_variant": "B",
    "reason": "全体平均とケース別結果を確認した判断理由",
    "risk_note": "悪化ケースに対する残る注意点"
  }
}
```

`evaluation_cases` は1件以上とし、`case_id` は入力内で一意にする。`required_terms` と `evidence_terms` は1件以上、`forbidden_terms` は0件以上とする。各要素は空でない文字列とする。

## 採点

各ケースについてA/Bの回答を同じ方法で採点する。

```text
correctness  = 禁止語がなければ 1、あれば 0
groundedness = 一致した根拠語数 / 根拠語数
completeness = 一致した必要語数 / 必要語数
conciseness  = min(1, 文字数上限 / 回答文字数)
total_score  = 各観点の点数 × 各観点の重み の合計
```

点数は小数第3位へ丸める。Prompt別の平均点は全ケースの `total_score` の平均とする。ケース別と全体の差は `B - A` で表す。

| 差 | ケース別判定 |
|---|---|
| 0より大きい | Prompt Bで改善 |
| 0より小さい | Prompt Bで悪化 |
| 0 | 同点 |

全体平均が高い側を `winner` とする。同点は `同点` とし、点数上の推奨は `保留` とする。

## 出力データ

| 項目 | 内容 |
|---|---|
| `winner` | A、B、同点 |
| `average_scores` | A/Bの平均点 |
| `score_difference_b_minus_a` | B平均点からA平均点を引いた値 |
| `variant_results` | Prompt本文、四観点の平均点、総合平均点 |
| `case_results` | ケース別の回答、点数、点差、判定、採点詳細 |
| `improved_cases` | Prompt Bで改善したケース |
| `regressed_cases` | Prompt Bで悪化したケース |
| `unchanged_cases` | 同点のケース |
| `adoption_record` | 記録した判断、点数上の推奨、一致判定、理由、注意点 |
| `fixed_conditions` | 比較時に固定した条件 |
| `scoring_weights` | 採点の重み |
| `saved` | JSONへ永続保存したか |
| `storage_status` | 保存状態の説明 |

`case_results.variant_details` にはA/Bごとに回答、回答文字数、四観点の点数、合計点、一致・不足した語句、検出した禁止語を格納する。

## 保存処理

`LearningSystemService` は実行結果を `system35_runs.json` へ保存する。保存前に一時ファイルへUTF-8で書き、置き換えで確定する。履歴は新しい順に最大20件を保持する。起動時に保存済みJSON配列を読み込み、履歴APIへ戻す。

保存ファイルが読めない、JSONとして不正、配列でない、配列内にオブジェクト以外がある場合は、対象ファイルを示す `RuntimeError` とする。

## 画面表示

結果画面は、最初に勝者、ケース数、A/B平均点、点差、改善・悪化件数を表示する。その後に、Prompt別集計、ケース別比較、ケース別採点根拠、採用判断、固定条件、採点の重み、評価方法、保存状態を表示する。

配列と入れ子の採点結果は表へ展開し、利用者が点数だけでなく、どの必要語・根拠語・禁止語が判定に影響したか確認できるようにする。

## 実行例

| 実行例 | 確認内容 |
|---|---|
| 改善と悪化の両方を比較 | Prompt Bが全体では勝つが、悪化ケースも残る |
| Prompt Aが優れるケース | Prompt Bの誤った期限が検出され、Aが勝つ |
| 同点で採用を保留 | A/Bが同点になり、点数上の推奨が保留になる |

## テスト

- 既定入力でBが勝ち、改善2件、悪化1件になること
- Aが勝つ実行例と、同点で保留する実行例を判定できること
- 不正な採点の重み、空の評価ケース、不正な採用判断を拒否すること
- 保存ファイルを別のサービスインスタンスで読み戻せること
- 検証スクリプトでケース数、両Promptの点数、改善・悪化、採用判断、保存状態を確認できること
- フロントエンドの本番ビルドが成功すること
- StudyHubの実画面で実行例、表、履歴の再表示を確認できること
