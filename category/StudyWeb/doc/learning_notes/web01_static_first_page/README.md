# web01 最初の自己紹介ページ

HTML、CSS、JavaScriptの役割分担を、最小の自己紹介ページで確認する学習テーマです。

## このテーマでできるようになること

- 自己紹介ページが崩れずに表示されることを確認できる
- 「あいさつを表示」を3回押し、メッセージとクリック回数が変わることを確認できる
- index.htmlは内容、styles.cssは見た目、script.jsはボタンの動きを担当していることを確認できる
- `defer`を指定したJavaScriptが、HTMLの解析後にボタン操作を登録することを確認できる

## 最初に取り組むこと

1. [実装フォルダ](../../../src/frontend/src/studyweb/systems/web01_static_first_page/)の `index.html` をブラウザで開く。
2. ボタンを3回押し、メッセージとクリック回数の変化を予想と比較する。
3. DevToolsのElementsで `messageButton` と `messageOutput` を探す。
4. DevToolsのSourcesまたはエディターで、そのIDを使うJavaScriptを探す。

`file://` で直接開いた場合、ブラウザや拡張機能によってはConsoleに `file:` URLの警告が出ることがあります。ページ表示とボタン操作が動いていれば、このサンプルのJavaScriptエラーではありません。

## 観察ポイント

- HTMLには見出し、自己紹介文、リスト、ボタン、結果表示領域がある
- CSSによって余白、背景色、カード風の見た目が反映される
- JavaScriptによって、ボタンを押すたびにメッセージとクリック回数が変わる
- `<script defer>` によって、HTML解析後にイベント登録が行われる

## 自分の言葉で説明する

- `index.html` を開いてから画面が操作可能になるまでの流れ
- CSSが読み込めなくてもHTMLとJavaScriptが動く理由
- JavaScriptの要素IDがHTMLと一致している必要がある理由

## うまく動かないとき

- 見た目が反映されない場合は、`index.html` の `<link>` と実際のファイル名を比較する
- ボタンを押しても変わらない場合は、`<script src="./script.js" defer>` を確認する
- Consoleに `web01: required element was not found.` があったら、HTMLとJavaScriptのIDを比較する
