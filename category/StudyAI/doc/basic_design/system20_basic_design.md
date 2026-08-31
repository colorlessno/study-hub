# system20 基本設計

## 目的

system20は、長い文章の先頭・中央・末尾に重要情報を置き、入力上限によって残る情報と回答可否がどう変わるかを比較する画面である。結果から、文章の分割、必要部分の検索、要約が必要になる条件を確認できるようにする。

## 利用時の流れ

```text
利用者
  ↓ 位置別の入力例または任意の文章を選ぶ
SystemLearningPage
  ↓ POST /api/system20/execute
ai_learning/router.py
  ↓
LearningSystemService._context
  ↓ 入力上限、残存文章、上限外文章、回答可否を返す
SystemLearningPage
  ↓
実行履歴から入力条件と結果を再表示する
```

画面とAPIの通信、実行履歴の保存はStudyAIの共通実装を使う。ブラウザ内だけで判定や保存を完結させない。

## 使用する実装

| 実装 | 役割 |
|---|---|
| `src/backend/src/studyai/systems/ai_learning/catalog.py` | 既定値と、短文、重要情報が先頭・中央・末尾にある入力例を定義する |
| `src/backend/src/studyai/systems/ai_learning/router.py` | メタデータ取得、実行、実行履歴取得のAPIを提供する |
| `src/backend/src/studyai/systems/ai_learning/service.py` | 入力検証、簡易分割、上限位置の特定、回答可否判定、履歴保存を行う |
| `src/frontend/src/pages/SystemLearningPage.tsx` | 入力例、実験条件、比較結果、実行履歴を表示する |
| `src/scripts/system20_demo.py` | 共有APIを利用するCLI確認入口を提供する |
| `src/backend/tests/systems/test_ai_learning_systems.py` | 位置別比較、日本語文章の境界、入力エラーを検証する |

## 入力

| 項目 | 内容 |
|---|---|
| `text` | 入力上限を確認する文章 |
| `context_limit` | 学習用の簡易分割に適用する上限。1以上の整数 |
| `important_marker` | 回答に必要な重要語句。`text`内に含まれている必要がある |

カタログには短い文章と、同じ重要語句を先頭・中央・末尾へ置いた三つの長い文章を持たせる。利用者は入力例を順番に実行し、同じ上限で結果を比較できる。

## 処理

バックエンドは、英数字の連続部分と、それ以外の空白でない1文字を学習用トークンとして数える。入力上限に入る最後のトークンが元の文章のどこで終わるかを求め、その位置で元の文章を二つに分ける。

重要語句の末尾まで上限内に含まれる場合は「回答できる」、一部または全部が上限外の場合は「回答できない」と判定する。重要語句の中央位置を文章全体に対する比率で求め、「先頭」「中央」「末尾」のいずれかを表示する。

この判定は重要語句の残存確認であり、AIモデルによる回答生成ではない。実際のモデル固有のトークン数と混同しないよう、画面へ注意事項を表示する。

## 出力

| 項目 | 内容 |
|---|---|
| `estimated_tokens` | 学習用の推定トークン数 |
| `context_limit` | 実行時に指定した入力上限 |
| `retained_token_count` | 上限内に入った推定トークン数 |
| `over_limit_token_count` | 上限外になった推定トークン数 |
| `truncated` | 上限外の文章があるか |
| `important_position` | 重要情報の位置。先頭・中央・末尾 |
| `marker_retained` / `answerable` | 重要語句が完全に残り、回答できる状態か |
| `answer_result` | 回答可否の理由を示す文章 |
| `retained_text` | 上限内に残った元の文章 |
| `discarded_text` | 上限外になった元の文章 |
| `missing_markers` | 上限内に残らなかった重要語句 |
| `mitigation_options` | 分割、検索、要約などの対策候補 |
| `notes` | 簡易分割と判定範囲に関する注意事項 |

## 実行履歴

共有サービスは、入力条件、判定結果、実行日時を`data/ai_learning/system20_runs.json`へUTF-8で保存する。system20の最新20件を保持し、起動時に読み戻す。画面は`GET /api/system20/runs`で履歴を取得し、過去の入力条件と結果を再表示する。Dockerでは既存の`src/backend/data`ボリュームを使うため、コンテナの再作成後もホスト側に履歴が残る。

## エラー

- `text`が空の場合は実行しない。
- `context_limit`が整数に変換できない場合、または1未満の場合は実行しない。
- `important_marker`が空、または`text`内に存在しない場合は実行しない。
- 画面はAPIから返されたエラーを実験条件の近くへ表示する。

## ローカル実行

StudyAIの既存Docker構成と共有APIを使用する。system20専用の別サーバーやブラウザ内だけの代替処理は作らない。画面は共有APIへ通信し、`system20_demo.py`は同じバックエンドサービスを直接呼び出すCLI確認入口とする。
