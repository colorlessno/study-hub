# devops08 要件定義

## Docker logs調査

## 1. 目的

Docker コンテナで起きる起動失敗、環境変数不足、port conflict、runtime error を logs / ps / exec で調査する基本を学ぶ。

## 2. 学習対象

- `docker compose ps`
- `docker compose logs`
- `docker compose exec`
- exit code と restart の見方
- port / env / volume の切り分け方

## 3. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | 正常起動する compose サンプルを用意する |
| FR-02 | 環境変数不足で失敗するケースを用意する |
| FR-03 | port conflict の確認手順を記載する |
| FR-04 | logs から原因箇所を探す演習を用意する |
| FR-05 | 調査結果を記録するテンプレートを用意する |
| FR-06 | 起動失敗、runtime error、正常応答のシグナルを自動テストする |
| FR-07 | 正常応答と、安全な項目だけを返すcontainer内診断を画面から実行できる |
| FR-08 | port競合時にbind errorと使用中processを確認し、所有者未確認のprocessを停止しない手順を用意する |

## 4. 非機能要件

- 破壊的な Docker 操作を前提にしない。
- 秘密情報を logs に出さない。
- 作成するテキストファイルは UTF-8 BOMなしとする。

## 5. 対象外

- 本番コンテナ基盤の運用
- Kubernetes 調査
- Docker image の脆弱性診断

## 6. 成果物

```text
category/StudyDevOps/
  src/apps/devops08_docker_logs_investigation/
    app/
      package-lock.json
    tests/
    docker-compose.yml
    docs/investigation_template.md
    docs/port_conflict_guide.md
  doc/requirements/devops08_docker_logs_investigation_requirements.md
```

## 7. 受入条件

- 起動失敗時に `ps` と `logs` で状態を確認できる。
- env 不足、port conflict、runtime error の切り分けができる。
- 調査結果をテンプレートに記録できる。
