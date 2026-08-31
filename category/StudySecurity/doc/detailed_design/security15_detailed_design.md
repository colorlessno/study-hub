# security15 セキュリティヘッダー 詳細設計
## 0. 関連文書

- `../requirements/security15_security_headers_requirements.md`
- `../basic_design/security15_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studysecurity/systems/security15_security_headers/
  Dockerfile
  package.json
  app/server.js
```

## 2. 主要設計
| 要素 | 内容 |
|---|---|
| CSP | `default-src 'self'`に加えてframeとobjectを拒否する |
| frame | `frame-ancestors 'none'`と`X-Frame-Options: DENY`を返す |
| X-Content-Type-Options | `nosniff`を返す |
| Referrer-Policy | `same-origin`を返す |
| Permissions-Policy | 不要なブラウザ機能を無効化する |
| HSTS | local HTTP教材では付与せず、production HTTPSの検討事項とする |

## 3. 安全制約
- ヘッダーだけで完全防御と説明しない。
- 互換性影響をREADMEに明記する。
- 実サイトにそのまま適用する前提にしない。
## 4. 確認手順
1. サンプルページを開く。
2. HTTP応答ヘッダーに各ヘッダーが含まれることを確認する。
3. CSPの制限内容を読む。
4. ヘッダーの役割と限界を確認する。
## 5. 完了条件

- 主要セキュリティヘッダーの目的を説明できる。
- CSPの基本方針を説明できる。
- 補助対策としての位置付けを説明できる。
