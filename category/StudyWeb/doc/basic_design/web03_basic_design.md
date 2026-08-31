# web03 基本設計
## 画像・CSS・JSのパス練習

---

## 1. システム構成設計

### 1.1 全体構成

```text
ブラウザ
  ↓
index.html / about.html
  ├─ styles/style.css
  ├─ scripts/main.js
  └─ images/avatar.svg, banner.svg
```

### 1.2 コンポーネント一覧

| コンポーネント | 役割 |
|---|---|
| `index.html` | トップページ、相対パス確認の起点 |
| `about.html` | 複数ページで同じ資産を参照する確認用ページ |
| `styles/style.css` | 共通スタイル |
| `scripts/main.js` | 共通JavaScript |
| `images/` | 画像資産 |
| `doc/learning_notes/web03_file_path_assets/README.md` | 正しいパス例、誤ったパス例を説明 |

---

## 2. 主要設計方針

### 2.1 ディレクトリ設計方針

- CSS、JavaScript、画像を役割ごとのフォルダへ分ける
- HTMLファイルから見た相対パスを中心に学習できる構成にする
- ファイル名は英小文字中心とする

### 2.2 パス学習方針

- `styles/style.css`、`scripts/main.js`、`images/...` の参照を確認する
- README に成功例と失敗例を記載する
- Console / Network で読み込み失敗を確認できるようにする

---

## 3. IF仕様

### 3.1 ファイル参照IF

| 呼び出し元 | 参照先 | 目的 |
|---|---|---|
| `index.html` | `styles/style.css` | CSS読み込み |
| `index.html` | `scripts/main.js` | JS読み込み |
| `index.html` | `images/avatar.svg` | 画像表示 |
| `about.html` | `styles/style.css` | 共通CSS読み込み |
| `about.html` | `scripts/main.js` | 共通JS読み込み |
| `about.html` | `images/banner.svg` | 画像表示 |

### 3.2 画面イベントIF

| イベント | 処理 | 出力 |
|---|---|---|
| 初期表示 | 相対パスで各ファイルを読み込む | CSS適用、画像表示 |
| ボタンクリック | JS読み込み確認 | メッセージ更新 |

---

## 4. 処理フロー

```text
HTMLを開く
  ↓
HTMLから見た相対パスでCSS/JS/画像を参照
  ↓
読み込み成功なら画面表示
  ↓
読み込み失敗なら DevTools でパスを確認
```

---

## 5. データ設計

DBは使用しない。

| データ | 保持場所 | 用途 |
|---|---|---|
| ページ本文 | HTML | 表示内容 |
| 画像ファイル | `images/` | パス確認 |
| 読み込み確認メッセージ | JavaScript | JS参照確認 |

---

## 6. プロンプト・AI制御設計

AI処理は使用しない。

---

## 7. ガードレール・エラー処理設計

- ファイル名の大文字小文字を統一する
- 参照失敗時は Network の 404 と Console のエラーを確認する
- README に `./` と `../` の使い分けを補足する

---

## 8. 非機能・運用設計

- 外部フレームワークは使わない
- ローカルで表示できる
- 階層は深くしすぎない
- 初学者がフォルダ構成を目視で追えることを優先する

---

## 9. 技術スタック

| 用途 | 技術 |
|---|---|
| 構造 | HTML |
| 見た目 | CSS |
| 動き | JavaScript |
| 画像 | SVG |
| 確認 | DevTools |

---

## 10. 画面一覧

| 画面名 | 目的 | 備考 |
|---|---|---|
| トップページ | 相対パス参照の確認 | `index.html` |
| Aboutページ | 複数HTMLで共通資産を参照 | `about.html` |

---

## 11. 権限制御

認証・認可は扱わない。

---

## 12. 主要導線

| 導線 | 内容 |
|---|---|
| トップ表示 | `index.html` を開く |
| About表示 | `about.html` を開く |
| エラー確認 | 意図的にパスを変えて Console / Network を見る |

---

## 13. 画面遷移図

```text
index.html
  ↓
about.html
```

---

## 14. 画面項目定義

| 項目 | 種別 | 内容 |
|---|---|---|
| ページタイトル | 見出し | パス練習ページ名 |
| 画像 | image | 相対パスで表示 |
| 説明文 | text | 参照しているファイルの説明 |
| 確認ボタン | button | JS読み込み確認 |

---

## 15. シーケンス図

```text
学習者 -> ブラウザ: HTMLを開く
ブラウザ -> HTML: ページ読み込み
HTML -> CSS/JS/images: 相対パスで参照
ブラウザ -> 学習者: 表示結果または読み込みエラーを表示
```
