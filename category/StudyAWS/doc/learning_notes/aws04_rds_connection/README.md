# aws04 PostgreSQLへの接続と接続失敗

Docker Composeで起動したPostgreSQLをRDS相当として扱い、Node.jsの接続アプリから環境変数を使って実際に接続します。正常接続、認証失敗、通信失敗を同じ画面で比較する教材です。

## このテーマでできるようになること

- host、port、database、user、passwordを環境変数から接続処理へ渡せる
- PostgreSQLへ接続し、実際のdatabase名とuser名を取得できる
- password誤りによる認証失敗と、port誤りによる通信失敗を区別できる
- passwordの値を画面やlogへ表示しないことを確認できる
- 接続環境を停止し、DB containerとvolumeを後片付けできる

## 最初に取り組むこと

1. Docker Desktopを起動し、StudyHubでaws04の「起動」を押す。
2. 「DB接続に成功」を実行し、`ok: true`と接続したdatabase、user、server portを確認する。
3. 「パスワード誤りで認証失敗」を実行し、PostgreSQLの認証error code `28P01`を確認する。
4. 「接続先ポート誤りで通信失敗」を実行し、認証処理の前に通信が失敗することを確認する。
5. 「停止」を押し、aws04専用のcontainerとvolumeを削除する。

## 画面の結果が示す範囲

| 操作 | 確認する結果 | 原因の区分 |
|---|---|---|
| DB接続に成功 | database、user、server address、server port | 接続情報とDBが利用可能 |
| パスワード誤りで認証失敗 | `28P01` | DBへ到達した後の認証失敗 |
| 接続先ポート誤りで通信失敗 | `ECONNREFUSED`等 | DBへ到達する前の通信失敗 |

接続結果ではpasswordを`masked`と表示し、値そのものは表示しません。

## 実装を直接確認する場合

```cmd
cd /d C:\work\work20260617\category\StudyAWS\src\backend\src\studyaws\systems\aws04_rds_connection
rtk docker compose --parallel 1 -p studyhub-aws04 up -d --build --wait db
rtk docker compose --parallel 1 -p studyhub-aws04 run --rm app node app/db_check.js successful-connection
rtk docker compose --parallel 1 -p studyhub-aws04 run --rm -e DB_PASSWORD=wrong-password app node app/db_check.js authentication-failure
rtk docker compose --parallel 1 -p studyhub-aws04 run --rm -e DB_PORT=6543 app node app/db_check.js network-failure
rtk docker compose --parallel 1 -p studyhub-aws04 down --volumes --remove-orphans
```

使用する値はローカル教材専用です。実RDSの認証情報は使用しません。

## この教材で扱う範囲

- ローカルPostgreSQLへの接続、認証失敗、通信失敗を実行する。
- RDS endpoint、Security Group、TLS、backup、maintenance window、Multi-AZは資料で構成を確認する。
- 実RDSの作成、接続、停止、削除は課金と公開範囲を確認した後の発展課題とする。
- `--parallel 1`でComposeの対象を一つずつ処理し、複数処理を同時実行しない。
