# security02 JWT認証 要件定義

## 1. 目的

JWTの発行、署名、期限、検証、改ざん拒否を学ぶ。

## 2. 学習対象

- JWT
- header / payload / signature
- token expiry
- Bearer token
- 改ざん検出

## 3. 作成する成果物

- JWT発行・検証サンプル
- token構造メモ
- 改ざんtoken確認手順
- 期限切れ確認手順

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | login APIでJWTを発行できる |
| FR-02 | Authorization headerでJWTを受け取れる |
| FR-03 | 署名を検証できる |
| FR-04 | 期限切れtokenを拒否できる |
| FR-05 | 改ざんtokenを拒否できる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | 署名鍵をソースに直書きしない方針を説明する |
| NFR-02 | token漏洩時のリスクを明記する |
| NFR-03 | localStorage保存の注意点を説明する |

## 6. 対象外

- refresh tokenの本格運用
- OAuth / OIDC
- 鍵ローテーションの実装

## 7. 受入条件

- JWTの3要素を説明できる
- 正常token、期限切れ、改ざんtokenの違いを確認できる
- JWTを署名済みデータとして説明できる

## 8. 学習観点

- JWTは暗号化ではなく署名が中心
- payloadは読める前提で扱う
- token保管場所はセキュリティ設計に関わる
