# security04 ABAC 基本設計
## 0. 関連要件

- `../requirements/security04_abac_requirements.md`

## 1. 設計目的
role、ユーザー部署、注文部署、注文状態を組み合わせた属性ベース認可を確認する。
## 2. 対象範囲

- user role / department
- resource department / status
- read policy / update policy
- 401 / 403 / 404
## 3. 成果物構成

```text
src/backend/src/studysecurity/systems/security04_abac/
  Dockerfile
  package.json
  app/server.js

doc/learning_notes/security04_abac/
  README.md
  policy_examples.md
```

## 4. 入力
| 入力 | 内容 |
|---|---|
| `X-User` | サーバー内の固定ユーザーを選ぶ学習用header |
| user attribute | role、department |
| resource attribute | order ID、department、status |
| request | `GET`または`PATCH /orders/:id` |

## 5. 出力
| 出力 | 内容 |
|---|---|
| read result | 200 / 401 / 403 / 404 |
| update result | `draft`だけ200、更新内容をメモリへ保存、条件不一致は403 |
| policy example | 属性と許可条件の対応 |

## 6. 処理方針
1. roleとdepartmentを持つ固定ユーザーを用意する
2. departmentとstatusを持つ注文を用意する
3. 管理者または部署一致なら参照を許可する
4. 参照可能かつ`draft`なら更新を許可する
5. 更新可能な項目だけをメモリへ保存し、再取得で確認する
6. 認証なし、属性不一致、未存在を401 / 403 / 404へ分ける

## 7. 確認観点

- roleだけでなくuserとresourceの属性を比較しているか
- 属性をrequest bodyから信用していないか
- 401 / 403 / 404の判断点を説明できるか
## 8. 後続工程への引き継ぎ

詳細設計では、固定データ、policy関数、API、拒否レスポンス、確認手順を定義する。
