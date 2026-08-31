# web07 詳細設計
## Reactカウンター

## 1. 実装対象

Reactの`useState`を使い、加算、減算、リセットによるstate変更と再描画を確認する単一画面を実装する。

```text
src/frontend/src/studyweb/systems/web07_react_counter/
├── package.json
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    └── App.css
```

| ファイル | 役割 |
|---|---|
| `main.tsx` | `#root`へReactアプリをマウントする |
| `App.tsx` | カウンターstate、現在値、3つの操作ボタンを定義する |
| `App.css` | 画面中央のカード、現在値、ボタンの見た目を定義する |

学習手順は`doc/learning_notes/web07_react_counter/README.md`に配置する。

## 2. state設計

```tsx
const [count, setCount] = useState(0);
```

| 名前 | 型・初期値 | 用途 |
|---|---|---|
| `count` | `number`、初期値`0` | 現在のカウント値 |
| `setCount` | Reactのstate更新関数 | ボタン操作を次回描画へ反映する |

props、外部状態管理ライブラリ、永続保存は使用しない。ページを再読込すると`count`は`0`へ戻る。

## 3. 画面とイベント

| 要素 | イベント | state更新 | 期待表示 |
|---|---|---|---|
| 加算ボタン | `onClick` | `setCount((value) => value + 1)` | 現在値を1増やす |
| 減算ボタン | `onClick` | `setCount((value) => value - 1)` | 現在値を1減らす |
| リセットボタン | `onClick` | `setCount(0)` | 現在値を0へ戻す |

加算と減算は、直前のstateを引数で受け取る関数形式の更新を使用する。出力には`output`要素を使い、`aria-label="現在のカウント"`を指定する。

```text
ボタンをクリック
  ↓
onClickを実行
  ↓
setCountで次の値を指定
  ↓
ReactがAppを再描画
  ↓
outputへ更新後のcountを表示
```

## 4. Reactマウント

`main.tsx`は`document.getElementById("root")`を取得し、`createRoot`で`App`を描画する。開発時の問題を見つけやすくするため`React.StrictMode`で囲む。

## 5. 入出力と対象外

ユーザー入力は3つのボタンクリックだけである。HTTP API、フォーム入力、データベース、AI処理、認証・認可は使用しない。

| 対象 | 制約 |
|---|---|
| `count` | TypeScriptにより`number`として扱う |
| 加算・減算 | 上限と下限は設けない |
| リセット | 現在値にかかわらず0へ戻す |

## 6. 起動とエラー確認

| 状況 | 確認・対処 |
|---|---|
| 依存パッケージがない | `npm ci`を実行する |
| Viteを起動できない | ターミナルに出た最初のエラーを確認する |
| 画面が空になる | `#root`、`main.tsx`、ブラウザConsoleを順に確認する |
| ボタンが反応しない | 対象ボタンの`onClick`と`setCount`を確認する |

## 7. アクセシビリティ

- 操作にはネイティブの`button`を使用する。
- 現在値には意味を持つ`output`要素を使用する。
- ボタンは折返し可能な行に配置し、狭い画面でも操作できるようにする。

## 8. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | 初期表示する | 現在値が0になる |
| `CHK-002` | 加算を2回押す | 現在値が2になる |
| `CHK-003` | 続けて減算を1回押す | 現在値が1になる |
| `CHK-004` | リセットを押す | 現在値が0へ戻る |
| `CHK-005` | 0から減算を押す | 現在値が-1になる |
| `CHK-006` | `npm run build`を実行する | TypeScriptとViteのビルドが成功する |

## 9. 実装との対応

| 設計要素 | 実装箇所 |
|---|---|
| Reactマウント | `src/main.tsx` |
| stateと3操作 | `src/App.tsx` |
| レイアウトと見た目 | `src/App.css` |

学習手順と完了条件は[`doc/learning_notes/web07_react_counter/README.md`](../learning_notes/web07_react_counter/README.md)を参照する。
