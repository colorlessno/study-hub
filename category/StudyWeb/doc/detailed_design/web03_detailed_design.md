# web03 詳細設計
## 画像・CSS・JSのパス練習

## 1. 実装対象

同じ階層にある2つのHTMLから共通のCSS、JavaScript、画像を相対パスで参照し、ファイル構成とURLの関係を学ぶ。

```text
src/frontend/src/studyweb/systems/web03_file_path_assets/
├── index.html
├── about.html
├── styles/
│   └── style.css
├── scripts/
│   └── main.js
└── images/
    ├── avatar.svg
    └── banner.svg
```

| ファイル | 役割 |
|---|---|
| `index.html` | トップページと`about.html`への導線を定義する |
| `about.html` | 別ページから同じ共通資産を参照する |
| `styles/style.css` | 2ページ共通のレイアウトと見た目を定義する |
| `scripts/main.js` | 2ページ共通の読込確認処理を実装する |
| `images/*.svg` | HTMLから相対パスで参照する画像資産 |

## 2. パス設計

### 2.1 ファイル参照

| 呼出元 | 参照先 | 指定 | 用途 |
|---|---|---|---|
| `index.html` | `styles/style.css` | `./styles/style.css` | 共通CSS |
| `index.html` | `scripts/main.js` | `./scripts/main.js` | 共通JavaScript |
| `index.html` | `images/banner.svg` | `./images/banner.svg` | バナー画像 |
| `index.html` | `images/avatar.svg` | `./images/avatar.svg` | カード画像 |
| `about.html` | `styles/style.css` | `./styles/style.css` | 共通CSS |
| `about.html` | `scripts/main.js` | `./scripts/main.js` | 共通JavaScript |
| `about.html` | `images/avatar.svg` | `./images/avatar.svg` | カード画像 |

両HTMLは同じディレクトリにあるため、共通資産への相対パスも同じになる。先頭の`./`は現在のHTMLがあるディレクトリを表す。

### 2.2 ページ遷移

| 発生元 | 指定 | 遷移先 |
|---|---|---|
| `index.html` | `./about.html` | Aboutページ |
| `about.html` | `./index.html` | トップページ |

ページ遷移後も各HTMLを起点としてCSS、JavaScript、画像の読込が行われる。

## 3. HTMLとCSS詳細

| 要素・セレクタ | 用途 |
|---|---|
| `main.page` | コンテンツの最大幅840pxと中央寄せ |
| `img.banner` | トップページの幅100%のバナー |
| `section.card` | 画像と説明をGridで配置する共通カード |
| `img.avatar` | 96px四方のカード画像 |
| `button.path-button` | JavaScript読込確認の操作要素 |
| `p.path-message` | 動的メッセージの出力先 |

画面幅560px以下では`.card`を1列に変更する。2つのHTMLで同じクラス名を使い、1つのCSSを共有する。

## 4. JavaScript詳細

### 4.1 初期化

1. `document.querySelectorAll(".path-button")`で全確認ボタンを取得する。
2. 取得件数が0件なら`web03: .path-button was not found.`をConsoleへ出す。
3. 各ボタンへ`click`イベントを登録する。

### 4.2 クリック処理

クリックされたボタンの親要素から`.path-message`を検索する。見つからない場合は`web03: .path-message was not found.`をConsoleへ出し、そのイベント処理だけを終了する。

メッセージが存在する場合は、次の形式で`textContent`を更新する。

```text
JavaScriptを読み込みました。現在のページ: {HTMLファイル名}
```

HTMLファイル名は`location.pathname.split("/").pop()`で現在のURLから取得する。

## 5. 入出力とエラー

HTTP API、フォーム入力、データベース、AI処理は使用しない。

| 状況 | 結果 | 確認箇所 |
|---|---|---|
| CSSの相対パスが誤っている | 共通スタイルが適用されない | Networkの404 |
| JavaScriptの相対パスが誤っている | ボタンで表示が変わらない | NetworkとConsole |
| 画像の相対パスが誤っている | 画像が表示されない | Networkの404 |
| `.path-button`が0件 | イベントを登録せず固定エラーを出す | Console |
| 対応する`.path-message`がない | 対象ボタンの更新を中止する | Console |

ファイル名は大文字小文字を区別する環境でも一致するよう、実ファイルと参照記述を同じ表記にする。

## 6. セキュリティとアクセシビリティ

- DOM更新には`textContent`を使用する。
- 画像ごとに用途を説明する`alt`を設定する。
- 動的メッセージに`aria-live="polite"`を設定する。
- 操作にはネイティブの`button`、ページ移動には`a`を使用する。

## 7. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | `index.html`を開く | CSS、JavaScript、2画像が読み込まれる |
| `CHK-002` | トップページのボタンを押す | メッセージに`index.html`が表示される |
| `CHK-003` | Aboutへのリンクを押す | `about.html`が同じCSSで表示される |
| `CHK-004` | Aboutページのボタンを押す | メッセージに`about.html`が表示される |
| `CHK-005` | 560px以下へ画面を狭める | カードが1列になる |
| `CHK-006` | CSSのパスを一時的に`../styles/style.css`へ変える | 読込失敗をNetworkで確認できる |

## 8. 実装との対応

| 設計要素 | 実装箇所 |
|---|---|
| トップページの参照と遷移 | `index.html` |
| Aboutページの参照と遷移 | `about.html` |
| 共通表示と560px以下の切替 | `styles/style.css` |
| 複数ボタンへのイベント登録 | `scripts/main.js` |

学習手順、故障演習、完了条件は[`doc/learning_notes/web03_file_path_assets/README.md`](../learning_notes/web03_file_path_assets/README.md)を参照する。
