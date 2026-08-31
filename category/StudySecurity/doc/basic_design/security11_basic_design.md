# security11 Webhook署名検証 基本設計

## 0. 関連要件

- `../requirements/security11_webhook_signature_requirements.md`

## 1. 設計目的

raw bodyのHMAC検証、timestampの期限、event IDの重複検出を独立した判断として観察する。

## 2. 成果物構成

```text
src/backend/src/studysecurity/systems/security11_webhook_signature/
  package.json
  app/signature.js
  app/webhook.js
  app/server.js
  app/demo.js
doc/learning_notes/security11_webhook_signature/
  README.md
  replay_protection.md
```

## 3. requestと応答

| 項目 | 内容 |
|---|---|
| endpoint | `POST /webhook` |
| headers | `X-Timestamp`、`X-Signature`、`X-Event-Id` |
| 署名対象 | timestamp、`.`、raw body bytes |
| 成功 | 200 |
| 不正timestamp・署名 | 401 |
| event ID不足 | 400 |
| replay | 409 |
| body超過 | 413 |

## 4. 処理方針

1. bodyをparseせず64KiBまでBufferとして収集する。
2. timestampの型と5分以内かを検証する。
3. event IDの存在、HMAC署名、処理済みIDを検証する。
4. 全条件を通過したIDだけを処理済みにする。

## 5. 安全制約

- 外部providerへ送信しない。
- default secretは学習用ダミーであり、本番利用しない。
- in-memoryの処理済みIDは再起動・複数instanceに対応しない。

## 6. 確認観点

- bodyの1byte変更が署名不一致になること
- 正しい署名でも期限切れ・replayは拒否されること
- 検証順序により処理済みIDを誤登録しないこと
