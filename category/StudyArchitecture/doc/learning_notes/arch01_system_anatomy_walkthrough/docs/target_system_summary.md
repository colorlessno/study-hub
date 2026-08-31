# 対象システム概要

## 対象

| 項目 | 値 |
| --- | --- |
| Study領域 | StudyArchitecture |
| 単元 | arch01専用の注文登録システム |
| 主目的 | 画面から入力した注文がAPI、SQLite、ログを通って保存される流れを説明する |
| runtime | Node.js、static files、SQLite |

## 境界

対象に含めるもの:

- `app/public/index.html`と`app/public/main.js`の画面・入力処理
- `app/server.js`のHTTP API、入力検証、SQLite保存、JSON応答
- arch01専用SQLiteファイルの注文一覧
- Trace IDで対応付ける実行ログ
- `/health`、`/ready`と障害モード

対象外:

- 他のStudyテーマの実行環境と保存先
- 過去の実装メモ
- 現在のsystemから確認できない将来改善

## 最初の問い

画面から注文を登録したとき、どのHTTP要求が送信され、どのSQLite行と実行ログが同じTrace IDで対応するか。
