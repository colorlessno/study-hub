# web13_nest_hello_api 要件定義

## 1. 目的
NestJS で GET リクエストに JSON を返す最小APIを作り、Controller と Service の役割を理解する。
## 2. 対象ユーザー

- バックエンドAPIを初めて作る人
- NestJS の基本構成を学びたい人
- フロントエンドから呼び出すAPIの最小形を理解したい人

## 3. 作成する成果物

GET API を持つ NestJS アプリケーションを作成する。
想定ファイル構成:

```text
src/backend/src/studyweb/systems/web13_nest_hello_api/
  package.json
  src/
    app.controller.ts
    app.service.ts
    app.module.ts
    main.ts
```

学習手順は `doc/learning_notes/web13_nest_hello_api/README.md` に配置する。

## 4. 機能要件

### 4.1 API起動
- NestJS アプリをローカルで起動できること
- 既定の起動ポートを3000番とし、`PORT`環境変数で変更できること
- 起動ポートを README に明記すること

### 4.2 GET API

- `GET /` または `GET /hello` で JSON を返すこと
- レスポンスにはメッセージ、現在時刻、サンプル名を含めること
- Controller はリクエスト受付を担当すること
- Service は返却データの生成を担当すること

### 4.3 動作確認
- ブラウザまたは curl でレスポンスを確認できること
- HTTPステータス 200 が返ること

## 5. 非機能要件

- NestJS を使うこと
- TypeScript を使うこと
- データベースは使わないこと
- API の責務が Controller と Service に分かれていること

## 6. 学習ポイント
- NestJS の Controller / Service / Module
- HTTP GET
- JSONレスポンス
- APIサーバーの起動と確認
## 7. 完了条件

- `npm run start:dev` で起動できる
- GET API が JSON を返す
- README に起動方法と確認コマンドが書かれている

## 8. 対象外
- POST API
- バリデーション
- データベース
- 認証
- Docker Compose
