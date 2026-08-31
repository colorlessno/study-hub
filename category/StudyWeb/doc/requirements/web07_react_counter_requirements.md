# web07_react_counter 要件定義

## 1. 目的
Vite + React でカウンターアプリを作り、`useState`、イベント、再描画の基本を理解する。

## 2. 対象ユーザー

- React を初めて触る人
- state の変化で画面が更新される仕組みを学びたい人
- Vite で React 開発環境を起動したい人

## 3. 作成する成果物

React製のカウンターアプリを作成する。
想定ファイル構成:

```text
src/frontend/src/studyweb/systems/web07_react_counter/
  package.json
  index.html
  src/
    App.tsx
    main.tsx
    App.css
```

学習手順は `doc/learning_notes/web07_react_counter/README.md` に配置する。

## 4. 機能要件

### 4.1 初期表示

- 現在のカウント値を表示すること
- 加算、減算、リセットのボタンを表示すること

### 4.2 カウンター操作
- 加算ボタンでカウント値が増えること
- 減算ボタンでカウント値が減ること
- リセットボタンでカウント値が0に戻ること

### 4.3 React 実装
- `useState` を使ってカウント値を管理すること
- ボタンの `onClick` で state を更新すること
- state の変更に応じて表示が更新されること

## 5. 非機能要件

- Vite を使うこと
- TypeScript テンプレートを使うこと
- 複雑な状態管理ライブラリは使わないこと
- 初学者が追いやすいコンポーネント数にすること

## 6. 学習ポイント
- React コンポーネントの基本
- `useState` による状態管理
- イベントハンドラによる state 更新
- Vite 開発サーバーの起動方法

## 7. 完了条件

- `npm install` 後に `npm run dev` で起動できる
- カウンターの加算、減算、リセットが動作する
- README に起動方法と React の学習ポイントが書かれている

## 8. 対象外
- API 通信
- データベース
- ルーティング
- グローバル状態管理
- テスト実装
