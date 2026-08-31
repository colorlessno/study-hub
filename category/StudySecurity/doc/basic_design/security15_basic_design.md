# security15 セキュリティヘッダー 基本設計

## 0. 関連要件

- `../requirements/security15_security_headers_requirements.md`

## 1. 設計目的

browserへ防御方針を伝えるresponse headerの役割と、headerだけでは防げない範囲を確認する。

## 2. 成果物構成

```text
src/backend/src/studysecurity/systems/security15_security_headers/
  package.json
  app/server.js
doc/learning_notes/security15_security_headers/
  README.md
  header_policy.md
```

## 3. header policy

| Header | 学習用policy |
|---|---|
| Content-Security-Policy | self限定、frame・objectを拒否 |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `same-origin` |
| Permissions-Policy | camera等を無効化 |
| Cache-Control | `no-store` |

## 4. 処理方針

1. local HTTP serverの全responseへ同じ学習用headerを付与する。
2. browser DevToolsまたはHTTP clientで実値を観察する。
3. CSPの制約とlegacy headerの重なりを比較する。
4. HSTSはHTTPS productionでのみ検討し、local HTTP教材では付与しない。

## 5. 安全制約

- 学習用policyを実siteへ無検証で適用しない。
- headerを入力validationや出力encodingの代替にしない。
- HSTSをlocalhostのHTTP確認へ追加しない。

## 6. 確認観点

- 各headerをどのbrowser機能が解釈するか
- CSP違反時の機能影響を事前検証する必要性
- HSTSが戻しにくい設定である理由
