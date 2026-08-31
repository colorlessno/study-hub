# db06 基本設計
## バックアップ・リストア・マイグレーション安全性

## 0. 関連要件

- `../requirements/db06_backup_restore_migration_requirements.md`

## 1. 設計目的
教材DBをdumpし、別DBへrestoreし、migration前後のデータ保持を確認できる教材にする。
## 2. 対象範囲

- dump / restore
- seed data
- migration
- schema変更の危険
- rollback plan
- restore確認記録
- `StudyAWS aws10` との関係
## 3. 成果物構成

```text
category/StudyDB/
  src/apps/db06_backup_restore_migration/
    sql/
      001_schema.sql
      002_seed.sql
      migrations/
        001_add_customer_email.sql
        002_add_order_status.sql
      checks/
        001_before_migration_check.sql
        002_after_migration_check.sql
        003_after_restore_check.sql
  doc/learning_notes/db06_backup_restore_migration/
    README.md
    docs/
      backup_restore_log.md
      migration_checklist.md
      rollback_plan.md
      studyaws_relation.md
```

## 4. 入力
| 入力 | 内容 |
|---|---|
| 教材DB | 顧客、注文、商品データ |
| dump操作 | バックアップ取得コマンド |
| restore操作 | 別DBへの復元コマンド |
| migration SQL | カラム追加、制約追加 |
| 確認SQL | 件数、制約、代表レコード確認 |

## 5. 出力
| 出力 | 内容 |
|---|---|
| backup log | dumpファイル作成結果 |
| restore log | 復元後の確認結果 |
| migration checklist | 実行前後の確認項目 |
| rollback plan | 失敗時に戻す手順 |

## 6. 処理方針
1. seed data を投入した教材DBを作る
2. dumpを取得する
3. 別DBへrestoreする
4. restore後の件数と代表データを確認する
5. migrationを実行する
6. migration前後の確認項目とrollback planを記録する
7. `StudyAWS aws10` のバックアップ学習との役割差を整理する
## 7. 確認観点

- backupを取得しただけでなくrestore確認まで説明できるか
- migration前後の確認項目を説明できるか
- schema変更とデータ保持を分けて考えられるか

## 8. 後続工程への引き継ぎ

詳細設計では、dump/restoreコマンド、migration SQL、検証SQL、失敗時の戻し方を定義する。
