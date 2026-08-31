# base02 情報不足時の暫定成果物 詳細設計

## ファイル構成

```text
src/apps/base02_incomplete_information_deliverable/app/
  index.html
  src/
    main.js
    provisional-deliverable.js
    style.css
```

`main.js` は画面状態とブラウザ操作を担当し、`provisional-deliverable.js` は入力検証とMarkdown変換を担当する。

## 画面状態

| 状態 | 内容 |
|---|---|
| currentStep | 表示中の手順。1から4まで |
| previewKind | 表示中の文書。deliverable、assumptions、unknowns、limitations |
| form data | 各入力欄の文字列 |

## 主な処理

| 処理 | 内容 |
|---|---|
| showStep | 対象手順だけを表示し、手順ボタンと前後ボタンを更新する |
| validateDeliverable | 文書作成に必要な入力があるか確認する |
| save | 検証後にフォーム値をローカルストレージへ保存する |
| restore | 保存済みJSONを読み込み、フォームとプレビューを復元する |
| updatePreview | 選択中の文書変換関数を実行し、Markdownを表示する |
| downloadCurrent | 選択中のMarkdownをBlobへ変換して保存する |
| clearSaved | 保存値、入力欄、プレビュー、手順を初期状態へ戻す |

## 文書変換

| 関数 | 出力 |
|---|---|
| buildProvisionalDeliverable | 暫定成果物 |
| buildAssumptionList | 前提・仮定一覧 |
| buildUnknownIssueList | 未確定事項一覧 |
| buildLimitationNote | 成果物限界メモ |

複数行入力は箇条書きへ変換する。表のセルでは縦線をエスケープし、改行を`<br>`へ変換する。未入力の任意項目は「未記入」と表示する。

## 入力検証

保存とダウンロードの前に、依頼内容、情報源、目的、書ける範囲、書けない範囲、暫定内容、仮定とその根拠・影響、未確定事項と確認内容・確認先、利用可能範囲、利用禁止範囲、成果物の限界を確認する。

不足時は不足項目を画面に表示し、保存とダウンロードを行わない。

## 保存仕様

- 保存先: ブラウザのローカルストレージ
- 保存キー: `studyhub:base02:provisional-deliverable`
- 保存形式: フォーム値を持つJSON
- 通信: なし
