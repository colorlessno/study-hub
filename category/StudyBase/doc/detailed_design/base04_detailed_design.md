# base04 テスト成立条件チェック 詳細設計
## ファイル構成

```text
src/apps/base04_test_precondition_checklist/app/
  index.html
  src/
    main.js
    preconditions.js
    style.css
```

`main.js` は画面状態とブラウザ操作を担当し、`preconditions.js` は行抽出、入力検証、開始可否判定、Markdown変換を担当する。

## 画面状態

| 状態 | 内容 |
|---|---|
| currentStep | 表示中の手順。1から4まで |
| previewKind | 表示中の文書。checklist、environment、data |
| form data | 対象、環境5件、アカウント、データ2件、判定条件の入力値 |

## 主な処理

| 処理 | 内容 |
|---|---|
| environmentDefinitions | E-01からE-05までのID、表示名、フォーム番号を定義し、画面生成と判定処理で共有する |
| showStep | 対象手順だけを表示し、手順ボタンと前後ボタンを更新する |
| decision | 全状態から開始可能、開始不可、保留を判定する |
| aggregateStatus | 環境またはデータの複数状態を1つの状態へ集約する |
| validatePreconditions | 共通必須項目、環境項目、使用中のデータ行を確認する |
| save | 検証後にフォーム値をローカルストレージへ保存する |
| restore | 保存済みJSONを読み込み、フォームとプレビューを復元する |
| updatePreview | 選択中の文書変換関数を実行し、Markdownを表示する |
| downloadCurrent | 選択中のMarkdownをBlobへ変換して保存する |
| clearSaved | 保存値、入力欄、プレビュー、手順を初期状態へ戻す |

## 判定順序

1. 状態に「不足」があれば「開始不可」とする。
2. 「不足」がなく、「保留」または「未確認」があれば「保留」とする。
3. すべて「確認済み」であれば「開始可能」とする。

## 文書変換

| 関数 | 出力 |
|---|---|
| buildChecklist | テスト成立条件チェックリスト |
| buildEnvironmentCheck | テスト環境確認表 |
| buildDataCheck | テストデータ確認表 |

表のセルでは縦線をエスケープし、改行を`<br>`へ変換する。中止条件の複数行入力は箇条書きへ変換する。未入力の任意項目は「未記入」と表示する。

## 入力検証

保存とダウンロードの前に、テスト名、対象、アカウント、権限、期待結果、合否基準、中止条件、証拠の保存先、判定者、5件の環境内容を確認する。入力されたテストデータ行は作成方法、初期状態、期待状態、後片付けをすべて必須とする。

不足時は不足項目を画面に表示し、保存とダウンロードを行わない。

## 保存仕様

- 保存先: ブラウザのローカルストレージ
- 保存キー: `studyhub:base04:test-preconditions`
- 保存形式: フォーム値を持つJSON
- 通信: なし
