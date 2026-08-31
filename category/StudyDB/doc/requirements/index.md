# StudyDB 要件定義一覧

作成日: 2026-05-06

## 目的
`StudyDB` は、アプリケーションやAIシステムを設計するときに必要になるデータベース基礎を、分野別に学ぶための領域である。
既存の `StudyWeb` はアプリ側からDBを使う例を扱っているが、DBそのものの種類、設計、SQL、トランザクション、性能、バックアップ、分析向けDBの違いを体系的には扱っていない。`StudyDB` はその不足を補う。
## 対象テーマ
| No | テーマ | 要件定義 |
| --- | --- | --- |
| db01 | DB基礎と種類の概要 | `db01_db_foundations_requirements.md` |
| db02 | SQL CRUD とスキーマ基礎 | `db02_sql_crud_schema_requirements.md` |
| db03 | 正規化とERモデリング | `db03_normalization_er_modeling_requirements.md` |
| db04 | トランザクション・ロック・分離レベル | `db04_transaction_lock_isolation_requirements.md` |
| db05 | index / EXPLAIN / 性能確認 | `db05_index_explain_performance_requirements.md` |
| db06 | バックアップ・リストア・マイグレーション安全性 | `db06_backup_restore_migration_requirements.md` |
| db07 | NoSQL / cache / search / DWH 比較 | `db07_nosql_cache_search_dwh_requirements.md` |

## 共通方針
- 既存 `StudyWeb` のDB利用例は変更しない。
- DB製品の網羅ではなく、設計判断に必要な違いを学ぶ。
- 可能な範囲で PostgreSQL、SQLite、Redis、MongoDB などをローカルまたは Docker で扱う。
- 実データ、秘密情報、個人情報は教材データに含めない。
- 作成・更新するテキストファイルは UTF-8 BOM なしとする。
## 工程記録

- 2026-05-07 に `category/StudyDB/doc/basic_design/` へ `db01`〜`db07` の基本設計を作成した。
- 2026-05-07 に `category/StudyDB/doc/detailed_design/` へ `db01`〜`db07` の詳細設計を作成した。
- 2026-05-07 に `category/StudyDB/src/apps/` と `category/StudyDB/doc/learning_notes/` へ教材実装や学習メモを作成した。
- 2026-05-07 に Docker 実起動、代表SQL、db04のロック状態、db06 dump/restore の検証を実施した。
