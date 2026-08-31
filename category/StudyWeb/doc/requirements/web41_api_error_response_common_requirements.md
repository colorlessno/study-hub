# web41 APIエラーレスポンス共通化 要件定義

## 1. 目的

フロントエンドが扱いやすい共通エラーレスポンス形式を設計し、入力エラー、業務エラー、システムエラーを分ける。

## 2. 学習対象

- API error format
- validation error
- business error
- system error
- request id
- frontend error handling

## 3. 作成する成果物

- 共通エラーレスポンス仕様
- サンプルAPI
- フロント表示例
- curl確認手順

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | 共通のerror response bodyを返せる |
| FR-02 | 項目別validation errorを返せる |
| FR-03 | 業務エラーを返せる |
| FR-04 | システムエラーで内部情報を隠せる |
| FR-05 | フロントでエラー種別に応じて表示を変えられる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | `requestId` を含められる |
| NFR-02 | 内部例外詳細を利用者へ返さない |
| NFR-03 | API仕様として文書化できる |

## 6. 対象外

- OpenAPI自動生成
- 多言語化
- 本格ログ基盤

## 7. 受入条件

- validation / business / system error を区別できる
- フロント側で項目別エラーを表示できる
- 内部情報を返さない方針を説明できる

## 8. 学習観点

- エラー形式はAPI契約である
- 利用者向けと調査向けの情報を分ける
- request id は障害調査に役立つ
