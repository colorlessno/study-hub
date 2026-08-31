# system47 基本設計

## Sales data analysis AI / BI explanation

## 0. 関連要件

- `../requirements/system47_requirements.md`

## 1. 設計目的

売上データの正確な集計をSQL/BI側で行い、AIは傾向説明・異常値の仮説・次の分析観点の提示に限定する教材にする。

## 2. 対象領域

- sales dataset
- SQL aggregation
- BI chart / dashboard 相当の集計表
- anomaly explanation
- trend summary
- hypothesis generation
- read-only SQL tool boundary

## 3. 成果物構造

```text
category/StudyAI/
  src/apps/system47_sales_data_analysis_ai/
    data/
      sales_sample.csv
    docker-compose.yml
    sql/
      001_schema.sql
      002_seed.sql
      monthly_sales.sql
      product_sales.sql
      customer_sales.sql
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
      read_only_boundary.md
```

## 4. 入力

| 入力 | 内容 |
|---|---|
| 売上サンプル | 注文日、顧客区分、商品区分、商品名、数量、単価、値引率、地域 |
| 集計SQL | 月別、商品別、顧客別の集計式 |
| 集計結果 | AIに渡す表またはグラフ相当のデータ |
| ローカルAI | LM StudioのチャットAPIと読み込み済みのチャット用モデル |
| 禁止操作 | update、delete、insertなどの更新SQL |

## 5. 出力

| 出力 | 内容 |
|---|---|
| 集計表 | Docker内のPostgreSQLで3種類のSQLを実行して算出した数値 |
| AI説明メモ | ローカルAIが返した傾向、異常値、仮説、追加確認観点 |
| 保存結果 | AI説明と入力した集計結果を記録した `outputs/ai_explanation_latest.json` と `outputs/ai_explanation_latest.md` |
| read-only基準表 | AIが見てよいデータと実行してはいけない操作 |

## 6. 処理方針

1. 教材用の売上サンプルを用意する
2. Docker内のPostgreSQLへスキーマと架空データを登録する
3. PostgreSQLで3種類のSQLを実行して集計結果を作る
4. 集計結果だけをローカルAI説明の入力にする
5. LM StudioのチャットAPIへ送信し、説明結果を受け取る
6. AIは数値を再計算せず、説明と仮説に限定する
7. 傾向、異常値、仮説、次の分析観点、注意点の5区分を検査する
8. AI説明と入力した集計結果をローカルファイルへ保存する
9. read-only基準と禁止SQLを明記する

## 7. 確認観点

- 集計とAI説明の役割分担を説明できるか
- AIが直接更新SQLを実行しない理由を説明できるか
- 傾向、異常値、次の分析観点を分けて文章化できるか
- AI説明がローカル通信で取得され、結果が保存されるか

## 8. 後続工程への引き継ぎ

詳細設計では、サンプルデータ列、SQL・集計結果例、ローカルAI通信、AI説明プロンプト、結果保存、禁止操作チェックを定義する。
