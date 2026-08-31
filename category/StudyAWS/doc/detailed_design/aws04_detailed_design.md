# aws04 RDS接続 詳細設計

## 0. 関連文書

- `../requirements/aws04_rds_connection_requirements.md`
- `../basic_design/aws04_basic_design.md`

## 1. 製造対象

```text
doc/learning_notes/aws04_rds_connection/
  README.md
  docs/
src/backend/src/studyaws/systems/aws04_rds_connection/
  package.json
  Dockerfile or docker-compose.yml where applicable
  app/ api/ web/ src/ scripts/ events/ data/ storage as required by the local sample
src/infra/aws04_rds_connection/
  template.yaml where applicable
```

## 2. 実装詳細

- Docker ComposeでPostgreSQLとNode.js接続appを構成する。
- `db_check.js`は環境変数を`pg.Client`へ渡し、PostgreSQLへ実接続する。
- 正常接続では`current_database()`、`current_user`、server address、server portを取得する。
- password誤りはPostgreSQL error code `28P01`、port誤りは通信errorとして区別する。
- 接続結果ではpasswordを`masked`とし、値を出力しない。
- `.env.example`にはダミー値のみを置く。
## 3. 実行コマンド
```cmd
rtk docker compose --parallel 1 -p studyhub-aws04 up -d --build --wait db
rtk docker compose --parallel 1 -p studyhub-aws04 run --rm app node app/db_check.js successful-connection
rtk docker compose --parallel 1 -p studyhub-aws04 run --rm -e DB_PASSWORD=wrong-password app node app/db_check.js authentication-failure
rtk docker compose --parallel 1 -p studyhub-aws04 run --rm -e DB_PORT=6543 app node app/db_check.js network-failure
rtk docker compose --parallel 1 -p studyhub-aws04 down --volumes --remove-orphans
```

## 4. 確認手順
1. `.env.example`に実秘密情報がないことを確認する。
2. 正常接続でdatabase、user、server address、server portを取得する。
3. password誤りで認証error `28P01`を取得する。
4. port誤りで通信errorを取得する。
5. 接続失敗時チェックリストで原因の確認順を照合する。
6. containerとvolumeを停止・削除する。
## 5. 実AWS発展課題
RDS作成、接続元制限、バックアップ、停止・削除、課金注意を整理してから実施する。DBをpublicにしない。
## 6. 完了条件

- RDS endpointとローカルDB接続先の対応を説明できる。
- DB接続情報を環境変数に分離できる。
- 接続失敗の切り分け観点を説明できる。
