# System 22 基本設計

## RAGの文書分割比較

## 設計目的

同じ文書と固定質問へ複数の分割条件を適用し、文書断片、検索順位、抽出回答、期待語句の保持、根拠の分断を比較する。処理と保存はブラウザ内へ閉じず、StudyAIのBackend APIで行う。

## 現行の配置

```text
category/StudyAI/
  src/backend/src/studyai/systems/ai_learning/
    catalog.py             system22の入力例と初期値
    router.py              共通API
    service.py             分割、検索、回答、評価、保存
  src/backend/src/studyai/common/config/settings.py
  src/backend/tests/systems/test_ai_learning_systems.py
  src/frontend/src/pages/SystemLearningPage.tsx
  scripts/validate-ai-learning.py
  src/scripts/system22_demo.py
  doc/learning_notes/system22_rag_chunk_size_comparison/README.md
```

system22専用の別APIや別画面は作らず、system17以降が使用する共通の`ai_learning` APIと画面へ登録する。

## 全体構成

```text
利用者
  ↓ StudyAIフロントエンド
  ↓ POST /api/system22/execute
  ↓ LearningSystemService
  ├─ 複数条件で文書を分割
  ├─ 固定質問ごとに各文書断片を検索
  ├─ 検索1位を抽出回答として返す
  ├─ 期待語句の保持と根拠の分断を評価
  └─ data/ai_learning/system22_runs.jsonへ保存
```

## 入力

| 項目 | 内容 |
|---|---|
| `document` | 全条件で共通して使う文書 |
| `question_set` | `question`と`expected_terms`を持つ固定質問の配列 |
| `chunk_configs` | `id`、`label`、`chunk_size`、`overlap`を持つ2～8件の比較条件 |
| `learning_note` | `observation`、`decision`、`risk_note` |

入力例として、分割サイズを小・中・大で比較する例と、同じ分割サイズで重複幅を比較する例を用意する。

## 処理

1. 文書、固定質問、比較条件を検証する。
2. 分割条件を入力順に一件ずつ処理し、`step = chunk_size - overlap`で開始位置を進めて文書断片を作る。
3. その条件に対する質問を入力順に一件ずつ処理し、各文書断片との文字単位の簡易類似度を計算して上位3件を検索結果とする。
4. 検索1位の文書断片をローカル抽出回答とする。
5. 検索1位に含まれる期待語句の割合と、期待語句が複数断片へ分断されたかを評価する。
6. 期待語句の平均保持率、根拠の分断数、検索1位の平均点の順で推奨条件を選ぶ。
7. 入力、比較結果、学習メモを最新20件のJSONへ保存する。

このテーマは外部LLMを必須としない。検索と回答はBackendで実行するローカルの簡易方式であり、ブラウザだけで結果を作らない。

## 出力

| 領域 | 表示内容 |
|---|---|
| 全体 | 文書文字数、固定質問数、比較条件数、保存状態 |
| 条件比較 | 分割サイズ、重複幅、分割数、検索1位の平均点、期待語句の平均保持率、根拠分断数 |
| 文書断片 | 番号、開始位置、終了位置、文章 |
| 質問結果 | 質問、検索1位、検索点、抽出回答、保持した期待語句、保持率、根拠分断 |
| 判断 | 推奨条件と比較理由 |
| 学習メモ | 観察結果、判断理由、注意点 |

## API

| メソッド | パス | 用途 |
|---|---|---|
| GET | `/api/system22/metadata` | 初期値、入力例、説明を取得 |
| POST | `/api/system22/execute` | 比較を実行して保存 |
| GET | `/api/system22/runs` | 保存済みの最新20件を取得 |

入力不正は`400`と`system22_input_invalid`で返す。永続ファイルを読み込めない場合は起動時に明示的なエラーとし、黙って空履歴へ置き換えない。

## 保存

保存先は`./data/ai_learning/system22_runs.json`とする。保存時は一時ファイルへUTF-8で書き、置換して更新する。最新20件だけを保持し、実行データはGitへ登録しない。

## 確認

- 複数条件へ同じ文書と固定質問が適用されること
- 分割数が実際の文書断片数と一致すること
- 根拠が1断片に収まる条件と分断される条件を区別できること
- 検索順位、抽出回答、期待語句の保持率が条件別に表示されること
- 保存後にサービスを作り直しても実行履歴を読み戻せること
- 不正なoverlapを拒否すること
