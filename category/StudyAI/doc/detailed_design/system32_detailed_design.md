# System 32 詳細設計

## RAG評価セット

### 実装対象

```text
src/backend/src/studyai/common/config/settings.py
src/backend/src/studyai/systems/ai_learning/catalog.py
src/backend/src/studyai/systems/ai_learning/service.py
src/backend/src/studyai/systems/ai_learning/router.py
src/frontend/src/pages/SystemLearningPage.tsx
src/backend/tests/systems/test_ai_learning_systems.py
scripts/validate-ai-learning.py
```

system32は `ai_learning` の共通実装を使い、system番号で処理と画面表示を切り替える。

### 入力データ

```json
{
  "dataset_name": "support-rag-evaluation-v1",
  "run_label": "baseline",
  "rag_config": {
    "retriever_version": "support-search-v1",
    "generator_version": "support-answer-v1",
    "prompt_version": "support-prompt-v1",
    "top_k": 3
  },
  "ground_truth_cases": [
    {
      "case_id": "case-returns",
      "question": "返品期限は？",
      "expected_answer": "商品到着後7日以内",
      "expected_evidence_ids": ["returns-policy"],
      "retrieval_results": ["returns-policy", "shipping-guide"],
      "generated_answer": "返品期限は商品到着後7日以内です。"
    }
  ],
  "learning_note": {
    "observation": "観察結果",
    "decision": "設計判断",
    "risk_note": "残る注意点"
  }
}
```

### 入力検証

| 項目 | 条件 | エラー |
|---|---|---|
| `dataset_name` | 空でない文字列 | `dataset_nameを入力してください。` |
| `run_label` | 空でない文字列 | `run_labelを入力してください。` |
| `rag_config` | JSONオブジェクト | `rag_configはJSONオブジェクトで指定してください。` |
| RAGの各バージョン | 空でない文字列 | 必須項目を示す入力エラー |
| `top_k` | 1以上の整数。真偽値は不可 | `rag_config.top_kは1以上の整数で指定してください。` |
| `ground_truth_cases` | 1件以上100件以下の配列 | 件数を示す入力エラー |
| ケース | JSONオブジェクト | ケース形式を示す入力エラー |
| `case_id` | 空でなく、評価セット内で一意 | 重複しない値を求める入力エラー |
| 質問、期待回答、正解文書 | すべて入力済み | 対象ケース番号を含む入力エラー |
| 検索結果、正解文書 | 文字列の配列 | 対象項目を示す入力エラー |
| `learning_note` | JSONオブジェクト | 学習メモ形式を示す入力エラー |

旧入力との互換性として、`cases` は `ground_truth_cases`、`expected` は `expected_answer` として読み込む。ただし、正解文書番号、検索結果、生成回答を持たない旧入力だけでは新しい評価を成立させない。

### ケース別の評価処理

1. `retrieval_results` の先頭から `top_k` 件を `top_k_results` とする。
2. `top_k_results` と `expected_evidence_ids` の共通要素を `matched_evidence_ids` とする。
3. 共通要素が1件以上あれば `retrieval_success` を `true` とする。
4. `generated_answer` に `expected_answer` が含まれれば `answer_score` を1.0、含まれなければ0.0とする。
5. `answer_score` が1.0なら `generation_success` を `true` とする。
6. 検索失敗、生成失敗、成功の順で `failure_type` と日本語の `failure_label` を決める。

ケース別結果には、入力値に加えて上位検索結果、合致した正解文書、検索成否、生成成否、回答評価、失敗箇所を含める。

### 集計処理

| 指標 | 算出方法 |
|---|---|
| `case_count` | ケース数 |
| `retrieval_success_rate` | 検索成功件数 ÷ ケース数。小数第3位まで |
| `generation_success_rate` | 生成成功件数 ÷ ケース数。小数第3位まで |
| `average_answer_score` | 回答評価の合計 ÷ ケース数。小数第3位まで |
| `retrieval_failure_count` | `failure_type` が `retrieval_failure` の件数 |
| `generation_failure_count` | `failure_type` が `generation_failure` の件数 |

### 前回実行との差

`self._runs["system32"]` は新しい順で保持される。現在の `dataset_name` と `rag_config` の両方が一致する最初の履歴を直前実行として採用する。

比較対象がある場合は、検索成功率、生成成功率、回答評価の平均について `現在値 - 前回値` を計算する。差が負の指標名を `regressed_metrics` に格納する。比較対象がない場合は `has_previous_run` を `false` とし、各差分を0とする。

### 出力データ

```json
{
  "dataset_name": "support-rag-evaluation-v1",
  "run_label": "baseline",
  "rag_config": {},
  "case_count": 3,
  "metrics": {},
  "case_results": [],
  "failure_summary": {},
  "regression_diff": {},
  "learning_note": {},
  "saved": true,
  "storage_status": "JSONファイルへ保存済み"
}
```

`retrieval_hit_rate` と `average_answer_score` は旧画面との互換項目として返す。

### 実行履歴の保存

保存先は設定 `system32_run_file` で指定し、既定値を `./data/ai_learning/system32_runs.json` とする。

実行結果を新しい順で最大20件保持し、JSONをUTF-8、2文字インデント、末尾改行付きで保存する。保存先と同じ場所に `.tmp` を付けた一時ファイルを書き、完了後に本ファイルへ置き換える。

起動時に保存ファイルが存在する場合は全体が配列であり、各要素がJSONオブジェクトであることを確認する。読込不能または形式不正の場合は、保存先を含む `RuntimeError` を発生させる。

### API

#### `GET /api/system32/metadata`

system番号、題名、分類、既定入力、説明、サンプルを返す。

#### `POST /api/system32/execute`

```json
{
  "input": {
    "dataset_name": "support-rag-evaluation-v1"
  }
}
```

入力を既定値へ上書きして評価し、`run_id`、入力、結果、作成日時を含む実行記録を返す。

#### `GET /api/system32/runs`

保存済みの実行記録を新しい順で返す。

### 画面表示

- system32は入力と結果を上下に並べる1列構成とする。
- サンプルボタンから基準実行、検索悪化、生成悪化を選択できる。
- 集計値、RAG設定、ケース別結果、前回との差、学習メモ、保存状態を別のまとまりで表示する。
- 比較対象がない場合は、次回から差を表示することを文章で示す。
- 配列やJSONオブジェクトは共通の表示処理で読みやすい文字列へ整形する。

### テスト

| 確認対象 | 内容 |
|---|---|
| 既定入力 | 成功、検索失敗、生成失敗が1件ずつになる |
| 集計 | 検索成功率と生成成功率が0.667になる |
| 永続化 | JSON保存後に新しいサービスで同じ履歴を復元できる |
| 前回比較 | 検索結果を悪化させると検索成功率の差が-0.667になる |
| 入力エラー | 0件のケース、重複番号、不正な `top_k` を拒否する |
| 教材検証 | 既定入力の件数、成否、指標、初回比較、学習メモを検証する |

### 文字コード

本文は既存ファイルと同じUTF-8 BOM付き、CRLFで保存する。実装、テスト、README、チェック設定は各既存ファイルのBOMと改行コードを維持する。
