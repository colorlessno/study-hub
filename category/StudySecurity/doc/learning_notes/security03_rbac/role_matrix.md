# ロール権限表

## 学習用ユーザー

| `X-User` | role | 意味 |
|---|---|---|
| `a-admin` | admin | 閲覧と取消を許可する管理者 |
| `o-operator` | operator | 閲覧と取消を許可する担当者 |
| `v-viewer` | viewer | 閲覧だけを許可する参照者 |

headerは固定ユーザーを選ぶための学習用入力です。本番ではSessionやJWTの検証結果からuser IDを確立し、サーバー側のユーザー情報からroleを取得します。

## Permission

| 操作 | admin | operator | viewer |
|---|---:|---:|---:|
| 注文閲覧 | 可 | 可 | 可 |
| 注文取消 | 可 | 可 | 不可 |

画面の表示制御だけでは認可にならないため、API側で必ず判定します。

| ケース | 期待status | 判断理由 |
|---|---:|---|
| `X-User`なし | 401 | 誰であるかを確立できない |
| `v-viewer`で閲覧 | 200 | `orders:read`を持つ |
| `v-viewer`で取消 | 403 | 認証済みだが`orders:cancel`を持たない |
| `o-operator`で取消 | 200 | `orders:cancel`を持つ |
