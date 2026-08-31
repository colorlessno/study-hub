# コマンド allowlist

## 許可taskの形

各taskは以下で定義する。

| 項目 | 意味 |
| --- | --- |
| `taskId` | 安定したtask識別子 |
| `description` | 画面に表示する説明 |
| `command` | アプリ側が所有する実行ファイル |
| `args` | アプリ側で固定した引数 |

## MVP task

| task | 目的 | 副作用 |
| --- | --- | --- |
| `plan-only` | install plan を模擬表示する | ファイルを書かない |
| `mock-clone` | clone結果を模擬する | run directoryへ教材ファイルを書く |
| `mock-venv` | Python venvを模擬する | run directoryへmarkerを書く |
| `mock-install` | 依存導入を模擬する | run directoryへlogを書く |
| `mock-wait` | キャンセル可能な待機処理 | ファイルを書かない |
| `mock-failure` | 失敗とcleanupを確認する | 不完全artifactを作り、失敗後にrun directoryを削除する |

## 拡張ルール

実setup taskを追加する前に、以下を定義する。

1. 正確なcommandと固定引数。
2. working directory。
3. output path。
4. timeout。
5. cleanup rule。
6. 無関係なlocal pathを露出しない失敗message。

user inputが必要な場合は、dataとして検証してから、app workspace配下の絶対pathへ変換する。
