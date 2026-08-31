# security07 CSRF体験と対策 要件定義

## 1. 目的

Cookie認証時に、別サイトから意図しないリクエストが送られるCSRFを学ぶ。

## 2. 学習対象

- CSRF
- Cookie認証
- SameSite
- CSRF token
- state changing request

## 3. 作成する成果物

- CSRF危険例
- SameSite確認
- CSRF token対策例
- 攻撃ページ風サンプル

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | Cookie認証の状態変更APIを用意できる |
| FR-02 | tokenなしの危険性を確認できる |
| FR-03 | SameSiteによる軽減を確認できる |
| FR-04 | CSRF tokenで拒否できる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | 学習用のローカル構成に限定する |
| NFR-02 | 破壊的操作はダミーデータに限定する |
| NFR-03 | XSSとの違いを説明する |

## 6. 対象外

- OAuth state深掘り
- SPA全体の認証設計
- 本番WAF

## 7. 受入条件

- CSRFが成立する条件を説明できる
- SameSiteとCSRF tokenの役割を説明できる
- GETで状態変更しない理由を説明できる

## 8. 学習観点

- Cookieは自動送信される
- 状態変更APIにはCSRF対策が必要
- XSSとCSRFは別の攻撃である
