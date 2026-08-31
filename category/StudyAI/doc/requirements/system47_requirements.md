# system47 要件定義

## このテーマでできるようになること

- 集計とAI説明の役割分担を説明できる
- AIが見てよいデータと実行してはいけない操作を説明できる
- 売上傾向、異常値、次の分析観点を文章化できる

## Sales data analysis AI / BI explanation

## 1. 目的

売上データをSQLやBIで正確に集計し、その結果をAIが説明、仮説化、次の分析観点として提示する流れを学ぶ。

## 2. 学習対象

- sales dataset
- SQL aggregation
- BI chart / dashboard
- anomaly explanation
- trend summary
- hypothesis generation
- read-only SQL tool boundary

## 3. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | 売上、商品、顧客、日付を含むサンプルデータを用意する |
| FR-02 | PostgreSQLで月別売上、商品別売上、顧客別売上をSQL集計する |
| FR-03 | 表またはグラフ相当の集計結果をAI入力にする |
| FR-04 | AIが傾向、異常値、追加確認観点を説明する |
| FR-05 | AIに直接更新SQLを実行させない read-only 境界を定義する |

## 4. 非機能要件

- 集計値はSQL/BI側で正確に算出し、AIは説明と仮説に限定する。
- 実売上データや個人情報を使わない。
- 作成するテキストファイルは UTF-8 BOMなしとする。

## 5. 対象外

- 実企業BI導入
- 予測モデルの本格学習
- 売上改善施策の実実行

## 6. 成果物

```text
category/StudyAI/
  doc/requirements/system47_requirements.md
  doc/basic_design/system47_basic_design.md
  doc/detailed_design/system47_detailed_design.md
  doc/learning_notes/system47_sales_data_analysis_ai/
```

## 7. 受入条件

- 集計とAI説明の役割分担を説明できる。
- PostgreSQLで3種類の集計SQLを実行し、結果を確認できる。
- AIが見てよいデータと実行してはいけない操作を説明できる。
- 売上傾向、異常値、次の分析観点を文章化できる。
