# system20 詳細設計

## 1. 目的

system20は、長い文章の先頭・中央・末尾へ重要情報を置き、入力上限によって残る文章と上限外になる文章を比較する教材である。指定した重要語句が上限内へ完全に残ったかを基準に回答可否を判定し、文章の分割、必要部分の検索、要約を検討する条件を確認できるようにする。

このテーマでは実際のLLMによる回答生成は行わない。学習用の簡易分割で入力上限を再現し、モデル固有のトークン分割や回答品質とは区別して表示する。

## 2. ファイル構成

```text
src/backend/src/studyai/systems/ai_learning/
  catalog.py
  service.py
  router.py
src/backend/src/studyai/common/config/settings.py
src/frontend/src/pages/SystemLearningPage.tsx
src/scripts/system20_demo.py
src/backend/tests/systems/test_ai_learning_systems.py
data/ai_learning/system20_runs.json
```

| ファイル | 役割 |
|---|---|
| `catalog.py` | 既定入力と、短文、重要情報が先頭・中央・末尾にある入力例を定義する |
| `service.py` | 入力検証、簡易分割、回答可否判定、実行履歴の保存と読戻しを行う |
| `router.py` | メタデータ取得、実行、実行履歴取得のAPIを提供する |
| `settings.py` | system20の保存先を定義する |
| `SystemLearningPage.tsx` | 入力例、実験条件、比較結果、実行履歴を表示する |
| `system20_demo.py` | 共有サービスを使って既定入力を実行するCLI入口を提供する |
| `test_ai_learning_systems.py` | 位置別比較、日本語文章の境界、永続保存、入力エラーを検証する |

## 3. 入力データ

| 項目 | 型 | 必須 | 内容 |
|---|---|---|---|
| `text` | string | 必須 | 入力上限を確認する文章 |
| `context_limit` | integer | 必須 | 学習用の簡易分割に適用する上限。1以上を指定する |
| `important_marker` | string | 必須 | 回答に必要な重要語句。`text`内に同じ表記で含める |

カタログには次の入力例を持たせる。

| ID | 内容 |
|---|---|
| `short-baseline` | 全文と重要語句が上限内に収まる短い文章 |
| `important-first` | 長文の先頭に重要語句がある文章 |
| `important-middle` | 長文の中央に重要語句がある文章 |
| `important-last` | 長文の末尾に重要語句がある文章 |

## 4. API

### 4.1 メタデータ取得

`GET /api/system20/metadata`

次の情報を返す。

| 項目 | 内容 |
|---|---|
| `system_id` | `system20` |
| `title` | テーマ名 |
| `category` | `context` |
| `default_input` | 既定入力 |
| `observation_hint` | 画面へ表示する確認観点 |
| `samples` | 位置別の入力例4件 |

### 4.2 実行

`POST /api/system20/execute`

リクエストは`input`に入力データを格納する。

```json
{
  "input": {
    "text": "返金期限は7日です。確認してください。",
    "context_limit": 24,
    "important_marker": "返金期限は7日"
  }
}
```

正常時は、実行ID、入力、判定結果、実行日時を含む実行記録を返す。入力不正時はHTTP 400と`system20_input_invalid`を返す。

### 4.3 実行履歴取得

`GET /api/system20/runs`

保存済みのsystem20実行履歴を新しい順で返す。最大件数は20件とする。

## 5. 分割と判定処理

1. `text`、`context_limit`、`important_marker`を検証する。
2. 正規表現`[A-Za-z0-9_]+|[^\sA-Za-z0-9_]`で、英数字の連続部分と空白以外の1文字を学習用トークンとして抽出する。
3. `context_limit`までに含まれる最後のトークンの終了位置を、元の文章上の文字位置として求める。
4. 元の文章をその位置で`retained_text`と`discarded_text`へ分ける。
5. `important_marker`の末尾位置が上限内の終了位置以下なら、重要語句が完全に残ったと判定する。
6. 重要語句の中央位置を文章全体に対する比率で求め、3分の1未満を「先頭」、3分の2未満を「中央」、それ以外を「末尾」とする。
7. 上限外の文章がある場合は、分割、検索、要約を対策候補として返す。

