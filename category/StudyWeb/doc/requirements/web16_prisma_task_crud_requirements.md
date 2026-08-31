# web16_prisma_task_crud 要件定義

## 1. 目的
Prisma と PostgreSQL を使って Task の CRUD を作り、データベース操作の最小形を理解する。

## 2. 対象ユーザー

- DB を使うAPIを初めて作る人
- Prisma の基本を学びたい人
- create / read / update / delete を一通り確認したい人

## 3. 作成する成果物

Task の CRUD API と PostgreSQL 環境を作成する。
想定ファイル構成:

```text
src/backend/src/studyweb/systems/web16_prisma_task_crud/
  docker-compose.yml
  package.json
  prisma/
    schema.prisma
  src/
    tasks/
      tasks.controller.ts
      tasks.service.ts
    main.ts
```

学習手順は `doc/learning_notes/web16_prisma_task_crud/README.md` に配置する。

## 4. 機能要件

### 4.1 DBモデル

- `Task` モデルを定義すること
- `id`、`title`、`done`、`createdAt`、`updatedAt` を持つこと

### 4.2 CRUD API

- `POST /tasks` で作成できること
- `GET /tasks` で一覧取得できること
- `GET /tasks/:id` で1件取得できること
- `PATCH /tasks/:id` で更新できること
- `DELETE /tasks/:id` で削除できること

### 4.3 DB確認
- Prisma migration を実行できること
- API操作後にDBへ反映されること

## 5. 非機能要件

- NestJS + Prisma + PostgreSQL を使うこと
- PostgreSQL は Docker Compose で起動できること
- DB接続情報は `.env` で管理すること
- 入力バリデーションを最低限行うこと

## 6. 学習ポイント
- Prisma schema
- migration
- CRUD
- API と DB の接続
- `.env` による接続情報管理

## 7. 完了条件

- Docker Compose で PostgreSQL が起動する
- Prisma migration が成功する
- CRUD API が一通り動作する
- README に起動手順・確認コマンドが書かれている

## 8. 対象外
- 認証
- ユーザー別データ管理
- 複雑な検索
- フロントエンド画面
- 本番DB運用
