# 状態遷移

## task状態

| 状態 | 意味 | 次の状態 |
| --- | --- | --- |
| `idle` | 実行中taskなし | `queued` |
| `queued` | allowlist済みtask IDを受理した | `running` |
| `running` | child process起動済み | `completed`, `failed`, `cancelling` |
| `cancelling` | userの停止要求を受理した | `cleaning` |
| `cleaning` | child process停止後にrun単位の後片付けを実行中 | `cancelled` |
| `completed` | exit code が0 | `idle` |
| `failed` | exit codeが非0、またはspawn失敗 | `idle` |
| `cancelled` | userが停止した | `idle` |
allowlist外のtask IDはprocessを起動せず、IPC呼び出しをエラーにする。

## log項目

| 項目 | 例 |
| --- | --- |
| `runId` | UUID |
| `type` | `queued`、`running`、`stdout`、`stderr`、`cleaning`、`completed`、`failed`、`cancelled` |
| `level` | `info`、`warn`、`error` |
| `message` | task ID、標準出力、終了コード、cleanup結果 |
| `timestamp` | ISO 8601 timestamp |

## 失敗時の扱い

失敗時は、原因説明に必要な証拠を残す。ただし、後続taskが不完全な状態を自動再利用しないようにする。
