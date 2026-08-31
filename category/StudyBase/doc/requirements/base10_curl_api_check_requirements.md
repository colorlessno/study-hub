# base10 curlによるAPI確認 要件定義

## 1. 目的

ブラウザやフロントエンドに依存せず、`curl` で API の疎通、HTTPメソッド、ヘッダー、リクエストボディ、ステータスコード、レスポンスを確認できるようにする。

## 2. 学習対象

- `curl` の基本
- GET / POST / PUT / PATCH / DELETE
- request header
- JSON request body
- status code
- response header / body
- APIエラーの切り分け

## 3. 作成する成果物

- curl練習用API
- curlコマンド集
- API確認手順
- 成功・失敗レスポンス例
- フロントエンド問題とAPI問題の切り分けメモ

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | GET API を curl で確認できる |
| FR-02 | JSON body を付けて POST API を確認できる |
| FR-03 | request header を指定できる |
| FR-04 | response status と body を確認できる |
| FR-05 | 400 / 401 / 403 / 404 / 405 / 413 / 415 / 500 / 502 の違いを確認できる |
| FR-06 | フロントエンドを使わず API 単体の問題を切り分けられる |
| FR-07 | 状態コード、応答ヘッダー、応答本文を同じ実行結果で確認できる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | Windowsのコマンドプロンプトで実行できるコマンド例にする |
| NFR-02 | ホストで直接実行するときはサンプルAPIをIPv4ループバック`127.0.0.1`だけで起動する。コンテナ内では`HOST=0.0.0.0`を明示し、公開先は起動側でローカルホストへ制限する |
| NFR-03 | 認証付きAPIやCORS学習へ接続できる構成にする |

## 6. 対象外

- 高度な負荷試験
- APIテストフレームワーク導入
- Postman / Insomnia の使い方
- CI/CD 上のAPIテスト

## 7. 受入条件

- curl で GET / POST を確認できる
- header、body、status code、response body を説明できる
- フロントエンドの不具合か API の不具合かを切り分けられる
- 失敗時のコマンドとレスポンスを学習メモに残せる

## 8. 学習観点

- API確認はブラウザ画面だけに依存しない
- status code と response body をセットで見る
- curl の実行ログは障害調査や質問に使える
