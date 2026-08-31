# base05 RACI・責任分担 詳細設計

## ファイル構成

```text
src/apps/base05_raci_responsibility_matrix/app/
  index.html
  src/
    main.js
    raci.js
    style.css
```

`main.js` は画面状態とブラウザ操作を担当し、`raci.js` は行抽出、役割名の検証、整合性分析、Markdown変換を担当する。

## 画面状態

| 状態 | 内容 |
|---|---|
| currentStep | 表示中の手順。1から4まで |
| previewKind | 表示中の文書。raci、decisions、escalations |
| form data | 対象、関係者、作業4件、判断待ち2件、エスカレーション2件 |

## 主な処理

| 処理 | 内容 |
|---|---|
| workRows | 使用中の作業行を抽出する |
| decisionRows | 使用中の判断待ち行を抽出する |
| escalationRows | 使用中のエスカレーション行を抽出する |
| validateRaci | 必須項目、役割数、関係者一覧との一致を確認する |
| analyzeRaci | 整合性結果と3種類の件数を返す |
| save | 検証後にフォーム値をローカルストレージへ保存する |
| restore | 保存済みJSONを読み込み、フォームとプレビューを復元する |
| updatePreview | 選択中の文書変換関数を実行し、Markdownを表示する |
| downloadCurrent | 選択中のMarkdownをBlobへ変換して保存する |
| clearSaved | 保存値、入力欄、プレビュー、手順を初期状態へ戻す |

## 役割名の検証

1. 関係者の役割は改行で分割し、重複を除外する。
2. ResponsibleとAccountableは読点、カンマ、スラッシュ、改行で分割した結果が1件であることを確認する。
3. R、A、C、I、決定者、依頼先の各役割が関係者一覧にあることを確認する。
4. 同じエラーは1件にまとめて表示する。

## 文書変換

| 関数 | 出力 |
|---|---|
| buildRaciMatrix | RACI表 |
| buildDecisionList | 判断待ち事項一覧 |
| buildEscalationNote | エスカレーションメモ |

表のセルでは縦線をエスケープし、改行を`<br>`へ変換する。未入力の任意項目は「未記入」と表示する。

## 保存仕様

- 保存先: ブラウザのローカルストレージ
- 保存キー: `studyhub:base05:raci`
- 保存形式: フォーム値を持つJSON
- 通信: なし
