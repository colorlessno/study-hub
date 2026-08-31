# System 18 詳細設計

## 文章の類似検索

## 1. 設計対象

検索文を送信した後、複数の候補文書を配列順に一件ずつLM StudioのEmbedding APIへ送り、返されたベクトルからcosine類似度を計算する。検索結果と使用したベクトルをJSONファイルへ保存し、StudyAI再起動後も実行履歴を参照できる構成とする。

```text
src/backend/src/studyai/
  common/ai/embedding_client.py
  common/config/settings.py
  systems/ai_learning/
    catalog.py
    router.py
    service.py
src/frontend/src/pages/SystemLearningPage.tsx
src/scripts/system18_demo.py
src/backend/tests/systems/test_ai_learning_systems.py
data/ai_learning/system18_runs.json
```

- system17からsystem36は共通の`ai_learning`実装を使用する。
- system18固有の初期入力、表示名、確認内容は`catalog.py`に定義する。
- Embedding取得は共通の`EmbeddingClient`を使用する。
- 実行履歴はメモリーだけでなくJSONファイルへ永続化する。

## 2. 処理の流れ

```text
SystemLearningPage
  ↓ POST /api/system18/execute
ai_learning router
  ↓ LearningSystemService.execute()
入力検証
  ↓
EmbeddingClient.embed([検索文])
  ↓ POST /v1/embeddings
LM Studio
  ↓ 検索文のベクトル
候補文書ごとにEmbeddingClient.embed([候補文書])
  ↓ 配列順に一件ずつPOST /v1/embeddings
LM Studio
  ↓ 候補文書のベクトル
cosine類似度計算・降順整列
  ↓
system18_runs.jsonへ保存
  ↓
画面へ保存結果と上位検索結果を返す
```

## 3. コンポーネント

| コンポーネント | 役割 |
|---|---|
| `ai_learning/catalog.py` | system18の表示名、初期入力、入力例、確認内容を定義する |
| `ai_learning/router.py` | メタデータ取得、実行、履歴取得のAPIを公開する |
| `ai_learning/service.py` | 入力検証、Embedding取得、類似度計算、順位付け、履歴保存、履歴読戻しを行う |
| `common/ai/embedding_client.py` | OpenAI互換のEmbedding APIと通信する |
| `common/config/settings.py` | LM Studio接続先、Embeddingモデル、system18履歴ファイルの場所を保持する |
| `SystemLearningPage.tsx` | 入力、実行状態、保存結果、検索結果、履歴を表示する |
| `system18_demo.py` | system18をCLIから実行する |

## 4. 入力設計

`POST /api/system18/execute`は次のJSONを受け取る。

```json
{
  "input": {
    "query": "返品方法を知りたい",
    "documents": [
      "商品を返送する前に返品受付を行ってください。",
      "注文のキャンセル方法を案内します。",
      "領収書は購入履歴から発行できます。"
    ],
    "top_k": 2
  }
}
```

| 項目 | 型 | 条件 |
|---|---|---|
| `query` | string | 空文字不可 |
| `documents` | string[] | 1件以上。各要素は空文字不可 |
| `top_k` | integer | 1以上、候補文書数以下 |

条件に合わない入力は400を返し、Embedding APIへ送信しない。

## 5. Embedding取得

- 検索文を1件送信して応答を受け取った後、候補文書を配列順に一件ずつ同じモデルへ送信する。
- 各送信の応答を受け取ってから次の文書へ進み、複数文書を同時または一括では送信しない。
- 使用モデルは設定値`LM_STUDIO_EMBEDDING_MODEL`を使用する。
- DockerからLM Studioへ接続するときは`host.docker.internal:5858`を使用する。
- 取得した全ベクトルの次元が一致しない場合は処理を失敗させる。
- テストでは固定ベクトルを返すクライアントへ差し替え、外部サービスへ通信しない。

## 6. 類似度計算

検索ベクトルを`q`、候補文書ベクトルを`d`とし、次式でcosine類似度を求める。

```text
score = dot(q, d) / (norm(q) * norm(d))
```

- 値は浮動小数として保持する。
- スコアの高い順に並べる。
- 並べ替え後の先頭から`top_k`件を返す。
- 各結果へ順位、文書番号、根拠文、類似度を付与する。

## 7. 出力設計

実行結果の`result`は次の情報を持つ。

