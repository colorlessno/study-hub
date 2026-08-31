# desktop01 要件定義
## Electron local environment automation

## 1. 目的

ElectronでUIを作り、ボタン操作から git clone、Python venv、依存インストール、ログ表示、キャンセル、失敗時の扱いまでを安全に学ぶ。

## 2. 学習対象

- Electron main / renderer
- IPC
- child_process.spawn
- git clone
- Python venv
- install log
- cancellation
- rollback / cleanup plan

## 3. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | インストール対象を選ぶUIを用意する |
| FR-02 | renderer から main へ IPC で実行依頼する |
| FR-03 | main 側で `child_process.spawn` を使い、ログを逐次表示する |
| FR-04 | git clone、venv作成、依存インストールの疑似または安全な実行手順を用意する |
| FR-05 | キャンセル、失敗、再実行、cleanup の扱いを定義する |

## 4. 非機能要件

- UIから任意コマンドを直接入力・実行できる形にしない。
- 実ユーザーの既存環境を壊さないよう、作業ディレクトリを教材用に限定する。
- secrets、token、password、個人情報をログに出さない。
- 作成するテキストファイルは UTF-8 BOMなしとする。

## 5. 対象外

- 自動インストーラー製品の完成
- 管理者権限が必要なソフト導入
- 本番配布署名や自動更新

## 6. 成果物

```text
category/StudyDesktop/
  doc/requirements/desktop01_electron_local_environment_automation_requirements.md
  doc/basic_design/desktop01_basic_design.md
  doc/detailed_design/desktop01_detailed_design.md
  doc/learning_notes/desktop01_electron_local_environment_automation/
```

## 7. 受入条件

- Electron の main / renderer / IPC の役割を説明できる。
- OSコマンド実行を安全に扱う境界を説明できる。
- インストールログ、失敗、キャンセル、cleanup の扱いを説明できる。
