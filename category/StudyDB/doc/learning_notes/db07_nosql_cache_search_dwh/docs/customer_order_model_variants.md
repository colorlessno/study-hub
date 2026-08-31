# customer order model variants

同じ顧客・注文題材を複数モデルで表す。

- RDB: customers / orders / order_items。
- Document: order documentにcustomer snapshotとitemsを含める。
- Key-Value: `session:{id}` や `cart:{id}` をvalueとして保存する。

