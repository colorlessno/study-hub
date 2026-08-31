# web19_fetch_task_list 要件定義

## 1. 目的
React から API を呼び出してタスク一覧を表示し、画面からバックエンドのデータを取得する流れを理解する。

## 2. 対象ユーザー

- フロントエンドとAPIの接続を初めて学ぶ人
- `fetch` の基本を確認したい人
- 一覧画面にサーバーデータを表示したい人

## 3. 作成する成果物

React フロントエンドと NestJS API を接続したタスク一覧アプリを作成する。
想定ファイル構成:

```text
src/infra/compose/web19_fetch_task_list/
  docker-compose.yml
src/backend/src/studyweb/systems/web19_fetch_task_list/backend/
src/frontend/src/studyweb/systems/web19_fetch_task_list/frontend/
doc/learning_notes/web19_fetch_task_list/README.md
```

## 4. 機能要件

### 4.1 API

- `GET /tasks` でタスク一覧をJSONで返すこと
- タスクには `id`、`title`、`done` を含めること

### 4.2 フロントエンド
- React 画面から `fetch` で API を呼び出すこと
- 取得したタスク一覧を表示すること
- 読み込み中、取得成功、取得失敗の状態を表示すること

### 4.3 接続
- API URL は設定値として管理すること
- CORS 設定を行い、フロントエンドからAPIを呼べること

## 5. 非機能要件

- React + TypeScript を使うこと
- NestJS + TypeScript を使うこと
- Docker Compose で起動できる構成にすること
- DBは必須ではなく、API内の固定データでもよいこと

## 6. 学習ポイント
- `fetch` によるGETリクエスト
- 非同期処理
- loading / error / success の状態管理
- CORS
- フロントエンドとAPIの責務の分担

## 7. 完了条件

- API がタスク一覧JSONを返す
- React 画面にタスク一覧が表示される
- API停止時にエラー表示が確認できる
- README に起動手順・確認方法が書かれている

## 8. 対象外
- DB保存
- POST/更新/削除
- TanStack Query
- 認証
- 本番デプロイ
