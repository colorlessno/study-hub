# system48 詳細設計
## ローカルLLMによるAI組織運用

## 0. 関連文書

- `../requirements/system48_requirements.md`
- `../basic_design/system48_basic_design.md`

## 1. 製造対象

```text
apps/system48_local_llm_agent_organization/
  README.md
  fixtures/
    task_success.json
    task_needs_approval.json
    task_missing_context.json
    role_catalog.json
    shared_memory.md
  samples/
    task_board.json
    plan.md
    design_note.md
    execution_proposal.md
    review_report.md
    qa_checklist.md
    safety_report.md
    decision_log.md
    final_report.md
    run_log.json
  checks/
    check_task_fixture.js
    check_task_board.js
    check_role_outputs.js
    check_approval_boundary.js
  scripts/
    run_organization.js
  runs/
    run-<task-id>-<timestamp>/
      task_request.json
      task_board.json
      role outputs
      run_log.json
doc/learning_notes/system48_local_llm_agent_organization/
  README.md
  docs/
    role_catalog.md
    task_board_contract.md
    shared_memory_policy.md
    approval_boundary.md
    run_log_template.md
```

## 2. 実行モード

| mode | 内容 | 用途 |
|---|---|---|
| `mock` | 固定応答で各ロールの成果物を作る | LM Studio未接続時、教材確認 |
| `local_llm` | LM Studio の OpenAI互換APIへ順番に問い合わせる | ローカルLLMでの実験 |

`mock` と `local_llm` は利用者が明示的に選ぶ。`local_llm` の接続に失敗した場合は `mock` へ自動変更せず、`blocked` と接続失敗理由を保存する。これにより、実通信と模擬結果を混同しない。

## 3. fixture設計

| fixture | 内容 | 期待結果 |
|---|---|---|
| `task_success.json` | 目的、制約、期待成果物が揃った通常タスク | 全ロール成果物と最終報告が作成される |
| `task_needs_approval.json` | ファイル変更やコマンド実行を含むタスク | 安全確認で承認待ちとして停止または保留になる |
| `task_missing_context.json` | 目的や制約が不足したタスク | 計画またはPMが不足情報として停止する |
| `role_catalog.json` | ロール定義、読む入力、書く成果物、判断範囲 | 各ロールの責任境界を検査できる |
| `shared_memory.md` | プロジェクト方針、禁止事項、既存決定 | 各ロールが共通制約を参照できる |

## 4. `task_board.json` 設計

```json
{
  "task_id": "task-001",
  "title": "学習教材の設計案を作る",
  "status": "in_review",
  "current_role": "reviewer",
  "mode": "mock",
  "round": 1,
  "max_rounds": 2,
  "max_retries_per_role": 1,
  "retry_count": 0,
  "role_count": 8,
  "required_outputs": [
    "plan.md",
    "design_note.md",
    "execution_proposal.md",
    "review_report.md",
    "qa_checklist.md",
    "safety_report.md",
    "decision_log.md",
    "final_report.md"
  ],
  "blocked_reason": null,
  "approval_required": [],
  "completed_roles": ["planner", "designer"],
  "review_reflection": {
    "review_output": "review_report.md",
    "status": "included_in_downstream_context",
    "downstream_roles": ["qa", "recorder", "coordinator"]
  }
}
```

| field | 内容 |
|---|---|
| `task_id` | タスクID |
| `title` | タスク名 |
| `status` | `new`、`in_progress`、`in_review`、`blocked`、`completed` |
| `current_role` | 現在の担当ロール |
| `mode` | `mock` または `local_llm` |
| `round` / `max_rounds` | 現在ラウンドと上限 |
| `max_retries_per_role` / `retry_count` | ロールごとの再試行上限と実際の再試行回数 |
| `role_count` | 設定ファイルから読み込んだ実行対象の役割数 |
| `required_outputs` | 完了に必要な成果物 |
| `blocked_reason` | 停止または保留理由 |
| `approval_required` | 人間確認が必要な操作 |
| `completed_roles` | 完了済みロール |
| `review_reflection` | レビュー結果を渡した後続ロールと反映確認状態 |

## 5. `role_catalog.json` 設計

```json
{
  "execution": {
    "max_rounds": 2,
    "max_retries_per_role": 1
  },
  "roles": [
    {
      "id": "planner",
      "name": "計画",
      "order": 1,
      "runs_while_approval_pending": true,
      "reads": ["task_board.json", "shared_memory.md"],
      "writes": ["plan.md"],
      "output": {
        "file": "plan.md",
        "title": "計画",
        "headings": ["目的", "対象外", "作業順序", "不足情報"]
      },
      "can_decide": ["作業順序案", "対象外案"],
      "must_not_do": ["ファイル変更", "コマンド実行", "外部送信"]
    }
  ]
}
```

全ロールは `order`、`runs_while_approval_pending`、`reads`、`writes`、`output`、`can_decide`、`must_not_do` を持つ。実行処理はこの設定から実行順と成果物を組み立てるため、役割数を変更してもソース内の固定配列を修正する必要はない。既定設定は8ロールとする。

## 6. ロール成果物テンプレート

| ファイル | 必須章 |
|---|---|
| `plan.md` | 目的、対象外、作業順序、不足情報 |
| `design_note.md` | 構成、データ、境界、失敗時の扱い |
| `execution_proposal.md` | 実行案、変更対象、実行しない操作、承認待ち |
| `review_report.md` | 指摘事項、重大度、対応案、残リスク |
| `qa_checklist.md` | 確認観点、機械的検査、受入条件 |
| `safety_report.md` | 禁止操作、承認待ち操作、秘密情報確認 |
| `decision_log.md` | 判断、理由、参照成果物、次回引き継ぎ |
| `final_report.md` | 結論、作成物、残課題、次の作業 |

