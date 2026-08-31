# aws10 バックアップ / リストア 基本設計

## 0. 関連文書

- `../requirements/aws10_backup_restore_requirements.md`

## 1. 設計方針
バックアップを取るだけでなく、リストアできることを確認する。実データや実AWSは使わず、ローカルのダミーデータで復旧手順を学ぶ。
## 2. ローカル学習方式
- ダミーJSONまたはSQLiteファイルを対象にする。
- backupディレクトリへ日時付きコピーを作る。
- restoreは明示した作業ディレクトリ内だけで行う。
- ドライランと実行を分ける。
## 3. 成果物構成

```text
doc/learning_notes/aws10_backup_restore/
  README.md
  docs/
src/backend/src/studyaws/systems/aws10_backup_restore/
  package.json
  Dockerfile or docker-compose.yml where applicable
  app/ api/ web/ src/ scripts/ events/ data/ storage as required by the local sample
src/infra/aws10_backup_restore/
  template.yaml where applicable
```

## 4. 設計内容

| 要素 | 内容 |
|---|---|
| backup | 対象ファイルを日時付きでコピーする |
| restore | 指定バックアップから復元する |
| dry run | 実行前に対象と結果を表示する |
| audit | 復旧対象、時刻、理由を記録する |

## 5. 実AWS発展課題
- RDS snapshot、S3 versioning、lifecycleを整理する。
- 実行時は削除・復旧対象を明示し、課金と保持期間を確認する。
## 6. 完了条件

- バックアップとリストアの違いを説明できる。
- 復旧テストの重要性を説明できる。
- RPO / RTOの入口を説明できる。
