# ポリシー例

## Policy

- 閲覧: userが管理者、またはuser部署と注文部署が一致。
- 更新: 閲覧可能、かつ注文状態が`draft`。

| user | resource | 閲覧 | 更新 | 理由 |
|---|---|---:|---:|---|
| alice（sales） | o-200（sales / draft） | 可 | 可 | 部署一致かつdraft |
| bob（support） | o-200（sales / draft） | 不可 | 不可 | 部署不一致 |
| bob（support） | o-201（support / confirmed） | 可 | 不可 | 部署一致だがconfirmed |
| admin（hq） | o-201（support / confirmed） | 可 | 不可 | 管理者は閲覧可能だがdraft条件は残る |

RBACはロール中心、ABACは属性条件中心の認可です。

この教材ではuser属性とresource属性をサーバー内の固定データから取得します。request bodyで`department=sales`を送るだけで許可される設計にはしません。
