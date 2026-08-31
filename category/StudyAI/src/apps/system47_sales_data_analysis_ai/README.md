# 売上データ分析とAI説明

売上の数値はDocker内のPostgreSQLで集計し、AIは集計済みの結果を説明する教材です。

## 構成

| パス | 役割 |
| --- | --- |
| `data/sales_sample.csv` | 集計に使う売上データ |
| `docker-compose.yml` | system47専用PostgreSQLの構成 |
| `sql/001_schema.sql` | 売上テーブルを作成するSQL |
| `sql/002_seed.sql` | 架空の売上データを登録するSQL |
| `scripts/sql_analysis.js` | 3種類のSQLをPostgreSQLで実行する処理 |
| `scripts/analyze_sales.js` | SQL結果と比較するCSV集計処理 |
| `scripts/explain_sales.js` | SQL実行結果をローカルAIへ送り、必須区分を検査して保存する処理 |
| `sql/monthly_sales.sql` | 月別集計SQL |
| `sql/product_sales.sql` | 商品別集計SQL |
| `sql/customer_sales.sql` | 顧客区分別集計SQL |
| `checks/readonly_sql_check.js` | SQLが読み取り専用か検証する処理 |

## StudyHubでの実行

1. Docker Desktopを起動する。
2. StudyHubでsystem47の「起動」を押す。
3. 月別、商品別、顧客区分別のSQL集計を実行する。
4. LM Studioにチャット用モデルを読み込み、「SQL集計をAIで説明」を実行する。
5. 更新SQLの拒否を確認する。
6. 「停止」を押してPostgreSQLを後片付けする。

`explain_sales.js` はLM Studioの `http://127.0.0.1:5858` を使用します。チャット用モデルを読み込んでから実行してください。モデル名を明示する場合は `LM_STUDIO_CHAT_MODEL` を指定します。

AIへ渡すのは集計済みの結果に限定し、AIからデータベースを更新しません。説明に「傾向」「異常値」「仮説」「次の分析観点」「注意点」が揃った場合だけ、`outputs/ai_explanation_latest.json` と `outputs/ai_explanation_latest.md` に保存します。
