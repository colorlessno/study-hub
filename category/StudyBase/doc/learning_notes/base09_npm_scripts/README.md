# base09 npm scriptsの使い分け

`package.json`を読み、`dev`、`build`、`test`、`start`が実際に何を行うか、実行結果と対応させて確認します。

## このテーマでできるようになること

- 4つのnpm scriptを目的に応じて使い分け、結果から確認できた範囲を説明できる

## 到達目標

- script名と`package.json`の定義を対応付けられる。
- 開発用実行、構文確認、テスト、通常実行の結果を区別できる。
- 存在しないscriptを指定したときのエラーから、確認する場所を判断できる。

## 最初に取り組むこと

StudyHubで次の操作を一つずつ実行し、表示されたコマンドと結果を`package.json`の`scripts`と照合します。

1. 「devを実行」で`--mode=dev`が渡され、`npm script practice: dev`と表示されることを確認する。
2. 「buildを実行」でJavaScriptの構文確認が成功することを確認する。
3. 「testを実行」で`smoke test passed`と表示されることを確認する。
4. 「startを実行」で通常実行の`npm script practice: start`が表示されることを確認する。
5. 「存在しないscriptのエラーを確認」で、script名を探せなかったことを示すエラーを確認する。

このサンプルには外部パッケージがないため、`npm install`は不要です。StudyHubを使わず個別に実行するときは、リポジトリルートで次を実行します。

```bat
rtk npm.cmd --prefix category\StudyBase\src\samples\base09_npm_scripts\sample_node_project run dev
rtk npm.cmd --prefix category\StudyBase\src\samples\base09_npm_scripts\sample_node_project run build
rtk npm.cmd --prefix category\StudyBase\src\samples\base09_npm_scripts\sample_node_project test
rtk npm.cmd --prefix category\StudyBase\src\samples\base09_npm_scripts\sample_node_project start
```

## 結果から分かること

- `dev`と`start`は同じJavaScriptを実行しますが、`dev`だけは`--mode=dev`を渡します。
- `build`は`node --check`による構文確認です。配布用ファイルの生成や動作仕様の確認は行いません。
- `test`は`message`関数の結果を1件確認します。アプリ全体を網羅するテストではありません。
- `Missing script`が表示された場合は、最初に`package.json`の`scripts`と入力した名前を照合します。
