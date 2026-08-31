# web42 pagination / sort / filter API 要件定義

## 1. 目的

業務一覧画面向けに、検索条件、並び替え、ページングを持つAPIを設計する。

## 2. 学習対象

- query parameter
- filtering
- sorting
- limit / offset
- total count
- response metadata

## 3. 作成する成果物

- 一覧API
- query parameter仕様
- response形式
- curl確認手順
- フロント接続例

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | keyword filter ができる |
| FR-02 | status filter ができる |
| FR-03 | sort key と order を指定できる |
| FR-04 | limit / offset でページングできる |
| FR-05 | total count と page metadata を返せる |
| FR-06 | 不正なquery parameterをvalidation errorにできる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | 大量データを全件返さない |
| NFR-02 | デフォルトのlimitを持つ |
| NFR-03 | フロント側が扱いやすいmetadataにする |

## 6. 対象外

- cursor pagination
- DB index最適化
- 複雑な検索DSL

## 7. 受入条件

- filter / sort / pagination を組み合わせて確認できる
- 不正パラメータ時のエラーを確認できる
- response metadata の意味を説明できる

## 8. 学習観点

- 一覧APIは画面要件と強く結びつく
- ページングは性能とUXの基本である
- query parameterも入力値検証の対象である
