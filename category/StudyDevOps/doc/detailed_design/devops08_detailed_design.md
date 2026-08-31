# devops08 詳細設計

## Docker logs調査

## 1. 実装配置

```text
category/StudyDevOps/src/apps/devops08_docker_logs_investigation/
  app/package.json
  app/package-lock.json
  app/server.js
  app/container_diagnostics.mjs
  tests/investigation.test.js
  docker-compose.yml
  normal_request.mjs
  runtime_error_request.mjs
  docs/investigation_template.md
  docs/port_conflict_guide.md
```

## 2. compose service

| service | 用途 |
|---|---|
| `app-ok` | 正常起動 |
| `app-missing-env` | env不足で失敗 |
| `app-runtime-error` | 起動後にruntime error |

## 3. 調査コマンド

```bat
rtk docker compose --parallel 1 -p studyhub-devops08 ps -a
rtk docker compose --parallel 1 -p studyhub-devops08 logs app-missing-env
rtk docker compose --parallel 1 -p studyhub-devops08 logs --tail 50 app-runtime-error
rtk docker compose --parallel 1 -p studyhub-devops08 exec -T app-ok node container_diagnostics.mjs
```

container内診断は`APP_MODE`、`PORT`、作業ディレクトリだけを出力し、環境変数の全件や値を表示しない。port競合は`port_conflict_guide.md`に従い、Composeのbind errorと使用中PIDを確認する。所有者未確認のprocessは停止しない。

## 4. failure pattern

| pattern | 原因 | 見る場所 |
|---|---|---|
| env missing | 必須環境変数なし | container logs |
| port conflict | host port 使用中 | compose ps / bind error |
| runtime error | 起動後例外 | app logs |

構造化ログは`timestamp`、`level`、`action`、`error_code`、`request_id`を必要に応じて持つ。URLはpathnameだけを記録する。

## 5. 調査テンプレート

| 項目 | 内容 |
|---|---|
| 発生日時 | いつ起きたか |
| service | 対象service |
| status | ps の状態 |
| logs | 重要ログ |
| cause | 推定原因 |
| action | 対処 |

## 6. 安全性

- secrets を logs と調査メモに残さない。
- 破壊的な Docker 操作を前提にしない。
- テキストファイルは UTF-8 BOMなしで保存する。

## 7. CI連携

CIではNode.js testがmissing env、runtime error、正常応答のシグナルを検証する。Docker調査は手動演習とし、将来Compose自体が失敗した場合は`docker compose ps -a`と対象serviceのlogsをjob logへ残す。

```bat
cd /d C:\work\work20260617
rtk npm.cmd --prefix category/StudyDevOps/src/apps/devops08_docker_logs_investigation/app test
```
