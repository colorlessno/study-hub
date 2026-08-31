# web15 APIエラーの返し方

NestJS標準の例外クラスを使い、200、400、404、500のレスポンスを比較するテーマです。

## このテーマでできるようになること

- 正常・入力誤り・対象なし・内部エラーを呼び、200・400・404・500を確認できる
- 各HTTP状態番号と、返されるエラー内容の対応を確認できる
- APIが返すHTTPエラーと、APIへ接続できない通信エラーの違いを確認できる
- 正常応答と各エラー応答を作るソースの違いを確認できる

## 最初に取り組むこと

次の順番で確認する。

1. StudyHubでAPIを起動し、200、400、404、500の操作を順に実行して応答を比較する。
2. 400と404のメッセージから、入力を直す場合と対象を選び直す場合を区別する。
3. 500の応答とサーバー側の例外を比較し、内部情報を応答へそのまま出さない理由を確認する。
4. ControllerとServiceのソースを見比べ、正常応答と各エラー応答の作り方を確認する。

## 起動方法

StudyHubでは「起動」を押し、4種類の操作を順に選んで「実行する」を押します。

単体で確認する場合は、実装ディレクトリで実行します。

```bat
rtk npm.cmd ci
rtk npm.cmd run start:dev
```

3000番をweb13・14等が使っている場合は先に停止します。

## 確認コマンド

```bat
curl.exe -i http://localhost:3000/status/ok
curl.exe -i http://localhost:3000/status/bad-request
curl.exe -i http://localhost:3000/status/not-found
curl.exe -i http://localhost:3000/status/server-error
```

## 比較表

| パス | status | 実装 |
|---|---:|---|
| `/status/ok` | 200 | Serviceのobjectを返す |
| `/status/bad-request` | 400 | `BadRequestException` |
| `/status/not-found` | 404 | `NotFoundException` |
| `/status/server-error` | 500 | `InternalServerErrorException` |

## 自分の言葉で説明する

- 400、404、500をそれぞれ1つの利用場面で説明する。
- 明示的な`NotFoundException`と未定義ルートの404の違いを説明する。
- HTTP状態番号だけでなく応答本文も確認する理由を説明する。

## うまく動かないとき

- 接続できない場合は、APIプロセスと3000番ポートを確認します。
- すべて404の場合は、`/status`を含む完全なパスを確認します。
- bodyが見えない場合は、curlへ`-i`を付けてheaderとbodyを確認します。
