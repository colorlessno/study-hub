# web26 詳細設計
## Docker Compose Web + API + DB

---

## 1. 実装ディレクトリ構成

```text
category/StudyWeb/
├── src/infra/compose/web26_docker_compose_web_api_db/docker-compose.yml
├── src/infra/env/web26_docker_compose_web_api_db/.env.example
├── src/infra/db/web26_docker_compose_web_api_db/db/init.sql
├── src/backend/src/studyweb/systems/web26_docker_compose_web_api_db/backend/
│   ├── Dockerfile
│   └── src/
├── src/frontend/src/studyweb/systems/web26_docker_compose_web_api_db/frontend/
│   ├── Dockerfile
│   └── src/main.tsx
└── doc/learning_notes/web26_docker_compose_web_api_db/README.md
```

## 2. モジュール詳細

| モジュール | 役割 | 主な処理 |
|---|---|---|
| `web` service | React画面 | `GET /health`と`GET /tasks`を順に呼び出す |
| `api` service | NestJS API | 稼働状態とDBのタスクをJSONで返す |
| db service | PostgreSQL | データ保持 |
| `docker-compose.yml` | 起動定義 | service名による通信、healthcheck、volume、環境変数 |

## 3. API 詳細

| メソッド | パス | 役割 |
|---|---|---|
| GET | `/health` | `{ "ok": true, "service": "web26 api" }`を返す |
| GET | `/tasks` | `tasks`表をID順に取得して返す |

## 4. 詳細API I/O 定義

| サービス | 入力 | 出力 |
|---|---|---|
| web | `VITE_API_URL` | API状態、タスク一覧、接続エラー |
| api | `DATABASE_URL` | health JSONまたはTask配列 |
| db | `SELECT id, title, created_at FROM tasks ORDER BY id` | PostgreSQLの行 |

## 5. 入力チェック仕様
| 対象 | ルール |
|---|---|
| 環境変数 | Composeの既定値または`.env.example`から受け取る |
| ポート | Web 5186、API 13026、DB 15426の競合がない |
| DB | apiから接続可能 |

## 6. エラー応答仕様
| 現象 | 発生条件 | 表示・対処 |
|---|---|---|
| Compose起動失敗 | 公開ポート使用中 | Dockerのエラーを確認し、環境変数で公開ポートを変更する |
| API起動失敗 | DB接続失敗 | `docker compose logs api db`でhealthcheckと`DATABASE_URL`を確認する |
| `接続エラー: ...` | BrowserからAPIへ接続できない | 画面のerror stateへ理由を表示する |
| `APIがHTTP x/yを返しました。` | healthまたはtasksが2xx以外 | 2つのHTTP statusを画面に表示する |

## 7. バリデーション一覧

| 対象 | 確認 |
|---|---|
| compose | `docker compose config` |
| services | `docker compose ps`で3 serviceを確認する |
| API | `/health`と`/tasks`を順に確認する |
| DB | StudyHubの「DBのタスクを確認」で実行を確認する |
| 障害 | API停止後の画面エラー、APIログ、再起動後の復帰を順に確認する |

## 8. データベース詳細

PostgreSQLを使用する。`init.sql`が接続確認用の`tasks`テーブルと初期データ1件を作成する。named volumeは通常のCompose停止・再起動後も保持し、明示的なvolume削除は別作業とする。

| カラム | 型 | 備考 |
|---|---|---|
| `id` | serial | PK |
| `title` | varchar(100) | 接続確認用タイトル |
| `created_at` | timestamp | 作成日時 |

## 9. AI 処理詳細

AI処理は使用しない。

## 10. エラー・監査設計
- サービスごとのログを確認する
- 本番監査ログは扱わない
## 11. DDL

```sql
CREATE TABLE tasks (
    id         SERIAL PRIMARY KEY,
    title      VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

## 12. 実装メモ

- service名でコンテナ間通信する
- DB volume を定義する
- BrowserからのAPI呼び出しはホスト公開ポート、APIからDBはservice名`db`を使う
- 学習手順、停止、ログ、volumeの扱いは[`README.md`](../learning_notes/web26_docker_compose_web_api_db/README.md)を参照する
