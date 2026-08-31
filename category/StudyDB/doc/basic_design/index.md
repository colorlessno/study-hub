# StudyDB 基本設計一覧

作成日: 2026-05-07

## 目的
`StudyDB` の要件定義を、後続の詳細設計や教材実装へ展開できる粒度に分解する。
## 対象テーマ
| No | テーマ | 基本設計 | 関連要件 |
| --- | --- | --- | --- |
| db01 | DB基礎と種類の概要 | `db01_basic_design.md` | `../requirements/db01_db_foundations_requirements.md` |
| db02 | SQL CRUD とスキーマ基礎 | `db02_basic_design.md` | `../requirements/db02_sql_crud_schema_requirements.md` |
| db03 | 正規化とERモデリング | `db03_basic_design.md` | `../requirements/db03_normalization_er_modeling_requirements.md` |
| db04 | トランザクション・ロック・分離レベル | `db04_basic_design.md` | `../requirements/db04_transaction_lock_isolation_requirements.md` |
| db05 | index / EXPLAIN / 性能確認 | `db05_basic_design.md` | `../requirements/db05_index_explain_performance_requirements.md` |
| db06 | バックアップ・リストア・マイグレーション安全性 | `db06_basic_design.md` | `../requirements/db06_backup_restore_migration_requirements.md` |
| db07 | NoSQL / cache / search / DWH 比較 | `db07_basic_design.md` | `../requirements/db07_nosql_cache_search_dwh_requirements.md` |

## 共通方針
- 教材DBは実データを含まない小さなサンプルに限定する。
- 基本設計では使用技術を固定しすぎず、詳細設計で Docker / PostgreSQL 等の具体手順に落とす。
- 既存 `StudyWeb`、`StudyAI`、`StudyAWS` の成果物は参照してよいが変更しない。
- 作成・更新するテキストファイルは UTF-8 BOM なしとする。
## 工程記録

- 2026-05-07 に `category/StudyDB/doc/detailed_design/` へ `db01`〜`db07` の詳細設計を作成した。
- 2026-05-07 に `category/StudyDB/src/apps/` と `category/StudyDB/doc/learning_notes/` へ教材実装や学習メモを作成した。
- 2026-05-07 に Docker 実起動、代表SQL、db04のロック状態、db06 dump/restore の検証を実施した。
