# aws04 RDS接続 基本設計

## 0. 関連文書

- `../requirements/aws04_rds_connection_requirements.md`

## 1. 設計方針
RDS接続の前に、ローカルPostgreSQLをRDS相当として扱い、接続文字列、環境変数、接続失敗時の確認観点を学ぶ。
## 2. ローカル学習方式
- Docker ComposeでPostgreSQLを起動する。
- NodeまたはPythonの小型スクリプトから接続確認する。
- `.env.example`にはダミー値のみを置く。
## 3. 成果物構成

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

## 4. 設計内容

| 要素 | 内容 |
|---|---|
| DB | ローカルPostgreSQL |
| 接続情報 | host、port、database、user、passwordを環境変数化する |
| 失敗確認 | host不正、port不正、認証失敗を分ける |
| 秘密情報 | 実パスワードは置かない |

## 5. 実AWS発展課題
- RDS作成、接続元制限、バックアップ、停止・削除、課金注意を整理する。
- DBをpublicにしない設計を確認する。
## 6. 完了条件

- RDS endpointとローカルDB接続先の対応を説明できる。
- 接続文字列を環境変数に分離できる。
- 接続失敗の原因を切り分けられる。
