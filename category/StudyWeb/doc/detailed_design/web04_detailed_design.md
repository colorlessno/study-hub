# web04 詳細設計
## 素のJavaScriptによるDOM操作

## 1. 実装対象

ブラウザ標準のDOM APIを使い、要素取得、イベント登録、状態変更、画面更新の基本を確認する単一ページを実装する。

```text
src/frontend/src/studyweb/systems/web04_vanilla_dom/
├── index.html
├── styles.css
└── script.js
```

| ファイル | 役割 |
|---|---|
| `index.html` | 操作ボタンと結果表示領域を定義する |
| `styles.css` | 操作領域、ボタン、結果表示の見た目を定義する |
| `script.js` | DOM取得、イベント登録、クリック回数、表示更新を実装する |

## 2. HTML詳細

| 要素 | 用途 | 設計上の注意 |
|---|---|---|
| `main.tool` | ページ全体のコンテナ | 最大幅720px、中央寄せとする |
| `section.panel` | 操作と結果をまとめる | `aria-labelledby="operationTitle"`で見出しと関連付ける |
| `button#changeButton` | 表示変更イベントの起点 | `type="button"`とする |
| `button#resetButton` | 状態初期化イベントの起点 | `type="button"`とする |
| `div#resultText` | JavaScriptの出力先 | `aria-live="polite"`を指定する |

`script.js`は`defer`付きで読み込み、HTMLの`onclick`属性は使わない。

## 3. CSS詳細

| セレクタ | 用途 |
|---|---|
| `.tool` | コンテンツ幅、余白、枠線を定義する |
| `.panel` | 操作領域を上罫線で区切る |
| `.button-row` | ボタンをFlexboxで配置し、折返し可能にする |
| `button` | 主要ボタンの見た目を定義する |
| `button:last-child` | リセット操作を副次的な見た目にする |
| `.result-box` | 動的な出力領域を視覚的に区別する |

## 4. JavaScript詳細

### 4.1 状態とDOM参照

| 名前 | 型・初期値 | 用途 |
|---|---|---|
| `changeButton` | `HTMLElement \| null` | 変更イベントの登録先 |
| `resetButton` | `HTMLElement \| null` | リセットイベントの登録先 |
| `resultText` | `HTMLElement \| null` | 表示の更新先 |
| `initialMessage` | 固定文字列 | 初期表示へ戻す際に使用する |
| `changeCount` | `0` | 表示変更ボタンのクリック回数 |

### 4.2 初期化

3つの必須DOMのうち1つでも取得できない場合は、イベントを登録せず`web04: required element was not found.`をConsoleへ出す。すべて存在する場合だけ、2つのclickイベントを登録する。

### 4.3 イベント

| イベントID | 発生元 | 状態変更 | 出力 |
|---|---|---|---|
| `EVT-CHANGE` | `#changeButton` | `changeCount`を1加算 | `表示を変更しました。クリック回数: {changeCount}` |
| `EVT-RESET` | `#resetButton` | `changeCount`を0へ戻す | `initialMessage` |

出力には`textContent`を使用する。リセット後に変更ボタンを押した場合、回数は再び1から始まる。

```text
ページ読込
  ↓
必須DOMを取得
  ↓
変更クリック → 回数を加算 → 結果表示を更新
  ↓
リセットクリック → 回数を0へ戻す → 初期文言を表示
```

## 5. 入出力とエラー

HTTP API、フォーム入力、データベース、AI処理、認証・認可は使用しない。ユーザー入力は2つのボタンクリックだけである。

| 対象 | 正常条件 | 不正時の動作 |
|---|---|---|
| `#changeButton` | 1件存在する | すべてのイベント登録を中止する |
| `#resetButton` | 1件存在する | すべてのイベント登録を中止する |
| `#resultText` | 1件存在する | 表示更新を行わない |
| `script.js` | 相対パスで読み込める | ボタン操作で表示が変わらない |

## 6. セキュリティとアクセシビリティ

- DOM更新には`innerHTML`ではなく`textContent`を使用する。
- 操作要素にはキーボード操作可能なネイティブの`button`を使用する。
- 動的結果には`aria-live="polite"`を設定する。
- 主要操作とリセット操作を色と文言の両方で区別する。

## 7. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | ページを開く | 初期メッセージが表示される |
| `CHK-002` | 変更ボタンを1回押す | クリック回数が1になる |
| `CHK-003` | 変更ボタンを続けて押す | 回数が1ずつ増える |
| `CHK-004` | リセットボタンを押す | 初期メッセージへ戻る |
| `CHK-005` | リセット後に変更ボタンを押す | クリック回数が1になる |
| `CHK-006` | 必須IDを一時的に変更する | Consoleに固定エラーが出る |

## 8. 実装との対応

| 設計要素 | 実装箇所 |
|---|---|
| 操作要素と結果領域 | `index.html` |
| 操作領域とボタンの表示 | `styles.css` |
| 状態管理とイベント処理 | `script.js` |

学習手順、故障演習、完了条件は[`doc/learning_notes/web04_vanilla_dom/README.md`](../learning_notes/web04_vanilla_dom/README.md)を参照する。
