# aws03 EC2 + SSH 詳細設計

## 0. 関連文書

- `../requirements/aws03_ec2_ssh_requirements.md`
- `../basic_design/aws03_basic_design.md`

## 1. 製造対象

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

## 2. 実装詳細

- LinuxコンテナをEC2相当の疑似サーバーとして扱う。
- `server.js`はNode標準HTTPサーバーで`/health`を返す。
- `container_diagnostics.js`はコンテナ内のPID 1、作業フォルダー、Node.js version、`PORT`だけを表示し、processとenvを確認する。
- READMEに`docker build`、`docker run`、ログ確認、停止手順を書く。
- SSH秘密鍵は作成しない。鍵の扱いはdocsで説明する。
## 3. 実行コマンド
```powershell
npm run check
rtk docker build -t studyhub-aws03 .
rtk docker run --rm -d --name studyhub-aws03 -p 127.0.0.1:43103:4103 studyhub-aws03
rtk docker exec studyhub-aws03 node app/container_diagnostics.js
```

## 4. 確認手順
1. `/health`が200相当を返すことを確認する。
2. コンテナログで起動メッセージを確認する。
3. コンテナ内診断でPID 1のcommand、作業フォルダー、Node.js version、`PORT`を確認する。
4. port公開の設定を確認する。
5. SSH鍵を成果物に置かないことを確認する。
## 5. 実AWS発展課題
EC2起動、key pair、Security Group、SSH接続、停止、削除、課金注意を手順化してから実施する。
## 6. 完了条件

- EC2相当のサーバー起動とアプリ起動を説明できる。
- SSH鍵と通信許可の関係を説明できる。
- ログ、port、process確認の観点を説明できる。
