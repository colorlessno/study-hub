# aws03 疑似サーバーの確認と復旧

Linuxコンテナを疑似サーバーとして起動し、health、ログ、公開ポート、停止中の接続失敗、再起動後の復旧を確認する教材です。EC2やSSH秘密鍵は作成しません。

## このテーマでできるようになること

- healthの正常応答を確認できる
- サーバーの起動ログを確認できる
- コンテナ内のPID 1、作業フォルダー、Node.js version、`PORT`を確認できる
- コンテナとホストのポート割り当てを確認できる
- サーバー停止中の接続失敗と再起動後の復旧を比較できる
- 疑似サーバーと実際のEC2で確認範囲が違うことを説明できる

## 最初に取り組むこと

1. Docker Desktopを起動してから、StudyHubでこのテーマを起動する。
2. 「healthの正常応答」を実行し、HTTP 200と`ok: true`を確認する。
3. 「コンテナのログ」を実行し、サーバーが4103番でlistenを開始した記録を確認する。
4. 「コンテナ内のprocessと環境」を実行し、PID 1のcommandと`PORT`を確認する。
5. 「ホストへ公開したポート」を実行し、コンテナの4103とホストの43103の対応を確認する。
6. 「停止中の接続失敗と復旧」を実行し、停止中の`ECONNREFUSED`と再起動後の200を一続きで確認する。
7. 確認後はStudyHubで停止し、コンテナを終了する。

## 障害を切り分ける順番

| 確認対象 | 画面の操作 | 分かること |
|---|---|---|
| アプリ | healthの正常応答 | HTTP要求へ応答できるか |
| プロセス | コンテナのログ | サーバーがlistenを開始したか |
| 実行環境 | コンテナ内のprocessと環境 | PID 1、作業フォルダー、Node.js version、`PORT`が意図どおりか |
| 通信経路 | ホストへ公開したポート | コンテナとホストのport対応 |
| 停止状態 | 停止中の接続失敗と復旧 | 停止とアプリ障害を区別できるか |

## 実装を直接確認する場合

```bat
cd /d C:\work\work20260617\category\StudyAWS\src\backend\src\studyaws\systems\aws03_ec2_ssh
rtk npm.cmd run check
rtk docker build -t studyhub-aws03 .
rtk docker run --rm -d --name studyhub-aws03 -p 127.0.0.1:43103:4103 studyhub-aws03
rtk node app\check_health.js up
rtk docker logs studyhub-aws03
rtk docker exec studyhub-aws03 node app/container_diagnostics.js
rtk docker port studyhub-aws03
rtk docker stop studyhub-aws03
```

停止中の接続失敗と復旧は、StudyHubの専用操作を使用すると安全に連続確認できます。

## この教材の範囲

- Dockerコンテナ内のNode.jsサーバーを疑似サーバーとして使用する。
- EC2、SSH鍵、IAM role、EBS、metadata service、Security Group、Session Managerは再現しない。
- 実EC2では停止と削除の違い、課金、接続元制限を別に確認する必要がある。
