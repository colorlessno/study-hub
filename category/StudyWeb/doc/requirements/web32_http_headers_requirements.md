# web32 HTTPヘッダー観察 要件定義

## 1. 目的

HTTP request / response / header / body を DevTools と curl で観察し、Web通信の基本構造を理解する。

## 2. 学習対象

- HTTP request / response
- request header / response header
- body の有無
- status code
- DevTools Network
- curl による確認

## 3. 作成する成果物

- HTTP観察用の小さな Web/API サンプル
- DevTools確認手順
- curl確認手順
- 観察ログテンプレート

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | GET request の header と response を確認できる |
| FR-02 | POST request の body と response を確認できる |
| FR-03 | DevTools Network で header / payload / response を確認できる |
| FR-04 | curl で同じAPIを確認できる |
| FR-05 | status code と response body を記録できる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | ローカル環境で実行できる |
| NFR-02 | ブラウザ確認とCLI確認の両方を扱う |
| NFR-03 | 既存 `web01`〜`web31` を変更しない |

## 6. 対象外

- 認証付き通信
- CORS詳細
- HTTPS / TLS
- 負荷試験

## 7. 受入条件

- GET / POST の request と response を説明できる
- DevTools と curl の確認結果を比較できる
- header、body、status code の役割を説明できる

## 8. 学習観点

- 画面表示の裏で HTTP 通信が起きている
- Network タブは障害調査の入口になる
- curl でAPI単体確認ができる
