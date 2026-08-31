# タスクボード契約

## 目的

タスクボードは、AIロール間の共有状態です。誰が何を担当し、何が完了し、何が承認待ちかを記録する。

## 必須項目

| 項目 | 内容 |
|---|---|
| `task_id` | タスクID |
| `title` | タスク名 |
| `status` | `new`、`in_progress`、`in_review`、`blocked`、`completed` |
| `current_role` | 現在の担当 |
| `mode` | `mock` または `local_llm` |
| `round` / `max_rounds` | 現在ラウンドと上限 |
| `required_outputs` | 完了に必要な成果物 |
| `approval_required` | 人間確認が必要な操作 |
| `completed_roles` | 完了済みロール |

## 停止条件

- 必須入力が不足している。
- 最大ラウンド数に到達した。
- 安全確認で承認待ちまたは禁止が見つかった。
- 必須成果物が欠けている。
