# StudyDB 詳細設計一覧

作成日: 2026-05-07

## 目的
`StudyDB db01-db07` の基本設計を、後続の教材実装や学習メモ作成へ渡せる具体設計へ落とす。
## 対象テーマ
| No | テーマ | 詳細設計 | 関連基本設計 |
|---|---|---|---|
| db01 | DB基礎と種類の概要 | `db01_detailed_design.md` | `../basic_design/db01_basic_design.md` |
| db02 | SQL CRUD とスキーマ基礎 | `db02_detailed_design.md` | `../basic_design/db02_basic_design.md` |
| db03 | 正規化とERモデリング | `db03_detailed_design.md` | `../basic_design/db03_basic_design.md` |
| db04 | トランザクション・ロック・分離レベル | `db04_detailed_design.md` | `../basic_design/db04_basic_design.md` |
| db05 | index / EXPLAIN / 性能確認 | `db05_detailed_design.md` | `../basic_design/db05_basic_design.md` |
| db06 | バックアップ・リストア・マイグレーション安全性 | `db06_detailed_design.md` | `../basic_design/db06_basic_design.md` |
| db07 | NoSQL / cache / search / DWH 比較 | `db07_detailed_design.md` | `../basic_design/db07_basic_design.md` |

## 共通実装方針
- SQL実行を伴う db02、db04、db05、db06 は `category/StudyDB/src/apps/common` の共通DB構成を使い、PostgreSQLコンテナを基本実行環境とする。
- db01 と db07 は文書中心とし、必要な比較データを Markdown / CSV / JSON で定義する。
- SQL、seed、確認ログは教材データのみを扱う。
- 実個人情報、実秘密情報、実顧客データを含めない。
- 作成・更新するテキストファイルは UTF-8 BOMなしとする。
## 共通DB構成方針
ユーザー回答により、SQL実行を伴う db02、db04、db05、db06 は個別composeではなく、`category/StudyDB/src/apps/common` の共通DB構成を使う。
```text
category/StudyDB/
  apps/
    common/
      docker-compose.yml
      db/
        init/
        scripts/
      scripts/
        run-sql.cmd
      README.md
```

SQL実行を伴う db02、db04、db05、db06 の教材は、個別にDBコンテナを持たず、共通DB構成へSQLを渡して実行する。PowerShell script は原則使用せず、DOS窓で使える `.cmd` を実行入口にする。
| 項目 | 値 | 理由 |
|---|---|---|
| service | `db` | 既存StudyXXのcomposeに合わせる |
| database | `studydb` | Study単位の共通DBとして扱う |
| user | `postgres` | 既存category/StudyWeb/category/StudyDevOps/StudyAIの教材値に合わせる |
| password | `postgres` | 教材用固定値。実秘密情報ではない |
| volume | `studydb_db` | `web26_db` など既存StudyWebの命名に合わせる |
| SQL mount | `/work/sql` | 教材SQLをテーマ別に渡す共通マウント先 |

## 製造状況
2026-05-07 に、上記方針に沿って `category/StudyDB/src/apps/common`、db02/db04/db05/db06 のSQL教材、db01-db07 の学習メモを作成した。
