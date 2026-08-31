# desktop01 詳細設計
## Electron local environment automation

## 0. 関連文書

- `../requirements/desktop01_electron_local_environment_automation_requirements.md`
- `../basic_design/desktop01_basic_design.md`

## 1. 製造対象

```text
src/apps/desktop01_electron_local_environment_automation/
  README.md
  package.json
  src/
    main/
      main.js
      taskRunner.js
      commandAllowlist.js
      cleanup.js
    preload/
      index.js
    renderer/
      index.html
      renderer.js
      styles.css
  scripts/
    safe_install_plan.js
  workspace/
    .gitkeep
doc/learning_notes/desktop01_electron_local_environment_automation/
  README.md
  docs/
    ipc_flow.md
    command_allowlist.md
    state_transition.md
    failure_cleanup.md
    command_log_example.md
```

## 2. 画面設計
| UI要素 | 役割 |
|---|---|
| task selector | 事前定義された教材taskを選ぶ |
| start button | 選択taskの実行を依頼する |
| cancel button | 実行中taskの停止を依頼する |
| status badge | queued、running、completed、failed、cancelled、cleaning を表示する |
| log panel | stdout / stderr / system event を時系列で表示する |
| cleanup result | 失敗時またはキャンセル時の片付け結果を表示する |

## 3. IPC payload 設計
| channel | direction | payload | 内容 |
|---|---|---|---|
| `task:list` | renderer -> main | none | 実行可能task一覧を取得 |
| `task:start` | renderer -> main | `{ taskId }` | allowlist済みtaskを開始 |
| `task:cancel` | renderer -> main | `{ runId }` | 実行中taskをキャンセル |
| `task:event` | main -> renderer | `{ runId, type, level, message, timestamp }` | 状態、標準出力、標準エラー、終了結果、cleanup結果を通知 |

## 4. task allowlist 設計
| taskId | command | args | 目的 |
|---|---|---|---|
| `plan-only` | `node` | `scripts/safe_install_plan.js --plan` | 実行予定の手順だけ表示する |
| `mock-clone` | `node` | `scripts/safe_install_plan.js --mock-clone` | git clone相当の教材ファイル作成 |
| `mock-venv` | `node` | `scripts/safe_install_plan.js --mock-venv` | Python venv相当の教材フォルダ作成 |
| `mock-install` | `node` | `scripts/safe_install_plan.js --mock-install` | install log相当の出力 |
| `mock-wait` | `node` | `scripts/safe_install_plan.js --mock-wait` | キャンセル確認用の待機処理 |
| `mock-failure` | `node` | `scripts/safe_install_plan.js --mock-failure` | 不完全な生成物を作成して失敗し、run単位cleanupを確認 |

任意文字列のcommandやargsは受け取らない。rendererは`taskId`だけを送信し、main側でcommandとargsを決定する。
## 5. 状態遷移設計
```text
idle -> queued -> running -> completed
idle -> queued -> running -> cleaning -> failed
idle -> queued -> running -> cancelling -> cleaning -> cancelled
```

| state | 内容 |
|---|---|
| `idle` | 実行なし |
| `queued` | task受付済み |
| `running` | child process実行中 |
| `cancelling` | キャンセル要求受付済み |
| `cleaning` | workspaceの片付け中 |
| `completed` | 正常終了 |
| `failed` | 異常終了 |
| `cancelled` | キャンセル完了 |

## 6. ログ設計
| field | 内容 |
|---|---|
| `runId` | 実行単位ID |
| `timestamp` | ISO 8601形式 |
| `source` | `system`、`stdout`、`stderr` |
| `level` | `info`、`warn`、`error` |
| `message` | 表示用メッセージ |

ログには実秘密情報、認証情報、ユーザー固有パスを含めない。教材workspace配下の相対パスを優先して表示する。
## 7. cleanup 設計
| ケース | cleanup内容 |
|---|---|
| `mock-clone` 失敗 | workspace内の途中作成フォルダを削除 |
| `mock-venv` 失敗 | workspace内の疑似venvフォルダを削除 |
| `mock-install` 失敗 | install logを残し、途中artifactを削除 |
| cancel | child process停止後、taskごとのcleanupを実行 |

cleanup対象は、実行開始時に作成したworkspace配下のpathだけに限定する。workspace外の削除は実装しない。
## 8. 確認手順
1. task一覧を取得し、rendererに表示されることを確認する
2. `plan-only` を実行し、ログが逐次表示されることを確認する
3. `mock-clone`、`mock-venv`、`mock-install` を実行する
4. 実行中にcancelし、状態が `cancelling -> cleaning -> cancelled` になることを確認する
5. `mock-failure`を実行し、`cleaning -> failed`とcleanup結果を確認する
6. command allowlist外のtaskIdが拒否されることを確認する
## 9. 完了条件

- main / renderer / preload / IPC の責務が分かれる
- rendererから任意コマンドを実行できない設計になっている
- 実行ログ、失敗、キャンセル、cleanupを状態として説明できる
- workspace外に副作用を出さない設計になっている

## 10. 安全性

- 管理者権限が必要な操作は扱わない
- 実git clone、実依存インストールは初期教材では行わず、mock taskを基本にする
- workspace外のファイル削除・移動は行わない
- 実秘密情報、認証情報、個人情報をログに出さない
