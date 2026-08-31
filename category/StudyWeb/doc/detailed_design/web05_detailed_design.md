# web05 詳細設計
## レスポンシブなカード一覧レイアウト

## 1. 実装対象

CSS Gridとメディアクエリを使い、画面幅に応じて3列、2列、1列へ変化するカード一覧を実装する。JavaScriptは使用しない。

```text
src/frontend/src/studyweb/systems/web05_responsive_layout/
├── index.html
└── styles.css
```

| ファイル | 役割 |
|---|---|
| `index.html` | ヘッダー、6件のカード、フッターを定義する |
| `styles.css` | Grid、カード内部のFlexbox、画面幅ごとの列数を定義する |

## 2. HTML詳細

```text
body
├── header.site-header
├── main.card-grid[aria-label="学習カード一覧"]
│   └── article.card × 6
│       ├── p.category
│       ├── h2
│       ├── p
│       └── button[type="button"]
└── footer.site-footer
```

カードは独立した内容として`article`で表し、一覧は`main`の`aria-label`で識別可能にする。各カードはカテゴリ、タイトル、説明、確認ボタンを同じ順序で持つ。

確認ボタンはレイアウト学習用の表示要素であり、JavaScriptイベントやページ遷移は割り当てない。

## 3. CSS詳細

### 3.1 全体幅

`.site-header`、`.card-grid`、`.site-footer`には`width: min(100%, 1080px)`と左右の`auto`マージンを適用する。PC幅でも本文が広がりすぎず、小さい画面では利用可能幅に収まる。

### 3.2 カード一覧

| セレクタ | 主な指定 | 目的 |
|---|---|---|
| `.card-grid` | `display: grid` | カードを行列に配置する |
| `.card-grid` | `repeat(3, minmax(0, 1fr))` | PC幅で均等な3列にする |
| `.card-grid` | `gap: 18px` | カード間の余白を作る |
| `.card` | `display: flex; flex-direction: column` | カード内部を縦方向に配置する |
| `.card` | `min-width: 0` | 長い内容によるGridのはみ出しを防ぐ |
| `.card button` | `margin-top: auto` | 説明文の長さが違ってもボタン位置を下へ揃える |

### 3.3 ブレークポイント

| 条件 | 列定義 | 補足 |
|---|---|---|
| 821px以上 | 3列 | 基本指定を使用する |
| 561px〜820px | 2列 | `@media (max-width: 820px)`を適用する |
| 560px以下 | 1列 | `@media (max-width: 560px)`を適用する |

560px以下では`body`の余白も`20px 12px`へ縮小する。横スクロールを発生させず、カードとボタンの操作領域を維持する。

## 4. データと入出力

カード6件の内容はHTMLへ固定値として保持する。HTTP API、データベース、フォーム入力、AI処理、認証・認可は使用しない。

| データ | 保持場所 | 用途 |
|---|---|---|
| カテゴリ | `p.category` | 学習領域の分類 |
| タイトル | `h2` | カードの主題 |
| 説明 | カード内の段落 | 学習内容の要約 |
| ボタン文言 | `button` | 同じ高さの操作部品を含むレイアウト確認 |

## 5. エラーと確認観点

| 状況 | 想定される問題 | 確認方法 |
|---|---|---|
| `styles.css`が読み込めない | カードが縦に並び装飾が消える | NetworkとConsoleを確認する |
| `minmax(0, 1fr)`または`min-width: 0`を外す | 長い内容で列幅が広がる可能性がある | 長い文字列を入れて確認する |
| メディアクエリの境界が重なる | 意図しない列数になる | 560px、561px、820px、821pxで確認する |
| 画面幅より要素が広い | 横スクロールが発生する | DevToolsのデバイスモードで確認する |

## 6. アクセシビリティ

- カードごとに`article`と`h2`を使用し、内容のまとまりを示す。
- 一覧に`aria-label="学習カード一覧"`を指定する。
- ボタンはネイティブ要素を使用し、最低40pxの高さを確保する。
- 文字色と背景色のコントラストを確保する。

## 7. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | 1080px以上で開く | カードが3列で表示される |
| `CHK-002` | 820pxへ狭める | カードが2列で表示される |
| `CHK-003` | 560pxへ狭める | カードが1列で表示される |
| `CHK-004` | 各境界の前後1pxを確認する | 指定どおり列数が切り替わる |
| `CHK-005` | 6件のカードを比較する | 各カードのボタンが下端に揃う |
| `CHK-006` | スマートフォン幅で横方向を確認する | 横スクロールが発生しない |

## 8. 実装との対応

| 設計要素 | 実装箇所 |
|---|---|
| 6件のカードと意味構造 | `index.html` |
| 3列Gridとカード内部のFlexbox | `styles.css` |
| 820px・560pxの切替 | `styles.css`のメディアクエリ |

学習手順、故障演習、完了条件は[`doc/learning_notes/web05_responsive_layout/README.md`](../learning_notes/web05_responsive_layout/README.md)を参照する。
