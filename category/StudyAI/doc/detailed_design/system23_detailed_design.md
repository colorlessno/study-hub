# System 23 詳細設計

## 検索結果の並べ替え比較

## 対象ファイル

```text
src/backend/src/studyai/systems/ai_learning/catalog.py
src/backend/src/studyai/systems/ai_learning/service.py
src/backend/src/studyai/systems/ai_learning/router.py
src/backend/src/studyai/common/ai/embedding_client.py
src/backend/src/studyai/common/config/settings.py
src/frontend/src/pages/SystemLearningPage.tsx
src/backend/tests/systems/test_ai_learning_systems.py
scripts/validate-ai-learning.py
src/scripts/system23_demo.py
```

## API

### GET `/api/system23/metadata`

初期入力、実EmbeddingでRerankerが有効な入力例、明示的なモックでRerankerが不要な入力例を返す。

### POST `/api/system23/execute`

request:

```json
{
  "input": {
    "query": "返金条件",
    "documents": [
      {"id": "refund-guide", "text": "返金の一般案内"},
      {"id": "refund-policy", "text": "返金条件は7日以内"}
    ],
    "initial_top_k": 2,
    "rerank_top_k": 2,
    "correct_document_id": "refund-policy",
    "mode": "model",
    "learning_note": {"observation": "", "decision": "", "risk_note": ""}
  }
}
```

`mode=model`は非同期処理からEmbedding APIを呼ぶ。`mode=mock`は外部通信を行わず、文字の重なりを初期検索点とする。

### GET `/api/system23/runs`

保存済みの最新20件を新しい順で返す。

## 入力検証

| 条件 | エラー |
|---|---|
| `query`が空 | 検索文エラー |
| `documents`が2～20件でない | 文書件数エラー |
| 文書がオブジェクトでない | 文書形式エラー |
| 文書IDが空または重複 | 文書IDエラー |
| 文書本文が空 | 文書本文エラー |
| `initial_top_k`が1未満または文書数超 | 初期件数エラー |
| `rerank_top_k`が1未満または初期件数超 | 再順位件数エラー |
| `correct_document_id`が候補にない | 正解文書エラー |
| `mode`が`model`または`mock`でない | モードエラー |
| `learning_note`がオブジェクトでない | 学習メモエラー |

入力不正はHTTP 400と`system23_input_invalid`へ変換する。

## 初期検索

### 実モデル

検索文、続いて各候補文書を一件ずつ順番に`/embeddings`へ送り、各応答が1件で同一次元のベクトルであることを確認する。検索文ベクトルと各文書ベクトルのcosine類似度を計算し、降順へ並べる。入力件数は検索文1件と候補文書数の合計として記録する。

### 明示的なモック

文字要素の集合を作り、共通要素数を両集合サイズの平方根で割った簡易類似度を使う。画面と判断手順の確認専用であり、実Embeddingの品質評価には使用しない。

## Reranker

初期順位の上位`initial_top_k`だけを候補とし、次を計算する。

```text
rerank_score = semantic_score * 0.5
             + lexical_score * 0.25
             + phrase_bonus
```

`phrase_bonus`は検索文が候補文書へそのまま含まれる場合に0.5、それ以外は0とする。これはCross-Encoderではなく、候補制限と追加評価を観察するローカル特徴Rerankerである。

## 正解順位の評価

`correct_document_id`の全候補中の初期順位と、Reranker候補中の再順位を取得する。

- `rank_improvement > 0`: 順位改善
- `rank_improvement == 0`: 順位変化なし
- `rank_improvement < 0`: 順位悪化
- 再順位が`null`: 正解文書が初期top-kの候補外

候補外の場合、Rerankerでは改善できないことを明示する。

## 遅延と処理件数

`perf_counter`でEmbeddingまたは模擬初期検索の処理時間と、Rerankerの処理時間を別々に計測する。合計時間、Embedding入力件数、検索文書数、再評価候補数を返す。

## 出力

| 項目 | 内容 |
|---|---|
| `search_mode` | `model`または`mock` |
| `search_mode_label` | 実Embeddingまたは明示的なモック |
| `reranker_method` | 再評価方法の説明 |
| `initial_ranking` | 初期top-k |
| `reranked_ranking` | rerank top-k |
| `correct_document` | 正解文書ID、初期順位、再順位、改善数 |
| `latency_summary` | 初期検索、Reranker、合計のミリ秒 |
| `processing_summary` | Embedding入力、検索文書、再評価候補の件数 |
| `judgement` | 有効、変化なし、悪化、候補外の判断文 |
| `learning_note` | 観察結果、判断理由、注意点 |
| `saved` | 永続保存したか |
| `storage_status` | 保存状態 |

実モデルでは`embedding_model`と`embedding_dimension`も返す。

## 保存

`Settings.system23_run_file`の既定値は`./data/ai_learning/system23_runs.json`とする。最新20件を保持し、一時ファイルへUTF-8で書いた後に保存先へ置き換える。サービス初期化時に読み戻す。形式不正や読取失敗は明示的なエラーとする。

## 画面

1. 初期検索方法、正解の初期順位、正解の再順位、保存状態
2. Rerankerの方式と比較結果
3. Embedding初期順位表
4. Reranker適用後の順位と点数内訳
5. 初期検索と再順位付けの遅延、処理件数
6. 学習メモ
7. 実モデルとモック、候補制限の注意

## テスト観点

- 実モデルモードがEmbeddingクライアントへ検索文と文書を渡す
- 初期順位2位の正解文書がRerankerで1位へ改善する
- Embedding入力件数と再評価候補数が一致する
- 実行結果と学習メモを保存して読み戻す
- 明示的なモックが同じ出力構造を返す
- オフラインvalidatorは`mode=mock`を明示する
- 不正なtop-k、文書ID、modeを拒否する
