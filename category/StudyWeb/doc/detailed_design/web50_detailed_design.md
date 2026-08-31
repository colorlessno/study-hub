# web50 N+1問題の再現 詳細設計

## 0. 関連文書

- `../requirements/web50_n_plus_one_reproduction_requirements.md`
- `../basic_design/web50_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studyweb/systems/web50_n_plus_one_reproduction/
  Dockerfile
  docker-compose.yml
  package.json
  app/src/server.js
  app/src/queryComparison.js
  prisma/schema.prisma
doc/learning_notes/web50_n_plus_one_reproduction/
  README.md
  docs/query_log_comparison.md
  docs/n_plus_one_note.md
```

## 2. 実装方式

Docker内のSQLiteへ親子データを保存し、Prisma Clientで取得する。Prismaのquery eventから、実際に発行されたSQL、parameter、durationを収集し、N+1方式とrelationを含めた取得方式を比較する。

## 3. Data

| Data | 件数 | Relation |
|---|---:|---|
| `User` | 1〜20 | id、name、tasks relation |
| `Task` | 2〜3 | id、title、userId、user relation |

user Aは2件、Bは1件、Cは0件のtaskを持つ。

## 4. Mode

| mode | Prisma処理 | Query count |
|---|---|---:|
| `n_plus_one` | `User.findMany`後、userごとに`Task.findMany` | 1+N |
| `optimized` | `User.findMany({ include: { tasks: true } })` | 親件数に比例しない |

`optimized`以外のmodeはN+1側で処理する。

## 5. 処理手順

1. queryからmodeと親件数を取得し、入力を検証する。
2. SQLite上のUserとTaskを指定件数の学習データへ入れ替える。
3. query logの収集を開始する。
4. n_plus_oneでは親一覧の後、親ごとにTaskを取得する。
5. optimizedではPrismaのrelation includeで親子を取得する。
6. 実SQL、parameter、duration、結果をJSONで返す。

## 6. 要件との対応

- Prisma ClientをORMとして使用する。
- SQLiteへ親子データを保存し、実際のquery eventを計測する。
- N+1方式とrelation include方式で同じ結果を取得する。
- query回数とdurationを返して比較できるようにする。
- mode、親件数、endpointを検証する。

## 7. 確認手順

1. n_plus_oneを親3件で実行し、query logが親一覧1回と子取得3回になることを確認する。
2. optimizedを同じ親件数で実行し、query回数が親件数に比例しないことを確認する。
3. 両modeのresultが同じことを確認する。
4. usersを増やし、N+1側だけquery数が比例することを確認する。
5. query logのSQL、parameter、durationを比較する。

## 8. 完了条件

- 1+Nの構造を説明できる。
- 改善前後のquery数を比較できる。
- 子0件の親にもqueryが発生し得る理由を説明できる。
- ORMの処理と実際に発行されたSQLを対応付けられる。
