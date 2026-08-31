# web09_props_state_list 要件定義

## 1. 目的
親子コンポーネント、props、state、配列の `map`、条件表示を使って、React の一覧画面の基本を理解する。

## 2. 対象ユーザー

- React の props と state の違いを学びたい人
- 一覧表示を作れるようになりたい人
- 親コンポーネントから子コンポーネントへデータを渡す流れを確認したい人

## 3. 作成する成果物

タスク一覧を表示し、フィルタや選択状態を扱う React アプリを作成する。
想定ファイル構成:

```text
src/frontend/src/studyweb/systems/web09_props_state_list/
  package.json
  src/
    components/
      TaskList.tsx
      TaskItem.tsx
      FilterButtons.tsx
    App.tsx
    main.tsx
```

学習手順は `doc/learning_notes/web09_props_state_list/README.md` に配置する。

## 4. 機能要件

### 4.1 一覧表示

- タスク配列を `map` で一覧表示すること
- 各タスクにはタイトル、状態、期限などを表示すること
- タスクが空の場合はメッセージを表示すること

### 4.2 props

- 親コンポーネントから子コンポーネントへタスク情報を渡すこと
- 子コンポーネントが受け取った props を使って表示すること

### 4.3 state と条件表示

- 表示フィルタを state で管理すること
- すべて、未完了、完了などで一覧を切り替えられること
- 条件に合うタスクだけを表示すること

## 5. 非機能要件

- Vite + React + TypeScript を使うこと
- props の型を定義すること
- 状態管理ライブラリは使わないこと
- コンポーネントの責務を分けること

## 6. 学習ポイント
- props によるデータ受け渡し
- state による画面状態の管理
- 配列の `map` と `filter`
- 条件表示
- 一覧画面の基本構造

## 7. 完了条件

- タスク一覧が表示される
- フィルタボタンで表示内容が切り替わる
- props の型定義がある
- README に props / state / map の役割が書かれている

## 8. 対象外
- API 通信
- データベース
- タスクの永続保存
- TanStack Query
- ルーティング
