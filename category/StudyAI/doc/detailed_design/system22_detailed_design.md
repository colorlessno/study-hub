# System 22 詳細設計

## RAGの文書分割比較

## 対象ファイル

```text
src/backend/src/studyai/systems/ai_learning/catalog.py
src/backend/src/studyai/systems/ai_learning/service.py
src/backend/src/studyai/systems/ai_learning/router.py
src/backend/src/studyai/common/config/settings.py
src/frontend/src/pages/SystemLearningPage.tsx
src/backend/tests/systems/test_ai_learning_systems.py
scripts/validate-ai-learning.py
src/scripts/system22_demo.py
```

## API

### GET `/api/system22/metadata`

system22のタイトル、説明、初期入力、分割サイズ比較と重複幅比較の入力例を返す。

### POST `/api/system22/execute`

request:

```json
{
  "input": {
    "document": "返品は商品到着から7日以内に申請します。",
    "question_set": [
      {"question": "返品を申請できる期間は？", "expected_terms": ["返品", "7日以内"]}
    ],
    "chunk_configs": [
      {"id": "small", "label": "小さい分割", "chunk_size": 16, "overlap": 0},
      {"id": "large", "label": "大きい分割", "chunk_size": 72, "overlap": 12}
    ],
    "learning_note": {"observation": "", "decision": "", "risk_note": ""}
  }
}
```

responseの`result`:

| 項目 | 型 | 内容 |
|---|---|---|
| `document_length` | integer | 文書文字数 |
| `question_count` | integer | 固定質問数 |
| `comparison_count` | integer | 比較条件数 |
| `comparisons` | array | 条件別の分割、検索、回答、評価 |
| `recommendation` | object | 推奨条件と比較理由 |
| `learning_note` | object | 学習者の観察・判断・注意点 |
| `evaluation_notes` | array | 簡易方式の範囲と比較方法 |
| `saved` | boolean | 永続保存したか |
| `storage_status` | string | 保存状態の説明 |

### GET `/api/system22/runs`

保存済みの実行履歴を新しい順で最大20件返す。

## 入力検証

| 条件 | エラー |
|---|---|
| `document`が空 | documentを入力するよう返す |
| `document`が20000文字超 | 上限エラー |
| `question_set`が1～20件でない | 件数エラー |
| 質問がオブジェクトでない | 形式エラー |
| `question`が空 | 質問エラー |
| `expected_terms`が空または空文字を含む | 期待語句エラー |
| `chunk_configs`が2～8件でない | 比較条件数エラー |
| `id`が空または重複 | 識別子エラー |
| `label`が空 | 表示名エラー |
| `chunk_size`が1未満または整数でない | 分割サイズエラー |
| `overlap`が0未満、整数でない、または`chunk_size`以上 | 重複幅エラー |
| `learning_note`がオブジェクトでない | 学習メモ形式エラー |

入力不正はRouterがHTTP 400と`system22_input_invalid`へ変換する。

## 文書分割

分割条件は入力配列の順、各条件の質問は質問配列の順に一件ずつ処理する。前の条件と質問の評価が完了してから次へ進み、複数条件や複数質問を同時または並列には処理しない。

各条件で`step = chunk_size - overlap`を計算する。開始位置を0から`step`ずつ進め、各断片へ次を記録する。

```json
{
  "index": 1,
  "start": 0,
  "end": 16,
  "text": "文書断片"
}
```

## 検索と回答

質問と各断片を英数字の連続部分と英数字以外の1文字へ分割し、重なった要素数を両側の要素数の平方根で割った簡易類似度を使う。検索点と期待語句の一致数で降順に並べ、上位3件を返す。

検索1位の断片を抽出回答とする。これは外部LLMの生成結果ではなく、分割条件の比較に範囲を限定したローカル抽出方式である。

## 評価

質問ごとに次を計算する。

| 項目 | 計算 |
|---|---|
| `matched_expected_terms` | 検索1位に含まれる期待語句 |
| `expected_term_coverage` | 一致した期待語句数 ÷ 期待語句数 |
| `evidence_split` | 文書全体には全期待語句があるが、全語句を同時に含む断片がない場合にtrue |

条件ごとに分割数、平均断片文字数、検索1位の平均点、期待語句の平均保持率、根拠分断数を集計する。推奨条件は、期待語句の平均保持率が高い、根拠分断数が少ない、検索1位の平均点が高い順で決める。

## 保存

`Settings.system22_run_file`の既定値は`./data/ai_learning/system22_runs.json`とする。

1. 実行結果を共通のrun形式へまとめる。
2. 最新の実行を先頭へ追加し、20件へ切り詰める。
3. `system22_runs.json.tmp`へUTF-8で書く。
4. 一時ファイルを保存先へ置き換える。
5. サービス初期化時にJSONを読み込み、最大20件を復元する。

JSONが配列でない、要素がオブジェクトでない、JSONとして読めない場合は起動時に明示的なエラーを返す。

## 画面

画面は次の順で表示する。

1. 文書文字数、固定質問数、比較条件数、保存状態
2. 条件別の集計比較表
3. 推奨条件と理由
4. 条件ごとの文書断片表
5. 条件ごとの固定質問、検索1位、抽出回答、期待語句、保持率、根拠分断
6. 学習メモ
7. 簡易検索と抽出回答の適用範囲

## テスト観点

- 2件以上の条件を比較できる
- 小さい分割の断片数が大きい分割より多い
- 小さい分割で期待語句が分断される
- 大きい分割で期待語句を同時に保持できる
- 実行結果と学習メモをJSONへ保存できる
- 新しいサービスで保存履歴を読み戻せる
- `overlap == chunk_size`を拒否する
- 既定入力で3条件と2質問をすべて評価する
