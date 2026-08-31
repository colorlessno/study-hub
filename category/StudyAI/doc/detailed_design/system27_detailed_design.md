# System 27 詳細設計

## 画像サイズとVLM精度比較

## ファイル構成

```text
src/backend/src/studyai/common/ai/
  models.py
  vlm_client.py
src/backend/src/studyai/common/config/settings.py
src/backend/src/studyai/systems/ai_learning/
  catalog.py
  service.py
  router.py
src/frontend/src/pages/SystemLearningPage.tsx
src/backend/tests/systems/test_ai_learning_systems.py
scripts/validate-ai-learning.py
data/ai_learning/system27_runs.json
```

system27はsystem17からsystem36までの共通実装へ組み込む。既存のsystem01からsystem16の個別画面とAPIには影響を与えない。

## カタログ定義

`catalog.py` のsystem27は、既定動作を `mode: mock` とする。既定入力にはモデル名、画像読取指示、元画像の見出しと本文、3件の画像変換条件、確認する要点、画像別の模擬回答、学習メモを持たせる。

画面のサンプル選択には次の2件を表示する。

| ID | 表示 | 動作 |
|---|---|---|
| `mock` | 明示的なモックで画面と評価手順を確認 | VLM通信を行わない |
| `model` | LM StudioのVLMへ実画像を送信 | OpenAI互換APIへ通信する |

## 入力検証

`LearningSystemService._vlm_conditions()` で次を検証する。

| 項目 | 規則 |
|---|---|
| `mode` | `model`または`mock` |
| `model` | model時は空文字不可 |
| `task_prompt` | 空文字不可 |
| `sample_image.title` | 空文字不可 |
| `sample_image.lines` | 空でない文字列を1件以上 |
| `image_variants` | 2件以上6件以下 |
| `image_variants.id` | 空文字不可、重複不可 |
| `width` | 160以上1600以下 |
| `jpeg_quality` | 20以上100以下 |
| `expected_points` | 空でない文字列を1件以上 |
| `mock_responses` | mock時は全画像IDの回答が必要 |

検証エラーは `ValueError` とし、ルーターがHTTP 400の `system27_input_invalid` に変換する。

## 画像生成と変換

`_prepare_vlm_image()` はPillowで1280×720のRGB画像を生成する。背景上に見出し、区切り線、複数行の文字を描画し、全条件の元画像を同一にする。

各画像条件について次の処理を行う。

1. 元画像の縦横比を維持して指定横幅へLANCZOSで縮小する。
2. 指定したJPEG品質でメモリ上のJPEGへ保存する。
3. バイト数を取得する。
4. OpenAI互換APIへ送れる `data:image/jpeg;base64,...` 形式へ変換する。

結果には横幅、高さ、JPEG品質、バイト数、画像データURLを残す。

## model実行

`execute_async()` は `category: vlm` かつ `mode: model` の場合に `_vlm_async()` を呼ぶ。同期入口でmodelを指定した場合は、外部通信を伴うことを示すエラーにする。

`_vlm_async()` は各画像を `VLMClient.extract_json_with_metadata()` へ1件ずつ渡す。VLMへは次のJSON形式を要求する。

```json
{
  "answer": "画像を根拠にした日本語回答",
  "observed_points": ["読み取れた要点"],
  "omissions": ["読み取れなかった可能性がある要点"]
}
```

`VLMClient` は入力の `model` をOpenAI互換 `/chat/completions` へ渡し、応答モデル名、入力トークン数、出力トークン数を返す。画像はuserメッセージの `image_url` として送信する。通信失敗や不正JSON時にmockへ切り替えない。

## mock実行

`execute_async()`で`mode: model`を指定すると、`image_variants`を入力順に一件ずつ処理する。画像を変換してVLM応答を`await`し、結果へ追加した後にだけ次の画像へ進む。同時送信や並列処理は行わない。`execute()`または`execute_async()`で`mode: mock`を指定すると`_vlm()`を呼ぶ。画像生成と変換はmodelと同じ処理を行うが、VLMへは通信しない。回答は`mock_responses`から画像ID別に取得し、応答モデル名を「明示的なモック」とする。

