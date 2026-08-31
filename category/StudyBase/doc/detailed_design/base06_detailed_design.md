# base06 Git基本操作 詳細設計

## ファイル構成

```text
category/StudyBase/
├─ scripts/base06-git-practice.mjs
├─ src/samples/base06_git_basic/practice_repo/
│  ├─ .gitignore
│  ├─ ignored.log
│  ├─ notes.txt
│  └─ README.md
└─ doc/learning_notes/base06_git_basic/
   ├─ README.md
   └─ notes/
      ├─ common_errors.md
      ├─ diff_reading_note.md
      └─ git_command_log.md
```

## スクリプトの引数

| 引数 | 処理 |
|---|---|
| `clean-state` | 初回コミット後の状態を表示する |
| `unstaged-diff` | `notes.txt`変更後の状態と差分を表示する |
| `staged-diff` | `notes.txt`をステージし、2種類の差分を表示する |
| `commit-history` | 変更をコミットし、状態と履歴を表示する |
| `ignored-file` | `runtime.log`を作り、除外規則と状態を表示する |
| `all-states` | 各状態を一つの流れで表示する |

未指定時は`all-states`を実行し、表にない引数はエラーにします。

## 一時リポジトリの作成

1. `os.tmpdir()`の直下へ`studybase-git-basic-`で始まる一時フォルダを作る。
2. `practice_repo`を一時フォルダ内の`practice`へコピーする。
3. `git init -b main`を実行する。
4. 練習用の利用者名とメールアドレスをリポジトリ内へ設定する。
5. 原本の全ファイルを初回コミットへ登録する。

## 状態別の処理

未ステージ状態では`notes.txt`へ1行を追加します。ステージ済み状態では同じ変更へ`git add notes.txt`を実行します。コミット状態では`Add a practice note`というメッセージでコミットします。除外状態では`.gitignore`の`*.log`に一致する`runtime.log`を作成します。

## 出力

各区切りに状態名、実行コマンド、コマンド出力を表示します。出力が空の場合は「（出力なし）」と表示し、その意味を補足します。

## 内部検証

スクリプトは、期待するファイル名、差分の追加行、コミットメッセージ、除外規則を`assert`で検証します。期待と異なる場合は終了コードを0以外にします。

## 後片付け

`finally`で一時フォルダを再帰削除します。削除対象は、この実行で作った一時フォルダだけです。
