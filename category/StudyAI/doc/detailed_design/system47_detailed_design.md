# system47 詳細設計
## Sales data analysis AI / BI explanation

## 0. 関連文書

- `../requirements/system47_requirements.md`
- `../basic_design/system47_basic_design.md`

## 1. 製造対象

```text
apps/system47_sales_data_analysis_ai/
  README.md
  docker-compose.yml
  data/
    sales_sample.csv
  sql/
    001_schema.sql
    002_seed_from_csv_note.md
    monthly_sales.sql
    product_sales.sql
    customer_sales.sql
  checks/
    readonly_sql_check.js
  scripts/
    analyze_sales.js
    sql_analysis.js
    explain_sales.js
  outputs/
    ai_explanation_latest.json
    ai_explanation_latest.md
doc/learning_notes/system47_sales_data_analysis_ai/
  README.md
  docs/
    aggregation_results.md
    ai_explanation_prompt.md
    ai_explanation_sample.md
    read_only_boundary.md
```

## 2. sales dataset 設計

| column | 内容 |
|---|---|
| `order_id` | 架空の注文識別子 |
| `order_date` | 注文日 |
| `customer_segment` | 個人、法人などの架空区分 |
| `product_category` | 商品カテゴリ |
| `product_name` | 架空商品名 |
| `quantity` | 数量 |
| `unit_price` | 単価 |
| `discount_rate` | 値引率 |
| `region` | 架空地域 |

実顧客名、実住所、実売上データは含めない。

## 3. SQL集計設計

| SQL | 内容 |
|---|---|
| `monthly_sales.sql` | 月別の注文数、販売数、売上額 |
| `product_sales.sql` | 商品区分・商品名別の注文数、販売数、売上額、平均値引率 |
| `customer_sales.sql` | 顧客区分・地域別の注文数、販売数、売上額 |

`docker-compose.yml` でPostgreSQL 16を起動し、`001_schema.sql` と `002_seed.sql` を順に実行する。`sql_analysis.js` は対象SQLのread-only検査後、Docker内のPostgreSQLでSQLを実行し、CSV形式の応答をJSONへ変換する。集計値はSQLで算出し、AI説明入力にはSQLの結果表だけを渡す。`analyze_sales.js` はCSV集計との比較用であり、受入確認の集計処理には使用しない。

## 4. read-only境界設計

| 操作 | 扱い |
|---|---|
| SELECT | 許可 |
| WITH / CTE | 許可 |
| INSERT | 禁止 |
| UPDATE | 禁止 |
| DELETE | 禁止 |
| DROP / ALTER / CREATE | 禁止 |
| ローカルAIへの集計結果送信 | 許可 |
| ローカル以外へのデータ送信 | 禁止 |

`readonly_sql_check.js` はSQL文字列に更新系・DDL系キーワードが含まれないことを確認する。完全なSQL parserではなく、教材用の境界確認として使う。

## 5. AI説明プロンプト設計

| 入力 | 内容 |
|---|---|
| aggregation table | SQLで算出した結果 |
| explanation prompt | 集計結果だけを使い、事実・仮説・次の分析観点・限界を分けて説明する指示 |
| constraints | 数値を再計算しない、不足する数値を作らない、仮説と事実を分ける |

| 出力 | 内容 |
|---|---|
| trend summary | 傾向 |
| anomaly note | 異常値または目立つ変化 |
| hypothesis | 原因仮説 |
| next analysis | 次に確認するSQLや切り口 |
| limitation | この集計だけでは断定できないこと |

`explain_sales.js` はPostgreSQLで実行した3種類の集計結果だけを `http://127.0.0.1:5858` のLM Studioへ送信する。チャット用モデルは `LM_STUDIO_CHAT_MODEL`、接続先は `LM_STUDIO_BASE_URL` で変更できるが、接続先はループバックアドレスに限定する。応答には「傾向」「異常値」「仮説」「次の分析観点」「注意点」の5見出しを必須とし、不足時は保存せず失敗として返す。

AIの説明結果と入力した集計結果は `outputs/ai_explanation_latest.json` と `outputs/ai_explanation_latest.md` に保存する。このフォルダはローカル実行結果としてGitの公開対象に含めない。

## 6. 確認手順

1. Docker Desktopを起動し、StudyHubの「起動」でPostgreSQL、スキーマ、架空データを準備する
2. 3種類の集計SQLを実行し、結果を `aggregation_results.md` と照合する
3. SQL結果表をAI説明入力に変換する
4. LM Studioにチャット用モデルを読み込み、「AIで集計結果を説明」を実行する
5. AI説明で傾向、異常値、仮説、次の分析観点、注意点が分かれていることを確認する
6. `outputs/ai_explanation_latest.json` と `outputs/ai_explanation_latest.md` に説明結果が保存されたことを確認する
7. `readonly_sql_check.js` で禁止SQLを検査する
8. StudyHubの「停止」でsystem47専用PostgreSQLを停止・削除する

## 7. 完了条件

- 集計とAI説明の役割分担を説明できる
- AIに数値を再計算させない境界を説明できる
- read-only SQL境界を検査できる
- 傾向、異常値、仮説、次の分析観点を分けて記録できる
- ローカルAIへ集計結果を送信し、説明結果を保存できる

## 8. 安全性

- 実売上データや個人情報を使わない
- AIに更新SQLやDDLを実行させない
- 集計値の正確性はSQL側で担保し、AI説明は補助に限定する
