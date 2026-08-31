# aws09 簡易デプロイ 詳細設計

## 0. 関連文書

- `../requirements/aws09_simple_deploy_requirements.md`
- `../basic_design/aws09_basic_design.md`

## 1. 製造対象

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

## 2. 実装詳細

- Node標準HTTPサーバーで`/health`と`/`を返す。
- `.env.example`には`PORT`などのダミー設定だけを置く。
- Dockerfileで非rootユーザーによる本番相当起動を定義する。
- StudyHubの「起動」はimageをbuildし、`studyhub-aws09`コンテナをホストの`43509`番ポートへ公開する。
- StudyHubの「停止」は`studyhub-aws09`コンテナだけを停止し、`--rm`により削除する。
- 実クラウド公開は行わず、比較表とチェックリストを作る。
## 3. 実行コマンド
```powershell
npm run start
npm run check
docker build -t studyaws-aws09 .
docker run --rm --name studyhub-aws09 -p 127.0.0.1:43509:4109 -e APP_NAME=studyaws-simple-deploy -e DEPLOY_ENV=production-like studyaws-aws09
```

## 4. 確認手順
1. imageのbuildとコンテナ起動が成功することを確認する。
2. `/health`が正常応答することを確認する。
3. 起動ログとリクエストログを確認する。
4. `.env.example`に実秘密情報がないことを確認する。
5. 停止後に教材用コンテナが残っていないことを確認する。
6. デプロイ前後チェックリストを読む。
## 5. 実クラウド発展課題
Vercel、Render、Railway、Fly.io、AWS App Runnerなどを比較する。公開URL、ログ、削除、課金注意を必須にする。
## 6. 完了条件

- ローカル本番相当起動を説明できる。
- 公開前後の確認項目を説明できる。
- 削除手順や課金注意を説明できる。
