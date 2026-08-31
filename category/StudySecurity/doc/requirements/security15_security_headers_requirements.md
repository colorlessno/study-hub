# security15 セキュリティヘッダー 要件定義

## 1. 目的

Webアプリで基本となるセキュリティヘッダーの意味と設定例を学ぶ。

## 2. 学習対象

- CSP
- HSTS
- X-Frame-Options
- X-Content-Type-Options
- Referrer-Policy

## 3. 作成する成果物

- security headers確認API
- header一覧表
- DevTools確認手順
- 設定前後比較

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | response headerにセキュリティヘッダーを付与できる |
| FR-02 | DevToolsでheaderを確認できる |
| FR-03 | CSPの基本的な役割を説明できる |
| FR-04 | HSTSの注意点を説明できる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | 学習用の緩い設定と本番設定の差を明記する |
| NFR-02 | HSTSは本番で慎重に扱う |
| NFR-03 | headerの意味を表で残す |

## 6. 対象外

- CSP完全設計
- ブラウザ互換性の網羅
- WAF

## 7. 受入条件

- 主要セキュリティヘッダーの目的を説明できる
- DevToolsでheaderを確認できる
- headerだけで全て防げるわけではないと説明できる

## 8. 学習観点

- セキュリティヘッダーは防御層の一つ
- CSPはXSS対策の補助になる
- HSTSは戻しにくい設定なので注意する
