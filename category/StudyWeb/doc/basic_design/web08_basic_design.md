# web08 基本設計
## Reactコンポーネントカタログ

---

## 1. システム構成設計

### 1.1 全体構成

```text
React App
  ├─ Button
  ├─ Card
  ├─ List
  └─ Modal
```

### 1.2 コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| `Button.tsx` | ボタンの見た目とクリック処理を共通化 |
| `Card.tsx` | タイトル、本文、操作を持つカード |
| `List.tsx` | 配列データの一覧表示 |
| `Modal.tsx` | 開閉可能なダイアログ |
| `App.tsx` | 各部品の表示サンプルをまとめる |

---

## 2. 主要設計方針

### 2.1 コンポーネント設計方針

- UIを小さな部品へ分割する
- 表示内容は props で受け取る
- `children` を使い、汎用的に中身を差し替えられる部品を含める

### 2.2 状態管理方針

- Modal の開閉状態のみ `useState` で管理する
- List の表示データは固定配列とする
- 外部状態管理は使わない

---

## 3. IF仕様

### 3.1 props IF

| コンポーネント | props | 用途 |
|---|---|---|
| Button | `variant`, `disabled`, `onClick`, `children` | ボタン表示 |
| Card | `title`, `description`, `children` | カード表示 |
| List | `items` | 配列表示 |
| Modal | `open`, `title`, `onClose`, `children` | モーダル表示 |

### 3.2 イベントIF

| イベント | 処理 | 出力 |
|---|---|---|
| Buttonクリック | サンプル処理実行 | メッセージ表示 |
| Modalを開く | `open=true` | Modal表示 |
| Modalを閉じる | `open=false` | Modal非表示 |

---

## 4. 処理フロー

```text
App.tsx 表示
  ↓
各コンポーネントに props を渡す
  ↓
Button / Card / List / Modal を表示
  ↓
Modal操作時のみ state を更新
```

---

## 5. データ設計

| データ | 型 | 保持場所 | 用途 |
|---|---|---|---|
| リスト項目 | array | `App.tsx` | List表示 |
| Modal開閉 | boolean | React state | Modal制御 |
| カード情報 | object | `App.tsx` | Card表示 |

DBは使用しない。

---

## 6. プロンプト・AI制御設計

AI処理は使用しない。

---

## 7. ガードレール・エラー処理設計

- props の型を TypeScript で定義する
- 空リストの場合の表示を用意する
- Modal は閉じる操作が必ずできるようにする

---

## 8. 非機能・運用設計

- Vite + React + TypeScript を使う
- 外部UIライブラリは使わない
- コンポーネントの責務を小さく保つ

---

## 9. 技術スタック

| 用途 | 技術 |
|---|---|
| UI | React |
| 型 | TypeScript |
| 開発 | Vite |
| スタイル | CSS |

---

## 10. 画面一覧

| 画面名 | 目的 | 備考 |
|---|---|---|
| コンポーネントカタログ | UI部品を一覧確認する | `App.tsx` |

---

## 11. 権限制御

認証・認可は扱わない。

---

## 12. 主要導線

| 導線 | 内容 |
|---|---|
| 部品確認 | Button / Card / List を見る |
| Modal確認 | 開く、閉じる |
| props確認 | 表示内容が props で変わることを見る |

---

## 13. 画面遷移図

```text
コンポーネントカタログ
  └─ Modal表示/非表示
```

---

## 14. 画面項目定義

| 項目 | 種別 | 内容 |
|---|---|---|
| Button例 | component | 通常、強調、無効 |
| Card例 | component | タイトル、本文、操作 |
| List例 | component | 配列から表示 |
| Modal例 | component | 開閉確認 |

---

## 15. シーケンス図

```text
App -> Button/Card/List/Modal: propsを渡す
学習者 -> Button: Modalを開く
Button -> App: onClick
App -> Modal: open=true
Modal -> 学習者: ダイアログ表示
```
