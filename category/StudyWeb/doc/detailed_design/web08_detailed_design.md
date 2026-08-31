# web08 詳細設計
## Reactコンポーネントカタログ

## 1. 実装対象

Button、Card、List、Modalを独立したReactコンポーネントとして実装し、props、`children`、親子間の操作通知を確認する。

```text
src/frontend/src/studyweb/systems/web08_component_catalog/
├── package.json
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── styles.css
    └── components/
        ├── Button.tsx
        ├── Card.tsx
        ├── List.tsx
        └── Modal.tsx
```

学習手順は`doc/learning_notes/web08_component_catalog/README.md`に配置する。

## 2. コンポーネント構成

| コンポーネント | 役割 | 主なprops |
|---|---|---|
| `Button` | 共通ボタンの見た目、無効状態、クリック処理を定義する | `variant`、`disabled`、`onClick`、`children` |
| `Card` | タイトル、説明、追加内容をひとまとまりに表示する | `title`、`description`、`children` |
| `List` | 配列を一覧へ変換し、0件時の表示も扱う | `items`、`emptyMessage` |
| `Modal` | `open`に応じてダイアログを表示し、閉じる操作を親へ通知する | `open`、`title`、`onClose`、`children` |
| `App` | 固定データと2つのstateを持ち、4部品の使用例を構成する | なし |

## 3. props設計

### 3.1 Button

| props | 型 | 必須 | 初期値・用途 |
|---|---|---|---|
| `variant` | `"default" \| "primary"` | 任意 | `"default"`、見た目の切替 |
| `disabled` | `boolean` | 任意 | `false`、操作可否 |
| `onClick` | `() => void` | 任意 | 親から渡す操作 |
| `children` | `ReactNode` | 必須 | ボタンの表示内容 |

### 3.2 Card

| props | 型 | 必須 | 用途 |
|---|---|---|---|
| `title` | `string` | 必須 | カード見出し |
| `description` | `string` | 必須 | カード説明 |
| `children` | `ReactNode` | 任意 | ボタンや一覧などの追加内容 |

### 3.3 List

| props | 型 | 必須 | 初期値・用途 |
|---|---|---|---|
| `items` | `{ id: string; label: string }[]` | 必須 | 一覧表示対象 |
| `emptyMessage` | `string` | 任意 | `表示する項目はありません。` |

### 3.4 Modal

| props | 型 | 必須 | 用途 |
|---|---|---|---|
| `open` | `boolean` | 必須 | 表示・非表示の判定 |
| `title` | `string` | 必須 | ダイアログ見出し |
| `onClose` | `() => void` | 必須 | 閉じる操作を親へ通知する |
| `children` | `ReactNode` | 必須 | ダイアログ本文 |

## 4. stateとイベント

| state | 初期値 | 更新元 | 画面への反映 |
|---|---|---|---|
| `message` | 操作案内 | 通常・強調ボタン | ボタン部品の結果文を切り替える |
| `modalOpen` | `false` | 開く・閉じるボタン | Modalの表示・非表示を切り替える |

```text
Buttonをクリック
  ↓ onClick
AppがmessageまたはmodalOpenを更新
  ↓ props
結果文またはModalの表示が更新される
```

無効ボタンは`disabled`属性によりクリックできない。Modalは`open === false`の場合に`null`を返す。

## 5. 一覧と固定データ

`App.tsx`は`id`と`label`を持つ固定配列3件を保持する。`List`は`items.map`で`li`へ変換し、`item.id`をReactのkeyに使う。空配列はエラーではなく、`emptyMessage`を表示する状態として扱う。

## 6. 入出力と対象外

HTTP API、データベース、フォーム入力、AI処理、認証・認可は使用しない。コンポーネント間のpropsとクリックイベントが、この教材の入出力となる。

| 状況 | 動作 |
|---|---|
| propsの型が一致しない | TypeScriptのビルドで検出する |
| Listが空 | 代替メッセージを表示する |
| Buttonがdisabled | ブラウザ標準の無効状態になり、操作を受け付けない |
| Modalが閉じている | DOMへダイアログを描画しない |

## 7. アクセシビリティ

- 操作にはネイティブの`button`を使用する。
- Modalは`role="dialog"`、`aria-modal="true"`、見出しとの関連付けを持つ。
- 無効状態は`disabled`属性で表す。
- 狭い画面ではカードを1列へ切り替える。

## 8. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | 通常ボタンを押す | 通常ボタン用の結果文へ変わる |
| `CHK-002` | 強調ボタンを押す | 強調ボタン用の結果文へ変わる |
| `CHK-003` | 無効ボタンを確認する | 押せず、結果文も変わらない |
| `CHK-004` | 一覧カードを確認する | 固定配列3件が表示される |
| `CHK-005` | ダイアログを開いて閉じる | `modalOpen`に応じて表示が切り替わる |
| `CHK-006` | `npm run build`を実行する | TypeScriptとViteのビルドが成功する |

## 9. 実装との対応

| 設計要素 | 実装箇所 |
|---|---|
| 固定データとstate | `src/App.tsx` |
| 共通ボタン | `src/components/Button.tsx` |
| `children`を含むカード | `src/components/Card.tsx` |
| 一覧とempty state | `src/components/List.tsx` |
| ダイアログと閉じる通知 | `src/components/Modal.tsx` |
| 共通スタイルとレスポンシブ | `src/styles.css` |

学習手順と完了条件は[`doc/learning_notes/web08_component_catalog/README.md`](../learning_notes/web08_component_catalog/README.md)を参照する。
