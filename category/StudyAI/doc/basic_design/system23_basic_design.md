# System 23 基本設計

## 検索結果の並べ替え比較

## 設計目的

LM StudioのEmbedding APIで作る初期検索順位と、初期top-kだけを再評価するローカル特徴Rerankerの順位を比較する。正解文書の順位改善だけでなく、追加遅延と再評価件数を確認し、Rerankerが有効な条件と不要な条件を判断する。処理と保存はブラウザ内へ閉じず、StudyAIのBackend APIで行う。

## 現行の配置

```text
category/StudyAI/
  src/backend/src/studyai/systems/ai_learning/
    catalog.py
    router.py
    service.py
  src/backend/src/studyai/common/ai/embedding_client.py
  src/backend/src/studyai/common/config/settings.py
  src/backend/tests/systems/test_ai_learning_systems.py
  src/frontend/src/pages/SystemLearningPage.tsx
  scripts/validate-ai-learning.py
  src/scripts/system23_demo.py
  doc/learning_notes/system23_reranker_comparison/README.md
```

system23専用の別APIや別画面は作らず、共通の`ai_learning` APIと画面へ登録する。

## 全体構成

```text
利用者
  ↓ StudyAIフロントエンド
  ↓ POST /api/system23/execute
  ↓ LearningSystemService
  ├─ model: LM Studio /embeddingsへ実通信
  ├─ mock: 明示的な簡易検索
  ├─ 初期top-kをローカル特徴Rerankerで再評価
  ├─ 正解順位、遅延、処理件数を比較
  └─ data/ai_learning/system23_runs.jsonへ保存
```

## 入力

| 項目 | 内容 |
|---|---|
| `query` | 検索文 |
| `documents` | 一意の`id`と空でない`text`を持つ2～20件の文書 |
| `initial_top_k` | 初期検索でRerankerへ渡す件数 |
| `rerank_top_k` | 再順位付け後に表示する件数 |
| `correct_document_id` | 正解順位を追跡する文書ID |
| `mode` | `model`または`mock` |
| `learning_note` | 観察結果、判断理由、注意点 |

`model`はLM StudioのEmbedding APIへ実通信する。`mock`は通信できない環境で画面構造と判断手順を確認する明示的な模擬検索であり、実モデル評価には使わない。実通信失敗時にモックへ黙って切り替えない。

## 初期検索

`model`では検索文、続いて各候補文書を一件ずつ順番にEmbeddingリクエストへ送り、cosine類似度の高い順に並べる。`mock`では文字単位の簡易類似度で同じ出力構造を作る。

初期順位は全候補について記録し、画面へは`initial_top_k`件を表示する。

## 再順位付け

初期top-kの候補だけを対象に、次を組み合わせる。

- Embeddingまたは模擬検索の意味類似度
- 検索文と候補文書の文字の重なり
- 検索文が候補文書へそのまま含まれる場合の加点

再評価点は`意味類似度×0.5 + 文字の重なり×0.25 + 完全一致加点`とする。これはCross-Encoderではなく、順位変化と候補制限を観察するローカル特徴Rerankerであることを画面へ明示する。

## 出力

| 領域 | 内容 |
|---|---|
| 初期順位 | 初期順位、文書ID、文書、意味類似度 |
| rerank後順位 | 再順位、初期順位、意味類似度、文字の重なり、完全一致加点、再評価点 |
| 正解文書 | 初期順位、再順位、順位改善数 |
| 遅延 | 初期検索、再順位付け、合計のミリ秒 |
| 処理件数 | Embedding入力件数、検索文書数、再評価候補数 |
| 判断 | 有効、変化なし、悪化、候補外の説明 |
| 学習メモ | 観察結果、判断理由、注意点 |
| 保存 | 保存状態 |

## API

| メソッド | パス | 用途 |
|---|---|---|
| GET | `/api/system23/metadata` | 初期値、入力例、説明を取得 |
| POST | `/api/system23/execute` | 初期検索と再順位付けを実行して保存 |
| GET | `/api/system23/runs` | 保存済みの最新20件を取得 |

入力不正はHTTP 400と`system23_input_invalid`で返す。Embedding通信のタイムアウトと通信失敗は既存の外部サービスエラーとして返し、モック結果へ置き換えない。

## 保存

保存先は`./data/ai_learning/system23_runs.json`とする。一時ファイルへUTF-8で書いて置換し、最新20件だけを保持する。実行データはGitへ登録しない。

## 確認

- 実モデルモードがEmbedding APIへ検索文と文書を送ること
- 初期top-kの候補だけがRerankerへ渡ること
- 正解文書の初期順位と再順位を追跡できること
- Rerankerが有効な例と順位が変わらない例を区別できること
- 候補外の正解文書をRerankerで改善できないこと
- 初期検索とRerankerの遅延、処理件数を表示できること
- 保存後に新しいサービスから履歴を読み戻せること
