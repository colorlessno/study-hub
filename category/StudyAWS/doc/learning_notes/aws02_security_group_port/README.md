# aws02 公開ポートと内部通信

Docker Composeの`ports`と`expose`を使い、ホストへ公開するWebと、コンテナ間だけで利用するAPI・DBの3層通信を確認する教材です。Security Groupそのものは再現しません。

## このテーマでできるようになること

- ホストへ公開したWebサービスへ接続できることを確認できる
- コンテナ間だけで利用するAPIへ内部から接続できることを確認できる
- APIから内部DB相当サービスへ接続できることを確認できる
- ホストへ公開していないAPIへ外部から接続できないことを確認できる
- ホストへ公開していないDBへ外部から接続できないことを確認できる
- `ports`と`expose`の役割をDocker Compose定義と照合できる
- ローカルのポート公開とAWSの通信制御の違いを説明できる

## 最初に取り組むこと

1. Docker Desktopを起動してから、StudyHubでこのテーマを起動する。
2. 「ホストへ公開したWeb」を実行し、127.0.0.1:43102から応答を取得できることを確認する。
3. 「コンテナ間だけのAPI」を実行し、webコンテナから`api:5102`へ通信できることを確認する。
4. 「APIからDBへの内部通信」を実行し、webからapiを経由して`db:5432`の応答を取得できることを確認する。
5. 「ホストへ公開していないAPI」と「ホストへ公開していないDB」を実行し、dbの`Publishers`が`PublishedPort: 0`・URL空で、検証用host port 54322への接続が拒否されることを確認する。
6. 「Docker Compose定義」と「危険設定と修正例」を表示し、画面で確認した結果と`ports`、`expose`を照合する。
7. 確認後はStudyHubで停止し、作成したコンテナとネットワークを終了する。

## 通信経路

| 接続元 | 接続先 | 期待する結果 | 理由 |
|---|---|---|---|
| ホスト | Webの43102 | 接続できる | `ports`でホストへ公開している |
| webコンテナ | APIの5102 | 接続できる | Composeネットワーク内で名前解決できる |
| APIコンテナ | DBの5432 | 接続できる | Composeネットワーク内で名前解決できる |
| ホスト | APIの5102 | 接続できない | APIは`expose`だけでホストへ公開していない |
| ホスト | DBの5432 | 接続できない | DBは`expose`だけでホストへ公開していない |

## 実装を直接確認する場合

```bat
cd /d C:\work\work20260617\category\StudyAWS\src\backend\src\studyaws\systems\aws02_security_group_port
rtk npm.cmd run check
rtk docker compose --parallel 1 -p studyhub-aws02 up -d
rtk node -e "fetch('http://127.0.0.1:43102').then(async response => console.log(await response.text()))"
rtk docker compose --parallel 1 -p studyhub-aws02 exec -T web node -e "fetch('http://api:5102').then(async response => console.log(await response.text()))"
rtk docker compose --parallel 1 -p studyhub-aws02 exec -T web node -e "fetch('http://api:5102/database').then(async response => console.log(await response.text()))"
rtk node scripts\check_host_port.js private-api
rtk node scripts\check_host_port.js private-database
rtk docker compose --parallel 1 -p studyhub-aws02 down --remove-orphans
```

StudyHubではホストへ公開していないAPIとDBの接続拒否も、独立した操作として確認できます。

## この教材の範囲

- Dockerのポート公開とComposeネットワークを使用する。
- `db`、`api`、`web`の依存順と`--parallel 1`により、一つずつ起動・停止する。
- 実際のVPC、subnet、route、NACL、Security Group、OS firewallは再現しない。
- 実AWSでは接続元、宛先、portに加えて、各通信制御を別々に確認する必要がある。
