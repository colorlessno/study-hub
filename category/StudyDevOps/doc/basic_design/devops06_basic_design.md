# devops06 基本設計

## request id付きログ

## 1. 設計目的

request id / trace id を API request に付与し、正常系と異常系のログを同じ ID で追える教材にする。

## 2. 配置方針

```text
category/StudyDevOps/
  src/apps/devops06_request_id_logging/
    app/
      server.js
      logger.js
      package.json
      package-lock.json
    tests/
      logging.test.js
    Dockerfile
```

- request IDはrequest handlerの入口で検証・生成する。
- 外部request IDは許可文字と長さを検証し、query値はログへ含めない。
- response header に request id を返す。
- ローカル起動は`127.0.0.1`、Dockerfileからの起動はcontainer外から到達できる`0.0.0.0`へbindする。
- 作成・更新するテキストファイルは UTF-8 BOMなしとする。

## 3. 全体フロー

```text
request received -> request id attach -> start log -> handler -> completed/failed log -> response header
```

## 4. コンポーネント

| コンポーネント | 役割 |
|---|---|
| `server.js` | request IDを付与するhandlerとendpointを提供する |
| `logger.js` | structured log を出力する |
| `logging.test.js` | header とログ出力を確認する |
| `Dockerfile` | Docker logs で確認できる実行環境を作る |

## 5. Docker / CI 方針

- Docker logs で request id を検索できるよう stdout に JSON line を出す。
- CIではAPI応答とlog assertionを同じ自動テストで順番に検証し、後続テーマの検査後にこのtestを実行する。
- password、token、個人情報はログに出さない。
- secrets は request / response / log のいずれにも出さない。

## 6. 後続工程への引き継ぎ

詳細設計では、log format、header 名、例外 endpoint、mask 対象、検証コマンドを定義する。
