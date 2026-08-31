# 正常な入力例

```json
{
  "task_goal": "Markdownの確認表を見直す",
  "target_file": "docs/checklist.md",
  "expected_output": "不足している確認内容と修正案を出力する"
}
```

検証処理は `task_goal`、`target_file`、`expected_output` の3項目があることと、禁止語が含まれていないことを確認します。
