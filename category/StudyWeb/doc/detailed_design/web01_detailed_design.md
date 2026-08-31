# web01 詳細設計
## 静的自己紹介ページ

## 1. 実装対象

HTML、CSS、JavaScriptの役割分担を確認するため、ビルドツールや外部ライブラリを使わない静的ページを実装する。

```text
src/frontend/src/studyweb/systems/web01_static_first_page/
├── index.html
├── styles.css
└── script.js
```

| ファイル | 役割 |
|---|---|
| `index.html` | ページ構造、表示内容、操作要素、外部ファイルの参照を定義する |
| `styles.css` | レイアウト、色、余白、ボタン、レスポンシブ表示を定義する |
| `script.js` | DOM要素の取得、クリックイベント、表示更新を実装する |

## 2. HTML詳細

### 2.1 文書構造

```text
html[lang="ja"]
├── head
│   ├── meta[charset="UTF-8"]
│   ├── meta[name="viewport"]
│   ├── title
│   ├── link[href="./styles.css"]
│   └── script[src="./script.js"][defer]
└── body
    └── main.profile-card
        ├── p.sample-label
        ├── h1#pageTitle
        ├── section.profile-summary
        ├── section.profile-list
        └── section.interaction-area
            ├── h2#interactionTitle
            ├── button#messageButton
            └── p#messageOutput.message-output
```

### 2.2 主要要素

| 要素 | 用途 | 設計上の注意 |
|---|---|---|
| `main.profile-card` | ページの主要コンテンツ | `aria-labelledby="pageTitle"` で見出しと関連付ける |
| `section.profile-summary` | 名前と自己紹介 | `h2` をセクション見出しにする |
| `section.profile-list` | 学習内容の箇条書き | `ul` / `li` で項目の集合を表す |
| `button#messageButton` | クリックイベントの起点 | 送信操作ではないため `type="button"` とする |
| `p#messageOutput` | JavaScriptの出力先 | `aria-live="polite"` で更新を通知可能にする |

### 2.3 外部ファイルの読込

| ID | 呼出元 | 対象 | 指定 |
|---|---|---|---|
| `LOAD-001` | `index.html` | `styles.css` | `<link rel="stylesheet" href="./styles.css">` |
| `LOAD-002` | `index.html` | `script.js` | `<script src="./script.js" defer></script>` |

`defer` を付け、HTMLの解析完了後にJavaScriptを実行する。これにより、スクリプト実行時に対象DOMが存在する状態を作る。

## 3. CSS詳細

### 3.1 主要セレクタ

| セレクタ | 用途 |
|---|---|
| `*` | `box-sizing: border-box` を全要素へ適用する |
| `body` | 全体の余白、文字、背景、最小高さを定義する |
| `.profile-card` | コンテンツ幅、中央寄せ、枠線、影を定義する |
| `section` | セクション間の余白と区切り線を定義する |
| `button` | 操作可能な見た目と44px以上の高さを確保する |
| `button:hover` | ポインター操作時の変化を示す |
| `button:focus-visible` | キーボード操作時のフォーカスを示す |
| `.message-output` | JavaScriptの出力領域を視覚的に区別する |

### 3.2 レスポンシブ表示

画面幅が520px以下の場合は、`body` と `.profile-card` の余白、`h1` の文字サイズを縮小する。横スクロールを発生させず、主要操作を維持する。

```css
@media (max-width: 520px) {
  body { padding: 16px 12px; }
  .profile-card { padding: 20px; }
  h1 { font-size: 1.6rem; }
}
```

## 4. JavaScript詳細

### 4.1 状態とDOM参照

| 名前 | 型・想定値 | 用途 |
|---|---|---|
| `messageButton` | `HTMLElement \| null` | クリックイベントを登録するボタン |
| `messageOutput` | `HTMLElement \| null` | メッセージと回数の出力先 |
| `clickCount` | `number` | ページを開いてからのクリック回数 |

### 4.2 初期化処理

1. `document.getElementById` で `messageButton` と `messageOutput` を取得する。
2. どちらかが取得できない場合は、Consoleへエラーを出す。
3. 両方が存在する場合だけ、ボタンへ `click` イベントを登録する。

```text
script.jsを実行
  ↓
対象DOMを取得
  ↓
どちらかがnull ─ Yes → Console errorを出して終了
  │
  No
  ↓
clickイベントを登録
```

### 4.3 クリック処理

| イベントID | 発生元 | 処理 | 出力 |
|---|---|---|---|
| `EVT-001` | `button#messageButton` | `clickCount` を1加算し、メッセージを組み立てる | `messageOutput.textContent` を更新する |

表示形式は次のとおりとする。

```text
こんにちは。JavaScriptでHTMLの表示を書き換えました。クリック回数: {clickCount}
```

HTML文字列として解釈する必要がないため、`innerHTML` ではなく `textContent` を使用する。

## 5. 入出力とバリデーション

HTTP API、フォーム入力、データベースは使用しない。ユーザー入力はボタンのクリックだけである。

| 対象 | 確認 | 不正時の動作 |
|---|---|---|
| `#messageButton` | DOMが1件取得できる | イベントを登録せず、Consoleにエラーを出す |
| `#messageOutput` | DOMが1件取得できる | 表示を更新せず、Consoleにエラーを出す |
| `styles.css` | 相対パスで読み込める | ページは表示されるが装飾が適用されない |
| `script.js` | 相対パスで読み込める | ページは表示されるがボタン操作で更新されない |

Consoleエラーは次の固定文言とする。

```text
web01: required element was not found.
```

## 6. セキュリティとアクセシビリティ

- 外部入力や外部通信を扱わない。
- DOM更新には `textContent` を使い、HTMLとして解釈させない。
- 操作要素にはネイティブの `button` を使用する。
- フォーカス表示を消さず、`focus-visible` で視認性を確保する。
- 動的メッセージには `aria-live="polite"` を指定する。
- 色だけに依存せず、見出しと区切りで構造を示す。

## 7. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | `index.html` を開く | 自己紹介ページが表示される |
| `CHK-002` | CSSを読み込む | 背景、カード、ボタン、余白が反映される |
| `CHK-003` | ボタンを1回押す | メッセージ末尾が `クリック回数: 1` になる |
| `CHK-004` | ボタンを続けて押す | 回数が1ずつ増える |
| `CHK-005` | 520px以下へ画面を狭める | 余白と見出しが縮小し、横スクロールが出ない |
| `CHK-006` | `messageButton` のIDを一時的に変える | Consoleに固定エラーが出る |

## 8. 対象外

- HTTP APIとWebサーバー
- データベースと永続化
- React、Vue等のフレームワーク
- TypeScriptとビルド処理
- ユーザー入力を受け取るフォーム
- 自動テスト

## 9. 実装との対応

| 設計要素 | 実装箇所 |
|---|---|
| HTML構造と外部ファイル参照 | `index.html` |
| レイアウトとレスポンシブ表示 | `styles.css` |
| DOM取得と存在確認 | `script.js` 1〜6行目 |
| クリック回数と表示更新 | `script.js` のイベントリスナー |

学習手順と確認内容は [`doc/learning_notes/web01_static_first_page/README.md`](../learning_notes/web01_static_first_page/README.md) を参照する。
