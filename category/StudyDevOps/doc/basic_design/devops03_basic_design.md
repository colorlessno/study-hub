# devops03 基本設計

## API test

## 1. 設計目的

API server と test runner を分け、health、正常系、異常系、response schema を自動確認する教材にする。

## 2. 配置方針

```text
category/StudyDevOps/
  src/apps/devops03_api_test/
    app/
      server.js
      package.json
    tests/
      api.test.js
    docker-compose.yml
  doc/learning_notes/devops03_api_test/
    README.md
```

- API は外部DBなしの最小 HTTP server とする。
- test runner は API server に HTTP request を投げる。
- 作成・更新するテキストファイルは UTF-8 BOMなしとする。

## 3. 全体フロー

```text
api start -> health smoke -> normal request -> error request -> schema assertion
```

## 4. コンポーネント

| コンポーネント | 役割 |
|---|---|
| `app/server.js` | `/health`, `/items`, `/items/:id` を提供する |
| `tests/api.test.js` | HTTP status と response schema を検証する |
| `docker-compose.yml` | api と test runner を起動する |
| `doc/learning_notes/.../README.md` | API操作、自動テスト、失敗時ログの対応を説明する |

## 5. Docker / CI 方針

- Docker Compose で `api` と `test` service を定義する。
- test service は api の health を待ってから実行する。
- CI では compose up / test / logs 確認の流れを想定する。
- secrets は使わず、API test の入力にも token も password も含めない。

## 6. 後続工程への引き継ぎ

詳細設計では、endpoint schema、test case、compose service、health wait、検証コマンドを定義する。
