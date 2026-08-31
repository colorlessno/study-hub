# desktop01 Electron ローカル環境自動化

## 目的

Electron の main / renderer / IPC 境界、コマンド allowlist、mock setup task、cancel、workspace cleanup を学ぶ。

初期MVPでは、実際の `git clone` や実プロジェクトへの依存インストールは行わない。安全な mock task のみを扱う。

## 最初に取り組むこと

1. GUIなし検証を実行し、許可処理・書き込み先・後片付けの境界を確認する。
2. Electronの依存準備後に画面を起動し、`plan-only`を実行する。
3. `mock-failure`を実行し、`cleaning -> failed`と後片付け結果を画面の記録で確認する。

GUIなし検証はNode.js標準機能だけを使うため、`npm ci` の前でも実行できる。

```cmd
cd /d C:\work\work20260617\category\StudyDesktop\src\apps\desktop01_electron_local_environment_automation
rtk npm.cmd run verify
```

検証では次の境界を確認する。

- rendererへ公開するtaskがallowlistに限定されている。
- 未登録taskが拒否される。
- mock処理の出力先が実行単位の `workspace/<run-id>/` に限定される。
- cleanupがworkspace外を拒否する。
- task runnerが `queued`、`running`、`completed` の順にeventを返す。

## コマンド

```cmd
rtk npm.cmd run verify
rtk npm.cmd run plan
rtk npm.cmd run mock:clone
rtk npm.cmd run mock:venv
rtk npm.cmd run mock:install
rtk npm.cmd run mock:wait
rtk npm.cmd run check:allowlist
rtk npm.cmd ci
rtk npm.cmd run setup:electron
rtk npm.cmd run start
```

| コマンド | GUI | 用途 |
|----------|-----|------|
| `npm run verify` | 不要 | 安全境界とmock処理をまとめて検証する |
| `npm run plan` | 不要 | 実行予定だけを表示する |
| `npm run mock:*` | 不要 | workspace内への限定書き込みを個別に確認する |
| `npm run mock:wait` | 不要 | 5秒待機するtaskでcancelを練習する |
| Electron画面の `mock-failure` | 必要 | 失敗時にrun単位の後片付けを行ってからfailedになることを確認する |
| `npm run check:allowlist` | 不要 | UIから選択できるtask IDを確認する |
| `npm run setup:electron` | 不要 | Electron実行ファイルを明示的に取得する |
| `npm run start` | 必要 | Electron UIとIPC eventを確認する |

## OSと実行条件

| 環境 | 実行方法 | 注意点 |
|------|----------|--------|
| Windows / macOS / Linuxのデスクトップ | `npm ci`、`npm run setup:electron`後に`npm run start` | Electronのウィンドウを表示できるログインセッションが必要 |
| CI / SSH / headless Linux | `npm run verify` | GUI起動は行わない |
| WSL | `npm run verify` | GUI転送を構成していない場合はWindows側のNode.jsでUIを確認する |

## workspace

task は `workspace/` 配下だけを操作する。workspace外のファイルを削除、移動、上書きしてはいけない。

検証用の出力は検証終了時に削除される。手動確認用の `manual-run/` は残るため、内容を確認してから `workspace/` 配下だけを片付ける。

## 失敗時の復旧

| 状況 | 確認と復旧 |
|------|------------|
| `npm run verify` が失敗する | 最初の失敗箇所を確認し、`node --version` が20以上か確認して再実行する |
| `npm ci` が失敗する | `node --version` と `npm --version`、ネットワークやproxy設定を確認して再実行する。workspaceは削除しない |
| Electronの画面が出ない | `npm run setup:electron`の完了とGUIを表示できるOSセッションを確認する。プロセスを停止し、まず`npm run verify`でコード側を切り分ける |
| taskが失敗またはcancelされる | event logのtask ID、exit code、run IDを確認する。対象は `workspace/<run-id>/` に限定する |
| workspaceを片付ける | 対象パスがこのアプリの `workspace/` 配下であることを確認し、該当runだけを削除する |

workspace外を一括削除して復旧しない。実taskを追加するときも、先にpreview、run単位cleanup、再実行可能性を設計する。

cancelを確認するときはElectron UIで `mock-wait` を開始し、5秒以内にcancelする。eventが `queued -> running -> cancelling -> cleaning -> cancelled` の順になり、cancel後に `failed` が出ないことを確認する。

StudyHubはWindows環境でGPU子processが起動直後に終了する事象を避けるため、Electronへ`--disable-gpu-sandbox`を起動引数として渡す。アプリが読み込むのはリポジトリ内の固定HTMLだけであり、外部URLは読み込まない。
