# aws02 Security Group / port 基本設計

## 0. 関連文書

- `../requirements/aws02_security_group_port_requirements.md`

## 1. 設計方針
Web/API/DB/管理接続の通信を分離し、公開してよいポートと閉じるべきポートを表で確認する。ローカルDocker Composeのport mappingとSecurity Groupの違いを比較する。
## 2. ローカル学習方式
- Docker ComposeでWeb/API/DB相当のコンテナ構成を題材にする。
- `ports`と`expose`の違いを確認する。
- 接続可否をポート表で整理する。
## 3. 成果物構成

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

## 4. 設計内容

| 要素 | 内容 |
|---|---|
| Web | 80/443相当だけを公開対象にする |
| API | Webからのみ接続する前提を整理する |
| DB | 外部公開しない |
| 管理接続 | SSHは発展課題で扱い、常時の公開にしない |

## 5. 実AWS発展課題
- Security GroupでHTTPだけを公開し、DBはアプリSGからのみ許可する。
- SSHを使う場合は送信元IP制限、Session Manager検討、削除手順を明記する。
## 6. 完了条件

- 公開ポートと内部ポートを区別できる。
- `0.0.0.0/0`を許可してよい通信と危険な通信を説明できる。
- 接続不可時に確認する項目を説明できる。
