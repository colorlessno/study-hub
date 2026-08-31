# パラメータ化

SQL本文に入力値を埋め込まず、SQLとパラメータ配列を分離します。これにより入力値は構文ではなく値として扱われます。

```text
SQL:    select * from products where name like $1 and status = $2
params: ["%keyboard%", "active"]
```

parameterized queryは、nameやstatusのような値に使います。column名、table名、sort方向などSQL構造に関わる要素は一般にplaceholderへできないため、利用可能な候補をallowlistから選びます。

入力検証は業務上受け入れる値を決め、parameterized queryは値をSQL構文として解釈させないための対策です。片方だけで他方を代替しません。
