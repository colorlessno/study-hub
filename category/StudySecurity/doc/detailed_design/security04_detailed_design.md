# security04 ABAC 詳細設計
## 0. 関連文書

- `../requirements/security04_abac_requirements.md`
- `../basic_design/security04_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studysecurity/systems/security04_abac/
  README.md
  Dockerfile
  package.json
  app/server.js
  docs/policy_examples.md
```

## 2. 主要設計
| 要素 | 内容 |
|---|---|
| 属性 | ユーザー部署、注文担当部署、ステータスを扱う |
| ポリシー | 属性条件を関数として定義する |
| 学習用ユーザー | `alice`はsales、`bob`はsupport、`admin`は管理者とする |
| 注文 | `o-200`はsales / draft、`o-201`はsupport / confirmedとする |
| `GET /orders/:id` | 部署一致または管理者を許可する |
| `PATCH /orders/:id` | 参照可能かつ`draft`だけを許可し、`note`と更新者をメモリへ保存する |

## 3. 安全制約
- role、department、statusはリクエスト本文から信用せず、サーバーのダミーデータから取得する。更新本文からは`note`だけを受け付ける。
- ポリシー条件と業務条件を分離して記録する。
- 実顧客データや実部署情報は扱わない。
- `X-User`は本物の認証ではなく、固定ユーザーを選ぶローカル教材用入力に限定する。
## 4. 確認手順
1. 認証なしの閲覧が401になることを確認する。
2. `alice`が`o-200`を閲覧・更新し、再取得した注文に`note`と更新者が残ることを確認する。
3. `bob`が`o-200`を閲覧すると403になることを確認する。
4. `bob`が同じ部署の確定済み`o-201`を閲覧できるが、更新は403になることを確認する。
5. `admin`が部署に関係なく閲覧できることを確認する。
6. 未存在の注文が404になることを確認する。
## 5. 完了条件

- RBACとABACの違いを説明できる。
- 属性の信頼境界を説明できる。
- ポリシー評価結果を再現できる。
