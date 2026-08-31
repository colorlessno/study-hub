# web17_relation_user_task 要件定義

## 1. 目的
User と Task の 1対多関係を作り、リレーションを持つデータモデルとAPIの基本を理解する。

## 2. 対象ユーザー

- DBの関連を学びたい人
- Prisma の relation を体験したい人
- ユーザーと投稿、注文と明細などの土台を理解したい人

## 3. 作成する成果物

User と Task の関連を扱うAPIを作成する。
想定ファイル構成:

```text
src/backend/src/studyweb/systems/web17_relation_user_task/
  docker-compose.yml
  package.json
  prisma/
    schema.prisma
  src/
    users/
    tasks/
    main.ts
```

学習手順は `doc/learning_notes/web17_relation_user_task/README.md` に配置する。

## 4. 機能要件

### 4.1 DBモデル

- `User` モデルを定義すること
- `Task` モデルを定義すること
- User は複数の Task を持てること
- Task は1人の User に紐づくこと

### 4.2 User API

- ユーザーを作成できること
- ユーザー一覧を取得できること
- ユーザーと紐づくタスク一覧を取得できること

### 4.3 Task API

- ユーザーを指定してタスクを作成できること
- タスク一覧で担当ユーザー情報を確認できること

## 5. 非機能要件

- NestJS + Prisma + PostgreSQL を使うこと
- PostgreSQL は Docker Compose で起動できること
- リレーションは Prisma schema で明示すること
- 存在しないユーザーへのタスク作成はエラーにすること

## 6. 学習ポイント
- 1対多リレーション
- 外部キー
- Prisma の `include`
- 関連データの作成と取得
- データ設計がAPI設計に影響すること

## 7. 完了条件

- User と Task の migration が成功する
- ユーザーに紐づくタスクを作成できる
- ユーザー詳細でタスク一覧を確認できる
- README にリレーションの説明と確認手順がある

## 8. 対象外
- 認証
- 多対多リレーション
- 権限管理
- フロントエンド画面
- 本格的なER図作成
