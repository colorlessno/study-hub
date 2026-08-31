# aws09 簡易デプロイ 基本設計

## 0. 関連文書

- `../requirements/aws09_simple_deploy_requirements.md`

## 1. 設計方針
実クラウド公開の前に、ローカルで本番相当の起動、環境変数、health check、ログ確認を行う。クラウド公開の比較は発展課題として扱う。
## 2. ローカル学習方式
- Dockerfileで小型Web/APIを起動する。
- `.env.example`を用意する。
- `/health`で死活確認する。
- 標準出力ログを確認する。
## 3. 成果物構成

```text
doc/learning_notes/aws09_simple_deploy/
  README.md
  docs/
src/backend/src/studyaws/systems/aws09_simple_deploy/
  package.json
  Dockerfile or docker-compose.yml where applicable
  app/ api/ web/ src/ scripts/ events/ data/ storage as required by the local sample
src/infra/aws09_simple_deploy/
  template.yaml where applicable
```

## 4. 設計内容

| 要素 | 内容 |
|---|---|
| build | Docker image作成 |
| runtime | 環境変数を渡して起動 |
| health | `/health`を返す |
| logs | 起動ログ、リクエストログ、エラーログを分ける |

## 5. 実クラウド発展課題
- Vercel、Render、Railway、Fly.io、AWS App Runnerなどを比較する。
- 公開後のURL確認、ログ確認、削除、課金注意を必須にする。
## 6. 完了条件

- ローカル本番相当起動を説明できる。
- 公開前チェックリストを説明できる。
- 公開後の確認と削除手順を説明できる。
