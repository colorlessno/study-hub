# devops06 要件定義

## request id付きログ

## 1. 目的

1リクエストの処理を request id / trace id で追跡し、障害調査時にログをつなげて読む方法を学ぶ。

## 2. 学習対象

- request id / trace id の採番
- middleware でのログ出力
- response header への request id 付与
- structured log の基本
- Docker logs での追跡

## 3. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | API request ごとに request id を生成する |
| FR-02 | request start / completed / failed のログを出力する |
| FR-03 | response header に request id を返す |
| FR-04 | 意図的に例外を起こす endpoint を用意する |
| FR-05 | Docker logs から request id で絞り込む手順を記載する |
| FR-06 | 外部request IDを許可文字と長さで検証し、query値をログへ出さない |

## 4. 非機能要件

- ログに password、token、個人情報を出さない。
- request id は推測困難な値または十分に衝突しにくい値にする。
- 作成するテキストファイルは UTF-8 BOMなしとする。

## 5. 対象外

- OpenTelemetry の本格導入
- 分散トレーシング基盤
- ログ収集SaaS連携

## 6. 成果物

```text
category/StudyDevOps/
  src/apps/devops06_request_id_logging/
    app/
      package-lock.json
    tests/
    Dockerfile
  doc/requirements/devops06_request_id_logging_requirements.md
```

## 7. 受入条件

- API response header から request id を取得できる。
- 正常系と異常系のログを同じ request id で追える。
- Docker logs 上で該当 request のログを確認できる。
