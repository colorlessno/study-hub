# web26 Docker ComposeでWeb・API・DBを接続

React、NestJS、PostgreSQLを別コンテナとして起動し、Docker Composeのservice名、公開ポート、healthcheck、volumeを学ぶテーマです。

## このテーマでできるようになること

- Web画面でAPIの稼働状態とDBから取得したタスク一覧を表示できる
- Docker ComposeがWeb・API・DBの3サービスを起動することを確認できる
- ブラウザからWeb、WebからAPI、APIからDBへ接続する順番と接続先を確認できる
- APIを停止して画面の接続エラーを確認し、ログ確認後にAPIを再起動できる

## 事前条件

- Docker Engineが起動していること
- 5186、13026、15426番が利用できること
- PostgreSQLの既定パスワードはローカル学習用であること

## 最初に取り組むこと

1. Composeを起動する。
2. Web画面でAPIの稼働状態とDBのタスクを確認する。
3. `docker compose ps`で3サービスを確認する。
4. APIを停止して「接続を再確認」を押し、エラー表示とログを確認してからAPIを再起動する。

## 起動方法

`category/StudyWeb/src/infra/compose/web26_docker_compose_web_api_db`で実行します。

```bash
docker compose up --build
```

サンプルの環境変数を明示する場合は次を使用します。

```bash
docker compose --env-file ../../env/web26_docker_compose_web_api_db/.env.example up --build
```

| 対象 | URL |
|---|---|
| Web | `http://localhost:5186` |
| API health | `http://localhost:13026/health` |
| API tasks | `http://localhost:13026/tasks` |

## 接続の違い

| 利用者 | 接続先 | 理由 |
|---|---|---|
| Browser | `localhost:5186` | ホストへ公開したWebポート |
| Browser/Web JS | `localhost:13026` | ホストへ公開したAPIポート |
| APIコンテナ | `db:5432` | Composeネットワークのservice名 |

## 観察ポイント

- dbがhealthyになってからapiが起動するか
- `/tasks`がinit.sqlの初期データを返すか
- 「接続を再確認」を押すと、Webがhealthを取得した後にtasksを順番に再取得するか
- `init.sql`がDB volume初回作成時に実行されるか
- Compose停止・再起動後もvolumeのデータが残るか

既存volumeがある場合、init.sqlを変更しても自動では再実行されません。volume削除はDBデータを失うため、必要性を確認してから別作業として扱います。

## 自分の言葉で説明する

- Browserのlocalhostとコンテナ内のservice名を説明してください。
- healthcheckとdepends_onは何を保証しますか。
- init.sqlが毎回実行されない理由は何ですか。
