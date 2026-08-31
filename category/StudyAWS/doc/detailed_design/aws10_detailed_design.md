# aws10 バックアップ / リストア 詳細設計

## 0. 関連文書

- `../requirements/aws10_backup_restore_requirements.md`
- `../basic_design/aws10_basic_design.md`

## 1. 製造対象

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

## 2. 実装詳細

- `backup.js`は`data/sample.json`を`backups/`へ日時付きでコピーする。
- `restore.js`は指定バックアップを`data/sample.json`へ戻す。
- `--dry-run`を用意し、実行前に対象パスを表示する。
- 操作対象は教材ディレクトリ内に限定する。
## 3. 実行コマンド
```powershell
npm run backup
npm run restore -- --dry-run
npm run check
```

## 4. 確認手順
1. バックアップを作成する。
2. バックアップファイル名に日時が入ることを確認する。
3. `--dry-run`で復元対象を確認する。
4. RPO / RTOの説明を読む。
## 5. 実AWS発展課題
RDS snapshot、S3 versioning、lifecycleを整理する。実施時は復旧対象、保持期間、課金、削除を確認する。
## 6. 完了条件

- バックアップとリストアの違いを説明できる。
- 復旧テストの重要性を説明できる。
- ドライランの目的を説明できる。
