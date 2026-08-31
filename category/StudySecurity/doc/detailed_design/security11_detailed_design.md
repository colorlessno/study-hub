# security11 Webhook署名検証 詳細設計
## 0. 関連文書

- `../requirements/security11_webhook_signature_requirements.md`
- `../basic_design/security11_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studysecurity/systems/security11_webhook_signature/
  Dockerfile
  package.json
  app/server.js
  app/signature.js
  app/webhook.js
  app/demo.js
```

## 2. 主要設計
| 要素 | 内容 |
|---|---|
| 署名対象 | raw bodyとtimestampを連結する |
| 署名方式 | HMAC-SHA256をNode標準`crypto`で実装する |
| `POST /webhook` | 署名、時刻差、重複IDを検証する |
| 入力上限 | raw bodyを64KiBまでBufferとして受け取る |
| 失敗応答 | event ID不足は400、検証失敗は401、重複は409、body超過は413にする |

## 3. 安全制約
- HMAC secretは学習用ダミー値にする。
- 外部Webhook送信や実サービス接続は行わない。
- リプレイ例はローカルHTTPリクエストに限定する。
## 4. 確認手順
1. 正しい署名で200になることを確認する。
2. body改ざんで401になることを確認する。
3. 古いtimestampで401になることを確認する。
4. 同じevent idの再送が409になることを確認する。
5. 64KiBを超えるraw bodyが署名検証前に413になることを確認する。
## 5. 完了条件

- raw bodyが必要な理由を説明できる。
- 署名検証とリプレイ対策の違いを説明できる。
- ダミーsecretの扱いを説明できる。
