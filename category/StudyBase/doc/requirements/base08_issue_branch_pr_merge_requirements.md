# base08 Issue・ブランチ・Pull Request・マージ・同期 要件定義

## 1. 目的

現代開発の基本フローである Issue、branch、push、Pull Request、review、merge、ローカル同期の流れを小さく再現し、作業単位と履歴を管理できるようにする。

## 2. 学習対象

- Issue の作成
- branch 名と作業目的の対応
- remote repository への push
- Pull Request の説明
- review 指摘と修正 commit
- protected main を想定した承認と merge
- merge 後のローカル main 同期
- 作業記録の残し方

## 3. 作成する成果物

- Issue テンプレート
- Pull Request テンプレート
- 練習用リポジトリ
- review 指摘対応メモ
- merge 完了確認メモ
- Docker Compose で起動するローカル Gitea 演習環境
- ローカル main 同期確認メモ

## 4. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | Issue に目的、作業内容、完了条件を記録できる |
| FR-02 | Issue に対応する branch を作成できる |
| FR-03 | Pull Request に変更内容、確認内容、未確認事項を記録できる |
| FR-04 | review 指摘を修正 commit として反映できる |
| FR-05 | merge 後に作業完了状態を確認できる |
| FR-06 | 作業 branch を remote repository へ push できる |
| FR-07 | main への直接 push を避け、Pull Request 経由で変更できる |
| FR-08 | 開発担当と review 担当の役割を分け、修正依頼と承認を体験できる |
| FR-09 | remote main の merge 結果をローカル main へ fast-forward で同期できる |
| FR-10 | StudyHubからGiteaを起動・停止し、状態とログを確認し、GiteaのWeb UIを別画面で開ける |
| FR-11 | 外部通信を行わない一時Git環境で、Issueからマージ後の同期までを一括確認できる |
| FR-12 | StudyHubから教材ファイルの検証を実行できる |

## 5. 非機能要件

| ID | 要件 |
|---|---|
| NFR-01 | 標準演習は `127.0.0.1` の Gitea を使い、実 GitHub を変更しない |
| NFR-02 | PR本文は短くても、目的、変更点、確認結果を含める |
| NFR-03 | 指摘対応は同種問題の横展開確認を含める |
| NFR-04 | Gitea は Docker Compose で隔離し、Web UI はIPv4ループバックの`127.0.0.1`だけへ公開する |
| NFR-05 | 演習用認証情報を実サービスと共用せず、リポジトリへ保存しない |
| NFR-06 | Gitホスティング製品固有の画面名より、移植可能な開発手順を優先する |

## 6. 対象外

- GitHub Projects の本格運用
- 自動デプロイ
- 大規模チーム運用
- 組織固有の Git Flow、release branch、承認ワークフロー
- Gitea Actions runner を使う CI/CD

## 7. 受入条件

- Issue から branch、push、PR、review、merge、ローカル同期までの流れを説明できる
- PR に目的、変更内容、確認結果、残課題を書ける
- review 指摘に対して修正内容と横展開確認範囲を記録できる
- main への直接 push を避ける理由と review 担当の役割を説明できる
- merge 後に `git switch main` と `git pull --ff-only origin main` でローカルを同期できる
- StudyHubの起動、状態確認、ログ確認、停止が動作する
- 停止後もnamed volumeに演習データが保持される
- 一時Git環境でローカルmainと`origin/main`が同じコミットになる

## 8. 学習観点

- 作業は Issue 単位に分ける
- PR は差分を説明する成果物である
- 指摘対応は一点修正ではなく横展開する
- merge はサーバー側 main を更新し、ローカル main は別途同期する
- 企業ごとに branch 戦略や merge 方法は異なるため、採用ルールを確認する
