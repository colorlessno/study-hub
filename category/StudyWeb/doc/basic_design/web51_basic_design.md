# web51 indexあり/なし検索比較基本設計
## 0. 関連要件

- `../requirements/web51_index_search_comparison_requirements.md`

## 1. 設計目的
DB indexあり/なしで検索性能と実行計画が変わることを比較するサンプルを設計する。
## 2. 対象範囲

- 検索対象データ
- indexなし検索
- indexあり検索
- response time
- explain

## 3. 成果物構成

```text
src/backend/src/studyweb/systems/web51_index_search_comparison/
  app/
  db/
  Dockerfile
  package.json
doc/learning_notes/web51_index_search_comparison/
  README.md
  docs/
    index_comparison.md
    explain_note.md
```

## 4. 入力
| 入力| 内容|
|---|---|
| search keyword | 検索条件 |
| index mode | indexなし / あり |
| data size | 学習用データ件数 |

## 5. 出力
| 出力| 内容|
|---|---|
| search result | 検索結果 |
| timing | 実行時間|
| explain | 実行計画 |

## 6. 処理手順
1. 学習用データを用意する
2. indexなしで検索する
3. 実行時間とexplainを記録する
4. indexを追加する
5. 同じ検索を実行して比較する
## 7. 確認観点

- 検索条件とindexの関係を説明できる
- indexの効果とコストを説明できる
- explainを性能調査の入口として使える
## 8. 後続工程への引き継ぎ

詳細設計では、テーブル定義、seed、index、比較項目を定義する。
