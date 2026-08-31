# web35 HTTPステータスの設計

正常、作成、入力不備、未認証、権限不足、対象なし、競合、サーバーエラーを返す小さなAPIを使い、HTTP状態番号をAPIの応答規則として読み分ける。

## このテーマでできるようになること

- 8種類のAPI操作を実行し、HTTP状態番号と応答本文を比較できる
- 401は未認証、403は権限不足、404は対象なし、409は状態の競合を表すことを確認できる
- 400・401・403・404・409・500で、`error.code`と`error.message`の形式が共通していることを確認できる
- `POST /items`でメモリ上の一覧へ登録し、再取得で追加結果を確認できる
- 空入力は400、同じ名前の再登録は409となり、要求形式と現在状態の違いを確認できる
- `/error`で発生した内部例外が500の共通形式へ変換され、内部情報を応答へ出さないことを確認できる

## 起動方法

StudyHubでは「起動」を押した後、8種類の要求操作を選んで実行する。単体で起動する場合は、コマンドプロンプトで次を実行する。

```bat
cd /d C:\work\work20260617\category\StudyWeb\src\backend\src\studyweb\systems\web35_http_status_design
rtk npm.cmd start
```

別のターミナルで API を確認する。終了は `Ctrl+C`。

```bat
curl.exe -i http://localhost:3035/items
curl.exe -i -X POST http://localhost:3035/items -H "Content-Type: application/json" -d "{\"name\":\"two\"}"
curl.exe -i http://localhost:3035/private
curl.exe -i http://localhost:3035/admin
```

全APIの対応は[HTTP状態番号の対応表](docs/status_code_matrix.md)、短いコマンド集は[curlでの確認例](docs/curl_examples.md)で確認できる。

## 最初に取り組むこと

StudyHubの要求操作または`curl.exe -i`で各URLを呼び、HTTP状態番号、`error.code`、`error.message`を比較する。

| 意図 | 呼び出し | 期待するstatus |
|---|---|---:|
| 一覧取得 | `GET /items` | 200 |
| 新規作成 | `POST /items`へ`name`を送信 | 201 |
| 入力不備 | `POST /items`へ空のJSONを送信 | 400 |
| 未認証 | `GET /private` | 401 |
| 権限不足 | `GET /admin` | 403 |
| 対象なし | `GET /items/999` | 404 |
| 競合 | `POST /items`へ登録済みの`name`を再送信 | 409 |
| 内部エラー | `GET /error` | 500 |

例:

```bat
curl.exe -i -X POST http://localhost:3035/items -H "Content-Type: application/json" -d "{}"
curl.exe -i http://localhost:3035/items/999
curl.exe -i -X POST http://localhost:3035/items -H "Content-Type: application/json" -d "{\"name\":\"two\"}"
curl.exe -i http://localhost:3035/error
```

## 観察ポイント

- 401 は「認証されていない」、403 は「誰かは分かるが許可されていない」を表す
- 404はURLに対応する処理がない場合と、処理はあるが対象データがない場合の両方で使われることがある
- 409は、要求の形式ではなく現在のデータ状態と操作が競合する場合に使う
- `error.code` はプログラムが分岐しやすい安定した値、`message` は人が理解する補足として扱える
- `/error` は確認用の内部例外を発生させるが、responseには固定した`INTERNAL_ERROR`だけを返し、例外メッセージやstack traceを出さない
- `POST /items`の登録結果はサーバープロセス内だけに保存され、再起動すると初期データへ戻る

## 自分の言葉で説明する

- 200 と 201 は何が違うか
- 401 と 403 を入れ替えると、利用者やクライアントにどんな誤解を与えるか
- 404 と 409 は、対象の存在と状態をどう表しているか
- 500 body に例外メッセージやスタックトレースをそのまま出してはいけない理由は何か

## うまく動かないとき

- 起動確認が終わらない場合は、3035番またはStudyHub用の43335番が別のプロセスに使われていないか確認する。
- StudyHubの「実行する」が使えない場合は、「起動」と「状態を更新」を順に押す。
- 409にならない場合は、直前の登録と同じ項目名を送っているか確認する。
