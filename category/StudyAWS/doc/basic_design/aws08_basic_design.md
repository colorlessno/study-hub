# aws08 API Gateway + Lambda 基本設計

## 0. 関連文書

- `../requirements/aws08_api_gateway_lambda_requirements.md`

## 1. 設計方針
HTTPリクエストがAPI Gatewayを通じてLambda eventへ変換される流れを、ローカルAPIで確認する。SAM CLIがある場合は`sam local start-api`、ない場合はNode HTTPサーバーで代替する。
## 2. ローカル学習方式
- GET `/items`、GET `/items/{id}`、POST `/items`を用意する。
- Lambda handlerはAPI Gateway proxy responseを返す。
- 代替HTTPサーバーはリクエストをevent形式へ変換してhandlerへ渡す。
## 3. 成果物構成

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

## 4. 設計内容

| 要素 | 内容 |
|---|---|
| route | `GET /items`, `GET /items/{id}`, `POST /items` |
| event | method、raw path、path parameter、query string、bodyを含める |
| response | statusCode、headers、bodyを返す |
| error | JSON不正とname不足は400、未登録routeとitem不足は404にする |

## 5. 実AWS発展課題
- API Gateway HTTP API + Lambdaを実AWSにデプロイする。
- CORS、認証、ログ、削除、課金注意を必ず確認する。
## 6. 完了条件

- HTTPリクエストとLambda eventの対応を説明できる。
- Lambda responseとHTTPレスポンスの対応を説明できる。
- ローカルAPIでGET/POSTを確認できる。
