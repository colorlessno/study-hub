# web02 詳細設計
## ブラウザ通信観察サンプル

## 1. 実装対象

ブラウザがHTMLからCSS、JavaScript、画像を追加取得する流れを、DevToolsのNetworkタブで観察する静的ページを実装する。

```text
src/frontend/src/studyweb/systems/web02_browser_network/
├── index.html
├── styles/
│   └── style.css
├── scripts/
│   └── main.js
└── images/
    └── profile-placeholder.svg
```

| ファイル | 役割 |
|---|---|
| `index.html` | 表示構造と各リソースへの相対パスを定義する |
| `styles/style.css` | パネル、画像、ボタン、レスポンシブ表示を定義する |
| `scripts/main.js` | ボタン操作を受け、JavaScriptの読込結果を表示する |
| `images/profile-placeholder.svg` | 画面表示用画像の通信を発生させる |

## 2. HTML詳細

### 2.1 外部リソース

| ID | HTML要素 | 参照先 | Network上の主なType |
|---|---|---|---|
| `LOAD-001` | `link[rel="stylesheet"]` | `./styles/style.css` | stylesheet |
| `LOAD-002` | `script[defer]` | `./scripts/main.js` | script |
| `LOAD-003` | `img` | `./images/profile-placeholder.svg` | image |

HTML自身はdocumentとして取得される。`script`には`defer`を付け、DOMの解析完了後にJavaScriptを実行する。

### 2.2 主要要素

| 要素 | 用途 | 設計上の注意 |
|---|---|---|
| `main.page-shell` | ページ全体の表示幅を制御する | 最大幅840px、中央寄せとする |
| `section.resource-panel` | 読込対象の一覧と画像を表示する | `aria-labelledby="resourceTitle"`で見出しと関連付ける |
| `button#checkButton` | JavaScriptの動作確認を開始する | 送信操作ではないため`type="button"`とする |
| `p#loadStatus` | 実行結果と時刻を表示する | `aria-live="polite"`で更新を通知可能にする |

## 3. CSS詳細

| セレクタ | 用途 |
|---|---|
| `.page-shell` | コンテンツ幅と中央配置 |
| `.resource-panel` | 説明と画像を2列のGridで配置 |
| `.check-panel` | JavaScript確認領域をカードとして表示 |
| `button` / `button:hover` | 操作要素とポインター操作時の変化 |
| `#loadStatus` | 動的メッセージ領域の高さと背景 |

画面幅640px以下では`.resource-panel`を1列へ切り替える。画像や本文が横にはみ出さない構成とする。

## 4. JavaScript詳細

### 4.1 DOM参照

| 変数 | 取得対象 | 用途 |
|---|---|---|
| `checkButton` | `#checkButton` | clickイベントの登録先 |
| `loadStatus` | `#loadStatus` | 読込確認メッセージの出力先 |

### 4.2 初期化とクリック処理

```text
main.jsを実行
  ↓
2つのDOMを取得
  ↓
どちらかがnull ─ Yes → Consoleに固定エラーを出す
  │
  No
  ↓
clickイベントを登録
  ↓
現在時刻を含むメッセージをtextContentへ設定
```

Consoleエラーは`web02: required element was not found.`とする。成功時の時刻は`new Date().toLocaleTimeString()`で、利用環境のロケールに従って表示する。

## 5. エラーと観察ポイント

| 状況 | 画面・DevTools上の結果 | 確認箇所 |
|---|---|---|
| CSSのパスが誤っている | 装飾が適用されず、通信が404になる | NetworkのStatusとName |
| JavaScriptのパスが誤っている | ボタンを押しても表示が変わらない | NetworkとConsole |
| 画像のパスが誤っている | 画像が表示されず、通信が404になる | NetworkのType=image |
| 必須DOMが存在しない | イベントを登録せず固定エラーを出す | Console |

HTTP API、データベース、AI処理、認証・認可は使用しない。ローカルファイルまたは簡易HTTPサーバーで動作し、外部ネットワークへ依存しない。

## 6. セキュリティとアクセシビリティ

- 外部入力と外部通信を扱わない。
- DOM更新には`textContent`を使用する。
- 画像に内容を説明する`alt`を設定する。
- 動的メッセージに`aria-live="polite"`を設定する。
- 操作にはネイティブの`button`を使用する。

## 7. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | `index.html`を開きNetworkを確認する | document、stylesheet、script、imageが取得される |
| `CHK-002` | 各通信のStatusを確認する | すべて成功ステータスになる |
| `CHK-003` | 確認ボタンを押す | JavaScript読込済みの文言と確認時刻が表示される |
| `CHK-004` | 640px以下へ画面を狭める | リソース領域が1列になる |
| `CHK-005` | 画像パスを一時的に変更する | Networkで404を観察できる |
| `CHK-006` | `Disable cache`を有効にして再読込する | 各リソースの通信が再度表示される |

## 8. 実装との対応

| 設計要素 | 実装箇所 |
|---|---|
| リソース参照と画面構造 | `index.html` |
| 2列表示と640px以下の切替 | `styles/style.css` |
| DOM存在確認とクリック処理 | `scripts/main.js` |

学習手順と確認内容は[`doc/learning_notes/web02_browser_network/README.md`](../learning_notes/web02_browser_network/README.md)を参照する。
