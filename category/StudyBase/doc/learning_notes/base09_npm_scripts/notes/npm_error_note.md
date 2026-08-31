# npmエラーメモ

| エラー | 原因候補 | 確認方法 |
|---|---|---|
| `Missing script` | 指定したscript名が`scripts`にない | 入力した名前と`package.json`の`scripts`を照合する |
| 終了コードが0以外 | scriptから実行された処理が失敗した | エラーの先頭と、最初に示されたファイル名・行番号を確認する |

StudyHubの失敗例は`npm --logs-max=0 run missing-script`を使用し、利用者ホーム配下へnpm debug logを作らず、画面にもホスト固有の絶対パスを表示しません。
