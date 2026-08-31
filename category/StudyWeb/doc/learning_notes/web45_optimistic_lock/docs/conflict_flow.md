# 更新競合が発生する流れ

```text
record version=1
  ├─ A reads version=1
  └─ B reads version=1

A saves with version=1
  -> current version=1なので成功
  -> record version=2

B saves with version=1
  -> current version=2なので競合
  -> recordは変更しない

B reloads version=2
  -> 内容を再確認・再編集
  -> version=2で保存
  -> record version=3
```

競合後に古い変更を自動適用すると、Aの変更を再び上書きする可能性がある。再読込後は最新内容と自分の変更を比較する導線が必要。
