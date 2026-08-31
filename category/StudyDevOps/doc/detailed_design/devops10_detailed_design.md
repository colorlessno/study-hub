# devops10 詳細設計

## ファイル構成

```text
doc/learning_notes/devops10_evidence_driven_design_review/
  README.md
  docs/
    evidence_guide.md
    sample_release_decision.md
src/apps/devops10_evidence_driven_design_review/app/
  index.html
  src/
    main.js
    decision-record.js
    style.css
```

## 画面制御

`main.js`は四つの手順の切替、固定シナリオの読込、保存、復元、クリア、ダウンロードを担当する。一度に表示する入力手順を一つに限定する。

## 記録変換

`decision-record.js`は次の処理を担当する。

- 必須項目の検証
- 条件付き可に対する条件入力の検証
- 入力値からMarkdownを作成
- リリースIDから安全なダウンロード名を作成

## 保存範囲

保存キーは`studyhub:devops10:release-decision`とする。保存先はブラウザの`localStorage`だけとし、StudyHubのサーバーや外部サービスには送信しない。

## arch02との境界

`arch02`は設計上の主張と根拠を対応付けて妥当性をレビューする独立テーマである。`devops10`は実行済みの確認結果と復旧準備を根拠にリリース可否を判断する独立テーマであり、`arch02`の別名入口や進捗共有先にはしない。

## 確認内容

- 四つの手順を前後または直接選択して移動できる。
- 固定シナリオを読み込める。
- 必須項目不足時に保存を拒否する。
- 条件付き可の条件が空なら保存を拒否する。
- 保存後に再読み込みして入力を復元できる。
- クリア後は初期状態へ戻る。
- Markdownプレビューとダウンロード内容が一致する。
- 共通CI workflowが証拠資料、記入例、`decision-record.js`を順番に存在確認する。
