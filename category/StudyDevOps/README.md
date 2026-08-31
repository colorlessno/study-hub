# StudyDevOps

CI、テスト自動化、可観測性、障害対応を、小さな実装を動かしながら学ぶ教材群です。AIで作った成果物を読むだけで終わらせず、**予想する → 実行する → 結果を説明する → 構成と処理を確認する**までを1テーマの学習単位にします。

## 学習経路

| グループ | 対象 | 到達点 | 状態 |
|---|---|---|---|
| CIとテスト | devops01〜05 | build、unit、API、E2E、DBテストをCIの証拠として残せる | 学習導線・自動CIあり |
| 可観測性と障害対応 | devops06〜09 | request ID、health、ログ調査、runbookを一連の運用として説明できる | 学習導線・自動CIあり |
| リリース判定 | devops10 | 自動確認と運用確認の証拠からリリース可否を判断する | 画面入力・ブラウザ内保存・Markdown出力あり |

最初はdevops01から順番に進めます。テストの層がbuildからDBへ段階的に広がるため、「何を、どこまで自動確認しているか」を比較しやすい並びです。

## CIとテストの入口

| テーマ | 学習ノート | 主な証拠 |
|---|---|---|
| devops01 GitHub Actions build | [再開する](./doc/learning_notes/devops01_github_actions_build/README.md) | buildログ |
| devops02 lint / unit test | [再開する](./doc/learning_notes/devops02_lint_unit_test/README.md) | lintとunit testの分離 |
| devops03 API test | [再開する](./doc/learning_notes/devops03_api_test/README.md) | 正常系・入力異常・死活確認 |
| devops04 Playwright E2E | [再開する](./doc/learning_notes/devops04_playwright_e2e/README.md) | ブラウザ操作と失敗時artifact |
| devops05 DB付きCI | [再開する](./doc/learning_notes/devops05_db_ci/README.md) | PostgreSQL初期化と結合テスト |

これらは実際の[StudyDevOps CI workflow](../../.github/workflows/studydevops-ci.yml)でも実行します。ローカル確認は学習ノート、GitHub上の結果はPull RequestのChecksから確認します。

## 可観測性と障害対応の入口

| テーマ | 学習ノート | 主な証拠 |
|---|---|---|
| devops06 request ID付きログ | [再開する](./doc/learning_notes/devops06_request_id_logging/README.md) | 正常・失敗を結ぶ構造化ログ |
| devops07 health check | [再開する](./doc/learning_notes/devops07_health_check_endpoint/README.md) | health 200とready 503の分離 |
| devops08 Docker logs調査 | [再開する](./doc/learning_notes/devops08_docker_logs_investigation/README.md) | 起動失敗とruntime errorの分類 |
| devops09 障害調査Runbook | [再開する](./doc/learning_notes/devops09_incident_runbook/README.md) | 事実・仮説・判断を分けた報告書 |
| devops10 リリース判定 | [確認する](./doc/learning_notes/devops10_evidence_driven_design_review/README.md) | build、test、health、readiness、ロールバックの証拠 |

devops06〜08のシグナルはCIで自動確認し、devops09で障害対応を記録します。devops10では、これまでの実行証拠と復旧準備からリリース可否を判断します。

## 最初に確認する

リポジトリルート `C:\work\work20260617` から、外部サービスを使わない2テーマを実行します。

```bat
npm.cmd --prefix category/StudyDevOps/src/apps/devops01_github_actions_build/app run build
npm.cmd --prefix category/StudyDevOps/src/apps/devops02_lint_unit_test run check
```

期待結果は、devops01がbuild情報のJSONを出力し、devops02が`lint ok`と3件のテスト成功を出力することです。コマンドが通ったら、各学習ノートの「説明してみる」に答えます。

## 構成

```text
category/StudyDevOps/
  src/apps/            実行対象、テスト、Docker構成
  doc/
    requirements/      何を満たすか
    basic_design/      どの構成で満たすか
    detailed_design/   ファイル・処理・検証方法
    learning_notes/    学習手順、観察点、説明演習
.github/workflows/
  studydevops-ci.yml   devops01〜09を検証するCI
```

## 技術と範囲

- Node.js 20 / JavaScript / TypeScript
- GitHub Actions、Playwright、Docker / Docker Compose、PostgreSQL
- 教材用の固定値だけを使い、secret、token、個人情報、本番DBは扱いません。
- CIは品質の一部を自動確認する教材であり、本番デプロイや組織向け運用設計までは対象外です。
- `node_modules`、`.env`、Playwrightの生成物はGit管理しません。

このリポジトリは個人学習用で、Claude Code / CodexなどのAI支援も利用しています。完了とは「AIが作ったコードが動く」ではなく、確認対象、失敗時の切り分け、残る制約を自分の言葉で説明できる状態を指します。
