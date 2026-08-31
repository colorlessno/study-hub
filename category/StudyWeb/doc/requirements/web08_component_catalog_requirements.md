# web08_component_catalog 要件定義

## 1. 目的
React で Button / Card / List / Modal を部品化し、UIをコンポーネントに分けて作る考え方を理解する。

## 2. 対象ユーザー

- React コンポーネントの分割を練習したい人
- 画面を小さな部品に分ける設計を学びたい人
- 業務画面でよく使うUI部品の基本形を作りたい人

## 3. 作成する成果物

基本UI部品を一覧できるコンポーネントカタログを作成する。
想定ファイル構成:

```text
src/frontend/src/studyweb/systems/web08_component_catalog/
  package.json
  src/
    components/
      Button.tsx
      Card.tsx
      List.tsx
      Modal.tsx
    App.tsx
    main.tsx
```

学習手順は `doc/learning_notes/web08_component_catalog/README.md` に配置する。

## 4. 機能要件

### 4.1 Button

- 通常ボタン、強調ボタン、無効ボタンを表示すること
- クリック時の動作例を確認できること

### 4.2 Card

- タイトル、本文、補足情報、操作ボタンを持つカードを表示すること
- 複数カードを並べて表示できること

### 4.3 List

- 配列データを `map` で一覧表示すること
- 空の一覧の場合の表示を用意すること

### 4.4 Modal

- ボタンでモーダルを開閉できること
- モーダルにタイトル、本文、閉じるボタンを表示すること

## 5. 非機能要件

- Vite + React + TypeScript を使うこと
- 各UI部品を独立したコンポーネントとして作ること
- props で表示内容を変えられるようにすること
- 外部UIライブラリは使わないこと

## 6. 学習ポイント
- コンポーネントの分割
- props による表示内容の差し替え
- children の使い方
- UI部品を再利用する考え方

## 7. 完了条件

- Button / Card / List / Modal が画面に表示される
- Modal の開閉が動作する
- List が配列データから表示される
- README に各コンポーネントの役割が書かれている

## 8. 対象外
- shadcn/ui
- Tailwind CSS
- API 通信
- データベース
- Storybook
