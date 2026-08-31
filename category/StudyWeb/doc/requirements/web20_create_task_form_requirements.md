# web20_create_task_form 要件定義

## 1. 目的
画面のフォームから POST して DB に保存し、一覧を更新する Webアプリの最小の形を理解する。

## 2. 対象ユーザー

- フロントエンドからデータ登録する流れを学びたい人
- API と DB を含む一連の処理を体験したい人
- タスク管理アプリの基本形を作りたい人

## 3. 作成する成果物

React + NestJS + Prisma + PostgreSQL のタスク作成アプリを作成する。
想定ファイル構成:

```text
src/infra/compose/web20_create_task_form/
  docker-compose.yml
src/backend/src/studyweb/systems/web20_create_task_form/backend/
src/frontend/src/studyweb/systems/web20_create_task_form/frontend/
doc/learning_notes/web20_create_task_form/README.md
```

## 4. 機能要件

### 4.1 タスク一覧

- APIからタスク一覧を取得して表示すること
- タスクのタイトルと完了状態を表示すること

### 4.2 タスク作成

- 画面にタスク作成フォームを表示すること
- タイトルを入力して送信できること
- `POST /tasks` でDBに保存すること
- 保存後に一覧を更新すること

### 4.3 入力チェック

- タイトルが空の場合は送信しないこと
- API側でもタイトルの必須チェックを行うこと
- エラー時は画面にメッセージを表示すること

## 5. 非機能要件

- Docker Compose で Web / API / DB を起動できること
- API URL と DB接続情報は環境変数で管理すること
- CORS を設定すること
- DB migration を実行できること

## 6. 学習ポイント
- フォーム入力
- POST リクエスト
- API バリデーション
- DB保存
- 保存後の一覧更新
- Web / API / DB の接続

## 7. 完了条件

- Docker Compose で一式起動できる
- 画面からタスクを作成できる
- 作成したタスクがDBに保存される
- 保存後に一覧へ反映される
- README に起動手順・migration・確認方法が書かれている

## 8. 対象外
- 認証
- ユーザー別タスク
- タスク削除/編集の本格UI
- 本番デプロイ
- 高度な状態管理
