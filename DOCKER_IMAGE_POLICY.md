# Dockerイメージ固定・更新方針

## 方針

公開対象のDockerfileの`FROM`とComposeの`image:`で外部イメージを参照する場合は、読みやすいversion tagと、取得内容を一意に決めるmulti-platform manifest digestを併記する。

```text
node:22-alpine@sha256:...
```

- `latest`、tagだけの参照、digestだけの参照は使用しない。
- 現在採用しているtagとdigestの正本は[`docker-images.lock.json`](./docker-images.lock.json)とする。
- 同じtagは全Dockerfile・Composeで同じdigestを使用する。
- digest固定によりビルドの再現性を確保し、tagを残すことで基盤とversion系列を読めるようにする。
- CPU固有のmanifestではなく、レジストリが返す最上位のmulti-platform manifest digestを固定する。これにより、対応する`linux/amd64`や`linux/arm64`を実行環境に応じて選択できる。
- digestを固定したまま放置せず、公開前、基盤versionの更新時、提供元のセキュリティ更新確認時に最新digestを確認する。
- 更新確認、実ビルド、試験はイメージまたは対象を一件ずつ順番に実行する。複数を同時に取得・ビルド・試験しない。

## ローカル検証

固定状態、lockとの一致、未使用lock項目、新しい可変tagの混入は、次のコマンドでネットワークへ接続せずに検証する。

```text
node scripts/validate-docker-image-lock.mjs
```

CIでも同じ検証をStudyHubのビルド・試験より前に実行する。

現在の可変tagが提供元で別digestへ更新されていないか確認する場合は、Docker Buildxを利用して次を実行する。この処理はlockを自動変更せず、10種類のtagをlockの順番で一件ずつ照会する。

```text
node scripts/validate-docker-image-lock.mjs --check-remote
```

## digest更新手順

1. 作業ツリーと現在のlock検証結果を確認する。
2. `--check-remote`でtagを一件ずつ照会し、変更されたtagと新しい最上位digestを確認する。
3. 対象tagの提供元、version、対応platformを確認し、意図しない基盤version変更がないことを確認する。
4. `docker-images.lock.json`と、そのtagを使う全Dockerfile・Composeを同じdigestへ更新する。
5. ローカル検証を実行し、可変tag、lockとの差異、未使用項目がないことを確認する。
6. 対象Dockerfileを一件ずつ実ビルドし、Composeを一件ずつ構文解析する。続いて該当テーマの試験を順番に実行する。
7. 差分に意図したtag・digest更新だけが含まれ、UTF-8、BOM、改行コードが維持されていることを確認してコミットする。

更新確認で新しいdigestが見つかっても、自動的には差し替えない。提供元の変更内容とローカル検証結果を確認できたものだけを採用する。
