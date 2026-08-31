# devops08 基本設計

## Docker logs調査

## 1. 設計目的

Docker Compose 上の起動失敗、env 不足、port conflict、runtime error を `ps`、`logs`、`exec` で調査する教材にする。

## 2. 配置方針

```text
category/StudyDevOps/
  src/apps/devops08_docker_logs_investigation/
    app/
      server.js
      package.json
      package-lock.json
    tests/
      investigation.test.js
    docker-compose.yml
    docs/
      investigation_template.md
      port_conflict_guide.md
```

- 正常起動ケースと失敗ケースを分ける。
- 破壊的な Docker 操作を前提にしない。
- 作成・更新するテキストファイルは UTF-8 BOMなしとする。

## 3. 全体フロー

```text
compose up -> ps status -> logs review -> exec check -> cause classify -> investigation note
```

## 4. コンポーネント

| コンポーネント | 役割 |
|---|---|
| `docker-compose.yml` | 正常 service と失敗演習 service を定義する |
| `app/server.js` | env 不足や runtime error を再現する |
| `tests/investigation.test.js` | 3種類のシグナルを有限時間で自動確認する |
| `investigation_template.md` | 調査結果を記録する |
| `port_conflict_guide.md` | bind errorと使用中processを安全に切り分ける |
| `app/container_diagnostics.mjs` | container内の教材用設定だけを表示する |
| `README.md` | Docker logs 調査手順を説明する |

## 5. Docker / CI 方針

- Docker Compose を主教材にする。
- CIでは3種類のシグナルを自動テストし、Compose固有のps/logs調査は手動演習として残す。
- secret をログに出さない。
- secrets は logs、調査テンプレート、README の例示値に含めない。

## 6. 後続工程への引き継ぎ

詳細設計では、失敗パターン、調査コマンド、記録テンプレート、確認手順を定義する。
