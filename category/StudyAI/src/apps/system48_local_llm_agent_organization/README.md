# ローカルLLMによるAI組織運用

複数のAI役割を直接会話させず、保存した入力と成果物を介して順番に作業させる構成を確認する教材です。明示的な模擬実行と、LM StudioのローカルAPIを使う実行を分けて確認できます。

## 構成

```text
fixtures/  役割定義、共有情報、作業入力
samples/   タスクボードと役割別成果物
checks/    入力、成果物、承認境界の検証処理
scripts/   役割を順番に実行する処理
runs/      実行ごとの入力、成果物、ログ（Git管理外）
```

## 実行例

```cmd
node scripts\run_organization.js mock fixtures\task_success.json
node scripts\run_organization.js mock fixtures\task_needs_approval.json
node scripts\run_organization.js mock fixtures\task_missing_context.json
node scripts\run_organization.js local_llm fixtures\task_success.json

node checks\check_task_board.js samples\task_board.json
node checks\check_task_fixture.js fixtures\task_success.json success
node checks\check_task_fixture.js fixtures\task_needs_approval.json needs_approval
node checks\check_task_fixture.js fixtures\task_missing_context.json missing_context
node checks\check_role_outputs.js samples
node checks\check_approval_boundary.js fixtures\task_needs_approval.json samples
```

`local_llm` は既定で `http://127.0.0.1:5858` のチャット用モデルを使用します。接続失敗時に模擬応答へ自動変更せず、失敗理由を実行ログへ保存します。

`fixtures/role_catalog.json` で役割数、実行順、成果物、最大ラウンド数、ロールごとの再試行上限を変更できます。既定は8役です。

タスクボードを中心に、計画、設計、レビュー、品質確認、安全確認、最終報告を役割別に残します。ファイル削除を含む承認が必要な操作は実行せず、承認待ちとして記録します。
