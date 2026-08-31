# web02 ブラウザ通信の観察

ブラウザがHTMLを起点にCSS、JavaScript、画像を取得する流れを、DevToolsのNetworkタブで観察するテーマです。

## このテーマでできるようになること

- F12でブラウザ開発者ツールを開き、Network（通信）タブを選んでからページを再読み込みできる
- 通信一覧で、ページ本体・CSS・JavaScript・プロフィール画像のStatus列が200（読込成功）になっていることを確認できる
- index.htmlがページ本体を構成し、profile-placeholder.svgがプロフィール画像として表示されることを確認できる
- style.cssがページの見た目を整えていることを確認できる
- main.jsがボタンの動作を制御していることを確認できる
- 「読み込み状態を表示」を押し、JavaScriptの読込時刻が画面に表示されることを確認できる

## 最初に取り組むこと

次の順番で確認する。

1. `index.html`をHTTPサーバーから開き、DevToolsのNetworkを表示して再読み込みする。
2. document、CSS、JavaScript、画像を選び、HTMLの参照記述が各通信を発生させていることと、正常時のstatus 200を確認する。
3. 存在しないファイルのURLを開き、status 404と正常時の200を比較する。
4. ボタンを押して時刻が変わることを確認し、動かない場合は`main.js`の通信結果を確認してからConsoleのエラーを確認する。
5. 通信で読み込まれたファイルと画面の動きを対応付けて、自分の言葉で説明する。

## 起動方法

実装ディレクトリの`index.html`をブラウザで直接開けます。HTTP通信として観察する場合は、実装ディレクトリで簡易サーバーを起動します。

```bash
python -m http.server 8002
```

ブラウザで`http://localhost:8002`を開きます。Chrome / Edgeでは`F12`または「検証」からDevToolsを開き、必要に応じて`Disable cache`を有効にして再読み込みします。

## 観察ポイント

| リソース | Typeの目安 | 画面上の役割 |
|---|---|---|
| `index.html` | document | ページ本体 |
| `styles/style.css` | stylesheet | レイアウトと装飾 |
| `scripts/main.js` | script | ボタン操作 |
| `images/profile-placeholder.svg` | image | プロフィール画像 |

- 各リソースのStatusが成功になっているか
- ファイルサイズと読込時間がリソースごとに違うか
- ボタンを押すたびに確認時刻が更新されるか
- 640px以下でリソース領域が1列になるか

## 自分の言葉で説明する

- HTMLから追加リソースが読み込まれる流れを3文で説明する。
- Networkの404から、修正箇所を探すために使う情報を説明する。
- `defer`がこのページで必要な理由を説明する。

## うまく動かないとき

- 404の場合は、NameとInitiatorを見てHTMLの参照元を確認します。
- ボタンだけ動かない場合は、scriptのStatusとConsoleの両方を確認します。
- `[Smart Unit Converter]`等のログはブラウザ拡張機能由来の可能性があります。シークレットウィンドウでも再確認します。
