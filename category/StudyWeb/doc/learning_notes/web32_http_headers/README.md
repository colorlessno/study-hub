# web32 HTTPヘッダーの観察

Node.js 標準の `http` モジュールだけで作ったサーバーを使い、request / response、header、body、status code の関係をブラウザと `curl` の両方から観察する。

## このテーマでできるようになること

- GETとPOSTを実行し、要求方法・ヘッダー・本文・HTTP状態番号を確認できる
- 要求ヘッダーと応答ヘッダーを分け、`X-Client`・`Content-Type`・`X-Study-Request-Id`を確認できる
- 存在しないURLへの要求で、HTTP 404と`not_found`の応答本文を確認できる
- 教材画面とStudyHubの要求操作で表示される内容を比較できる
- 観察記録ひな形へ、確認した要求と応答の違いを記録できる

## 起動方法

StudyHubでは「起動」を押すと教材画面と要求操作を利用できる。単体で起動する場合は、コマンドプロンプトで次を実行する。

```bat
cd /d C:\work\work20260617\category\StudyWeb\src\backend\src\studyweb\systems\web32_http_headers
rtk npm.cmd start
```

起動後に `http://localhost:3032/` を開く。終了するときは、起動したターミナルで `Ctrl+C` を押す。

依存パッケージはなく、`npm install` は不要。構文だけ確認したい場合は次を実行する。

```bat
rtk npm.cmd run build
```

## 最初に取り組むこと

### 1. ブラウザで観察する

1. DevTools の Network タブを開く
2. 画面の `GET` を押し、`/api/hello` の Headers と Response を見る
3. 画面の `POST` を押し、`/api/echo` の Headers、Payload、Response を見る
4. response header の `X-Study-Request-Id` がリクエストごとに変わることを確認する

詳しい操作は [DevTools確認](docs/devtools_check.md) を参照する。

### 2. curlで同じAPIを呼ぶ

別のターミナルで次を実行する。

```bat
curl.exe -i http://localhost:3032/api/hello
curl.exe -i -X POST http://localhost:3032/api/echo -H "Content-Type: application/json" -d "{\"message\":\"hello\"}"
```

ブラウザが付ける header と `curl` が付ける header の違いを [観察ログ](docs/observation_log.md) に記録する。コマンドだけ見直したい場合は [curl確認](docs/curl_check.md) を使う。

## 観察ポイント

- `X-Client: browser` は GET ボタンの JavaScript が明示的に追加している
- `Content-Type` は「送ったデータの形式」を相手に伝える header である
- POST の body は文字列として読み取られ、このサンプルでは JSON として検証されない
- response body に request header を入れているのは観察用であり、本番 API の一般的な設計ではない
- 存在しない URL は 404 と `{ "error": "not_found" }` を返す

## 自分の言葉で説明する

- request header と response header は、誰が誰に送る情報か
- GET と POST で body の扱いがどう違うか
- DevTools と `curl` は、それぞれどんな調査に向くか
- status code と response body の両方を確認する理由は何か

## うまく動かないとき

- 起動できない場合は、別のテーマが3032番を使用していないか確認する。
- StudyHubの要求操作が使えない場合は、先に「起動」を押してから「状態を更新」を押す。
- `curl`の結果だけが異なる場合は、要求ヘッダーと送信先のポートを確認する。
