# db06 詳細設計
## バックアップ・リストア・マイグレーション安全性

## 0. 関連文書

- `../requirements/db06_backup_restore_migration_requirements.md`
- `../basic_design/db06_basic_design.md`

## 1. 製造対象

```text
src/apps/db06_backup_restore_migration/
  README.md
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
  backups/
    .gitkeep
doc/learning_notes/db06_backup_restore_migration/
  README.md
  docs/
    backup_restore_log.md
    migration_checklist.md
    rollback_plan.md
    studyaws_relation.md
```

## 2. DB実行環境
| 項目 | 内容 |
|---|---|
| DB | PostgreSQL 16 alpine |
| database | `studydb` |
| 起動方式 | `category/StudyDB/src/apps/common` の共通DB構成を使う |
| backup形式 | `pg_dump` のplain SQL |
| restore先 | 同一compose内の別databaseまたは再作成DB |

## 3. テーブル設計
| table | 初期column | migration後 |
|---|---|---|
| `customers` | `id`, `name`, `created_at` | `email` を追加 |
| `orders` | `id`, `customer_id`, `ordered_at` | `status` を追加 |

## 4. ファイル設計
| ファイル | 内容 |
|---|---|
| `001_schema.sql` | migration前のschema |
| `002_seed.sql` | 顧客と注文の教材データ |
| `001_add_customer_email.sql` | nullable email追加、後でunique制約候補を説明 |
| `002_add_order_status.sql` | status追加、default値設定 |
| `001_before_migration_check.sql` | migration前の件数と代表データ確認 |
| `002_after_migration_check.sql` | migration後の新カラムと既存データ確認 |
| `003_after_restore_check.sql` | restore後の件数と代表データ確認 |

## 5. backup / restore コマンド設計
```cmd
docker compose -p studyhub-db06 -f category/StudyDB\src\apps\common\docker-compose.yml exec -T db pg_dump -U postgres -d studydb --schema=db06 --file=/backups/studydb_db06_before_migration.sql
docker compose -p studyhub-db06 -f category/StudyDB\src\apps\common\docker-compose.yml exec -T db psql -U postgres -d postgres -c "CREATE DATABASE studydb_restore;"
docker compose -p studyhub-db06 -f category/StudyDB\src\apps\common\docker-compose.yml exec -T db psql -U postgres -d studydb_restore -f /backups/studydb_db06_before_migration.sql
```

## 6. migration checklist 設計
| timing | 確認項目 |
|---|---|
| before | backup取得、restore可能性、件数、代表データ、制約影響 |
| during | migration順序、エラー時停止、ログ保存 |
| after | 件数、新カラム、既存データ、アプリ想定影響 |
| rollback | restore対象、戻す手順、戻した後の確認SQL |

## 7. StudyAWSとの関係
| Study | 役割 |
|---|---|
| `StudyAWS aws10` | クラウドやバックアップ運用観点 |
| `StudyDB db06` | DBスキーマ変更とrestore確認の教材観点 |

## 8. 確認手順
1. schemaとseedを投入する
2. migration前checkを実行する
3. `pg_dump`でbackupを取得する
4. restore先DBへ復元する
5. restore確認SQLを実行する
6. migrationを実行する
7. migration後checkとrollback planを記録する

## 9. 完了条件

- backup取得とrestore確認を一連の手順として説明できる
- migration前後の確認項目を説明できる
- schema変更とデータ保持を分けて考えられる
## 10. 安全性

- backup対象は教材データだけに限定する
- backupファイルに実秘密情報や実個人情報を含めない
- destructive migrationは教材内でもrollback planとセットにする
