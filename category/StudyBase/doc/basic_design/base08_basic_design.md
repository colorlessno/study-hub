# base08 Issue・ブランチ・Pull Request・マージ・同期 基本設計
## 0. 関連要件

- `../requirements/base08_issue_branch_pr_merge_requirements.md`

## 1. 設計目的
Issue から branch、push、Pull Request、review、merge、ローカル main 同期までの開発フローを小さく再現する学習サンプルを設計する。
## 2. 対象範囲

- Issue テンプレート
- branch 命名
- ローカル Gitea への push
- Pull Request テンプレート
- main 保護と review 担当による修正依頼・承認
- merge 後のローカル main 同期
- コンテナと演習データの後片付け

## 3. 成果物構成

```text
doc/learning_notes/base08_issue_branch_pr_merge/
  README.md
doc/templates/base08_issue_branch_pr_merge/
  issue_template.md
  pull_request_template.md
  review_response_note.md
src/samples/base08_issue_branch_pr_merge/
  sample_issue.md
  sample_pull_request.md
  sample_review_response.md
  gitea_lab/
    README.md
    docker-compose.yml
    review_scenario.md
    seed_repository/
      README.md
      docs/team-workflow.md
      scripts/check-workflow.mjs
scripts/
  base08-pr-workflow-practice.mjs
```
## 4. 入力
| 入力 | 内容 |
|---|---|
| 作業依頼 | Issue 化する小さい変更 |
| 変更ファイル | PR で差分するファイル |
| review 指摘 | 修正すべき観点 |
| ローカル環境 | Git、Node.js 20以上、Docker Desktop |
| Gitサーバー | `127.0.0.1`で起動したGitea |

## 5. 出力
| 出力 | 内容 |
|---|---|
| Issue | 目的、作業内容、完了条件 |
| Pull Request | 変更内容、確認結果、未確認事項 |
| 指摘対応メモ | 指摘、対処、横展開確認 |
| Git履歴 | branch、修正 commit、merge、main 同期の履歴 |
| サーバー状態 | Issue、Pull Request、review、merge の記録 |
| StudyHub実行結果 | 一時Git環境のブランチ、履歴、検証、同期状態 |

## 6. 処理方針
1. 作業依頼を Issue にする
2. Issue に対応する branch を作る
3. 小さい変更を commit し、remote へ push する
4. main 宛ての PR 本文を作る
5. 検証結果を示して review を依頼する
6. review 担当から修正依頼を出す
7. 開発担当が修正 commit を push し、同種問題を横展開確認する
8. review 担当が承認し、squash merge する
9. 開発担当がローカル main を `pull --ff-only` で同期する
10. ブランチと演習環境を後片付けする

StudyHubはGiteaの起動、別画面でのWeb UI表示、状態確認、ログ確認、停止を提供する。Giteaは埋め込み表示を許可しないため、Web UIは`127.0.0.1:3418`を別画面で開く。別操作として一時Git環境を作成し、Issueからマージ後の同期までを自動実行する。停止時はGiteaのnamed volumeを削除しない。

## 7. 確認観点

- Issue と branch と PR の目的が対応しているか
- PR に確認結果があるか
- 指摘対応に横展開確認が含まれるか
- main へ直接 push せず、review と承認を経由しているか
- remote main とローカル main が同じ commit を指しているか
- 認証情報や実務データを演習環境へ持ち込んでいないか
## 8. 後続工程への引き継ぎ

詳細設計では、テンプレート項目、Giteaの起動、役割分担、修正 commit、merge、同期、後片付けの手順を定義する。
