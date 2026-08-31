# lintと単体テストの失敗ログを再現する

失敗例は、未コミットの変更がない専用の作業コピーで一つずつ試し、確認後に変更した1行だけを元へ戻します。失敗状態をコミットしません。

## lint failure

1. `src/calculator.js`の任意の行末へ半角空白を一つ追加する。
2. `npm run lint`を実行する。
3. `trailing whitespace`、対象ファイル、行番号が表示されることを確認する。
4. 追加した半角空白だけを削除し、もう一度`npm run lint`を実行する。
5. `lint ok`が表示されることを確認する。

この失敗は、計算結果ではなくソースの書式に対する静的品質の失敗です。

## unit test failure

1. `test/calculator.test.js`の`add(2, 3)`の期待値を`5`から`6`へ一時的に変更する。
2. `npm test`を実行する。
3. expectedとactualが異なるassertion failureが表示されることを確認する。
4. 期待値を`5`へ戻し、もう一度`npm test`を実行する。
5. 3件すべてが成功することを確認する。

この失敗は、関数へ入力した結果と期待値が一致しない振る舞いの失敗です。

## DockerとGitHub Actions

Dockerfileは`npm run check`を実行します。GitHub Actionsはlintと単体テストを別stepとして順番に実行します。どちらも最初に失敗したコマンドで停止するため、step名と最初のエラー行から原因を分類します。
