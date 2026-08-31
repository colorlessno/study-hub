# GitHub Actionsの処理対応表

実際の自動処理は、リポジトリ直下の `.github/workflows/studydevops-ci.yml` に定義されています。

StudyHubでは「実際のGitHub Actions定義」から、このYAML自体を表示できます。

devops01に関係する処理は次の順番です。

| 順番 | GitHub Actionsの処理 | 対象 |
| --- | --- | --- |
| 1 | リポジトリのソースを取得する | `actions/checkout@v4` |
| 2 | Node.js 20を準備する | `actions/setup-node@v4` |
| 3 | 依存パッケージを準備する | `npm ci` |
| 4 | ビルド処理を実行する | `npm run build` |

依存パッケージの準備とビルド処理では、次のフォルダが `working-directory` に指定されています。

`category/StudyDevOps/src/apps/devops01_github_actions_build/app`

StudyHubの「ローカルでビルドを確認」は `npm run check` を実行します。checkはpackage.json内で `npm run build` を呼び出すため、GitHub Actionsと同じビルド処理を確認できます。

共通workflowのjobは`node-quality`、`api-integration`、`browser-e2e`、`database-integration`、`operations-signals`の順に`needs`で接続されています。前のjobが成功してから次のjobを開始するため、複数の教材テストを同時には実行しません。

失敗時は赤くなった最初のstepを開きます。`npm ci`ならlockfileと依存関係、`npm run build`ならpackage.jsonのscriptと直前のエラー行を確認します。
