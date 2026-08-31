# web11 詳細設計
## TailwindカードUI

## 1. 実装対象

ReactとTailwind CSSを使い、4件のカードを画面幅に応じて1列、2列、4列へ切り替えて表示する。カードのhover・focus状態と、ボタンで選択結果を表示する操作も確認できるようにする。

```text
src/frontend/src/studyweb/systems/web11_tailwind_cards/
├── package.json
├── index.html
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.tsx
    ├── App.tsx
    └── index.css
```

学習手順は`doc/learning_notes/web11_tailwind_cards/README.md`に配置する。

## 2. モジュール構成

| ファイル | 役割 |
|---|---|
| `App.tsx` | 固定カード、選択state、カード一覧と結果表示を定義する |
| `main.tsx` | Reactアプリを`#root`へマウントする |
| `index.css` | Tailwindのbase、components、utilitiesを読み込む |
| `tailwind.config.js` | HTMLとTypeScript/TSXをクラス検出対象にする |
| `postcss.config.js` | PostCSSでTailwindとAutoprefixerを有効にする |

## 3. データとstate

```ts
type CardItem = {
  title: string;
  description: string;
  tag: string;
};
```

`cards`は4件の固定配列とし、`card.title`をReactのkeyと選択結果の値に使う。

| state | 型・初期値 | 用途 |
|---|---|---|
| `selectedTitle` | `string \| null`、初期値`null` | 最後に「表示例」を押したカード名 |

初期状態では操作案内を表示し、ボタンを押した後は`「{selectedTitle}」の表示例を選びました。`を表示する。結果領域には`aria-live="polite"`を指定する。

## 4. Tailwindクラス設計

### 4.1 レスポンシブGrid

| 条件 | クラス | 列数 |
|---|---|---:|
| 基本 | `grid-cols-1` | 1列 |
| `md`以上 | `md:grid-cols-2` | 2列 |
| `lg`以上 | `lg:grid-cols-4` | 4列 |

### 4.2 カードと操作

| 対象 | 主なクラス | 目的 |
|---|---|---|
| カード | `flex min-h-64 flex-col` | 高さと内部配置を揃える |
| カード | `rounded-lg border bg-white p-5 shadow-sm` | 角丸、枠線、背景、余白、影 |
| カードhover | `hover:-translate-y-1 hover:border-teal-300 hover:shadow-md` | 位置、枠線、影を変える |
| 操作ボタン | `mt-auto min-h-10` | 下端へ揃え、操作高さを確保する |
| ボタンhover | `hover:bg-teal-800` | カーソル時に色を変える |
| ボタンfocus | `focus-visible:outline-*` | キーボードフォーカスを可視化する |

## 5. イベント処理

```text
カード内の「表示例」を押す
  ↓
onClickでsetSelectedTitle(card.title)を実行
  ↓
ReactがAppを再描画
  ↓
選択結果へカード名を表示
```

カード自体のhoverはCSSによる見た目の変化であり、stateを変更しない。

## 6. 入出力と対象外

ユーザー入力は4つの「表示例」ボタンである。HTTP API、データベース、外部保存、AI処理、認証・認可は使用しない。

| 状況 | 確認・対処 |
|---|---|
| Tailwindが反映されない | `index.css`のimportとcontent設定を確認する |
| 列数が変わらない | `md:grid-cols-2`と`lg:grid-cols-4`を確認する |
| hoverが変化しない | `hover:`から始まるクラスを確認する |
| 選択結果が変わらない | `onClick`と`setSelectedTitle`を確認する |

## 7. アクセシビリティ

- 操作にはネイティブの`button`を使用する。
- キーボードフォーカスを輪郭で示す。
- 選択結果に`aria-live="polite"`を指定する。
- 狭い画面では1列にして読み順を維持する。

## 8. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | 狭い幅で表示する | カードが1列になる |
| `CHK-002` | `md`以上で表示する | カードが2列になる |
| `CHK-003` | `lg`以上で表示する | カードが4列になる |
| `CHK-004` | カードへカーソルを合わせる | 位置、枠線、影が変わる |
| `CHK-005` | 各カードの「表示例」を押す | 押したカード名が結果へ表示される |
| `CHK-006` | `npm run build`を実行する | TypeScript、Tailwind、Viteのビルドが成功する |

## 9. 実装との対応

| 設計要素 | 実装箇所 |
|---|---|
| 固定カードと選択state | `src/App.tsx` |
| Grid、hover、focus、結果表示 | `src/App.tsx`のTailwindクラス |
| Tailwind読込 | `src/index.css` |
| クラス検出対象 | `tailwind.config.js` |

学習手順と完了条件は[`doc/learning_notes/web11_tailwind_cards/README.md`](../learning_notes/web11_tailwind_cards/README.md)を参照する。
