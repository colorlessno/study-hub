# StudyAWS

AWSの概念を、まず認証情報不要のローカル教材で観察し、その結果を実AWSとの差分まで説明するための学習プロジェクトです。`aws01`〜`aws10`を、権限・ネットワークから運用・復旧まで一続きの経路として扱います。

## 最初に取り組むこと

リポジトリルートで次を実行します。Node.js 20以上を使い、AWSアカウント、AWS CLI、アクセスキー、外部通信は必要ありません。

```powershell
node category/StudyAWS\scripts\validate-studyaws.mjs aws01
```

成功したら、表示された検証内容について「ローカルで証明できたこと」と「実AWSで別途確認すること」を1行ずつ書きます。

## 学習経路

| 段階 | テーマ | ローカル教材で確認すること |
|---|---|---|
| Identity and network | [aws01 IAM / 権限](doc/learning_notes/aws01_iam_basics/README.md) | allow、暗黙deny、明示deny |
| Identity and network | [aws02 Security Group / port](doc/learning_notes/aws02_security_group_port/README.md) | 公開portと内部通信 |
| Identity and network | [aws03 EC2 / SSH](doc/learning_notes/aws03_ec2_ssh/README.md) | サーバー、health、ログ、終了 |
| Data and observability | [aws04 RDS接続](doc/learning_notes/aws04_rds_connection/README.md) | 接続設定とsecretの分離 |
| Data and observability | [aws05 S3ファイル保存](doc/learning_notes/aws05_s3_file_storage/README.md) | object key、保存、一覧、取得 |
| Data and observability | [aws06 CloudWatch Logs](doc/learning_notes/aws06_cloudwatch_logs/README.md) | 構造化ログとrequest ID |
| Serverless and operations | [aws07 Lambda最小API](doc/learning_notes/aws07_lambda_local_api/README.md) | event、context、response |
| Serverless and operations | [aws08 API Gateway + Lambda](doc/learning_notes/aws08_api_gateway_lambda/README.md) | HTTPからLambda eventへの変換 |
| Serverless and operations | [aws09 簡易デプロイ](doc/learning_notes/aws09_simple_deploy/README.md) | health、環境変数、ログ、終了 |
| Serverless and operations | [aws10 バックアップ / リストア](doc/learning_notes/aws10_backup_restore/README.md) | backup、dry-run、復元確認 |

## 学習モードと境界

| モード | 認証情報 | 課金 | このリポジトリで行うこと |
|---|---|---|---|
| ローカル標準 | 不要 | なし | Node.jsで10テーマを検証する |
| ローカル任意 | 不要 | なし | Docker DesktopやSAM CLIで疑似環境を観察する |
| 実AWS発展 | 必要 | 発生し得る | この教材とは分離し、事前計画と明示承認後に行う |

ローカル教材が再現するのは概念の一部です。IAM評価の完全な互換性、Security Group、EC2、RDS、S3、CloudWatch、Lambda、API Gatewayのマネージドサービス動作を証明するものではありません。

## 自動検証

テーマ指定または全件を実行できます。

```powershell
node category/StudyAWS\scripts\validate-studyaws.mjs aws08
node category/StudyAWS\scripts\validate-studyaws.mjs
```

サーバー教材は空いている一時portで起動し、応答確認後に終了します。aws10はOSの一時領域へbackup・restoreし、終了時に削除します。CIでも [StudyAWS validation](../../.github/workflows/studyaws-validation.yml) を実行します。

## 実AWSへ進む前の必須確認

- 学習専用アカウントまたは明確に分離されたsandboxを使う。
- 予算上限、Budget通知、利用リージョン、作成予定リソースを記録する。
- rootユーザーや長期アクセスキーを教材コードへ置かない。
- 最小権限、公開範囲、ログ、削除手順、復旧手順を事前に決める。
- 終了後はリソースが削除された証拠と、課金が残らないかを確認する。

## 構成

```text
category/StudyAWS/
  doc/learning_notes/                 再開手順・観察・完了条件
  doc/requirements/                   要件定義
  doc/basic_design/                   基本設計
  doc/detailed_design/                詳細設計
  scripts/                            認証情報不要の自動検証
  src/backend/src/studyaws/systems/   ローカル教材
  src/infra/                          SAM参考テンプレート
```