## 採点と推奨候補

`_vlm_variant_result()` は、回答、`observed_points`、`omissions` を結合した文字列へ期待語句が含まれるかを大文字小文字を区別せず照合する。

```text
要点網羅率 = 確認できた期待語句数 ÷ 全期待語句数
読み落とし数 = 全期待語句数 - 確認できた期待語句数
```

画像ごとに確認できた要点と読み落としを配列で返す。`_vlm_result()` は要点網羅率が最高の画像を抽出し、その中でデータ量が最小の画像を推奨候補にする。推奨は教材用の一次判断であり、実運用の採用決定ではない。

## API

### GET `/api/system27/metadata`

system ID、タイトル、カテゴリ、既定入力、観察項目、サンプルを返す。

### POST `/api/system27/execute`

```json
{
  "input": {
    "mode": "mock"
  }
}
```

共通の実行記録に `run_id`、入力、結果、観察項目、UTC作成日時を含める。結果には比較方法、固定条件、画像別結果、推奨候補、学習メモ、注意、保存状態を含める。

### GET `/api/system27/runs`

保存済み実行履歴を新しい順に最大20件返す。

## 保存処理

設定 `system27_run_file` の既定値は `./data/ai_learning/system27_runs.json` とする。実行結果を先頭に追加し、20件を超えた履歴を除外する。保存時は同じ場所へ一時ファイルを書き、置き換える。読込時に配列以外または要素がオブジェクト以外なら起動エラーにする。

画像データURLも実行結果に含まれる。教材の組み込み画像以外を扱う拡張時は、個人情報や機密情報を保存しない入力制御を別途設計する。

## 画面表示

`SystemLearningPage.tsx` は次を表示する。

- 比較方法、指定モデル、推奨サイズ、保存状態
- 固定した指示と確認要点
- 画像条件ごとの実画像、縦横サイズ、JPEG品質、データ量、回答、網羅率、読み落とし
- 全条件を比較する表
- 推奨理由、学習メモ、確認上の注意

画像カードは可変列のグリッドとし、狭い画面では1列へ折り返す。比較表だけ横スクロールを許可し、画面全体に横スクロールを発生させない。

## テスト

| テスト | 確認内容 |
|---|---|
| 明示的mock | 3種類のJPEGを生成し、回答差から網羅率と読み落としを算出する |
| VLMクライアント差し替え | 各画像を指定モデルへ送信し、応答と計測値を比較結果へ入れる |
| 永続保存 | JSONへ保存し、新しいサービスインスタンスで履歴を復元する |
| 不正入力 | 一部画像のmock回答がない場合に拒否する |
| オフライン検証 | mockを明示し、画像生成、採点、推奨条件を検証する |

対象テストは `src/backend/tests/systems/test_ai_learning_systems.py` のsystem27テストと `scripts/validate-ai-learning.py system27` とする。

## 実環境確認

1. StudyAIのbackend、frontendをDockerで起動する。
2. mockを実行し、画像変換、表示、採点、保存を確認する。
3. LM Studioの `/v1/models` で画像入力対応モデルがロード済みか確認する。
4. 対応モデルがある場合だけmodelへ切り替え、3件の画像送信と回答差を確認する。
5. VLMが未ロードの場合は未実施理由を記録し、生成用LLMをVLMとして代用しない。

## 完成判定

- 画像を使わない横幅だけの推定点を廃止している。
- modelとmockの処理、表示、文書が明確に分かれている。
- modelが同一画像の各変換結果を実際にVLMへ送信する。
- 画像、回答、読み落とし、要点網羅率、推奨候補を画面で確認できる。
- 実行結果がUTF-8 JSONへ保存され、履歴を復元できる。
