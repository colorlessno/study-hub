# web42 APIのページ分割・並べ替え・絞り込み

30件の固定データを返すAPIへ、StudyHubのフロント接続例から検索条件を実際に送り、絞り込み・並べ替え・ページ分割の結果を確認するテーマです。

## このテーマでできるようになること

- StudyHubの入力欄から検索語、状態、並べ替え、取得件数、開始位置を実APIへ指定できる
- 正常な検索と不正な検索条件の状態コードを確認できる
- 応答の`meta`から全件数、取得件数、開始位置、現在ページ、総ページ数、前後ページの有無を読み取れる
- 絞り込み、並べ替え、ページ分割の処理順を実ソースから確認できる

## 最初に取り組むこと

1. StudyHubでAPIを起動する。
2. 「絞り込み・並べ替え・ページング」を選び、検索語や取得件数を空欄のまま実行し、既定条件がAPIへ適用されることを確認する。
3. 検索語に`Item 1`、状態に`open`、並べ替える項目に`createdAt`、並び順に`desc`、取得件数に`5`、開始位置に`0`を入力して実行する。
4. 応答の`items`と`meta.total`・`meta.limit`・`meta.offset`・`meta.page`・`meta.totalPages`・`meta.hasPrevious`・`meta.hasNext`を確認する。
5. 「不正な取得件数」「不正な並べ替え項目」「許可されていない操作」を実行し、400と405を確認する。
6. 「絞り込み・並べ替え・ページ分割処理」を開き、処理の順番を確認する。

## 検索条件

| 入力 | 動作 |
|---|---|
| 検索語 | 名前の部分一致。大文字と小文字を区別しない |
| 状態 | `open`または`closed` |
| 並べ替える項目 | `name`、`status`、`createdAt` |
| 並び順 | `asc`または`desc` |
| 取得件数 | 1～50。既定値は10 |
| 開始位置 | 0以上。既定値は0 |

検索条件で絞り込んだ後に並べ替え、最後に開始位置から取得件数分を切り出します。`meta.total`はページ分割前の件数なので、`items.length`と一致しない場合があります。`meta.returned`は今回返した件数、`meta.page`と`meta.totalPages`は現在ページと総ページ数、`meta.hasPrevious`と`meta.hasNext`は前後ページの有無を表します。

StudyHubは空欄をquery parameterへ追加せず、値を入力した項目だけをURLへ変換してAPIへ送信します。これが要件にあるフロント接続例であり、画面内だけの疑似結果ではありません。

## 手動で起動する場合

```bat
cd /d category\StudyWeb\src\backend\src\studyweb\systems\web42_pagination_sort_filter_api
rtk npm.cmd run build
rtk npm.cmd test
rtk npm.cmd start
```

起動後は`http://127.0.0.1:3042/items`を呼び出します。終了するときは`Ctrl+C`を押します。

## うまく動かないとき

- 400の場合は、入力した状態、並べ替える項目、並び順、取得件数、開始位置を確認する。
- 405の場合は、GET以外の操作を選んでいないか確認する。
- 結果件数が想定と違う場合は、`meta.total`と`items.length`を分けて確認する。
