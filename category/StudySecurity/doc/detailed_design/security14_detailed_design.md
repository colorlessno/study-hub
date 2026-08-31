# security14 CORS設定 詳細設計
## 0. 関連文書

- `../requirements/security14_cors_requirements.md`
- `../basic_design/security14_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studysecurity/systems/security14_cors/
  Dockerfile
  package.json
  app/server.js
```

## 2. 主要設計
| 要素 | 内容 |
|---|---|
| 許可Origin | 明示的な許可リストで管理する |
| preflight | `OPTIONS`に許可メソッドとヘッダーを返す |
| credentials | Cookie利用時だけ明示的に許可する |
| 拒否 | 不許可OriginにはCORS許可ヘッダーを返さない |
| cache | Originとpreflight条件を`Vary`へ含める |

## 3. 安全制約
- `*`とcredentialsの組み合わせを許可しない。
- CORSを認証・認可の代替にしない。
- 外部サイトからの実検証は行わず、ローカルHTTPヘッダー確認に限定する。
## 4. 確認手順
1. 許可Originのpreflightが成功することを確認する。
2. 不許可Originに許可ヘッダーが出ないことを確認する。
3. credentials有無の差を確認する。
4. READMEでCORSの目的を読む。
## 5. 完了条件

- CORSがブラウザ制御であることを説明できる。
- preflightの役割を説明できる。
- 認証・認可との違いを説明できる。