各Markdown成果物は、空の章だけで完了扱いにしない。少なくとも1件以上の具体項目を含める。

## 7. ロール実行順序

```text
coordinator
  ↓
planner
  ↓
designer
  ↓
executor
  ↓
reviewer
  ↓
qa
  ↓
safety
  ↓
recorder
  ↓
coordinator
```

レビュー、QA、安全確認で重大指摘がある場合は `blocked` にする。軽微な指摘は `decision_log.md` に残し、最終報告へ反映する。

## 8. ローカルLLM呼び出し設計

| 項目 | 内容 |
|---|---|
| endpoint | LM Studio の OpenAI互換API |
| 呼び出し単位 | 1ロール1リクエスト |
| 入力 | ロール指示、読むべき成果物、共有記憶の必要部分 |
| 出力 | ロール成果物Markdown |
| 失敗時 | `blocked_reason` と `run_log.json` に接続失敗を記録して停止する |

複数ロールを同時に呼ばない。ローカルPCのVRAM制約を前提に、順次実行で設計する。

## 9. 承認境界設計

| 操作 | 扱い | 記録先 |
|---|---|---|
| 要約、計画、レビュー、QA観点作成 | 許可 | 各ロール成果物 |
| 教材内サンプル出力の作成 | 条件付き許可 | `run_log.json` |
| ファイル変更 | 人間確認 | `safety_report.md`、`task_board.json` |
| コマンド実行 | 人間確認 | `safety_report.md`、`task_board.json` |
| 外部送信 | 人間確認 | `safety_report.md`、`task_board.json` |
| ファイル削除 | 人間確認 | `safety_report.md`、`task_board.json` |
| 秘密情報の利用 | 禁止 | `safety_report.md` |
| OS設定変更 | 禁止 | `safety_report.md` |

教材では、危険操作は実行せず、承認待ちまたは禁止として記録する。

## 10. `run_log.json` 設計

```json
{
  "run_id": "run-001",
  "task_id": "task-001",
  "requested_mode": "mock",
  "effective_mode": "mock",
  "model": null,
  "started_at": "2026-05-09T00:00:00+09:00",
  "ended_at": "2026-05-09T00:00:10+09:00",
  "roles": [
    {
      "role": "planner",
      "status": "completed",
      "output": "plan.md",
      "attempts": 1,
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
  "failure_reason": null
}
```

## 11. check設計

| check | 入力 | 検査内容 |
|---|---|---|
| `check_task_fixture.js` | `fixtures/*.json` | 通常タスク、承認待ちタスク、文脈不足タスクの期待状態 |
| `check_task_board.js` | `task_board.json` | 必須項目、状態値、最大ラウンド、承認待ち項目の型 |
| `check_role_outputs.js` | `role_catalog.json`、`samples/*.md` | 設定した役割の必須成果物、必須章、空章、レビュー結果の後続引き渡し |
| `check_approval_boundary.js` | fixture、全Markdown成果物 | 禁止操作、秘密情報語、承認対象の実行済み表現 |

checkはAI出力の良し悪しを完全評価しない。教材として最低限の構造、安全境界、再実行可能性を確認する。

## 12. 確認手順

1. StudyHubで「通常作業を模擬実行」を実行し、8つの役割別成果物と完了状態が実行フォルダへ保存されることを確認する。
2. 「承認対象を模擬実行」を実行し、ファイル変更・ファイル削除・コマンド実行が承認待ちになり、停止理由が保存されることを確認する。
3. 「情報不足を模擬実行」を実行し、不足情報を記録して停止することを確認する。
4. LM Studioにチャット用モデルを読み込み、「LM Studioで実行」を実行して、役割ごとに順次通信することを確認する。
5. 「タスクボードを検証」と3種類の入力検証を実行し、入力とタスクボードを検査する。
6. 「役割別成果物を検証」を実行し、各Markdown成果物の必須章を検査する。
7. 「承認境界を検証」を実行し、承認が必要な操作が実行済み扱いになっていないことを検査する。
8. 実行フォルダの `run_log.json` で、指定モード、実効モード、モデル、ロール結果、検査結果、停止理由を確認する。

## 13. 完了条件

- タスクボード、ロール定義、共有記憶、判断ログの役割を説明できる。
- ロールごとに読む入力と書く成果物を分けられる。
- ローカルLLM実行と模擬実行を明確に区別できる。
- LM Studioへ役割ごとに順次通信し、実行ごとの成果物とログを保存できる。
- 危険操作が実行されず、承認待ちまたは禁止として記録される。
- 確認スクリプトで、必須成果物、承認境界、停止理由を確認できる。
- 役割数を設定ファイルで変更でき、既定では8役が順番に実行される。
- ロールごとの再試行回数と、レビュー結果を後続ロールへ渡した状態を実行記録で確認できる。

## 14. 安全性

- 実秘密情報、実顧客データ、個人情報を使わない。
- 外部送信とファイル削除を承認前に実行せず、OS設定変更をAIが実行しない。
- コマンド実行は教材の確認スクリプトに限定し、危険操作の実行は扱わない。
- ローカルLLMの出力は最終判断ではなく、レビュー、QA、安全確認を通す。
