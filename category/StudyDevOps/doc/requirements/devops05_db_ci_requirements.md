# devops05 要件定義

## DB付きCI

## 1. 目的

PostgreSQL などの DB を含む CI / ローカルテストを構成し、migration、seed、API test を一連で確認する方法を学ぶ。

## 2. 学習対象

- Docker Compose による DB 起動
- migration と seed の順序
- DB 接続待機
- test database の初期化
- CI service container の考え方

## 3. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | DB service を含む `docker-compose.yml` を用意する |
| FR-02 | migration または schema 初期化 script を用意する |
| FR-03 | seed data を投入する script を用意する |
| FR-04 | DB を使う API または repository test を用意する |
| FR-05 | DB 起動待機と失敗時のログ確認手順を記載する |

## 4. 非機能要件

- ローカルで再実行してもデータが壊れないよう test database を前提にする。
- 本番DB、個人情報、秘密情報は使わない。
- 作成するテキストファイルは UTF-8 BOMなしとする。

## 5. 対象外

- 本番 migration 運用
- backup / restore の本格運用
- 大規模データ性能試験

## 6. 成果物

```text
category/StudyDevOps/
  src/apps/devops05_db_ci/
    db/
    tests/
    docker-compose.yml
  doc/learning_notes/devops05_db_ci/
    README.md
  doc/requirements/devops05_db_ci_requirements.md
```

## 7. 受入条件

- Docker Compose で DB と test 対象を起動できる。
- migration、seed、test の順序を説明できる。
- DB 接続失敗時に service logs を確認できる。
