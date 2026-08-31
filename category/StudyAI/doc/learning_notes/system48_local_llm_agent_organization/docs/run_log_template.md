# 実行ログテンプレート

```json
{
  "run_id": "run-001",
  "task_id": "task-001",
  "requested_mode": "local_llm",
  "effective_mode": "local_llm",
  "model": "読み込んだチャット用モデル名",
  "started_at": "2026-05-09T00:00:00+09:00",
  "ended_at": "2026-05-09T00:00:10+09:00",
  "roles": [
    {
      "role": "planner",
      "status": "completed",
      "output": "plan.md",
      "notes": []
    }
  ],
  "checks": [
    {
      "name": "check_task_board",
      "status": "passed",
      "message": "required fields exist"
    }
  ],
  "status": "completed",
  "blocked_reason": null,
  "approval_required": [],
  "forbidden_operations": [],
  "failure_reason": null
}
```

## 記録する理由

指定した実行モード、実際に使ったモードとモデル、各ロールの出力、検査結果、停止理由を残すことで、実通信と模擬応答を区別しながら後から状態を追えるようにする。
