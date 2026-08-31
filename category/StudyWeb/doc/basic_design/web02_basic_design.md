# web02 基本設計
## ブラウザ通信観察サンプル

---

## 1. システム構成設計

### 1.1 全体構成

```text
学習者
  ↓
ブラウザ / DevTools Network
  ↓
index.html
  ├─ styles/style.css
  ├─ scripts/main.js
  └─ images/profile-placeholder.svg
```

### 1.2 コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| `index.html` | HTML構造と CSS / JS / 画像参照を定義する |
| `styles/style.css` | 画面の見た目を定義する |
| `scripts/main.js` | 読み込み完了表示やボタン操作を担当する |
| `images/profile-placeholder.svg` | Network タブで画像リクエストを確認する対象 |
| `doc/learning_notes/web02_browser_network/README.md` | Network タブで見る項目と操作手順を説明する |

---

## 2. 主要設計方針

### 2.1 リソース分離方針

- HTML / CSS / JavaScript / 画像を別ファイルに分ける
- ブラウザが複数リソースを読み込む様子を DevTools で確認できる構成にする
- ファイル数は初学者が追いやすい最小限にする

### 2.2 観察方針

- Network タブで `index.html`、CSS、JS、画像の読み込みを確認する
- Status、Type、Size、Time を確認対象とする
- 404 が出た場合にパス指定を確認する流れを README に記載する

---

## 3. IF仕様

### 3.1 ファイル参照IF

| 呼び出し元 | 参照先 | 方式 | 目的 |
|---|---|---|---|
| `index.html` | `styles/style.css` | `<link>` | CSS読み込み |
| `index.html` | `scripts/main.js` | `<script defer>` | JS読み込み |
| `index.html` | `images/profile-placeholder.svg` | `<img>` | 画像読み込み |

### 3.2 画面イベントIF

| イベント | 処理 | 出力 |
|---|---|---|
| 初期表示 | 各リソースを読み込む | ページ表示、Network に履歴表示 |
| ボタンクリック | JS読み込み確認メッセージを更新 | 画面に確認結果を表示 |

---

## 4. 処理フロー

### 4.1 初期表示

```text
index.html を開く
  ↓
HTML 読み込み
  ↓
CSS / JS / 画像を追加読み込み
  ↓
Network タブに各リクエストが表示される
```

### 4.2 読み込み確認

```text
ボタンをクリック
  ↓
main.js のイベント処理
  ↓
読み込み完了メッセージを表示
```

---

## 5. データ設計

DBは使用しない。画面内データのみ扱う。

| データ | 保持場所 | 用途 |
|---|---|---|
| リソース説明文 | HTML | 観察対象の説明 |
| 読み込み確認メッセージ | JavaScript | JS読み込み確認 |
| 画像 | SVGファイル | Network の Image 確認 |

---

## 6. プロンプト・AI制御設計

AI処理は使用しない。

---

## 7. ガードレール・エラー処理設計

- `defer` を使い、DOM構築後に JavaScript を実行する
- 画像やCSSが読めない場合は Network タブで 404 を確認する
- Console にエラーが出た場合はファイルパスとファイル名を確認する

---

## 8. 非機能・運用設計

- ローカルファイルとして開ける
- 必要に応じて簡易HTTPサーバーでも確認できる
- 外部ネットワークに依存しない
- 最新の Chrome / Edge / Firefox を想定する

---

## 9. 技術スタック

| 用途 | 技術 |
|---|---|
| 構造 | HTML |
| 見た目 | CSS |
| 動き | JavaScript |
| 観察 | Browser DevTools Network |

---

## 10. 画面一覧

| 画面名 | 目的 | 備考 |
|---|---|---|
| 通信観察ページ | HTML / CSS / JS / 画像の読み込みを確認する | `index.html` |

---

## 11. 権限制御

認証・認可は扱わない。

| ロール | 利用可能画面 | 主要操作 |
|---|---|---|
| 学習者 | 通信観察ページ | 表示、Network確認、ボタンクリック |

---

## 12. 主要導線

| 導線 | 内容 |
|---|---|
| ページ表示 | `index.html` を開く |
| Network確認 | DevTools の Network タブを見る |
| リソース確認 | HTML / CSS / JS / Image の Type を確認する |

---

## 13. 画面遷移図

```text
通信観察ページ
  └─ 同一画面内で読み込み確認メッセージを更新
```

---

## 14. 画面項目定義

| 項目 | 種別 | 内容 |
|---|---|---|
| ページタイトル | 見出し | 通信観察サンプル名 |
| リソース説明 | テキスト | 読み込まれるファイルの説明 |
| 画像 | image | Network確認対象 |
| 確認ボタン | button | JS動作確認 |
| メッセージ領域 | text | JSによる更新結果 |

---

## 15. シーケンス図

```text
学習者 -> ブラウザ: index.html を開く
ブラウザ -> index.html: HTML取得
index.html -> style.css: CSS取得
index.html -> main.js: JS取得
index.html -> image: 画像取得
ブラウザ -> DevTools: Network履歴を表示
```
