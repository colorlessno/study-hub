# StudyAWS aws01-aws10 詳細設計索引

## 1. 目的

StudyAWS `aws01`から`aws10`について、製造・環境工程に進めるための詳細設計を整理する。

## 2. 対象

| 番号 | テーマ | 詳細設計 |
|---|---|---|
| aws01 | IAM / 権限の基本 | `aws01_detailed_design.md` |
| aws02 | Security Group / port | `aws02_detailed_design.md` |
| aws03 | EC2 + SSH | `aws03_detailed_design.md` |
| aws04 | RDS接続 | `aws04_detailed_design.md` |
| aws05 | S3ファイル保存 | `aws05_detailed_design.md` |
| aws06 | CloudWatch logs | `aws06_detailed_design.md` |
| aws07 | Lambda最小API | `aws07_detailed_design.md` |
| aws08 | API Gateway + Lambda | `aws08_detailed_design.md` |
| aws09 | 簡易デプロイ | `aws09_detailed_design.md` |
| aws10 | バックアップ / リストア | `aws10_detailed_design.md` |

## 3. 共通詳細方針

- 既存`Lamdab`フォルダは変更しない。
- 製造対象は`aws01_*`から`aws10_*`の新規ディレクトリに置く。
- 実AWS認証情報、実アクセスキー、実秘密情報は置かない。
- ローカル疑似実行を基本にし、実AWS利用は発展課題として分離する。
- Dockerに入れられるサンプルは`Dockerfile`または`docker-compose.yml`を製造対象に含める。
- Lambda関連はSAM CLIがなくても動くhandler直接実行またはNode HTTPサーバー代替を用意する。
- 作成ファイルはUTF-8 BOMなしを原則にする。

## 4. 次工程への引き継ぎ

- 製造工程では、各ディレクトリに`README.md`、`package.json`、Docker実行入口を置く。
- DockerやSAM CLIが必要な操作は任意確認とし、Node標準機能で確認できる入口を残す。
- 検証記録では、実行したコマンドと未実施の発展課題を分けて記録する。
