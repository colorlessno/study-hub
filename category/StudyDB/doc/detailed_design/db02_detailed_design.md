# db02 SQLの基本操作とテーブル設計 詳細設計

## ファイルの役割

| ファイル | 役割 |
|---|---|
| `sql/001_schema.sql` | 4つのテーブルと制約を作成する |
| `sql/002_seed.sql` | 動作確認用データを登録する |
| `sql/003_crud_examples.sql` | 登録・検索・更新・削除を実行する |
| `sql/004_join_examples.sql` | 内部結合と外部結合を実行する |
| `sql/005_constraint_errors.sql` | 5種類の制約違反例をまとめて確認する |
| `docs/schema_notes.md` | テーブルの関係と制約を整理する |
| `docs/command_log.md` | SQLの予想、結果、理由を記録する |
| `docs/constraint_error_notes.md` | 制約違反時のエラーを記録する |

## 起動処理

StudyHubは共通のPostgreSQL教材環境を、db02専用のComposeプロジェクトとして起動する。

| 項目 | 設定 |
|---|---|
| Composeプロジェクト名 | `studyhub-db02` |
| データベース | `studydb` |
| ホスト側ポート | 自動割り当て（`STUDYDB_PORT=0`） |
| 起動確認の制限時間 | 180秒 |
| 起動前処理 | 同じプロジェクト名のコンテナとボリュームを削除する |

## SQL実行処理

1. 対象SQLファイルをUTF-8で読み込む。
2. `docker compose exec -T db psql` の標準入力へSQLを渡す。
3. 成功する操作では `ON_ERROR_STOP=1` を指定し、SQLエラーを検出する。
4. 実行結果と終了コードをStudyHubへ返す。

## 画面から選べる操作

| 操作ID | 画面表示 | 実行内容 |
|---|---|---|
| `prepare` | テーブルと確認用データを準備 | `001_schema.sql`、`002_seed.sql` |
| `crud` | 登録・検索・更新・削除を実行 | `003_crud_examples.sql` |
| `join` | テーブル結合を実行 | `004_join_examples.sql` |
| `duplicate-email` | メールアドレスの重複を確認 | `UNIQUE`制約違反 |
| `missing-name` | 必須項目の未入力を確認 | `NOT NULL`制約違反 |
| `missing-customer` | 存在しない顧客の指定を確認 | `FOREIGN KEY`制約違反 |
| `negative-price` | 負の価格を確認 | `CHECK (price >= 0)`制約違反 |
| `zero-quantity` | 数量0を確認 | `CHECK (quantity > 0)`制約違反 |

制約違反を確認する5操作は、SQLが終了コード1を返してもStudyHubが実行結果を保持する。学習者は表示されたPostgreSQLのエラーを確認し、制約名、入力値、拒否された理由を記録する。

## 停止処理

停止時は、db02専用のComposeプロジェクトに対して `down --volumes --remove-orphans` を実行する。コンテナ、ネットワーク、教材用ボリュームを削除し、他テーマのDocker環境には触れない。

## 検証内容

- 顧客3件、商品4件、注文3件が登録されること
- 登録・検索・更新・削除の結果がSQLの意図と一致すること
- 内部結合と外部結合で取得件数の違いを確認できること
- `UNIQUE`、`NOT NULL`、`FOREIGN KEY`、2種類の`CHECK`制約が不正な入力を拒否すること
- 停止後にdb02専用のコンテナとボリュームが残らないこと
