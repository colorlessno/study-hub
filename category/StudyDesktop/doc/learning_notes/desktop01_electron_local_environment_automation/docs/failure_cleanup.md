# 失敗時cleanup

## cleanup境界

cleanup対象は以下に限定する。
```text
src/apps/desktop01_electron_local_environment_automation/workspace/
```

このdirectory外のファイルを削除してはいけない。
## cleanup mode

| mode | 動作 | 用途 |
| --- | --- | --- |
| `plan-only` | 対象手順のみ表示し、ファイルを作らない | 初期確認 |
| Run scoped cleanup | 失敗またはキャンセルした1つのrun directoryだけ削除 | 実装済み |

## 失敗時方針
taskが失敗したら:

1. 画面のevent logへ標準エラーと失敗したtask IDを残す。
2. `cleaning`を通知する。
3. 失敗したrun directoryだけを削除する。
4. cleanup結果を含む`failed`を通知する。
5. 自動retryしない。再実行は利用者が選ぶ。
失敗を隠すのではなく、証拠と境界を理解する教材にする。
