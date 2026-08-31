# web20_create_task_form

ReactのフォームからNestJS APIへタスクを登録し、PostgreSQLへ保存する学習サンプルです。

## このテーマでできるようになること

- フォーム入力をReactのstateで管理できる
- JSONをPOSTし、APIのレスポンスとHTTPステータスを確認できる
- APIからPrismaを通してPostgreSQLへ保存する流れを説明できる
- 画面、Network、APIログ、DBのどこで失敗したかを切り分けられる

## 前提

- Node.js、npm、Docker、Docker Composeを使用できる
- `web19_fetch_task_list` 相当の一覧取得を確認済み
- ローカル学習用のDBを起動できる

## 使用技術

- フロントエンド: React / Vite / TypeScript
- バックエンド: NestJS / Prisma
- データベース: PostgreSQL
- 実行環境: Docker Compose

## 構成

```text
src/frontend/src/studyweb/systems/web20_create_task_form/frontend/
src/backend/src/studyweb/systems/web20_create_task_form/backend/
src/infra/compose/web20_create_task_form/docker-compose.yml
```

## 最初に取り組むこと

1. Docker Desktopが起動していることを確認する。
2. Web、API、DBの起動後に、タスクを1件登録する。
3. NetworkのPOST要求と、画面の一覧に追加されたタスクを確認する。

## 実行方法

```cmd
cd /d C:\work\work20260617\category\StudyWeb
rtk docker compose -f src\infra\compose\web20_create_task_form\docker-compose.yml up --build
```

- 画面: `http://localhost:5180`
- API: `http://localhost:13020/tasks`

確認後は次のコマンドで停止します。

```cmd
rtk docker compose -f src\infra\compose\web20_create_task_form\docker-compose.yml down
```

Volumeを削除する場合は、学習データが不要であることを確認してから実行します。

## 確認すること

1. 画面にタスク名を入力する。
2. 送信前に、発生するHTTPメソッド、URL、ステータスを予想する。
3. 登録ボタンを押す。
4. DevToolsのNetworkで `POST /tasks` のrequestとresponseを確認する。
5. 一覧へ新しいタスクが反映されることを確認する。
6. APIログまたはDBで、データが保存されたことを確認する。

## 学んだこと

- 送信ボタンを押してからDBへ保存されるまでの流れ
- 画面側とAPI側の両方で入力検証が必要な理由
- 成功後に一覧を更新する方法と、それぞれの利点
- 本番利用で認証、CSRF対策、重複送信対策が必要になる理由

## うまく動かないとき

| 症状 | 最初に確認する場所 | 対処 |
|---|---|---|
| CORSエラー | Networkのresponse headerとAPIのCORS設定 | 許可するoriginを限定して設定する |

## 注意

実際のDBパスワードやAPIキーをREADMEへ記載しません。ローカル学習用の既定値と、本番用の秘密情報管理を区別します。
