# desktop01 基本設計
## Electron local environment automation

## 0. 関連要件

- `../requirements/desktop01_electron_local_environment_automation_requirements.md`

## 1. 設計目的
Electronのmain / renderer / IPCを使い、ボタン操作から安全な環境準備処理、ログ表示、キャンセル、失敗時cleanupまでを学べる教材にする。
## 2. 対象範囲

- Electron main / renderer
- IPC
- child_process.spawn
- git cloneの疑似または安全な実行
- Python venv作成
- install log
- cancellation
- rollback / cleanup plan

## 3. 成果物構成

```text
category/StudyDesktop/
  src/apps/desktop01_electron_local_environment_automation/
    package.json
    src/
      main/
      renderer/
      preload/
    scripts/
      safe_install_plan.js
  doc/learning_notes/desktop01_electron_local_environment_automation/
    README.md
    docs/
      ipc_flow.md
      command_allowlist.md
      failure_cleanup.md
```

## 4. 入力
| 入力 | 内容 |
|---|---|
| インストール対象 | 事前定義された教材用タスク |
| 実行依頼 | rendererからmainへ送るIPCメッセージ |
| allowlist | 実行してよいコマンドと引数 |
| cancellation | ユーザーによる中断操作 |

## 5. 出力
| 出力 | 内容 |
|---|---|
| 進行ログ | stdout / stderr の逐次表示 |
| 状態表示 | queued、running、cancelled、failed、completed |
| cleanup log | 失敗時または中断時の片付け記録 |
| 安全境界メモ | 任意コマンド実行を避ける設計理由 |

## 6. 処理方針
1. rendererでインストール対象を選ぶ
2. IPCでmainへ実行依頼する
3. mainでallowlist済み処理だけをspawnする
4. ログをrendererへ逐次返す
5. キャンセル、失敗、再実行、cleanupを状態遷移として扱う
6. 実ユーザー環境ではなく教材用ディレクトリだけを操作する
## 7. 確認観点

- main / renderer / IPCの役割を説明できるか
- 任意コマンド実行を避ける境界を説明できるか
- 失敗、キャンセル、cleanupの扱いを説明できるか
## 8. 後続工程への引き継ぎ

詳細設計では、IPC payload、状態遷移、allowlist、ログ形式、cleanup手順を定義する。
