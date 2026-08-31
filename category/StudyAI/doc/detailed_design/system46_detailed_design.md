# system46 詳細設計
## AI harness engineering

## 0. 関連文書

- `../requirements/system46_requirements.md`
- `../basic_design/system46_basic_design.md`

## 1. 製造対象

```text
category/StudyAI/src/apps/system46_ai_harness_engineering/
  README.md
  fixtures/
    task_success.json
    task_missing_input.json
    task_forbidden_operation.json
  checks/
    check_task_fixture.js
    check_output_schema.js
    check_no_forbidden_ops.js
  samples/
    expected_output.md
    run_logs/
doc/learning_notes/system46_ai_harness_engineering/
  README.md
  docs/
    harness_contract.md
    approval_boundary.md
    run_log_template.md
    feedback_loop.md
```

## 2. fixture設計

| fixture | 内容 | 期待結果 |
|---|---|---|
| `task_success.json` | 必須入力が揃った通常task | 入力構造検査と禁止操作検査が通る |
| `task_missing_input.json` | targetやexpected outputが不足 | 不足入力として停止 |
| `task_forbidden_operation.json` | 削除や外部送信を求めるtask | approval boundaryまたは禁止として停止 |

## 3. harness contract 設計

| 項目 | 内容 |
|---|---|
| `task_goal` | AIに依頼する目的 |
| `target` | 作業対象 |
| `expected_output` | 期待する成果物 |
| `allowed_actions` | 自動実行を許可する操作の配列 |
| checks | 入力構造検査、禁止操作検査、Markdown必須見出し検査 |
| run log | 実行日時、fixture、check結果、失敗理由 |

## 4. check設計

| check | 入力 | 検査内容 |
|---|---|---|
| `check_task_fixture.js` | task fixture | 必須入力、許可操作の配列 |
| `check_output_schema.js` | output markdown | `指摘`、`要約`、`残リスク`の3見出し |
| `check_no_forbidden_ops.js` | task fixture | 任意パス削除、外部送信、秘密情報要求を表す文字列 |

checkはAI品質を完全評価するものではなく、最低限の再現性と安全境界を確認する。

## 5. approval boundary 設計

| operation | 扱い |
|---|---|
| read fixture | 許可 |
| write output under sample dir | 許可 |
| delete generated sample output | 条件付き許可 |
| delete arbitrary path | 禁止 |
| external API call | 自動実行では禁止。別の承認済み手順はこのテーマの対象外 |
| handle secrets | 自動実行では禁止。別の承認済み手順はこのテーマの対象外 |

## 6. run log 設計

| field | 内容 |
|---|---|
| `run_id` | 実行単位ID |
| `task_id` | 入力または出力ファイルから判別した作業ID |
| `fixture` | 使用したfixture |
| `started_at` / `ended_at` | 実行時刻 |
| `checks` | check名、結果、メッセージ |
| `result` | 検証全体の `passed` または `failed` |
| `failure_reason` | 失敗時の理由 |
| `rerun_condition` | 再実行に必要な変更 |
| `feedback_memo` | fixture、check、approval boundaryへ反映する内容 |
| `residual_risk` | checkだけでは判定できず人間が確認する内容 |
| `log_path` | `samples/run_logs/`へ保存したJSON記録の場所 |

各checkは実行結果をJSONで標準出力へ返し、同じ内容を`samples/run_logs/`へ1実行1ファイルで保存する。ファイル名は`check名-process ID-開始時刻.json`とし、成功・失敗の両方をUTF-8で保存する。DBやプロセスメモリだけの保存には置き換えず、既存ログを上書きしない。

## 7. StudyHub操作設計

| operation id | 画面表示 | command | args | 終了コード1の許容 |
|---|---|---|---|---|
| `valid-fixture` | 正常な入力構造を検証 | `node` | `checks/check_task_fixture.js fixtures/task_success.json` | no |
| `missing-input` | 入力不足を検出 | `node` | `checks/check_task_fixture.js fixtures/task_missing_input.json` | yes |
| `allowed-operations` | 許可された操作を検証 | `node` | `checks/check_no_forbidden_ops.js fixtures/task_success.json` | no |
| `forbidden-operations` | 禁止操作を検出 | `node` | `checks/check_no_forbidden_ops.js fixtures/task_forbidden_operation.json` | yes |
| `check-output-schema` | 出力形式を検証 | `node` | `checks/check_output_schema.js samples/expected_output.md` | no |

- presentationは`command`、lifecycleは`one-shot`とする。
- working directoryは`category/StudyAI/src/apps/system46_ai_harness_engineering`とする。
- 教材欄には3種類の入力例、3種類のcheck、期待する出力例を個別に表示する。
- コマンド結果のJSONには`log_path`を含め、保存された実行記録の場所を画面から確認できるようにする。

## 8. 確認手順

1. success fixtureの入力構造と許可操作を個別に検証する
2. expected outputの3つの必須見出しを検証する
3. missing input fixtureを検証し、停止理由が自動保存されることを確認する
4. forbidden operation fixtureを検証し、自動実行の禁止境界を確認する
5. 各検証が保存したrun logとfeedback memoを比較する

## 9. 完了条件

- fixture、check、approval、logの役割を説明できる
- AI作業を再実行可能にする要素を列挙できる
- 禁止操作を検査可能な形にできる

## 10. 安全性

- 実秘密情報、実顧客データ、破壊的操作を扱わない
- checkは教材ディレクトリ内のfixtureとoutputだけを対象にする
- 外部AI API課金を伴う検証は行わない

## 11. 検証コマンド

```bat
cd /d C:\work\work20260617\category\StudyAI\src\apps\system46_ai_harness_engineering
rtk node checks\check_task_fixture.js fixtures\task_success.json
rtk node checks\check_task_fixture.js fixtures\task_missing_input.json
rtk node checks\check_no_forbidden_ops.js fixtures\task_success.json
rtk node checks\check_no_forbidden_ops.js fixtures\task_forbidden_operation.json
rtk node checks\check_output_schema.js samples\expected_output.md
```

入力不足と禁止操作の検出は、検出結果をJSONへ保存した後に終了コード1を返す。StudyHubでは`allowFailure`により教材用の失敗結果として表示する。
