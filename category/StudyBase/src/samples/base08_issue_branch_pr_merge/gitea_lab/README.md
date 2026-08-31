# ローカルGiteaによるチーム開発演習

Giteaを社内Gitサーバーに見立て、企業案件で使われるPull Request中心の基本手順を安全なローカル環境で一巡します。実GitHub、現在のリポジトリ、実務データは変更しません。

## 演習で使う役割

| 役割 | 操作 |
|---|---|
| 依頼者 | Issueへ目的と完了条件を書く |
| 開発担当 | ブランチ作成、変更、検証、push、Pull Request、指摘対応を行う |
| レビュー担当 | 差分と検証結果を確認し、修正依頼または承認を行う |
| マージ担当 | 承認済みPull Requestをmainへマージする |

最初は1アカウントで役割を読み替えて構いません。発展編では管理者が開発担当とreview担当の2アカウントを作り、別ブラウザーまたはプライベートウィンドウで役割を分けます。

## 前提と安全事項

- Docker Desktop、Git、Node.js 20以上を使用する。
- 演習専用のユーザー名とパスワードを使い、GitHubや業務システムと共用しない。
- Web UIは`http://127.0.0.1:3418/`だけで使用する。
- コマンドはGitea演習フォルダから実行する。
- Docker imageの初回取得時だけインターネット接続が必要になる。

## Giteaを起動する

```bat
cd /d C:\work\work20260617\category\StudyBase\src\samples\base08_issue_branch_pr_merge\gitea_lab
docker compose -p studyhub-base08 up -d
docker compose -p studyhub-base08 ps
```

長時間監視は行いません。`ps`を1回確認し、起動途中なら少し置いてからブラウザーで`http://127.0.0.1:3418/`を開きます。

初回画面ではSQLite3を選び、ベースURLが`http://127.0.0.1:3418/`であることを確認して、演習専用の管理者アカウントを作ります。次に空のrepository `workflow-practice` を作成します。README、`.gitignore`、licenseの自動生成は選びません。

## 練習用リポジトリを一時領域へコピーする

教材原本や現在のGit repository内で`git init`しないよう、OSの一時領域へコピーします。

```bat
set PRACTICE_ROOT=%TEMP%\studybase-base08-practice
xcopy seed_repository "%PRACTICE_ROOT%" /E /I /Y
cd /d "%PRACTICE_ROOT%"
git init -b main
git config user.name "StudyBase Developer"
git config user.email "developer@example.invalid"
git add .
git commit -m "Initialize workflow practice"
git remote add origin http://127.0.0.1:3418/<Giteaユーザー名>/workflow-practice.git
git push -u origin main
```

`<Giteaユーザー名>`は実際の演習用ユーザー名へ置き換えます。初回pushではGiteaの認証情報を求められる場合があります。

## mainを保護する

Giteaのrepository設定でmainのbranch protection ruleを追加します。画面名はversionによって多少異なりますが、次を目標にします。

- mainへ直接pushしない。
- Pull Request経由の変更を必須にする。
- 発展編ではreview担当1名の承認を必須にする。
- merge後にremoteの作業branchを削除する。

実案件では管理者が定めた既存ルールに従い、開発担当が勝手に保護設定を変えません。

## Issueから作業ブランチを作る

GiteaでIssueを作ります。

- 件名: `チーム開発ルールへ完了条件を追加する`
- 目的: merge判断を誰でも同じ基準で行えるようにする。
- 完了条件: `## 完了条件`節があり、レビュー承認が明記され、検証scriptが成功する。
- 対象外: CI/CDとrelease手順。

Issue番号が`1`なら、ローカルで次を実行します。

```bat
git switch -c feature/issue-1-completion-rule
node scripts\check-workflow.mjs
```

最初の検証は失敗します。失敗理由を読んでから`docs\team-workflow.md`へ次を追加します。

```markdown
## 完了条件

- 変更内容がIssueの完了条件を満たしている。
- 自動検証が成功している。
- review担当が差分を確認し、レビュー承認している。
```

差分と検証結果を確認してcommit・pushします。

```bat
git diff --check
git diff -- docs\team-workflow.md
node scripts\check-workflow.mjs
git add docs\team-workflow.md
git commit -m "docs: add merge completion rule"
git push -u origin feature/issue-1-completion-rule
```

## Pull Requestを作る

Giteaで`feature/issue-1-completion-rule`から`main`へのPull Requestを作ります。

- 目的と関連Issueを書く。例: `Closes #1`
- 変更内容を書く。
- 実行したcommandと成功結果を書く。
- 未確認事項があれば隠さず書く。
- 発展編ではreview担当を指定する。

この段階では自分でmergeせず、reviewへ進みます。

## 修正依頼へ対応する

レビュー担当は[レビュー指摘シナリオ](review_scenario.md)の指摘をPull Requestへ投稿し、修正を依頼します。開発担当は指摘の意図を確認し、`docs\team-workflow.md`の完了条件へ次を追加します。

```markdown
- merge後、開発担当はローカルmainをremote mainへ同期している。
```

同じ作業branchで修正し、PRを作り直さず追加pushします。

```bat
node scripts\check-workflow.mjs
git diff --check
git add docs\team-workflow.md
git commit -m "docs: add local main synchronization"
git push
```

Pull Request上で原因、対処、横展開、再確認結果を回答します。レビュー担当は新しい差分と検証結果を再確認して承認します。

## サーバー側でmainへマージする

承認後、Gitea上でSquash and mergeを選び、作業branchも削除します。ここで更新されたのはGitea上の`main`です。ローカルの`main`はまだ古いままです。

企業によってmerge commit、squash merge、rebase mergeの採用方針は異なります。実案件ではrepositoryのルールに従います。

## ローカルmainを同期する

「ローカルmainへもう一度mergeする」のではなく、server側で更新されたmainを取得してfast-forwardします。

```bat
git switch main
git pull --ff-only origin main
git fetch --prune origin
git status
git log --oneline --graph --decorate --all -10
```

確認すること:

- `git status`がcleanである。
- `main`と`origin/main`が同じcommitを指している。
- Issue、PR、review、mergeの記録がGiteaに残っている。
- squash mergeの場合、元の作業branchのcommitがmain上で1つにまとまっている。

## 後片付けする

まずrepositoryルートへ戻り、コンテナだけを停止します。named volumeを残すため、後日同じ状態から再開できます。

```bat
cd /d C:\work\work20260617\category\StudyBase\src\samples\base08_issue_branch_pr_merge\gitea_lab
docker compose -p studyhub-base08 down --remove-orphans
```

演習を完全にやり直すときだけ、Gitea内のrepositoryやIssueを含むnamed volumeも削除します。

```bat
docker compose -p studyhub-base08 down --volumes --remove-orphans
```

一時リポジトリは、`%PRACTICE_ROOT%`がOSの一時領域配下であり、必要な記録を残したことを確認してから削除します。誤削除防止のため、この教材では削除コマンドを提示しません。

## 実案件で追加確認すること

- branch命名規則、commit規則、merge方法
- 必須review人数、Code Owners、職務分離
- CIの必須check、静的解析、脆弱性scan
- secretをcommitしない仕組み
- release、deploy、rollback、監査証跡

この演習はPR中心の共通部分を扱います。組織固有の規約がある場合は、その規約を優先します。
