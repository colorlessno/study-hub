# web39 画面エラーからの復旧

ReactのError Boundaryで画面の一部を保護し、子componentの描画例外を代替表示へ切り替える。利用者向け表示と開発者向け情報を分け、ページ全体を再読み込みしない復旧も確認する。

## このテーマでできるようになること

- 「正常表示」と「エラーを発生させる」を押し、2種類の表示を確認できる
- エラー発生時に、利用者向けの代替メッセージと「もう一度表示する」ボタンが出ることを確認できる
- 「もう一度表示する」を押し、ページ全体を再読み込みせず正常表示へ戻ることを確認できる
- 利用者向けの表示と、Consoleへ出す開発者向けエラー情報が分かれていることを確認できる
- 子componentの描画例外をReact Error Boundaryが捕捉していることをソースで確認できる

## 最初に取り組むこと

1. StudyHubの「教材を表示」で画面を開き、初期状態の「正常表示」を確認する。
2. ブラウザ開発者ツールのConsoleを開く。
3. 「エラーを発生させる」を押し、パネル内だけが代替表示へ変わることを確認する。
4. 画面には内部の例外文が表示されず、Consoleには調査用のエラーが記録されることを確認する。
5. 「もう一度表示する」を押し、ページ全体を再読み込みせず正常表示へ戻ることを確認する。

JavaScriptの構文は、コマンドプロンプトで次を実行して確認できる。

```bat
cd /d C:\work\work20260617\category\StudyWeb\src\frontend\static\studyweb\systems\web39_error_boundary
rtk npm.cmd test
```

## Error Boundaryの構成

| 要素 | 役割 |
|---|---|
| `ProtectedPanel` | 正常表示または想定例外を発生させる保護対象 |
| `getDerivedStateFromError` | 描画例外後にfallbackを表示するstateへ切り替える |
| `componentDidCatch` | 例外名、message、component stackをConsoleへ記録する |
| fallback | 利用者向けの安全な説明と復旧buttonを表示する |
| reset | 原因となるstateとBoundaryのstateを戻す |

React Error Boundary でも、event handler、`setTimeout` などの非同期 callback、サーバー側のエラーを自動ですべて捕捉できるわけではない。

## 観察ポイント

- panel の外にある見出しと操作ボタンは、fallback 表示後も残る
- 想定例外の内部messageは利用者向け表示には含めずConsoleへ記録する
- 本番では内部情報を画面へ出しすぎず、調査用情報を監視・ログ基盤へ分離する
- 復旧時は例外を発生させるstateもfalseへ戻すため、直後に同じ例外を繰り返さない
- fallback を置く範囲が大きすぎると、無関係な画面まで操作不能になる

## 自分の言葉で説明する

- fallback UI は誰に何を伝えるための画面か
- 利用者向け表示と開発者向けログを分ける理由は何か
- 保護範囲を画面の一部に限定する利点は何か
- try/catchとReact Error Boundaryでは捕捉できる場所がどう違うか

## うまく動かないとき

- Consoleに何も出ない場合は、Consoleを開いたまま「エラーを発生させる」をもう一度押す。
- 「もう一度表示する」が見つからない場合は、先にエラーを発生させて代替表示へ切り替える。
- 通信や非同期処理の失敗はError Boundaryが自動捕捉する対象ではない。
