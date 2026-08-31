# StudyAWS aws01-aws10 要件定義索引

## 1. 目的

AWS / cloud / infra の基礎を、ローカル疑似実行を優先しながら要件定義、基本設計、詳細設計、製造へ進めるための要件索引。

## 2. 対象

| 番号 | テーマ | 要件定義 |
|---|---|---|
| aws01 | IAM / 権限の基本 | `aws01_iam_basics_requirements.md` |
| aws02 | Security Group / port | `aws02_security_group_port_requirements.md` |
| aws03 | EC2 + SSH | `aws03_ec2_ssh_requirements.md` |
| aws04 | RDS接続 | `aws04_rds_connection_requirements.md` |
| aws05 | S3ファイル保存 | `aws05_s3_file_storage_requirements.md` |
| aws06 | CloudWatch logs | `aws06_cloudwatch_logs_requirements.md` |
| aws07 | Lambda最小API | `aws07_lambda_local_api_requirements.md` |
| aws08 | API Gateway + Lambda | `aws08_api_gateway_lambda_requirements.md` |
| aws09 | 簡易デプロイ | `aws09_simple_deploy_requirements.md` |
| aws10 | バックアップ / リストア | `aws10_backup_restore_requirements.md` |

## 3. 共通方針

- 既存の`Lamdab`フォルダは変更しない。
- 新規教材は`aws01`以降で作る。
- 作成ファイルはUTF-8 BOMなしを原則にする。
- Lambda、API Gateway、S3、SQS、DynamoDBなどはローカル疑似実行を優先する。
- 実AWS利用は課金、権限、削除手順を明記した発展課題に分ける。
- 実AWS認証情報、実秘密情報、実個人情報は置かない。

## 4. 次工程への引き継ぎ

基本設計では、各番号についてローカル実行方式、任意の実AWS発展課題、成果物構成、確認観点を分けて定義する。
