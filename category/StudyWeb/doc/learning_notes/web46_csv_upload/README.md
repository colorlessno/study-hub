# web46 CSVファイルの送信と内容検証

CSVファイルを検証APIへ送信し、サーバー側で拡張子、容量、UTF-8、必須列、行ごとの値を検証するテーマです。

## このテーマでできるようになること

- multipart/form-dataでCSVファイルをAPIへ送信できる
- 正しいCSVと不正なCSVで、サーバー側の検証結果の違いを確認できる
- 必須列の不足と行ごとの値の誤りを分けて確認できる
- 取込前に先頭3件と取込可能件数を確認できる
- APIがCSVファイルを検証するが、DB取込やファイル保存は行わないことを説明できる
- 送信中は別のファイル送信を開始せず、応答後に次の検証を行える

## 最初に取り組むこと

1. 「正しい確認用CSVを送信」を押す。
2. HTTP 200、先頭3件、成功件数が表示されることを確認する。
3. 「不正な確認用CSVを送信」を押し、必須値が空の行と価格が数値でない行のエラーを確認する。
4. 手元のCSVファイルを選択して送信する。
5. `.csv`以外のファイル、512KiBを超えるファイル、UTF-8でないファイルがサーバー側で拒否されることを確認する。
6. 「CSVファイルを送信する画面処理」と「CSVファイルを受信して検証するAPI」を開き、画面の結果と照合する。

検証APIへ送信している間は確認用ボタン、ファイル選択、送信ボタンが無効になります。応答を受け取ってから次のCSVを送信します。

## 入力と結果

必須列は`code`、`name`、`price`です。`code`と`name`は空にできず、`price`には数値が必要です。

| 結果 | 内容 |
|---|---|
| 先頭3件の確認 | 検証したデータの先頭3件 |
| 成功件数 | 行検証に成功したデータ件数 |
| 失敗件数 | 行検証に失敗したデータ件数 |
| エラー | 必須列の不足、空の必須値、数値でない価格 |

## この教材で扱わないこと

- DB保存
- 文字コードの自動判定と最大行数の検証
- 一部成功や再実行時の重複管理

## 手動で確認する場合

APIと画面を起動します。

```bat
cd /d category\StudyWeb\src\frontend\static\studyweb\systems\web46_csv_upload\app
set PORT=43346
rtk node server.js
```

構文確認は次のコマンドです。

```bat
rtk node --check category\StudyWeb\src\frontend\static\studyweb\systems\web46_csv_upload\app\src\main.js
rtk node --check category\StudyWeb\src\frontend\static\studyweb\systems\web46_csv_upload\app\server.js
```

## うまく動かないとき

- APIが起動しているか確認する。
- ファイルの拡張子が`.csv`で、UTF-8、512KiB以下になっているか確認する。
- 1行目に`code,name,price`が含まれているか確認する。
