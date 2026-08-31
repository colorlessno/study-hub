# devops06 リクエストIDによるログ追跡

一回のリクエストを、応答ヘッダーと実行ログに記録された同じIDで追跡するテーマです。

## このテーマでできるようになること

- 正常な処理と失敗した処理をリクエストIDで追跡できる
- 外部から受け取ったIDを検査する理由を説明できる
- ログへ記録しない情報を確認できる

## 最初に取り組むこと

1. APIを起動し、稼働状態を確認する。
2. 正常な処理と失敗した処理を順に実行する。
3. 応答ヘッダーのIDと実行ログのrequest_idを対応付ける。
4. 不正なIDを送信し、新しいIDへ置き換わることを確認する。
5. リクエスト処理、ログ出力処理、自動テストを見比べる。
6. 「CI workflow」で、リクエストIDの自動テストを順番に実行するstepを確認する。

## 確認する内容

利用できるリクエストIDは、英数字と一部の記号だけに制限されています。メールアドレスのような許可されない値を受け取った場合は、新しいIDを発行します。

正常な処理ではrequest_completed、失敗した処理ではrequest_failedが記録されます。URLの問い合わせ文字列はログへ含めず、値の漏えいを防ぎます。

## Dockerログで追跡する

「Dockerfile」で実行環境を確認した後、リポジトリルートのcmd.exeから対象を明示して一つずつ実行します。

```bat
cd /d C:\work\work20260617
rtk docker build -t studydevops-devops06 category/StudyDevOps/src/apps/devops06_request_id_logging
rtk docker run --name studydevops-devops06 --rm -d -p 18086:8080 studydevops-devops06
rtk curl.exe -i -H "X-Request-Id: devops06-docker-01" http://127.0.0.1:18086/ok
rtk docker logs studydevops-devops06
rtk docker stop studydevops-devops06
```

応答ヘッダーの`X-Request-Id`と、`request_started`・`request_completed`の`request_id`を照合します。停止対象は、この手順で起動した`studydevops-devops06`だけです。

## 自分の言葉で説明する

- 応答ヘッダーへリクエストIDを返す利点
- 外部から受け取ったIDを無条件で記録しない理由
- URL全体ではなくパスだけをログへ記録する理由
