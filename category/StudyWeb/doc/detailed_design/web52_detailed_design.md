# web52 詳細設計

## ファイル構成

```text
app/
  index.html
  src/
    main.js
    decision-memo.js
    style.css
```

## `index.html`

- 利用場面の選択欄を置く
- 条件を定義リストで表示する
- 基本となる方式をラジオボタンで表示する
- 組み合わせる仕組みをチェックボックスで表示する
- 判断メモの5入力欄を置く
- 保存、削除、保存内容の表示欄を置く
- 入力内容がサーバーへ送られないことを明記する

## `decision-memo.js`

| 名前 | 役割 |
|---|---|
| `SCENARIOS` | 4つの利用場面と条件を定義する |
| `DISPLAY_METHODS` | MPA、SPA、SSR、SSGを定義する |
| `STRATEGIES` | Server Components、Islands、PWAを定義する |
| `emptyMemo` | 利用場面ごとの空の判断メモを作る |
| `validateMemo` | 基本方式と選定理由の入力を確認する |
| `formatMemo` | 保存した内容を読みやすい文章へ変換する |

## `main.js`

- 画面の選択肢を定義データから作る
- 利用場面の変更時に条件と保存内容を表示する
- 画面の入力値から判断メモを作る
- 入力確認後に `localStorage` へ保存する
- 現在の利用場面の保存内容だけを削除する
- 保存済み件数を更新する

## 保存形式

保存キーは `studyhub:web52:decision-memos` とする。値は利用場面IDをキーにしたJSON形式とする。

```json
{
  "public-docs": {
    "scenarioId": "public-docs",
    "method": "ssg",
    "strategies": ["islands"],
    "reason": "公開情報を事前に生成して配信するため",
    "responsibilities": "本文は配信前に生成し、検索だけをブラウザで動かす",
    "cacheBoundary": "公開本文だけを共有キャッシュへ置く",
    "rejected": "全面的なSPAは初期表示と検索結果への掲載で利点が少ない",
    "risk": "更新後の再生成とキャッシュ更新を確認する"
  }
}
```

## 画面幅への対応

広い画面では方式と入力欄を2列にし、狭い画面では1列にする。操作ボタンは同じ幅と形状にする。横方向のスクロールは発生させない。
