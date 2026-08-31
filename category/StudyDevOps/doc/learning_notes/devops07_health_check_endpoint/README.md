# devops07 稼働確認と受付準備確認

処理が動いている状態と、依存先を含めてリクエストを受け付けられる状態を分けて確認するテーマです。

## このテーマでできるようになること

- 稼働状態と受付準備状態を個別に確認できる
- 依存先の状態によって受付準備の結果が変わることを確認できる
- 200と503が表す運用上の違いを説明できる

## 最初に取り組むこと

1. APIを起動し、稼働状態と受付準備状態を確認する。
2. 依存先を利用不可へ切り替える。
3. 受付準備状態が503になり、稼働状態は200のままであることを確認する。
4. 依存先を利用可能へ戻し、受付準備状態が200へ戻ることを確認する。
5. APIのソースと自動テストで同じ状態変化を追う。
6. 「CI workflow」で、稼働状態と受付準備状態の自動テストを順番に実行するstepを確認する。

## 確認する内容

稼働確認は、処理自体が応答できるかを確認します。受付準備確認は、依存先を含めて利用者のリクエストを受けられるかを確認します。

依存先が利用できないとき、受付準備確認は503になりますが、稼働確認は200のままです。これにより、処理の停止と依存先の障害を区別できます。

## Dockerの稼働状態を確認する

「Docker Compose構成」と「Dockerfile」でhealthcheckの対象を確認します。実Dockerでは、リポジトリルートのcmd.exeから専用project名を指定して一つずつ操作します。

```bat
cd /d C:\work\work20260617
rtk docker compose -p studyhub-devops07 -f category/StudyDevOps/src/apps/devops07_health_check_endpoint/docker-compose.yml up -d --build
rtk docker compose -p studyhub-devops07 -f category/StudyDevOps/src/apps/devops07_health_check_endpoint/docker-compose.yml ps
rtk docker compose -p studyhub-devops07 -f category/StudyDevOps/src/apps/devops07_health_check_endpoint/docker-compose.yml down --remove-orphans
```

`ps`のhealthが正常になったことを確認し、停止時は`studyhub-devops07`だけを片付けます。StudyHub画面の依存先切替は、実APIのメモリー状態を変えて`/ready`の200・503・200を確認する教材用操作です。

## 自分の言葉で説明する

- 稼働確認と受付準備確認を分ける理由
- 受付準備が503でも稼働確認を200にする理由
- 状態確認の応答へ接続情報を含めない理由
