# aws08 API Gateway + Lambda 詳細設計

## 0. 関連文書

- `../requirements/aws08_api_gateway_lambda_requirements.md`
- `../basic_design/aws08_basic_design.md`

## 1. 製造対象

```text
doc/learning_notes/aws08_api_gateway_lambda/
  README.md
  docs/
src/backend/src/studyaws/systems/aws08_api_gateway_lambda/
  package.json
  Dockerfile or docker-compose.yml where applicable
  app/ api/ web/ src/ scripts/ events/ data/ storage as required by the local sample
src/infra/aws08_api_gateway_lambda/
  template.yaml where applicable
```

## 2. 実装詳細

- `handler.js`は`GET /items`、`GET /items/{id}`、`POST /items`を処理する。
- `local_api.js`はNode標準HTTPサーバーでHTTPリクエストを受け、method、raw path、path parameter、query string、bodyをLambda event形式に変換する。
- 未登録routeと存在しないitemは404、JSON不正とname不足は400を返す。
- `template.yaml`はSAM CLIの`sam local start-api`向け参考定義として置く。
## 3. 実行コマンド
```cmd
rtk node scripts\local_api.js
sam local start-api
```

`sam local start-api`はSAM CLIがある場合だけ実行する。
## 4. 確認手順
1. ローカルAPIを起動する。
2. `GET /items`で一覧を取得する。
3. `GET /items/item-1?include=source`でpath parameterとquery stringの変換結果を確認する。
4. `POST /items`でダミーitemを作成する。
5. name不足と壊れたJSONが400になることを確認する。
6. 未登録routeが404になることを確認する。
## 5. 実AWS発展課題
API Gateway HTTP API + Lambdaを実AWSにデプロイする。CORS、認証、ログ、削除、課金注意を確認する。
## 6. 完了条件

- HTTPリクエストとLambda eventの対応を説明できる。
- Lambda responseとHTTPレスポンスの対応を説明できる。
- SAM CLIなしでもローカルAPIを確認できる。
