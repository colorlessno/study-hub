# devops07 基本設計

## health check endpoint

## 1. 設計目的

`/health` と `/ready` を分け、process alive と dependency ready の違い、Docker healthcheck、smoke test の使い方を学べる教材にする。

## 2. 配置方針

```text
category/StudyDevOps/
  src/apps/devops07_health_check_endpoint/
    app/
      server.js
      package.json
      package-lock.json
    tests/
      health.test.js
    docker-compose.yml
```

- `/health` は process alive を返す。
- `/ready` は dependency 状態を返す。
- ローカル起動は`127.0.0.1`、Dockerfileからの起動はcontainer外から到達できる`0.0.0.0`へbindする。
- 作成・更新するテキストファイルは UTF-8 BOMなしとする。

## 3. 全体フロー

```text
container start -> /health -> dependency check -> /ready -> Docker health status -> smoke test
```

## 4. コンポーネント

| コンポーネント | 役割 |
|---|---|
| `server.js` | `/health`, `/ready`, failure toggle を提供する |
| `health.test.js` | health / ready の response を確認する |
| `docker-compose.yml` | app と healthcheck を定義する |
| `README.md` | health と ready の違いを説明する |

## 5. Docker / CI 方針

- Compose healthcheck で `/health` を確認する。
- smoke test では `/ready` も確認する。
- 共通CI workflowはhealth、ready、依存障害、復旧を一件ずつ順番に自動テストする。
- response に secret や詳細すぎる内部情報を出さない。
- secrets は health / ready response に含めない。

## 6. 後続工程への引き継ぎ

詳細設計では、response schema、failure toggle、healthcheck command、CI smoke command を定義する。
