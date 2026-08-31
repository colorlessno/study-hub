# devops03 詳細設計

## API test

## 1. 実装配置

```text
category/StudyDevOps/src/apps/devops03_api_test/
  package.json
  package-lock.json
  app/package.json
  app/package-lock.json
  app/server.js
  tests/api.test.js
  docker-compose.yml
```

## 2. API設計

| method | path | response |
|---|---|---|
| GET | `/health` | `{ "status": "ok" }` |
| GET | `/items` | `{ "items": [] }` |
| POST | `/items` | `{ "id": "item-1", "name": "..." }` |
| GET | `/missing` | 404 error |

`POST /items`は64 KiBを上限とし、不正JSONには`invalid_json`、`name`不足には`name_required`を返す。

## 3. test case

| case | 確認 |
|---|---|
| health smoke | status 200 / `status=ok` |
| create item | status 201 / `id`, `name` |
| validation error | status 400 |
| malformed JSON | status 400 / process継続 |
| oversized body | status 413 / process継続 |
| not found | status 404 |

## 4. compose設計

```yaml
services:
  api:
    build: ./app
    ports:
      - "18083:8080"
  test:
    build: .
    depends_on:
      - api
    environment:
      API_BASE_URL: http://api:8080
```

## 5. 検証コマンド

```powershell
docker compose --parallel 1 -f category/StudyDevOps/src/apps/devops03_api_test/docker-compose.yml build api test
docker compose -f category/StudyDevOps/src/apps/devops03_api_test/docker-compose.yml up --abort-on-container-exit --exit-code-from test
curl http://localhost:18083/health
```

CI では compose 起動、API test、失敗時 logs 取得を別 step として扱う。

## 6. 安全性

- secrets は使わない。
- API request / response に password、token、個人情報を含めない。
- テキストファイルは UTF-8 BOMなしで保存する。
