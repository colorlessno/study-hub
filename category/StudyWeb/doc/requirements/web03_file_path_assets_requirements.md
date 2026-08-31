# web03_file_path_assets 要件定義

## 1. 目的
HTML から CSS / JavaScript / 画像ファイルを参照するときの相対パスを理解するためのサンプルを作成する。
このサンプルでは、フォルダ構成とファイル参照の関係を体験し、パスのミスによる表示崩れや読み込み失敗を自分で確認できるようにする。

## 2. 対象ユーザー

- `styles/style.css` や `scripts/main.js` のような相対パスに慣れていない人
- 画像が表示されない・CSS が反映されない・JavaScript が動かない原因を切り分けたい人
- Webアプリの基本的なディレクトリ構成を学びたい人

## 3. 作成する成果物

CSS / JavaScript / 画像を別フォルダに配置した静的Webページを作成する。
想定ファイル構成:

```text
src/frontend/src/studyweb/systems/web03_file_path_assets/
  index.html
  about.html
  styles/
    style.css
  scripts/
    main.js
  images/
    avatar.svg
    banner.svg
```

学習手順は `doc/learning_notes/web03_file_path_assets/README.md` に配置する。

## 4. 機能要件

### 4.1 ファイル配置

- HTML、CSS、JavaScript、画像を別ファイルとして配置すること
- CSS は `styles/style.css` として配置すること
- JavaScript は `scripts/main.js` として配置すること
- 画像は `images/` 配下に配置すること

### 4.2 相対パス参照

- `index.html` から CSS ファイルを相対パスで読み込むこと
- `index.html` から JavaScript ファイルを相対パスで読み込むこと
- `index.html` から画像ファイルを相対パスで読み込むこと
- `about.html` からも同じ CSS / JavaScript / 画像を参照できること

### 4.3 動作確認
- CSS が正しく読み込まれていることを見た目で確認できること
- JavaScript が正しく読み込まれていることを画面上で確認できること
- 画像が正しく表示されること
- あえて間違えたパス例を README に記載し、どのような失敗が起きるか説明すること

## 5. 非機能要件

- 外部フレームワークは使わないこと
- ビルドツールは使わないこと
- ファイル構成は初学者が見て理解しやすい階層にすること
- パスの説明は、絶対パスではなく相対パスを中心とすること
- ファイル名の大文字小文字の違いで混乱しないよう、英小文字を中心とすること

## 6. 学習ポイント
- HTML ファイルから見た相対パスの考え方
- `./`、`../`、フォルダ名指定の違い
- CSS / JavaScript / 画像の読み込み失敗時に確認する箇所
- DevTools の Console / Network タブで読み込みエラーを確認する方法
- 複数ページで同じ CSS / JavaScript を共有する考え方

## 7. 完了条件

- `index.html` を開くと CSS が適用されたページが表示される
- `index.html` で画像が表示される
- `index.html` で JavaScript の動作が確認できる
- `about.html` でも同じ CSS / JavaScript / 画像参照が機能する
- README に正しいパス例と間違ったパス例が書かれている

## 8. 対象外
- React / Vue などのフロントエンドフレームワーク
- TypeScript
- API 通信
- データベース
- Docker
- Webpack / Vite などのモジュールバンドラ
