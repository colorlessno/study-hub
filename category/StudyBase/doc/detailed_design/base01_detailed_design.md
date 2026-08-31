# base01 曖昧依頼のヒアリング 詳細設計

## ファイル構成

```text
doc/learning_notes/base01_ambiguous_request_hearing/
  README.md
doc/templates/base01_ambiguous_request_hearing/
  request_hearing_note.md
  requirement_input_summary.md
src/samples/base01_ambiguous_request_hearing/
  ambiguous_request_case.md
  completed_hearing_note.md
src/apps/base01_ambiguous_request_hearing/app/
  index.html
  src/
    main.js
    hearing-note.js
    style.css
```

## 画面制御

`main.js`は四つの手順の切替、固定シナリオの読込、保存、復元、クリア、プレビュー切替、ダウンロードを担当する。一度に表示する入力手順を一つに限定する。

## 記録変換

`hearing-note.js`は次の処理を担当する。

- 必須項目の検証
- 複数行入力のMarkdownリスト変換
- 表内で使う文字のエスケープ
- ヒアリングメモの作成
- 要件定義入力メモの作成
- 二種類のダウンロード名の選択

## 保存範囲

保存キーは`studyhub:base01:hearing-note`とする。保存先はブラウザの`localStorage`だけとし、StudyHubのサーバーや外部サービスには送信しない。

## 確認内容

- 四つの手順を前後または直接選択して移動できる。
- 固定シナリオを読み込める。
- 必須項目不足時に保存を拒否する。
- 保存後に再読み込みして入力を復元できる。
- クリア後は初期状態へ戻る。
- 二種類のMarkdownプレビューとダウンロード内容が、それぞれ同じ変換処理で作られる。
