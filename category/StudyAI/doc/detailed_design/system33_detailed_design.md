# System 33 詳細設計

## 検索評価

## 実装する範囲

system33は、質問ごとの期待根拠と順位付き検索結果を照合し、検索品質だけを評価する。実際の検索処理や回答生成は行わない。複数質問を同じ条件で評価し、失敗ケースとchunk設定変更前後の差を確認できるようにする。

```text
src/backend/src/studyai/systems/ai_learning/
  catalog.py    既定入力、実行例、画面説明
  service.py    評価、比較、履歴保存
  router.py     共通API入口
src/backend/src/studyai/common/config/settings.py
src/backend/tests/systems/test_ai_learning_systems.py
src/frontend/src/pages/SystemLearningPage.tsx
scripts/validate-ai-learning.py
data/ai_learning/system33_runs.json
```

## API

| メソッド | パス | 処理 |
|---|---|---|
| GET | `/api/system33/metadata` | 題名、説明、既定入力、実行例を返す |
| POST | `/api/system33/execute` | 入力を検証し、検索評価を実行して保存する |
| GET | `/api/system33/runs` | 保存済み実行履歴を新しい順に最大20件返す |

POST `/api/system33/execute` の要求本文:

```json
{
  "input": {
    "evaluation_name": "support-retrieval-evaluation",
    "chunk_setting": "500文字・100文字重複",
    "top_k": 3,
    "query_cases": [
      {
        "case_id": "case-returns",
        "question": "返品期限は？",
        "expected_evidence": ["returns-policy"],
        "retrieval_results": ["returns-policy", "shipping-guide", "payment-faq"]
      }
    ],
    "learning_note": {
      "observation": "観察した内容",
      "decision": "設計判断",
      "risk_note": "残る注意点"
    }
  }
}
```

## 入力検証

| 項目 | 条件 |
|---|---|
| `evaluation_name` | 空でない文字列 |
| `chunk_setting` | 空でない文字列 |
| `top_k` | 1以上の整数 |
| `query_cases` | 1件以上100件以下の配列 |
| `case_id` | ケース内で空でなく重複しない |
| `question` | 空でない文字列 |
| `expected_evidence` | 空でない文書番号の配列 |
| `retrieval_results` | 空でない順位付き文書番号の配列 |
| `learning_note` | JSONオブジェクト |

従来の単一ケース入力である `question`、`expected_evidence`、`retrieval_results` も受け付け、内部で1件の `query_cases` に変換する。

## 評価処理

各ケースについて、検索結果の先頭から `top_k` 件を評価範囲とする。検索結果が `top_k` より少ない場合は、実際の検索結果件数までを評価する。

| 指標 | 算出方法 |
|---|---|
| Hit | top-kに正解文書が1件以上あれば1、なければ0 |
| Recall | top-kで見つかった重複しない正解文書数 ÷ 正解文書数 |
| Precision | top-kで見つかった重複しない正解文書数 ÷ 実際の評価件数 |
| 逆順位 | 最初の正解文書の順位の逆数。正解がなければ0 |
| Hit Rate | 全ケースのHit平均 |
| 平均Recall | 全ケースのRecall平均 |
| 平均Precision | 全ケースのPrecision平均 |
| 平均逆順位 | 全ケースの逆順位平均 |

失敗分類:

| `failure_type` | 条件 |
|---|---|
| `no_relevant_in_top_k` | top-kに正解文書が一件もない |
| `partial_recall` | 正解文書を一部だけ取得した |
| `none` | すべての正解文書を取得した |

## chunk設定の比較

保存済み履歴から同じ `evaluation_name` の直前実行を探す。前回と今回のchunk設定を表示し、Hit Rate、平均Recall、平均Precision、平均逆順位について `今回 - 前回` の差を返す。前回実行がない場合は比較なしとして返す。

## 応答データ

```json
{
  "evaluation_name": "support-retrieval-evaluation",
  "chunk_setting": "500文字・100文字重複",
  "top_k": 3,
  "case_count": 3,
  "metrics": {
    "case_count": 3,
    "hit_rate": 1.0,
    "average_recall_at_k": 0.833,
    "average_precision_at_k": 0.333,
    "mean_reciprocal_rank": 0.778
  },
  "case_results": [],
  "failure_cases": [],
  "chunk_comparison": {
    "has_previous_run": false,
    "previous_run_id": null,
    "previous_chunk_setting": null,
    "current_chunk_setting": "500文字・100文字重複",
    "metric_deltas": {}
  },
  "learning_note": {},
  "saved": true,
  "storage_status": "JSONファイルへ保存済み"
}
```

`hit_at_k`、`hit_rate`、`recall_at_k`、`precision_at_k`、`reciprocal_rank`、`ranked_results`、`missing_evidence` は、従来の単一ケース画面と検証処理との互換項目として返す。

## 履歴保存

`SYSTEM33_RUN_FILE` の既定値は `./data/ai_learning/system33_runs.json` とする。実行時に入力と結果を新しい順に保存し、最新20件を保持する。保存時は一時ファイルを書き終えてから置き換え、起動時にJSONを読み戻す。不正なJSONまたは配列以外のデータは起動時エラーにする。

## 画面

画面には、実行例選択、JSON入力、実行ボタン、全体指標、質問別結果、失敗ケース、chunk設定の比較、先頭ケースの検索順位、学習メモ、保存状態、実行履歴を表示する。指標名は英語の略称だけにせず、日本語の説明と対応する位置に表示する。

## エラー

入力不正はHTTP 400で返し、画面に具体的な入力項目を含むメッセージを表示する。履歴ファイルの読込失敗は起動時エラーとし、評価結果が保存されたように見せない。

## 検証

```bat
docker compose run --rm -v .:/workspace -e PYTHONPATH=/workspace/src/backend/src -w /workspace/src/backend backend-test python -m pytest -p asyncio -q tests/systems/test_ai_learning_systems.py -k system33
docker compose run --rm -v .:/workspace -e PYTHONPATH=/workspace/src/backend/src -w /workspace backend-test python scripts/validate-ai-learning.py system33
docker compose run --rm --no-deps -v ./src/frontend/src:/app/frontend/src frontend npm run build
```

実画面では既定例とchunk設定変更例を順に実行し、指標、失敗分類、前回との差、履歴保存を確認する。
