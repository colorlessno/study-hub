# web18_seed_and_migration 要件定義

## 1. 目的
Prisma migration と seed を使い、DB構造と初期データをコードで管理する考え方を理解する。

## 2. 対象ユーザー

- DB変更を手作業ではなくコードで管理したい人
- migration の役割を学びたい人
- 開発用の初期データ投入を体験したい人

## 3. 作成する成果物

migration と seed を実行できる Prisma プロジェクトを作成する。
想定ファイル構成:

```text
src/backend/src/studyweb/systems/web18_seed_and_migration/
  docker-compose.yml
  package.json
  prisma/
    schema.prisma
    seed.ts
```

学習手順は `doc/learning_notes/web18_seed_and_migration/README.md` に配置する。

## 4. 機能要件

### 4.1 migration

- Prisma schema でモデルを定義すること
- migration を作成・実行できること
- DBテーブルが作成されること

### 4.2 seed

- seed コマンドで初期データを投入できること
- 初期データには複数件のサンプルを含めること
- seed を再実行しても扱いやすいデータ投入方法にすること

### 4.3 確認
- Prisma Studio または API/CLI で初期データを確認できること
- README に migration と seed の違いを記載すること

## 5. 非機能要件

- PostgreSQL は Docker Compose で起動できること
- DB接続情報は `.env` で管理すること
- migration ファイルを成果物に含めること
- seed は開発用データとして扱うこと

## 6. 学習ポイント
- DB構造の変更を migration で管理すること
- 初期データを seed で投入すること
- schema と実DBの関係
- 開発環境を再現しやすくする考え方

## 7. 完了条件

- PostgreSQL が起動する
- migration が実行できる
- seed が実行できる
- 初期データを確認できる
- README に手順・確認方法が書かれている

## 8. 対象外
- 本番データ移行
- バックアップ/リストア
- 複雑なマイグレーション戦略
- 認証
- フロントエンド画面