| 項目 | 内容 |
|---|---|
| `model` | 実際に使用したEmbeddingモデル |
| `dimension` | ベクトル次元 |
| `stored_documents` | 保存した候補文書数 |
| `query_embedding` | 検索文のベクトル |
| `vector_storage` | 文書番号、根拠文、ベクトル、次元 |
| `results` | 順位、文書番号、根拠文、類似度 |
| `saved` | JSONファイルへの保存成否 |
| `storage_status` | 保存状態を画面へ伝える文言 |

共通の実行応答には`run_id`、`system_id`、`input`、`result`、`observation`、`created_at`も含める。

## 8. 保存設計

| 項目 | 設計 |
|---|---|
| 保存先 | `data/ai_learning/system18_runs.json` |
| 文字コード | UTF-8 |
| 保存件数 | 最新20件 |
| 保存内容 | 共通実行応答一式。入力、検索・文書ベクトル、検索結果を含む |
| 更新方法 | 一時ファイルへ書き込み後、対象ファイルへ置き換える |
| 読戻し | `LearningSystemService`初期化時に既存JSONを読み込む |

- 保存先の親フォルダが存在しない場合は作成する。
- JSONが存在しない場合は空の履歴として開始する。
- 破損JSONを正常な履歴として扱わない。
- 保存後の`GET /api/system18/runs`は、再起動前後で同じ`run_id`を返す。

## 9. API設計

### GET `/api/system18/metadata`

画面表示に使用するsystem ID、題名、分類、初期入力、入力例、確認内容を返す。

### POST `/api/system18/execute`

入力検証、Embedding取得、類似度計算、保存を実行し、保存済みの実行結果を返す。

### GET `/api/system18/runs`

JSONファイルから読み戻したものを含む、最新20件の実行履歴を返す。

## 10. 画面設計

| 領域 | 表示・操作 |
|---|---|
| テーマ説明 | system18の目的と確認対象を表示する |
| 実験条件 | `query`、`documents`、`top_k`をJSONで編集する |
| 実行 | 実行ボタンと処理状態を表示する |
| 保存結果 | 使用モデル、次元、保存文書数、保存状態を表示する |
| 検索結果 | 順位、文書番号、根拠文、cosine類似度を表示する |
| 実行履歴 | 過去の実行結果を選択して再表示する |

## 11. エラー処理

| 条件 | 処理 |
|---|---|
| 入力形式が不正 | 400を返し、対象項目を示す |
| LM Studioへ接続できない | 共通の外部サービスエラーとして返す |
| Embedding応答が不正 | 実行失敗として記録し、画面へ理由を表示する |
| ベクトル次元が不一致 | 類似度を計算せず失敗させる |
| JSON保存に失敗 | 実行結果を成功扱いにせず、保存失敗を返す |

## 12. 設定

| 設定値 | 用途 |
|---|---|
| `LM_STUDIO_BASE_URL` | OpenAI互換APIの基底URL |
| `LM_STUDIO_EMBEDDING_MODEL` | Embeddingモデル名 |
| `system18_run_file` | JSON履歴ファイルのパス |

既定の履歴パスは`./data/ai_learning/system18_runs.json`とする。

## 13. テスト設計

- 固定ベクトルを使用し、同義文が上位、非類似文が下位になることを確認する。
- 検索文と各候補文書が一件ずつ入力順にEmbeddingクライアントへ渡されることを確認する。
- `top_k`を変えると返却件数が変わることを確認する。
- モデル名、次元、保存件数、根拠文、ベクトルが応答へ含まれることを確認する。
- 実行後にJSONファイルが作成されることを確認する。
- 新しい`LearningSystemService`を生成し、同じ`run_id`を読み戻せることを確認する。
- 実環境ではLM Studioの`text-embedding-nomic-embed-text-v1.5`と通信する。

## 14. 受入条件

- 画面から検索文、候補文書、取得件数を変更して実行できる。
- LM Studioとの実通信でEmbeddingベクトルを取得できる。
- 検索結果が類似度の降順で表示される。
- 使用モデル、次元、保存文書数、根拠文を確認できる。
- 実行履歴がJSONファイルへ保存される。
- StudyAI再起動後も保存した履歴を読み戻せる。
- 詳細設計書の本文が厳密なUTF-8として読み取れる。
