# StudyAWS aws01-aws10 基本設計索引

## 1. 目的

StudyAWS `aws01`から`aws10`について、ローカル疑似実行を優先した基本設計を整理する。

## 2. 対象

| 番号 | テーマ | 基本設計 |
|---|---|---|
| aws01 | IAM / 権限の基本 | `aws01_basic_design.md` |
| aws02 | Security Group / port | `aws02_basic_design.md` |
| aws03 | EC2 + SSH | `aws03_basic_design.md` |
| aws04 | RDS接続 | `aws04_basic_design.md` |
| aws05 | S3ファイル保存 | `aws05_basic_design.md` |
| aws06 | CloudWatch logs | `aws06_basic_design.md` |
| aws07 | Lambda最小API | `aws07_basic_design.md` |
| aws08 | API Gateway + Lambda | `aws08_basic_design.md` |
| aws09 | 簡易デプロイ | `aws09_basic_design.md` |
| aws10 | バックアップ / リストア | `aws10_basic_design.md` |

## 3. 共通設計方針

- 既存`Lamdab`フォルダは変更しない。
- 実AWS認証情報、実アクセスキー、実秘密情報は置かない。
- ローカル疑似実行を基本とし、実AWSは発展課題として分離する。
- Lambda関連はAWS SAM CLIがある場合とない場合の代替手順を分ける。
- 作成ファイルはUTF-8 BOMなしを原則にする。

## 4. 次工程への引き継ぎ

詳細設計では、各番号のディレクトリ構成、ファイル単位の処理、実行コマンド、確認手順を具体化する。
