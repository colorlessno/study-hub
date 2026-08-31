# web36 localStorageの注意点

ブラウザの`localStorage`と`sessionStorage`に非機密のメモを保存・読取・削除し、保存期間の違いとセキュリティ上の注意点を確認する静的サンプル。

## このテーマでできるようになること

- メモを保存し、ページ再読み込み後に読み込み、最後に削除できることを確認できる
- 同じタブの再読み込みと新しいタブで、sessionStorageの保存期間を比較できる
- ブラウザ開発者ツールで、`studyweb.web36.memo`と`studyweb.web36.sessionMemo`のキーと保存値を確認できる
- localStorageの値は文字列として同じ表示元ごとに保存されることを確認できる
- パスワード・認証情報・個人情報をlocalStorageへ保存しない理由を確認できる

## 最初に取り組むこと

1. StudyHubの「教材を表示」で保存画面を開く。
2. ブラウザ開発者ツールのApplication（保存領域）を開き、教材の表示元にあるLocal Storageを選ぶ。
3. localStorage欄に機密情報ではないテスト文字列を入れて「保存」を押す。
4. `studyweb.web36.memo`が追加されたことを確認する。
5. 教材を再読み込みしてから「読込」を押し、値が残っていることを確認する。
6. sessionStorage欄にも別のテスト文字列を保存し、同じタブの再読み込み後に値が残ることを確認する。
7. 同じURLを新しいタブで開き、`studyweb.web36.sessionMemo`が引き継がれないことを確認する。
8. 二つの「削除」を順番に押し、それぞれ対象のキーだけが削除されることを確認する。

StudyHubを使わずに確認する場合は`app/index.html`をブラウザで開く。JavaScriptの構文は、コマンドプロンプトで次を実行して確認できる。

```bat
cd /d C:\work\work20260617\category\StudyWeb\src\frontend\static\studyweb\systems\web36_localstorage_notes
rtk node --check app\src\main.js
```

## 観察ポイント

- `localStorage` はページを再読み込みしても、同じ origin なら値が残る
- `sessionStorage`は同じタブの再読み込みでは残るが、新しいタブやタブ終了後には引き継がれない
- key と value は文字列として保存される。オブジェクトを扱うなら JSON への変換が必要になる
- ブラウザの利用者は DevTools から値を閲覧・変更・削除できる
- `HttpOnly` Cookie と違い、同じ origin で動く JavaScript から読み取れる
- そのため XSS が起きると、保存した token などを盗まれる可能性がある

このサンプルには本物の token、password、氏名、メールアドレスなどを入力しない。動作確認には架空の値だけを使う。

## 自分の言葉で説明する

- `localStorage` の値は、どこに、どの単位で、いつまで残るか
- `localStorage`、`sessionStorage`、Cookieは何が違うか
- UI 設定は保存できても、access token や個人情報を避けるのはなぜか
- XSS とブラウザ保存領域にはどんな関係があるか

## うまく動かないとき

- 保存後に値が見つからない場合は、Application（保存領域）で教材と同じ表示元を選んでいるか確認する。
- 読込結果が予想と違う場合は、`studyweb.web36.memo`以外のキーを見ていないか確認する。
- sessionStorageの結果が予想と違う場合は、同じタブか新しいタブかを確認する。
- 実在するパスワード・認証情報・個人情報は入力しない。
