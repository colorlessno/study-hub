# System 34 詳細設計

## 回答内容の評価

## 対象

system34は、質問、期待する回答、必要な回答要素、根拠、AI回答、回答内の主張を照合し、四つの観点で評価する。実装はStudyAI共通の `LearningSystemService` と `SystemLearningPage` を使用する。

## 入力JSON

```json
{
  "evaluation_name": "返品回答の評価",
  "question": "商品の返品期限と条件は？",
  "expected_answer": "商品到着後7日以内で、未使用品に限り返品できます。",
  "expected_points": [
    {
      "point_id": "deadline",
      "label": "返品期限",
      "required_terms": ["7日以内"],
      "contradiction_terms": ["30日以内"]
    }
  ],
  "evidence": [
    {
      "evidence_id": "returns-policy",
      "text": "返品は商品到着後7日以内で、未使用品に限り受け付けます。"
    }
  ],
  "generated_answer": "返品は商品到着後7日以内で受け付けます。",
  "answer_claims": [
    {
      "claim_id": "claim-deadline",
      "text": "返品は商品到着後7日以内で受け付けます。",
      "evidence_ids": ["returns-policy"],
      "expected_point_ids": ["deadline"],
      "support_terms": ["7日以内"]
    }
  ],
  "learning_note": {
    "observation": "確認した内容",
    "decision": "採用する評価方法",
    "risk_note": "残る注意点"
  }
}
```

## 入力検証

| 項目 | 規則 |
|---|---|
| `evaluation_name` | 空でない文字列 |
| `question` | 空でない文字列 |
| `expected_answer` | 空でない文字列 |
| `generated_answer` | 空でない文字列 |
| `expected_points` | 1件以上20件以下 |
| `point_id` | 空でなく、入力内で重複しない |
| `required_terms` | 空でない語句を1件以上含む配列 |
| `contradiction_terms` | 文字列の配列。省略時は空配列 |
| `evidence` | 1件以上30件以下 |
| `evidence_id` | 空でなく、入力内で重複しない |
| `answer_claims` | 1件以上30件以下 |
| `claim_id` | 空でなく、入力内で重複しない |
| `text` | `generated_answer` に含まれる文 |
| `evidence_ids` | 入力内に存在する根拠番号だけを参照する配列 |
| `expected_point_ids` | 入力内に存在する回答要素番号だけを参照する配列 |
| `support_terms` | 参照した根拠文で確認する語句の配列 |
| `learning_note` | オブジェクト |

## 回答要素の判定

各 `expected_points` について次を記録する。

- `covered`: `required_terms` のいずれかがAI回答に含まれるか
- `covered_terms`: AI回答で見つかった必要語句
- `contradicted`: `contradiction_terms` のいずれかがAI回答に含まれるか
- `matched_contradiction_terms`: AI回答で見つかった矛盾語

語句の照合では英字の大文字と小文字を区別しない。

## 主張と根拠の判定

各 `answer_claims` について次を記録する。

- `supported`: 一つ以上の根拠を参照し、すべての `support_terms` が参照した根拠文に含まれるか
- `relevant`: 一つ以上の必要な回答要素へ対応しているか
- `assessment`: 根拠付きの必要な回答、不要な補足、根拠で確認できない主張のいずれか

## 点数

| キー | 計算式 |
|---|---|
| `correctness` | `(回答要素数 - 矛盾した回答要素数) / 回答要素数` |
| `groundedness` | `(主張数 - 根拠で確認できない主張数) / 主張数` |
| `completeness` | `(回答要素数 - 不足した回答要素数) / 回答要素数` |
| `conciseness` | `(主張数 - 不要な補足数) / 主張数` |
| `overall_score` | 四つの点数の平均 |

各点数は小数第3位へ丸め、0から1の範囲で返す。

## 分類と改善内容

| コード | 表示名 | 条件 | 改善内容 |
|---|---|---|---|
| `incorrect` | 不正確な回答 | 矛盾した回答要素がある | 矛盾する表現を修正する |
| `insufficient` | 回答不足 | 不足した回答要素がある | 不足している回答要素を追加する |
| `unsupported` | 根拠のない主張 | 根拠で確認できない主張がある | 主張を削除するか根拠を追加する |
| `excessive` | 不要情報を含む回答 | 根拠はあるが質問に不要な主張がある | 不要な補足を削除する |
| `acceptable` | 要件を満たす回答 | 他の分類がない | 現在の回答が条件を満たすことを示す |

問題が複数ある場合は複数の分類と改善内容を返す。

## 出力JSONの主要項目

```text
evaluation_name
question
expected_answer
generated_answer
overall_score
score_breakdown
evaluation_items
point_results
claim_results
supporting_evidence
missing_points
contradicted_points
unsupported_assertions
excessive_claims
classifications
risk_flags
improvement_notes
learning_note
evaluation_note
saved
storage_status
```

## 保存処理

`LearningSystemService._store_run` は入力、出力、実行日時を実行履歴へ追加する。`system34_run_file` が設定されている場合は、同じ内容を `system34_runs.json.tmp` へUTF-8で書き込み、`system34_runs.json` と置き換える。保持件数は新しい順に20件とする。

サービス起動時はJSONファイルを読み込み、配列でない場合や要素がオブジェクトでない場合は `RuntimeError` とする。

## API

| メソッド | パス | 処理 |
|---|---|---|
| GET | `/api/ai-learning/system34` | テーマ定義と実行例を返す |
| POST | `/api/ai-learning/system34/runs` | 入力を評価し、結果を保存して返す |
| GET | `/api/ai-learning/system34/runs` | 保存済み実行履歴を返す |

## 画面表示

`SystemLearningPage` は総合点と四観点を数値で表示する。回答分類、観点別の採点理由、必要な回答要素、回答内の主張と根拠、根拠文、改善内容、学習メモ、保存状態を表または一覧で表示する。

実行例は、要件を満たす回答、回答不足、根拠のない主張、不要な補足の四つを用意する。

## テスト

- 既定入力で四観点がすべて1になり、`acceptable` へ分類されること
- 回答要素を一つ省いた場合に網羅性が0.5になり、`insufficient` へ分類されること
- 根拠のない主張を追加した場合に根拠性が下がり、`unsupported` へ分類されること
- 質問に不要だが根拠のある主張を追加した場合に簡潔性が下がり、`excessive` へ分類されること
- JSONファイルへ保存し、新しいサービスから履歴を読み直せること
- 入力検証エラーが画面で確認できること
