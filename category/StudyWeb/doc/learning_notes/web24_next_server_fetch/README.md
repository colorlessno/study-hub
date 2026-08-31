# web24 Next.jsのサーバー側データ取得

async Server Componentでデータを取得して一覧を生成し、クライアントfetchとの違いを学ぶテーマです。現実装は外部APIではなく、サーバー内の非同期関数が固定データを返します。

## このテーマでできるようになること

- タスク一覧に3件のデータが表示されることを確認できる
- ページを開いた後、ブラウザから別のAPI通信が発生しないことを確認できる
- サーバー側で取得したデータが、最初のHTMLに含まれることを確認できる
- 固定データを返す`fetchTasks`がサーバー側で実行されることをソースで確認できる
- 取得失敗確認用のリンクから、サーバー側のエラー表示を確認できる

## 最初に取り組むこと

次の順番で確認する。

1. 開発サーバーを起動し、`/tasks`を開いて初回HTMLから3件が表示されることを確認する。
2. BrowserのNetworkを確認し、表示後に別APIへfetchしていないことを確認する。
3. `TasksPage → fetchTasks`を辿り、Server Componentでdataを取得する場所を確認する。
4. 入口へ戻って「取得失敗時の表示を確認する」を開き、Server Component内で取得失敗が処理されることを確認する。
5. serverだけで使う値とClientへ渡るpropsを区別し、秘密情報をresponseやClient componentへ含めない境界を確認する。

## 起動方法

実装ディレクトリで`npm install`、`npm run dev`を実行します。`npm run build`でServer Componentを含む本番ビルドを確認できます。

## 処理の流れ

```text
Browserが/tasksを要求
  ↓
Next.jsサーバーでTasksPage実行
  ↓
fetchTasksをawait
  ↓
一覧を含むHTMLを生成
  ↓
Browserへ応答
```

## 観察ポイント

- 初期表示から一覧が含まれるか
- Browserから別APIへの通信が発生しないか
- statusのunion型が3値に制限されるか
- listのkeyへ安定したidを使っているか
- 現在のfetchTasksが実通信ではないことを説明できるか
- `/tasks?fail=1`で取得失敗表示になるか

## 自分の言葉で説明する

- Server Componentでデータ取得する利点を説明してください。
- web19のBrowser fetchとweb24の取得は何が違いますか。
- 本物のAPIやDB取得へ置き換える場合、どの関数を変更しますか。

## うまく動かないとき

- 画面エラーでは、ブラウザだけでなく開発サーバーのログを確認します。
- `/tasks`が404なら、`app/tasks/page.tsx`の位置を確認します。
- Client Hook関連のエラーが出る場合は、Server ComponentへHookを追加していないか確認します。
