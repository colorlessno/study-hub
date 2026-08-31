# web11_tailwind_cards 要件定義

## 1. 目的
Tailwind CSS を使ってカードUIを作り、ユーティリティクラスで見た目を組み立てる開発スタイルを理解する。

## 2. 対象ユーザー

- Tailwind CSS を初めて使う人
- CSSファイルに書く方法とユーティリティクラスの違いを体験したい人
- 現代的なカードUIを短時間で作りたい人

## 3. 作成する成果物

Tailwind CSS で作成したカード一覧ページを作成する。
想定ファイル構成:

```text
src/frontend/src/studyweb/systems/web11_tailwind_cards/
  package.json
  index.html
  src/
    App.tsx
    main.tsx
    index.css
```

学習手順は `doc/learning_notes/web11_tailwind_cards/README.md` に配置する。

## 4. 機能要件

### 4.1 カード表示

- 複数のカードを一覧表示すること
- カードにはタイトル、説明、タグ、操作ボタンを含めること
- 操作ボタンを押すと、選択したカード名を画面へ表示すること
- PC幅・スマートフォン幅で読みやすく表示すること

### 4.2 Tailwind 利用

- 余白、色、枠線、影、角丸、文字サイズを Tailwind のクラスで持つこと
- レスポンシブ指定に Tailwind のブレークポイントを使うこと
- 状態変化に `hover:` などの修飾子を使うこと

### 4.3 比較・補足
- README に通常CSSとの違いを簡単に記載すること
- よく使うクラスの意味を確認できる説明を入れること

## 5. 非機能要件

- Vite + React + TypeScript を使うこと
- Tailwind CSS を導入すること
- UIライブラリは使わないこと
- 画面全体が単色一辺倒にならないようにすること

## 6. 学習ポイント
- Tailwind のユーティリティクラス
- レスポンシブクラス
- hover / focus などの状態指定
- CSS設計を小さなクラスの組み合わせで行う考え方

## 7. 完了条件

- Tailwind のスタイルが反映される
- カード一覧がレスポンシブに表示される
- hover などの状態変化が確認できる
- 各カードの操作ボタンで選択結果が表示される
- README に起動方法と主要クラスの説明がある

## 8. 対象外
- shadcn/ui
- API 通信
- データベース
- 独自デザイントークンの本格設計
- Storybook
