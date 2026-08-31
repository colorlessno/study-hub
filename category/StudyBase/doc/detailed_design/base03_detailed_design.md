# base03 見積り根拠表 詳細設計

## ファイル構成

```text
src/apps/base03_estimate_basis/app/
  index.html
  src/
    estimate.js
    main.js
    style.css
```

`main.js` は画面状態とブラウザ操作を担当し、`estimate.js` は行抽出、入力検証、合計計算、Markdown変換を担当する。

## 画面状態

| 状態 | 内容 |
|---|---|
| currentStep | 表示中の手順。1から4まで |
| previewKind | 表示中の文書。basis、work、risks |
| form data | 共通項目、作業4件、リスク2件の入力値 |

## 主な処理

| 処理 | 内容 |
|---|---|
| showStep | 対象手順だけを表示し、手順ボタンと前後ボタンを更新する |
| calculateTotal | 入力済み作業の工数を数値化して合計する |
| validateEstimate | 共通必須項目、使用中の作業行、使用中のリスク行を確認する |
| save | 検証後にフォーム値をローカルストレージへ保存する |
| restore | 保存済みJSONを読み込み、フォームとプレビューを復元する |
| updatePreview | 選択中の文書変換関数を実行し、Markdownを表示する |
| downloadCurrent | 選択中のMarkdownをBlobへ変換して保存する |
| clearSaved | 保存値、入力欄、プレビュー、手順を初期状態へ戻す |

## 文書変換

| 関数 | 出力 |
|---|---|
| buildEstimateBasis | 見積り根拠表 |
| buildWorkBreakdown | 作業分解表 |
| buildRiskList | リスク一覧 |

複数行入力は箇条書きへ変換する。表のセルでは縦線をエスケープし、改行を`<br>`へ変換する。未入力の任意項目は「未記入」と表示する。

## 入力検証

保存とダウンロードの前に、依頼内容、見積り対象、対象外、前提、再見積り条件を確認する。入力された作業行は工程、作業内容、成果物、0より大きい工数、根拠をすべて必須とする。入力されたリスク行はリスク、発生条件、影響、対策、見積りへの影響をすべて必須とする。

不足時は不足項目を画面に表示し、保存とダウンロードを行わない。

## 保存仕様

- 保存先: ブラウザのローカルストレージ
- 保存キー: `studyhub:base03:estimate-basis`
- 保存形式: フォーム値を持つJSON
- 通信: なし
