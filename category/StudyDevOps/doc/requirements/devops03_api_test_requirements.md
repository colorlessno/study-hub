# devops03 要件定義

## API test

## 1. 目的

backend API の疎通、正常系、異常系、response schema を自動確認し、curl だけでは漏れやすい回帰を検知する方法を学ぶ。

## 2. 学習対象

- API smoke test
- request / response schema の確認
- HTTP status と error response の検証
- Docker Compose 上の API test
- CI での API test 実行

## 3. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | 最小 API server を用意する |
| FR-02 | health endpoint の smoke test を用意する |
| FR-03 | 正常系 POST API の test を用意する |
| FR-04 | 400 / 404 など異常系 API test を用意する |
| FR-05 | Docker Compose で API server と test runner を起動できる構成にする |

## 4. 非機能要件

- test は固定データで再現可能にする。
- 外部クラウド、外部DBを必須にしない。
- 作成するテキストファイルは UTF-8 BOMなしとする。

## 5. 対象外

- 負荷試験
- 認証認可の網羅テスト
- 契約テスト基盤の本格導入

## 6. 成果物

```text
category/StudyDevOps/
  src/apps/devops03_api_test/
    app/
    tests/
    docker-compose.yml
  doc/learning_notes/devops03_api_test/
    README.md
  doc/requirements/devops03_api_test_requirements.md
```

## 7. 受入条件

- API server 起動後に test runner から疎通確認できる。
- 正常系と異常系の status code を自動確認できる。
- response schema の重要項目の欠落を検知できる。
