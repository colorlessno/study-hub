# web14_nest_post_api 要件定義

## 1. 目的
NestJS で POST リクエストを受け取り、リクエストボディ、JSON、バリデーションの基本を理解する。

## 2. 対象ユーザー

- GET API の次にデータ登録系APIを学びたい人
- リクエストボディの扱いを確認したい人
- DTO とバリデーションの入口を学びたい人

## 3. 作成する成果物

タスク作成を模した POST API を持つ NestJS アプリケーションを作成する。
想定ファイル構成:

```text
src/backend/src/studyweb/systems/web14_nest_post_api/
  package.json
  src/
    tasks/
      dto/
        create-task.dto.ts
      tasks.controller.ts
      tasks.service.ts
      tasks.module.ts
    app.module.ts
    main.ts
```

学習手順は `doc/learning_notes/web14_nest_post_api/README.md` に配置する。

## 4. 機能要件

### 4.1 POST API

- `GET /tasks/guide` でテーマ名、操作対象、非永続化の説明を確認できること
- `POST /tasks` でタスク作成リクエストを受け取ること
- リクエストボディにはタイトルと説明を含めること
- 正常時は作成されたタスク風のJSONを返すこと

### 4.2 バリデーション

- タイトルが空の場合は 400 を返すこと
- タイトルの最大文字数を設定すること
- バリデーションエラーの内容をレスポンスで確認できること

### 4.3 動作確認
- curl または REST Client で正常系と異常系を確認できること
- README にリクエスト例を記載すること

## 5. 非機能要件

- NestJS と TypeScript を使うこと
- DTO を使って入力データの形を定義すること
- DB保存は行わず、メモリ上またはレスポンス生成のみでよいこと
- Controller と Service の責務を分けること

## 6. 学習ポイント
- HTTP POST
- リクエストボディ
- DTO
- class-validator による入力チェック
- 正常系と異常系の確認

## 7. 完了条件

- 正常なPOSTでタスク風JSONが返る
- 不正なPOSTで 400 が返る
- README に正常系と異常系の確認コマンドがある

## 8. 対象外
- データベース保存
- 認証
- ファイルアップロード
- フロントエンド連携
- Docker Compose
