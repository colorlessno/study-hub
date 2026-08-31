# System 19 詳細設計
## Attentionの関係表示

## 1. 実装配置

```text
src/backend/src/studyai/systems/ai_learning/
  catalog.py
  service.py
  router.py
src/backend/src/studyai/common/config/settings.py
src/frontend/src/pages/SystemLearningPage.tsx
src/scripts/system19_demo.py
src/backend/tests/systems/test_ai_learning_systems.py
data/ai_learning/system19_runs.json
```

- `system17`から`system36`は共通の学習APIとサービスを使い、system IDとcategoryで処理を切り替える。
- system19は外部AI APIへ通信せず、位置・同一語・指示語・修飾語から決定的な疑似スコアをサーバー側で計算する。
- 実際のTransformerのAttention値やAIモデルの判断理由ではないことを画面と教材へ明示する。

## 2. コンポーネント

| コンポーネント | 役割 |
|---|---|
| `ai_learning/catalog.py` | 既定入力、題名、観察内容を定義する |
| `ai_learning/service.py` | 入力分割、疑似関係行列、注目位置補正、加算理由、履歴保存と読戻しを行う |
| `ai_learning/router.py` | メタデータ、実行、履歴APIを公開する |
| `common/config/settings.py` | system19履歴JSONの保存先を定義する |
| `SystemLearningPage.tsx` | 入力、分割単語、注目位置、関係行列、保存状態、実行履歴を表示する |
| `system19_demo.py` | 共通サービスを使うCLI実行口を提供する |

## 3. API

### 3.1 GET `/api/system19/metadata`

`system_id`、`title`、`category`、`default_input`、`observation_hint`を返す。

### 3.2 POST `/api/system19/execute`

request:

```json
{
  "input": {
    "sentence": "赤い 商品 は 売り切れた 。 それ を 顧客 が 予約 した",
    "focus_token_index": 5
  }
}
```

処理結果を共通実行応答へ格納し、JSON保存完了後に返す。

### 3.3 GET `/api/system19/runs`

JSONから読み戻したものを含む直近20件の実行履歴を新しい順で返す。

## 4. 入力と検証

| 項目 | 型 | 条件 |
|---|---|---|
| `sentence` | string | 空文字不可。空白区切りがある場合は空白で分割し、ない場合は簡易Tokenizerで分割する |
| `focus_token_index` | integer | 範囲外は0から単語数-1の範囲へ補正する |

空の文章は`system19_input_invalid`としてHTTP 400を返す。

## 5. 疑似関係値

- 各組合せの基準値を単語間距離`1 / (1 + distance)`で求める。
- 同じ単語には0.2を加算する。
- 修飾語と直後の語、指示語と前にある参照候補へ定義済みの値を加算する。
- 全単語の組合せを二重ループで一件ずつ順番に計算する。
- `relation_reasons`へ加算対象、理由、加算値を記録する。
- `score_note`へ実際のTransformer Attentionではないことを記録する。

## 6. 出力

| 項目 | 内容 |
|---|---|
| `tokens` | 分割した単語の配列 |
| `attention_matrix` | 単語数と同じ行数・列数を持つ疑似関係行列 |
| `focus_token_index` | 補正後の注目位置 |
| `focus_relations` | 注目単語から各単語への関係値 |
| `relation_reasons` | 指示語・修飾語の加算理由 |
| `score_note` | 疑似スコアの制約 |
| `saved` | JSON保存の成否 |
| `storage_status` | 画面へ表示する保存状態 |

## 7. 保存

| 項目 | 設計 |
|---|---|
| 保存先 | `data/ai_learning/system19_runs.json` |
| 文字コード | UTF-8 |
| 保存件数 | 新しい順で直近20件 |
| 保存内容 | 入力、関係行列、注目位置、加算理由、観察内容、作成日時を含む共通実行応答 |
| 更新方法 | 一時ファイルへ書いた後に対象JSONへ置き換える |
| 読戻し | `LearningSystemService`初期化時に既存JSONを読み込む |

- Dockerでは`src/backend/data`をホスト側からマウントし、コンテナ再作成後も履歴を保持する。
- 破損JSONは正常履歴として扱わず、起動時に明示的なエラーとする。

## 8. 画面

| 領域 | 表示・操作 |
|---|---|
| 実験条件 | `sentence`と`focus_token_index`をJSONで編集する |
| 実行結果 | 分割単語、補正後の注目位置、保存状態を表示する |
| 関係行列 | 行見出しと列見出しを単語に対応させて表で表示する |
| 実行履歴 | 保存済みの実行結果を選択して再表示する |

## 9. Docker・試験

| 確認 | コマンド・方法 | 期待結果 |
|---|---|---|
| Backend test | `docker compose run --rm backend-test python -m pytest -p asyncio -q tests/systems/test_ai_learning_systems.py -k system19` | 注目位置補正、指示語・修飾語の関係、JSON保存・読戻しが成功する |
| Demo | `rtk python src\scripts\system19_demo.py` | 既定入力の実行結果をJSONで表示する |
| API | metadata、execute、runsを順に確認する | 入力、結果、保存履歴を取得できる |
| Browser | `/system19`を開く | 入力、行列、保存状態、履歴を確認できる |

- system19はLM Studioを使用しない。
- コマンドは`C:\work\work20260617\category\StudyAI`で実行する。

## 10. 受入条件

- 文章を分割し、単語数と同じ大きさの正方行列を返す。
- 注目位置を変更して関係値を比較できる。
- 指示語と先行語、修飾語と直後の語の加算理由を確認できる。
- 疑似スコアと実際のAttentionの違いを説明できる。
- 入力と結果をJSONへ保存し、バックエンド再起動後に同じ履歴を読み戻せる。
- 画面からAPIへ入力を送信し、ブラウザ内だけで処理を完結させない。

## 11. 製造対象

- `src/backend/src/studyai/systems/ai_learning/catalog.py`
- `src/backend/src/studyai/systems/ai_learning/service.py`
- `src/backend/src/studyai/systems/ai_learning/router.py`
- `src/backend/src/studyai/common/config/settings.py`
- `src/frontend/src/pages/SystemLearningPage.tsx`
- `src/scripts/system19_demo.py`
- `src/backend/tests/systems/test_ai_learning_systems.py`
