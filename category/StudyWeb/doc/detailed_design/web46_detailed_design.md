# web46 CSVアップロード 詳細設計

## 0. 関連文書

- `../requirements/web46_csv_upload_requirements.md`
- `../basic_design/web46_basic_design.md`

## 1. 製造対象

```text
src/frontend/static/studyweb/systems/web46_csv_upload/
  Dockerfile
  app/index.html
  app/src/main.js
  app/server.js
  samples/valid.csv
  samples/invalid.csv
doc/learning_notes/web46_csv_upload/
  README.md
  docs/csv_format.md
  docs/import_result.md
```

## 2. 現在の位置付け

画面から実CSVファイルまたは確認用CSVをmultipart/form-dataで検証APIへ送信する。APIはファイル条件とCSV内容を再検証し、取込前の結果を返す。DB保存は行わない。

## 3. 入力形式

| Column | 必須 | Rule |
|---|---|---|
| `code` | はい | 空でない |
| `name` | はい | 空でない |
| `price` | はい | `Number()`がNaNでない |

headerは先頭行。data rowは2行目以降。

## 4. API

| Method | Path | 処理 |
|---|---|---|
| GET | `/api/health` | 起動確認 |
| POST | `/api/csv/validate` | CSVファイルの受信と検証 |

## 5. 処理手順

1. 画面がファイルをFormDataへ入れ、検証APIへ送信する。
2. APIが拡張子、512KiB上限、UTF-8を検証する。
3. 引用符内のカンマと改行を区別してCSVを解析する。
4. 先頭行をheaderとし、required columnを検証する。
5. code・name・priceを行単位で検証する。
6. 先頭3件、成功件数、失敗件数、行エラーを返す。
7. 画面がHTTP状態とJSON結果を表示する。
8. 画面は送信開始から応答受信まで全入力・送信操作を無効化し、複数要求を同時に開始しない。

## 6. Output

| 項目 | 内容 |
|---|---|
| preview | parse結果の先頭3件 |
| successCount | 行検証に成功した件数 |
| failedCount | 行検証に失敗した件数 |
| errors | missing column、`line N: invalid data` |

## 7. 要件との差分・既知の課題

- APIは受信データをDBへ保存しない。
- ウイルススキャン、重複検出、transaction、非同期取込は扱わない。
- 本格的な文字コード自動判定は行わず、UTF-8以外を拒否する。

## 8. 確認手順

1. 正しい確認用CSVをAPIへ送信し、previewとsuccessCountを確認する。
2. 不正な確認用CSVを送信し、行番号付きerrorとfailedCountを確認する。
3. required columnを削除しmissing columnを確認する。
4. 4行以上でpreviewが3件に限定されることを確認する。
5. quoted commaを含むnameが1列として解析されることを確認する。

## 9. 完了条件

- header・row validationを説明できる。
- line番号付きerrorを確認できる。
- previewの目的を説明できる。
- multipart/form-dataでファイルがAPIへ送信されることを確認できる。
