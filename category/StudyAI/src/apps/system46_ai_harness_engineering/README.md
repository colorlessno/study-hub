# system46 AI harness 設計

## 目的

AIが安定して作業できるように、入力fixture、決定的check、権限境界、実行logを揃える方法を学ぶ。

## ファイル

| path | 目的 |
| --- | --- |
| `fixtures/` | 成功、入力不足、禁止操作などのtask例 |
| `checks/check_task_fixture.js` | 必須入力と許可操作の検証 |
| `checks/check_output_schema.js` | 出力形式の簡易check |
| `checks/check_no_forbidden_ops.js` | 禁止操作の簡易check |
| `samples/expected_output.md` | 期待出力例 |
| `samples/run_logs/` | 検証結果、失敗理由、再実行条件、改善メモを含む実行記録 |

## 実行例

```cmd
node checks\check_output_schema.js samples\expected_output.md
node checks\check_no_forbidden_ops.js fixtures\task_success.json
```

各コマンドは検証結果をJSONで表示し、同じ内容を`samples/run_logs/`へ保存する。異常例では`failure_reason`と`rerun_condition`を使い、fixture、check、approval boundaryのどこを直すか判断する。

AIそのものを呼ばなくても、harnessの契約、決定的な検証、権限境界、実行記録、改善循環を学べる構成にしている。
