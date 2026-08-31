# aws08 API Gateway + Lambda 要件定義

## 1. 目的

LambdaをHTTP APIとして公開する構成を、ローカルAPI起動で疑似体験する。

## 2. 学習対象

- API Gateway HTTP API / REST APIの入口
- route、method、path parameter、query string
- Lambda proxy integration
- statusCode、headers、body
- AWS SAM CLIの`sam local start-api`

## 3. 要件

- ローカルでは`sam local start-api`または小型HTTPサーバーでAPI Gateway相当を再現する。
- GETとPOSTの最小APIを用意し、Lambda handlerにイベントを渡す。
- エラー時のHTTP statusを明確に返す。
- 実AWS公開は発展課題として、認証、CORS、ログ、削除、課金注意を分ける。

## 4. 成果物

- API route一覧
- Lambda proxy event / response仕様
- ローカルAPI実行手順
- 実AWS公開時の注意事項

## 5. 完了条件

- HTTPリクエストがLambda eventに変換される流れを説明できる。
- Lambda responseがHTTPレスポンスになる流れを説明できる。
- ローカルでAPI Gateway + Lambda相当の動きを確認できる。
