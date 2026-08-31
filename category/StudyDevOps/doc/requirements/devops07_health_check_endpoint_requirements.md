# devops07 要件定義

## health check endpoint

## 1. 目的

アプリの死活監視、依存先確認、Docker healthcheck の基本を学び、起動しているだけではなく使える状態かを確認する入口を作る。

## 2. 学習対象

- `/health` と `/ready` の違い
- process alive と dependency ready の違い
- Docker healthcheck
- CI / smoke test での health endpoint 利用
- 障害時の確認順序

## 3. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | `/health` endpoint を用意する |
| FR-02 | `/ready` endpoint で依存先状態を返す |
| FR-03 | dependency failure を疑似再現できる設定を用意する |
| FR-04 | Dockerfile または compose に healthcheck を定義する |
| FR-05 | smoke test で health endpoint を確認する |

## 4. 非機能要件

- health response に秘密情報を含めない。
- ready check は重すぎる処理にしない。
- 作成するテキストファイルは UTF-8 BOMなしとする。

## 5. 対象外

- Kubernetes liveness / readiness の本格設計
- 監視アラート設計
- SLA / SLO の詳細設計

## 6. 成果物

```text
category/StudyDevOps/
  src/apps/devops07_health_check_endpoint/
    app/
      package-lock.json
    tests/
    docker-compose.yml
  doc/requirements/devops07_health_check_endpoint_requirements.md
```

## 7. 受入条件

- `/health` と `/ready` の役割を説明できる。
- Docker healthcheck の状態を確認できる。
- dependency failure 時に ready が失敗することを確認できる。
