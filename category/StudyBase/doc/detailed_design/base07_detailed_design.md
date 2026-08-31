# base07 ブランチ・マージ・競合解消 詳細設計

## ファイル構成

```text
category/StudyBase/
├─ scripts/base07-git-conflict-practice.mjs
├─ src/samples/base07_branch_merge_conflict/practice_repo/
│  ├─ conflict_target.txt
│  └─ README.md
└─ doc/learning_notes/base07_branch_merge_conflict/
   ├─ README.md
   └─ notes/
      ├─ branch_operation_log.md
      ├─ conflict_reproduction.md
      └─ conflict_resolution_note.md
```

## スクリプトの引数

| 引数 | 処理 |
|---|---|
| `branch-creation` | feature/aを作り、現在位置と一覧を表示する |
| `branch-commits` | mainとfeature/aへ変更をコミットし、分岐した履歴を表示する |
| `conflict-reproduction` | マージ競合を発生させ、状態と競合マーカーを表示する |
| `conflict-resolution` | 両方の意図を統合し、差分と解消コミットを表示する |
| `resolution-check` | 解消後のファイル、状態、履歴を表示する |
| `all-steps` | 分岐から解消後の確認までを続けて表示する |

未指定時は`all-steps`を実行し、表にない引数はエラーにします。

## 一時リポジトリの作成

1. `os.tmpdir()`の直下へ`studybase-git-conflict-`で始まる一時フォルダを作る。
2. `practice_repo`を一時フォルダ内の`practice`へコピーする。
3. `git init -b main`を実行する。
4. 練習用の利用者名、メールアドレス、除外設定をリポジトリ内へ設定する。
5. 原本の全ファイルを初回コミットへ登録する。

## 分岐と競合の作成

feature/aでDecision行を`feature branch choice`へ変更してコミットします。mainでは同じ行を`main branch choice`へ変更してコミットします。mainから`git merge feature/a`を実行し、終了コードが0以外、状態が`UU`、ファイルに3種類の競合マーカーがあることを検証します。

## 解消処理

Decision行を`main and feature choices combined`へ置き換えます。`git add`後の差分に統合内容があることを検証し、`Resolve practice conflict`としてコミットします。

## 解消後の検証

`git status --short`が空で、ファイルに統合内容があり、競合マーカーがなく、履歴に解消コミットがあることを検証します。期待と異なる場合は終了コードを0以外にします。

## 後片付け

`finally`で一時フォルダを再帰削除します。削除対象は、この実行で作った一時フォルダだけです。
