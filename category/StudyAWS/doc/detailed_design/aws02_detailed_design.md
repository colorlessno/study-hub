# aws02 Security Group / port 詳細設計

## 0. 関連文書

- `../requirements/aws02_security_group_port_requirements.md`
- `../basic_design/aws02_basic_design.md`

## 1. 製造対象

```text
doc/learning_notes/aws02_security_group_port/
  README.md
  docs/
src/backend/src/studyaws/systems/aws02_security_group_port/
  package.json
  Dockerfile or docker-compose.yml where applicable
  app/ api/ web/ src/ scripts/ events/ data/ storage as required by the local sample
src/infra/aws02_security_group_port/
  template.yaml where applicable
```

## 2. 実装詳細

- `docker-compose.yml`でweb、api、dbの3サービスを定義する。
- webだけをホスト公開し、api/dbは内部通信として扱う。
- DB相当は実DBではなく、DB応答を返す軽量なNode.jsサービスとして動かす。
- webからapi、apiからdbへ順番に実通信し、ホストからapi/dbへは接続できないことを別操作で確認する。
- Composeは`db`、`api`、`web`の依存順を定義し、`--parallel 1`で一つずつ起動・停止する。
- Security Groupの概念は`docs/network_matrix.md`に対応表として残す。
## 3. 実行コマンド
```cmd
rtk docker compose --parallel 1 -p studyhub-aws02 up -d
rtk docker compose --parallel 1 -p studyhub-aws02 exec -T web node -e "fetch('http://api:5102/database').then(async response => console.log(await response.text()))"
rtk docker compose --parallel 1 -p studyhub-aws02 down --remove-orphans
```

Dockerが使えない場合はREADMEの通信表だけで確認できる構成にする。
## 4. 確認手順
1. 公開対象ポートがwebだけであることを確認する。
2. webからapiへ通信できる構成を確認する。
3. apiからdbへ通信でき、dbがホストへ公開されていないことを確認する。
4. ホストからapiとdbへ接続できないことを確認する。
5. `0.0.0.0/0`を許可してよい通信と危険な通信を分類する。
## 5. 実AWS発展課題
Security GroupでHTTPだけ公開し、DBはアプリSecurity Groupからのみ許可する。SSHを使う場合は送信元制限を必須にする。
## 6. 完了条件

- 公開ポートと内部ポートを区別できる。
- Security GroupとDocker port mappingの違いを説明できる。
- 接続不可時の確認項目を説明できる。
