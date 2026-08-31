# web02_browser_network 要件定義

## 1. 目的
ブラウザが HTML / CSS / JavaScript / 画像ファイルを読み込む流れを、DevTools の Network タブで観察できるサンプルを作成する。
このサンプルでは、単にページを表示するだけでなく、ページ表示の裏側で複数のファイルがリクエストされていることを理解する。

## 2. 対象ユーザー

- Webページがブラウザに表示される仕組みを学びたい人
- DevTools の Network タブを初めて使う人
- HTML / CSS / JavaScript / 画像が別々のリソースとして読み込まれることを確認したい人

## 3. 作成する成果物

ブラウザ通信を観察するための静的Webページを作成する。
想定ファイル構成:

```text
src/frontend/src/studyweb/systems/web02_browser_network/
  index.html
  styles/
    style.css
  scripts/
    main.js
  images/
    profile-placeholder.svg

doc/learning_notes/web02_browser_network/
  README.md
```

## 4. 機能要件

### 4.1 ページ表示

- ブラウザで `index.html` を開くとページが表示されること
- HTML から外部 CSS ファイルを読み込むこと
- HTML から外部 JavaScript ファイルを読み込むこと
- HTML から画像ファイルを読み込むこと
- 画面上に、読み込まれているファイルの種類がわかる説明を表示すること

### 4.2 Network タブでの確認
- DevTools の Network タブで次のリソースを確認できること
  - `index.html`
  - `style.css`
  - `main.js`
  - 画像ファイル
- 各リソースのステータスコードを確認できること
- 各リソースの種類が HTML / CSS / JS / Image として区別できること

### 4.3 JavaScript の動作
- JavaScript が読み込まれたことを画面上で確認できること
- 例
  - 読み込み完了メッセージを表示する
  - ボタンを押すと確認メッセージを表示する
  - 現在時刻を表示する

## 5. 非機能要件

- 外部フレームワークは使わないこと
- ビルドツールは使わないこと
- ローカルファイルとして開いて動作確認できること
- 可能であれば簡易HTTPサーバーでも確認できる構成にすること
- 初学者が DevTools で観察しやすいよう、ファイル数を増やしすぎないこと

## 6. 学習ポイント
- ブラウザは HTML だけでなく、CSS / JavaScript / 画像を追加で読み込むこと
- `<link>`、`<script>`、`<img>` がネットワークリクエストにつながること
- Network タブで URL、Status、Type、Size、Time を確認できること
- 404 エラーがあった場合、パスやファイル名を確認する必要があること

## 7. 完了条件

- `index.html` を開くとページが表示される
- CSS が適用されている
- JavaScript の動作が確認できる
- 画像が表示されている
- DevTools の Network タブで HTML / CSS / JS / 画像の読み込みを確認できる
- README に目的・起動方法・Network タブで見るポイントが書かれている

## 8. 対象外
- React / Vue などのフロントエンドフレームワーク
- TypeScript
- API 通信
- データベース
- Docker
- 本格的なHTTPプロトコル解説
