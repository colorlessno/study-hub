# web23_next_pages_layout 要件定義

## 1. 目的
Next.js App Router のページ、レイアウト、ナビゲーションを作り、Vite単体のSPAとの構成差を理解する。

## 2. 対象ユーザー

- Next.js を初めて学ぶ人
- App Router の基本構成を知りたい人
- layout、page、navigation の役割を確認したい人

## 3. 作成する成果物

複数ページと共通レイアウトを持つ Next.js アプリを作成する。
想定ファイル構成:

```text
src/frontend/src/studyweb/systems/web23_next_pages_layout/
  package.json
  app/
    layout.tsx
    page.tsx
    about/
      page.tsx
    tasks/
      page.tsx
doc/learning_notes/web23_next_pages_layout/README.md
```

## 4. 機能要件

### 4.1 ページ作成

- トップページを表示すること
- About ページを表示すること
- Tasks ページを表示すること
- 各ページへナビゲーションできること

### 4.2 共通レイアウト
- 全ページに共通ヘッダーを表示すること
- 全ページに共通フッターを表示すること
- `app/layout.tsx` を使うこと

### 4.3 App Router

- `app` ディレクトリ配下にページを作成すること
- Next.js の `Link` を使ってページ遷移すること

## 5. 非機能要件

- Next.js + TypeScript を使うこと
- App Router を使うこと
- API通信やDBは使わないこと
- ページ構成が初学者にわかりやすいこと

## 6. 学習ポイント
- `app/page.tsx`
- `app/layout.tsx`
- ルーティング
- `Link` によるページ遷移
- Vite SPA との構成の違い

## 7. 完了条件

- Next.js アプリが起動する
- 複数ページへ遷移できる
- 共通レイアウトが全ページに適用される
- README に App Router の構成説明がある

## 8. 対象外
- Server Actions
- DB
- 認証
- API Routes
- 本番デプロイ
