# security03 RBAC認可 基本設計
## 0. 関連要件

- `../requirements/security03_rbac_authorization_requirements.md`

## 1. 設計目的
roleに基づき、管理者と一般ユーザーの操作権限を分離する。
## 2. 対象範囲

- user role
- admin API
- user API
- 403 response
- roleに応じたUI表示制御とAPI認可の比較
## 3. 成果物構成

```text
src/backend/src/studysecurity/systems/security03_rbac/
  README.md
  app/
    index.html
  docs/role_permission_matrix.md
  docs/authz_check.md
```

## 4. 入力
| 入力 | 内容 |
|---|---|
| user | role付きユーザー |
| request | 管理者操作や一般操作 |

## 5. 出力
| 出力 | 内容 |
|---|---|
| permitted response | 権限あり |
| forbidden response | 403 |
| role table | roleとpermission |

## 6. 処理方針
1. roleを持つユーザーを用意する
2. APIごとに必要roleを定義する
3. 一般ユーザーで管理APIを拒否する
4. roleに応じて通常の取消ボタンを表示・非表示にする
5. UIで非表示でも直接要求でき、API側の認可で403になることを確認する
## 7. 確認観点

- API側で認可しているか
- 401と403を混同していないか
- roleとpermissionの関係を説明できるか
## 8. 後続工程への引き継ぎ

詳細設計では、role表、API、権限チェック、確認手順を定義する。
