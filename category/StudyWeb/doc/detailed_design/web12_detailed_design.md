# web12 詳細設計
## shadcn/ui風ダッシュボード

## 1. 実装対象

React、TypeScript、Tailwind CSS、lucide-reactを使い、管理画面でよく使われるサイドバー、ヘッダー、統計カード、テーブルを組み立てる。shadcn/ui本体のコンポーネントは導入せず、見た目と分割方針を学ぶ。

```text
src/frontend/src/studyweb/systems/web12_shadcn_dashboard/
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    └── components/
        ├── AppSidebar.tsx
        ├── Header.tsx
        ├── StatCard.tsx
        └── DataTable.tsx
```

| コンポーネント | 役割 |
|---|---|
| `App` | 全体レイアウトと統計カードの反復描画 |
| `AppSidebar` | アイコン付きナビゲーションの表示 |
| `Header` | 選択中セクションの見出し、説明、画面種別ラベルの表示 |
| `StatCard` | label、value、noteの再利用可能なカード |
| `DataTable` | 固定データ3件の表形式表示と横スクロール制御 |

## 2. レイアウト設計

### 2.1 全体

`App`のルートは最小画面高を確保する。通常幅では縦積み、Tailwindの`lg`以上では`240px`のサイドバーと残り幅のメイン領域をGridで配置する。

```text
App
├── AppSidebar
└── main area
    ├── Header
    └── main
        ├── StatCard × 3
        └── DataTable
```

統計カードは通常1列、`md`以上で3列にする。情報密度を保ちつつ、狭い画面でも読む順序を変えない。

### 2.2 コンポーネント

| 対象 | 主なTailwind設計 |
|---|---|
| Sidebar | 白背景、右罫線、`lg:min-h-screen` |
| Header | Flexbox、折返し可、下罫線 |
| StatCard | 白背景、枠線、角丸、余白 |
| DataTable wrapper | `overflow-x-auto`で小画面の横スクロールを許可 |
| table | `min-w-[560px]`で列の可読性を維持 |

## 3. propsと固定データ

### 3.1 StatCard

| props | 型 | 用途 |
|---|---|---|
| `label` | string | 指標名 |
| `value` | string | 表示値 |
| `note` | string | 補足説明 |

`App.tsx`の`stats`配列3件を`map`し、`label`をkeyにしてスプレッド構文でpropsを渡す。

### 3.2 Sidebar itemと選択state

| 項目 | 内容 |
|---|---|
| `label` | メニュー名とkey |
| `icon` | lucide-reactのアイコンコンポーネント |

`App`は`currentSection`を初期値`"概要"`で保持し、`setCurrentSection`を`AppSidebar`の`onSelect`へ渡す。各ボタンは自分の`label`を親へ通知する。選択中の判定は`currentSection === item.label`とし、背景色と文字色を切り替え、`aria-current="page"`を指定する。

`Header`にも`currentSection`を渡し、選択したメニュー名を`h1`へ表示する。本文先頭の結果領域にも同じ値を表示し、`aria-live="polite"`で変更を通知する。

### 3.3 DataTable row

```ts
type Row = {
  id: string;
  name: string;
  status: "active" | "pending" | "done";
  updatedAt: string;
};
```

固定3件を`map`し、`row.id`をkeyにする。statusはunion型で許可値を制限する。

## 4. アイコンと操作要素

Sidebarでは`Home`、`ClipboardList`、`BarChart3`、`Settings`を使用し、各アイコンを18pxで描画する。装飾目的のアイコンを増やしすぎず、メニューの識別補助に限定する。

Sidebarの各項目はネイティブの`button`であり、クリックすると選択state、選択中の見た目、Header見出し、結果文が更新される。URL遷移は行わない。Header右側の「管理画面サンプル」は画面種別を示すラベルであり、操作要素ではない。

## 5. データ・エラー設計

HTTP API、データベース、フォーム入力、AI処理、認証・認可は使用しない。表示データは各コンポーネントの固定値とする。

| 状況 | 対策 |
|---|---|
| 想定外のstatus | TypeScriptのunion型でビルド時に検出する |
| Reactのkey重複 | 統計はlabel、メニューはlabel、行はidを使う |
| テーブルのはみ出し | wrapperの横スクロールと560pxの最小幅で扱う |
| Sidebarによる本文圧迫 | 2列化を`lg`以上に限定する |

監査ログとランタイムのエラー応答は対象外とする。レイアウト不備はブラウザ表示とDevToolsで確認する。

## 6. アクセシビリティ

- ページ名に`h1`、統計カードに`article`、データ一覧に`table`を使用する。
- 操作要素はネイティブの`button`を使用し、最低40pxの高さを確保する。
- テーブルの列名を`th`で定義する。
- active状態は背景色と文字色を併用して示す。

## 7. 確認項目

| ID | 操作 | 期待結果 |
|---|---|---|
| `CHK-001` | `npm run dev`で表示する | Sidebar、Header、3カード、3行の表が表示される |
| `CHK-002` | サイドメニューを順に押す | 選択状態、Header見出し、結果文が同じメニュー名へ切り替わる |
| `CHK-003` | `lg`以上へ広げる | Sidebarと本文が240px対残り幅の2列になる |
| `CHK-004` | `lg`未満へ狭める | Sidebarと本文が縦に並ぶ |
| `CHK-005` | `md`未満へ狭める | 統計カードが1列になる |
| `CHK-006` | 560px未満で表を確認する | 表の外枠内で横スクロールできる |
| `CHK-007` | `npm run build`を実行する | TypeScriptとViteのビルドが成功する |

## 8. 実装との対応

| 設計要素 | 実装箇所 |
|---|---|
| 全体Grid、選択state、統計配列、結果文 | `src/App.tsx` |
| メニュー、アイコン、選択通知 | `src/components/AppSidebar.tsx` |
| 選択中タイトルと画面種別ラベル | `src/components/Header.tsx` |
| propsによるカード再利用 | `src/components/StatCard.tsx` |
| union型とテーブル描画 | `src/components/DataTable.tsx` |

学習手順、故障演習、完了条件は[`doc/learning_notes/web12_shadcn_dashboard/README.md`](../learning_notes/web12_shadcn_dashboard/README.md)を参照する。
