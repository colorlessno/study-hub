# performance observation

性能値はPCやDocker状態で変わるため、絶対値ではなく傾向を見る。

見るポイント:

- `Seq Scan` か `Index Scan` か。
- 推定行数と実行行数が大きくずれていないか。
- 条件式がindexを使いやすい形か。

