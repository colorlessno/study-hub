# StudyBase

他の`StudyXX`へ進む前に、AIが生成した成果物を自分で確認・説明・修正するための共通基礎を学ぶプロジェクトです。要求整理、見積り、テスト前提、責任分界、Git、npm、API確認、ポートフォリオ説明を一続きの経路として扱います。

## 最初に取り組むこと

リポジトリルートで次を実行します。Node.js 20以上とGitを使い、外部通信や既存リポジトリの変更は行いません。

```powershell
node category/StudyBase\scripts\validate-studybase.mjs base01
```

次に学習ノートの「始める前の問い」へ短く答え、サンプルと記入例の差を1つ説明します。

## 推奨学習経路

| 段階 | テーマ | 学習の証拠 |
|---|---|---|
| Clarify and plan | [base01 曖昧依頼ヒアリング](doc/learning_notes/base01_ambiguous_request_hearing/README.md) | 確定・仮定・未確定を分けられる |
| Clarify and plan | [base02 情報不足時の暫定成果物](doc/learning_notes/base02_incomplete_information_deliverable/README.md) | 書ける範囲と限界を示せる |
| Clarify and plan | [base03 見積もり根拠](doc/learning_notes/base03_estimate_basis/README.md) | 範囲・分解・リスクから説明できる |
| Clarify and plan | [base04 テスト成立条件](doc/learning_notes/base04_test_precondition_checklist/README.md) | 実行前提と判定基準を確認できる |
| Clarify and plan | [base05 RACI / 責任分界](doc/learning_notes/base05_raci_responsibility_matrix/README.md) | 実施・承認・相談・共有を分けられる |
| Version control | [base06 Git基本操作](doc/learning_notes/base06_git_basic/README.md) | status・diff・commitを説明できる |
| Version control | [base07 branch・merge・conflict](doc/learning_notes/base07_branch_merge_conflict/README.md) | 競合を再現して解消できる |
| Version control | [base08 Issue → PR → merge → 同期](doc/learning_notes/base08_issue_branch_pr_merge/README.md) | ローカルGiteaでチーム開発手順を通せる |
| Execute and explain | [base09 npm scriptsの使い分け](doc/learning_notes/base09_npm_scripts/README.md) | dev・build・test・startを区別できる |
| Execute and explain | [base10 curlによるAPI確認](doc/learning_notes/base10_curl_api_check/README.md) | UIなしで正常系・失敗系を切り分けられる |
| 実行結果を説明する | [base11 ポートフォリオのデモ・説明](doc/learning_notes/base11_portfolio_demo_presentation/README.md) | 主張を証拠と制限付きで説明できる |
| システム構成 | [base12 システム構成を読み解く入口](doc/learning_notes/base12_system_anatomy_walkthrough/README.md) | 正規テーマ`StudyArchitecture arch01`へ迷わず移動できる |

base01〜05は文書演習、base06〜07は一時Gitリポジトリ演習、base08は文書と任意のローカルGitea演習、base09〜10はNode.js実行演習、base11は説明案の作成演習です。base12は重複教材を作らず、`StudyArchitecture arch01`への案内入口とします。

## 学習サイクル

1. **入力を読む**: 依頼、サンプル、コード、ログをそのまま確認する。
2. **予想する**: 不明点、差分、コマンド結果、失敗条件を先に書く。
3. **手を動かす**: テンプレート記入または隔離された実行を行う。
4. **証拠を残す**: diff、test結果、API status、文書の対応箇所を示す。
5. **説明する**: 分かったこと、未確認、次の行動を自分の言葉でまとめる。

## 自動検証

テーマ指定または全件を実行できます。

```powershell
node category/StudyBase\scripts\validate-studybase.mjs base07
node category/StudyBase\scripts\validate-studybase.mjs
```

base06〜07はOSの一時領域へ教材をコピーしてGit操作し、終了時に削除します。base08の自動検証は外部通信を使わない一時Git環境でIssueから同期までを確認し、Giteaの起動や画面上のPR操作は行いません。base10は空いている一時portでAPIを起動し、応答確認後に停止します。CIでも [StudyBase validation](../../.github/workflows/studybase-validation.yml) を実行します。

## 構成

```text
category/StudyBase/
  doc/templates/       記入用テンプレート
  doc/learning_notes/  再開手順・観察・完了条件
  doc/requirements/    要件定義
  doc/basic_design/    基本設計
  doc/detailed_design/ 詳細設計
  scripts/             隔離された自動検証
  src/samples/         問題、記入例、小規模実装
```

## 安全上の前提

- base06〜07で現在のリポジトリや教材原本に`git init`しない。
- base08のGiteaは`127.0.0.1`だけへ公開し、実サービスのパスワードや実務データを使わない。
- base08で実GitHubのIssue・PRを作るのは、公開対象と権限を確認した明示的な作業だけにする。
- base09は外部依存なし、base10はlocalhostだけを使用する。
- 実行成功を理解済みと同一視せず、予想・証拠・説明を完了条件にする。
