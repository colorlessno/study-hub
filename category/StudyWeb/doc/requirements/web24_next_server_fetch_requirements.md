# web24_next_server_fetch 要件定義

## 1. 目的
Next.js のサーバー側データ取得を使い、ブラウザだけで処理する SPA との違いを理解する。

## 2. 対象ユーザー

- SSR や Server Components の入口を学びたい人
- サーバー側で先にデータを取得する流れを体験したい人
- Next.js のデータ取得方法を確認したい人

## 3. 作成する成果物

サーバー側でデータを取得して表示する Next.js アプリを作成する。
想定ファイル構成:

```text
src/frontend/src/studyweb/systems/web24_next_server_fetch/
  package.json
  app/
    page.tsx
    tasks/
      page.tsx
doc/learning_notes/web24_next_server_fetch/README.md
```

## 4. 機能要件

### 4.1 サーバー側取得
- Server Component でデータを取得すること
- 取得したデータを一覧表示すること
- ブラウザの初期表示時点でデータが描画されていること

### 4.2 データソース

- 外部APIまたはローカルのサンプルAPIからデータを取得すること
- 学習用に固定JSONでもよいこと
- エラー時の表示を用意すること

### 4.3 比較・説明
- README にクライアントの fetch との違いを記載すること
- Network タブで見える挙動の違いを説明すること

## 5. 非機能要件

- Next.js + TypeScript を使うこと
- App Router を使うこと
- Client Component は必要最小限にすること
- 機密情報をブラウザに出さない考え方を説明すること

## 6. 学習ポイント
- Server Component
- サーバー側 fetch
- SSR / 事前描画の入口
- ブラウザ側 fetch との違い
- サーバーで処理するメリット

## 7. 完了条件

- Next.js アプリが起動する
- サーバー側で取得したデータが表示される
- エラー表示が確認できる
- README に確認手順・比較説明がある

## 8. 対象外
- Server Actions
- DB直接接続
- 認証
- キャッシュ戦略の詳細
- 本番デプロイ
