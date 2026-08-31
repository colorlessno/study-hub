# StudyDB

データベースを「読んで終わり」にせず、予想・実行・観察・説明まで繰り返すための個人学習プロジェクトです。`db01`〜`db07` を、基礎から運用・データストア選定まで一続きの学習経路として扱います。

## 最初に取り組むこと

1. 下表から1テーマだけ選ぶ。
2. 学習ノートの「始める前の問い」に短く答える。
3. 「最初に取り組むこと」を1つ実行する。
4. 観察結果を自分の言葉で1行残す。

SQL教材をすぐ確認する場合は、リポジトリルートで次を実行します。Docker Desktop が必要です。

```cmd
node category/StudyDB\scripts\validate-studydb.mjs db02
```

## 学習経路

| 段階 | テーマ | 形式 | 学習の証拠 |
|---|---|---|---|
| 基礎・モデリング | [db01 DB基礎と保存方式の選び方](doc/learning_notes/db01_db_foundations/README.md) | 文書と記入ひな形 | 用途に応じた保存先を説明できる |
| 基礎・モデリング | [db02 SQLの基本操作とテーブル設計](doc/learning_notes/db02_sql_crud_schema/README.md) | PostgreSQL | 検索・登録・更新・削除、テーブル結合、制約違反を確認できる |
| 基礎・モデリング | [db03 正規化とERモデリング](doc/learning_notes/db03_normalization_er_modeling/README.md) | 文書 | 非正規表からERモデルを導ける |
| 正しさ・性能 | [db04 トランザクション・ロック・分離レベル](doc/learning_notes/db04_transaction_lock_isolation/README.md) | PostgreSQL | commit、rollback、更新時のロックを説明できる |
| 正しさ・性能 | [db05 index・EXPLAIN・性能](doc/learning_notes/db05_index_explain_performance/README.md) | PostgreSQL | 実行計画の変化を根拠に説明できる |
| 変更・運用 | [db06 バックアップ・リストア・マイグレーション](doc/learning_notes/db06_backup_restore_migration/README.md) | PostgreSQL | 別DBへの復元と変更前後確認ができる |
| 選定 | [db07 NoSQL・cache・search・DWH](doc/learning_notes/db07_nosql_cache_search_dwh/README.md) | 文書 | 問いと整合性要件から保存先を選べる |

`db01`、`db03`、`db07` は文書完結型です。SQL教材は `db02`、`db04`、`db05`、`db06` にあります。

DBを初めて学ぶ場合は、番号テーマの前に[非エンジニア・新卒向けDB入門](./doc/db_intro_for_nonengineer_fresh_grads.md)を補助教材として利用できます。

## 学習サイクル

各テーマでは次の順序を使います。

1. **予想**: 実行結果や設計上の選択を先に言葉にする。
2. **実行**: SQLまたは設計課題を小さく試す。
3. **実測**: 行数、エラー、実行計画、復元結果などを記録する。
4. **説明**: なぜその結果になったかを自分の言葉で説明する。
5. **後片付け**: コンテナや一時DBを終了し、次回の入口を残す。

## 自動検証

PostgreSQL教材は、テーマ単位または一括で検証できます。

```cmd
node category/StudyDB\scripts\validate-studydb.mjs db04
node category/StudyDB\scripts\validate-studydb.mjs
```

検証は固有のComposeプロジェクト、空いているホストポート、一時的な復元DBを使い、終了時にコンテナとvolumeを削除します。CIでも [StudyDB validation](../../.github/workflows/studydb-validation.yml) を実行します。

## 構成

```text
category/StudyDB/
  doc/
    requirements/      各テーマの要件定義
    basic_design/      基本設計
    detailed_design/   詳細設計
    learning_notes/    再開手順・観察記録・完了条件
  scripts/             教材の自動検証
  src/apps/            PostgreSQL教材と共通Docker環境
```

## 安全上の前提

- 接続先はローカルの教材用PostgreSQLだけです。実データや本番DBには使いません。
- `postgres/postgres` は教材専用の固定値であり、外部公開する環境では使用しません。
- `down --volumes`、復元、migrationは対象を確認してから実行します。
- 実行時間の絶対値は環境差があるため、性能学習では実行計画と相対的な変化を見ます。
- 開発・整理にはAIコーディング支援を利用していますが、学習の完了条件は「自分で予想し、観察し、説明できること」です。
