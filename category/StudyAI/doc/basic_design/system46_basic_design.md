# system46 基本設計

## AI harness engineering

## 0. 関連要件

- `../requirements/system46_requirements.md`

## 1. 設計目的

AI作業を再実行可能にするために、入力・制約・fixture・deterministic check・approval boundary・ログを設計する教材にする。

## 2. 対象領域

- harness の役割
- sandbox
- fixture
- deterministic check
- evaluation gate
- tool permission
- reproducible run
- feedback loop

## 3. 成果物構造

```text
category/StudyAI/
  doc/learning_notes/system46_ai_harness_engineering/
    README.md
    docs/
      harness_contract.md
      approval_boundary.md
      run_log_template.md
      feedback_loop.md
  src/apps/system46_ai_harness_engineering/
    fixtures/
    checks/
    samples/
      expected_output.md
      run_logs/
```

## 4. 入力

| 入力 | 内容 |
|---|---|
| task fixture | AIに渡す固定入力 |
| expected output | 期待する成果物または検査条件 |
| permission rule | 許可操作、承認が必要な操作、禁止操作 |
| run condition | 再実行に必要な環境条件 |

入力例は、必須項目が揃った`task_success.json`、必須項目が不足した`task_missing_input.json`、禁止操作を含む`task_forbidden_operation.json`の3件とする。

## 5. 出力

| 出力 | 内容 |
|---|---|
| harness contract | 入力・制約・検証基準 |
| deterministic check | 成果物を機械的に確認する検査 |
| run log | 実行結果、失敗理由、再実行条件 |
| feedback memo | 次回改善する指示・fixture |

各検証は、検証結果、失敗理由、再実行条件、改善メモ、残る確認事項、保存先をJSONで標準出力へ返す。同じ内容を`samples/run_logs/`へ1実行1ファイルのUTF-8 JSONとして保存し、成功と失敗のどちらも後から比較できるようにする。

## 6. 処理方針

1. AI作業の入力と制約を定義する
2. fixtureと期待結果を用意する
3. 機械的に確認できるcheckを作る
4. 危険操作のapproval boundaryを定義する
5. 実行ログと失敗理由を記録する
6. fixtureまたはcheckへフィードバックを反映する

## 7. StudyHubへの組み込み

| 操作 | 使用する検証と入力 |
|---|---|
| 正常な入力構造を検証 | `check_task_fixture.js`と`task_success.json` |
| 入力不足を検出 | `check_task_fixture.js`と`task_missing_input.json` |
| 許可された操作を検証 | `check_no_forbidden_ops.js`と`task_success.json` |
| 禁止操作を検出 | `check_no_forbidden_ops.js`と`task_forbidden_operation.json` |
| 出力形式を検証 | `check_output_schema.js`と`expected_output.md` |

- StudyHubでは`command-one-shot`として各検証を個別に実行する。
- 入力不足と禁止操作は、期待どおり検出した場合も検証プロセス自体は終了コード1を返すため、教材画面では失敗例として結果を表示できるよう`allowFailure`を設定する。
- 教材欄から入力例、3種類の検証処理、期待する出力例を開けるようにする。

## 8. 確認観点

- harnessがプロンプト単体と違う理由を説明できるか
- fixture、check、approval、logの役割を説明できるか
- 再実行可能性を高める要素を列挙できるか

## 9. 後続工程への引き継ぎ

詳細設計では、fixture形式、checkコマンド、ログ項目、承認基準の具体例を定義する。
