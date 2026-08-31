# web25 Next.jsのフォーム送信

Next.js App Router、Reactの`useActionState`、Server Actionを使い、フォーム入力をサーバー側で検証して同じ画面へ結果を返すテーマです。

## このテーマでできるようになること

- 空入力・タイトルだけ・タイトルと説明の3通りで送信結果を確認できる
- FormClient.tsxからactions.tsのcreateTaskが呼ばれる流れを確認できる
- 送信中はボタン表示が変わり、完了後に結果メッセージが表示されることを確認できる
- 送信後も同じページにとどまり、入力結果だけが更新されることを確認できる

## 最初に取り組むこと

次の順番で確認する。

1. 開発サーバーを起動し、空のtitle、titleだけ、titleとdescriptionの順に送信して結果を比較する。
2. `FormClient.tsx`から`actions.ts`までを辿り、`"use client"`と`"use server"`の境界を確認する。
3. server側のvalidationを確認し、browserから送られた値をClient側の確認だけで信用しない理由を確認する。
4. formからServer Actionを直接呼ぶ流れを確認し、別のREST API endpointを作る構成との違いを整理する。

## 起動方法

実装ディレクトリで実行します。

```bash
npm install
npm run dev
```

表示されたURLをブラウザで開きます。3000番をweb13・14等が使っている場合は、先に停止するかNext.jsが案内する別ポートを使用します。`npm run build`で本番ビルドも確認します。

## データの流れ

```text
Browserのform
  ↓ FormData
createTask Server Action
  ↓ trimと必須検証
FormState
  ↓ useActionState
Client Componentの結果表示
```

## 観察ポイント

- 初期状態では結果要素が表示されないか
- titleが空または空白だけならエラーになるか
- description省略時と入力時で成功文言が変わるか
- 処理中にボタンがdisabledになり`送信中`と表示されるか
- URL遷移を伴わず同じ画面に結果が出るか
- 入力値がDBやファイルへ保存されていないか

## 自分の言葉で説明する

- BrowserからServer Actionを経て結果表示へ戻る流れを説明してください。
- `useActionState`が返す3つの値は何ですか。
- この構成でNestJS等の別APIを必要としない理由は何ですか。

## うまく動かないとき

- Hookのエラーでは、FormClientの`"use client"`を確認します。
- Actionが呼ばれない場合は、formのactionとactions.tsのexportを確認します。
- buildエラーでは、ClientからServer Actionをimportする境界と型を確認します。
