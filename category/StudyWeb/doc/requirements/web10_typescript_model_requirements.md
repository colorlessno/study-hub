# web10_typescript_model 要件定義

## 1. 目的
TypeScript の型を使って User / Task / Article などのデータモデルを定義し、画面側で型安全に扱う練習をする。

## 2. 対象ユーザー

- JavaScript から TypeScript へ進みたい人
- 画面で扱うデータの形を明確にしたい人
- フロントエンドとバックエンドを TypeScript で動かす前提を学びたい人

## 3. 作成する成果物

型定義とサンプルデータを使った React アプリを作成する。
想定ファイル構成:

```text
src/frontend/src/studyweb/systems/web10_typescript_model/
  package.json
  src/
    models/
      user.ts
      task.ts
      article.ts
    data/
      sampleData.ts
    App.tsx
    main.tsx
```

学習手順は `doc/learning_notes/web10_typescript_model/README.md` に配置する。

## 4. 機能要件

### 4.1 型定義

- `User` 型を定義すること
- `Task` 型を定義すること
- `Article` 型を定義すること
- 必須項目と任意項目を含めること

### 4.2 サンプルデータ

- 定義した型を使ってサンプルデータを作成すること
- 型に合わないデータを入れるとエディタやビルドで検出できること

### 4.3 画面表示

- User / Task / Article のサンプルデータを画面に表示すること
- 配列データは一覧として表示すること
- 状態やカテゴリなどはわかりやすく表示すること

## 5. 非機能要件

- Vite + React + TypeScript を使うこと
- `any` の使用は避けること
- 型定義ファイルと表示コンポーネントを分けること
- 初学者が型の効き方を確認しやすいようにすること

## 6. 学習ポイント
- `type` または `interface` による型定義
- 配列型、任意プロパティ、ユニオン型
- 型定義とサンプルデータの関係
- 型安全に props を渡す方法

## 7. 完了条件

- User / Task / Article の型が定義されている
- 型を使ったサンプルデータがある
- 画面にサンプルデータが表示される
- README に型定義の目的・確認方法が書かれている

## 8. 対象外
- API 通信
- データベース
- Prisma schema
- Zod などのランタイムバリデーション
- 認証
