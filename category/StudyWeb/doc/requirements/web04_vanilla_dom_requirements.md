# web04_vanilla_dom 要件定義

## 1. 目的
React などのフレームワークに進む前に、素の JavaScript で DOM を操作する基本を理解するためのサンプルを作成する。
このサンプルでは、HTML 要素を取得し、ボタンのクリックイベントを受け取り、画面表示を変更する流れを体験する。

## 2. 対象ユーザー

- JavaScript で画面を動かす基本を学びたい人
- `document.querySelector` や `addEventListener` を使ったことがない人
- React の前に、ブラウザ標準の DOM 操作を理解したい人

## 3. 作成する成果物

ボタン操作で表示内容が変わる静的Webページを作成する。
想定ファイル構成:

```text
src/frontend/src/studyweb/systems/web04_vanilla_dom/
  index.html
  styles.css
  script.js
```

学習手順は `doc/learning_notes/web04_vanilla_dom/README.md` に配置する。

## 4. 機能要件

### 4.1 初期表示

- ブラウザで `index.html` を開くとページが表示されること
- 見出し、説明文、操作ボタン、表示結果エリアがあること
- 初期状態では、表示結果エリアに初期メッセージが表示されていること

### 4.2 DOM 要素の取得
- JavaScript で HTML 要素を取得すること
- 取得対象には少なくとも次を含めること
  - ボタン
  - 表示結果エリア
- 要素取得には `document.querySelector` または `document.getElementById` を使うこと

### 4.3 イベントの処理
- ボタンをクリックすると JavaScript の処理が実行されること
- イベント登録には `addEventListener` を使うこと
- HTML の `onclick` 属性に直接処理を書かないこと

### 4.4 表示変更

- ボタンをクリックすると、表示結果エリアのテキストが変わること
- クリック回数、現在時刻、ランダムメッセージなど、動作結果がわかる内容を表示すること
- 複数のボタンを用意する場合、それぞれ異なる表示変更を行うこと

## 5. 非機能要件

- 外部フレームワークは使わないこと
- ビルドツールは使わないこと
- TypeScript は使わず JavaScript で実装すること
- 初学者が DOM 操作の流れを追える程度のコード量にすること
- HTML、CSS、JavaScript の役割を分けること

## 6. 学習ポイント
- DOM とはブラウザが HTML を操作可能な形にしたものだと理解すること
- JavaScript から HTML 要素を選択できること
- `addEventListener` でユーザー操作を処理できること
- `textContent` などを使って画面表示を変更できること
- React の state やイベントの理解の前提となるブラウザ標準の動きを理解すること

## 7. 完了条件

- `index.html` を開くと画面が表示される
- ボタンをクリックすると表示結果エリアの内容が変わる
- JavaScript は外部ファイルとして読み込まれている
- HTML に直接 `onclick` を書いていない
- README に目的・起動方法・DOM 操作の確認ポイントが書かれている

## 8. 対象外
- React / Vue などのフロントエンドフレームワーク
- TypeScript
- API 通信
- データベース
- Docker
- 複雑な状態管理
