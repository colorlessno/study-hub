# security03 RBAC 詳細設計
## 0. 関連文書

- `../requirements/security03_rbac_authorization_requirements.md`
- `../basic_design/security03_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studysecurity/systems/security03_rbac/
  README.md
  Dockerfile
  package.json
  app/server.js
  app/index.html
  docs/role_matrix.md
```

## 2. 主要設計
| 要素 | 内容 |
|---|---|
| 学習用ユーザー | `X-User`をサーバー内の固定ユーザーへ対応付け、roleを取得する |
| ロール | `admin`, `operator`, `viewer`を定義する |
| 権限表 | 操作ごとの許可ロールを行列で管理する |
| `GET /orders` | 閲覧権限を確認する |
| `POST /orders/o-100/cancel` | 取消権限を確認する |
| `GET /demo` | roleに応じたUI表示と、同じAPI認可結果を比較する画面を返す |

## 3. 安全制約
- ロール名だけでなく操作単位の許可表で判定する。
- フロント表示制御を認可の代替にしない。
- 権限不足時は403、未認証時は401として分ける。
- `X-User`は本物の認証ではなく、固定ユーザーを選択するローカル教材用入力に限定する。
## 4. 確認手順
1. `v-viewer`では通常の取消ボタンが非表示になることを確認する。
2. `v-viewer`でAPIへ取消要求を直接送信しても403になることを確認する。
3. `v-viewer`で閲覧できることを確認する。
4. `o-operator`では取消ボタンが表示され、取消APIが200になることを確認する。
5. 未認証が401になることを確認する。
## 5. 完了条件

- 認証と認可の違いを説明できる。
- ロールと権限表の関係を説明できる。
- 401と403の使い分けを確認できる。
