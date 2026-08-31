# security02 JWT認証 基本設計
## 0. 関連要件

- `../requirements/security02_jwt_auth_requirements.md`

## 1. 設計目的
JWTの発行、署名、検証、期限切れ、改ざん拒否を確認する。
## 2. 対象範囲

- token発行
- Authorization Bearer
- signature verification
- expiry
- tampered token

## 3. 成果物構成

```text
src/backend/src/studysecurity/systems/security02_jwt_auth/
  README.md
  app/
  docs/jwt_structure.md
  docs/token_check.md
```

## 4. 入力
| 入力 | 内容 |
|---|---|
| login情報 | 学習用固定ユーザー |
| JWT | Bearer token |
| 改ざんtoken | payloadやsignatureを変更したtoken |

## 5. 出力
| 出力 | 内容 |
|---|---|
| JWT | header.payload.signature |
| protected response | 200 / 401 |
| 検証結果 | 正常、期限切れ、改ざん |

## 6. 処理方針
1. loginでJWTを発行する
2. protected APIで署名と期限を検証する
3. 改ざんtokenを拒否する
4. 期限切れtokenを拒否する
5. payloadは読める前提で扱う
## 7. 確認観点

- JWTを暗号化と混同していないか
- 署名鍵を実秘密情報として扱っていないか
- token漏洩リスクを説明できるか
## 8. 後続工程への引き継ぎ

詳細設計では、署名方式、token構造、検証API、改ざん確認手順を定義する。
