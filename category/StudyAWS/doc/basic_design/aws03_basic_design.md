# aws03 EC2 + SSH 基本設計

## 0. 関連文書

- `../requirements/aws03_ec2_ssh_requirements.md`

## 1. 設計方針
EC2そのものは発展課題とし、基本工程ではローカルLinuxコンテナを仮想サーバー相当として扱い、プロセス起動、port確認、ログ確認、環境変数確認を重点にする。
## 2. ローカル学習方式
- DockerでLinuxコンテナを起動する。
- 小型HTTPサーバーを起動し、コンテナ内から疎通確認する。
- `ps`、環境変数、ログ、portを確認する。
## 3. 成果物構成

```text
doc/learning_notes/aws03_ec2_ssh/
  README.md
  docs/
src/backend/src/studyaws/systems/aws03_ec2_ssh/
  package.json
  Dockerfile or docker-compose.yml where applicable
  app/ api/ web/ src/ scripts/ events/ data/ storage as required by the local sample
src/infra/aws03_ec2_ssh/
  template.yaml where applicable
```

## 4. 設計内容

| 要素 | 内容 |
|---|---|
| 疑似サーバー | Linuxコンテナで再現する |
| アプリ | Node標準HTTPサーバーを使う |
| 確認 | port、process、log、envを確認する |
| 鍵 | SSH秘密鍵は作成・保存しない |

## 5. 実AWS発展課題
- EC2起動、key pair、Security Group、SSH、停止、削除を手順化する。
- 課金が発生するため、実行前確認と削除確認を必須にする。
## 6. 完了条件

- サーバー上でプロセスが動く意味を説明できる。
- SSH鍵と通信許可の関係を説明できる。
- 起動しているアプリのログとportを確認できる。
