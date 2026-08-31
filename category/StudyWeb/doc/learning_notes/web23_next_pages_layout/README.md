# web23 Next.jsのページと共通画面

Next.js App Routerの`layout.tsx`、`page.tsx`、ディレクトリとURLの対応、`Link`による画面遷移を学ぶテーマです。

## このテーマでできるようになること

- トップ・概要・タスクの3ページをメニューから開ける
- URLと、表示に使われるpage.tsxファイルの対応を確認できる
- layout.tsxのヘッダーとフッターが、3ページで共通表示されることを確認できる
- `Link`でページを移動し、ページ全体を再読み込みせずに表示が切り替わることを確認できる

## 最初に取り組むこと

次の順番で確認する。

1. 開発サーバーを起動し、`/`、`/about`、`/tasks`を順に開く。
2. URLと`app`配下のpage fileを対応付け、`/about`を作るfileを確認する。
3. pageを移動してもHeaderとFooterが共通で表示されることを確認し、layoutへまとめる理由を確認する。
4. navigationの`Link`を確認し、通常の`a`によるpage全体の再読込との違いを確認する。

## 起動方法

実装ディレクトリで実行します。

```bash
npm install
npm run dev
```

表示されたURLをブラウザで開きます。`npm run build`でルートを含む本番ビルドを確認できます。

## ルート対応

| URL | ファイル | 共通Layout |
|---|---|---|
| `/` | `app/page.tsx` | 適用される |
| `/about` | `app/about/page.tsx` | 適用される |
| `/tasks` | `app/tasks/page.tsx` | 適用される |

## 自分の言葉で説明する

- LayoutとPageの責務を説明してください。
- ディレクトリ構造からURLが決まる仕組みを3例で説明してください。
- 共通ナビゲーションをRootLayoutへ置く利点は何ですか。

## うまく動かないとき

- 404の場合は、URLと`app/{segment}/page.tsx`を照合します。
- 共通部分が出ない場合は、RootLayoutのreturnとchildrenを確認します。
- buildエラーでは、ReactNodeの型とLinkのimportを確認します。
