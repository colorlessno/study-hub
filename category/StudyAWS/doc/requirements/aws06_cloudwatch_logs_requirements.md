# aws06 CloudWatch logs 要件定義

## 1. 目的

クラウド運用で必要なログ確認、検索、障害切り分けを、ローカルログからCloudWatch Logsの概念へつなげて学ぶ。

## 2. 学習対象

- log group、log stream、event
- request id、trace id
- structured log
- error log、access log、application logの違い
- ローカルDocker logsとの比較

## 3. 要件

- ローカルではアプリがJSONログを標準出力に出す。
- request idで1リクエストの流れを追える。
- エラー発生時に、どのログを見るかを整理する。
- 実CloudWatch Logsは発展課題として、ログ閲覧、検索、保持期間、課金注意を分ける。

## 4. 成果物

- ログ設計メモ
- ローカルJSONログサンプル要件
- 障害調査チェックリスト
- CloudWatch Logs概念メモ

## 5. 完了条件

- log group / stream / eventの違いを説明できる。
- request idでログを追跡できる。
- 障害時に確認するログを説明できる。