日本語の文字間へ空白を追加した別文字列は作らず、上限内と上限外の表示には入力された元の文章を使用する。

## 6. 出力データ

| 項目 | 内容 |
|---|---|
| `estimated_tokens` | 学習用の推定トークン数 |
| `context_limit` | 実行時の入力上限 |
| `retained_token_count` | 上限内に入った推定トークン数 |
| `over_limit_token_count` | 上限外になった推定トークン数 |
| `truncated` | 上限外の文章が存在するか |
| `important_marker` | 確認対象の重要語句 |
| `important_position` | 重要情報の位置。先頭、中央、末尾 |
| `marker_retained` | 重要語句が上限内へ完全に残ったか |
| `answerable` | この入力だけで重要語句に基づく回答が可能か |
| `answer_result` | 回答可否の判定理由 |
| `retained_text` | 上限内に残った元の文章 |
| `discarded_text` | 上限外になった元の文章 |
| `missing_markers` | 上限内に残らなかった重要語句 |
| `mitigation_options` | 分割、検索、要約の対策候補 |
| `notes` | 簡易分割と判定範囲に関する注意事項 |
| `saved` | 永続保存先が設定されているか |
| `storage_status` | 保存状態の表示文 |

## 7. 実行履歴の保存

保存先の既定値は`data/ai_learning/system20_runs.json`とする。実行結果を先頭へ追加し、最新20件だけを保持する。

保存時は次の順で処理する。

1. 保存先の親フォルダーを作成する。
2. JSONをUTF-8で一時ファイルへ書き込む。
3. 一時ファイルを正式な保存ファイルへ置き換える。

サービス起動時は保存ファイルを読み込み、配列かつ各要素がJSONオブジェクトであることを検証してから実行履歴へ復元する。読込み不能または形式不正の場合は、対象ファイルを示した実行エラーとする。

Dockerでは`src/backend/data`をホスト側へ割り当てる既存ボリュームを使用する。コンテナを再起動または再作成しても、ホスト側のJSONが残っていれば履歴を読み戻せる。

## 8. 画面表示

画面はStudyAIの共通ページを使用し、system20では次を表示する。

- 短文と位置別3件の入力例
- 文章、入力上限、重要語句の編集欄
- 推定トークン数、入力上限、上限外の推定トークン数、重要情報の位置
- 回答可否と判定理由
- 失われた重要語句
- JSONへの保存状態
- 上限内に残った文章と上限外になった文章
- 分割、検索、要約の対策候補
- 簡易分割であることを示す注意事項
- 保存済み実行履歴

判定処理と保存処理はブラウザ内で行わず、必ずStudyAI APIへ送信する。

## 9. エラー処理

| 条件 | エラー |
|---|---|
| `text`が空 | `textを入力してください。` |
| `context_limit`が整数でない | `context_limitは1以上の整数で指定してください。` |
| `context_limit`が1未満 | `context_limitは1以上を指定してください。` |
| `important_marker`が空 | `important_markerを入力してください。` |
| `important_marker`が`text`内にない | `important_markerはtext内に含まれる語句を指定してください。` |
| 保存ファイルを読めない | 保存先を含む実行エラー |
| 保存ファイルが配列形式でない | 保存先を含む形式エラー |

## 10. 確認項目

- 短文では全文が上限内に残り、回答可能になる。
- 同じ入力上限で、重要情報が先頭、中央、末尾にある長文を比較できる。
- 上限外になった元の文章が文字化けや不要な空白なしで表示される。
- 重要語句が一部でも上限外になる場合は回答不可になる。
- 空入力、不正な上限、空または存在しない重要語句を拒否する。
- 実行結果がJSONへ保存され、サービス再起動後に同じ実行IDを読み戻せる。
- 画面に判定結果、保存状態、上限内と上限外の文章、対策候補が表示される。

## 11. 実行方法

StudyAIの既存Docker構成でバックエンドとフロントエンドを起動する。system20専用のサーバーは作らない。system20はローカルの規則で入力上限を再現するため、LM Studioや外部AI APIを必要としない。

