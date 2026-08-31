# System 24 基本設計

## 複数モデルの比較

## 設計目的

同じ指示と評価基準で複数のモデルへ実通信し、回答品質、実測応答時間、推定費用、運用条件を横並びで比較する。実モデル比較を通常の動作とし、外部環境を使わず画面と比較手順だけを確認する場合は、利用者が明示的にモックを選ぶ。

## 現在の配置

```text
category/StudyAI/
  src/backend/src/studyai/common/ai/llm_client.py
  src/backend/src/studyai/common/config/settings.py
  src/backend/src/studyai/systems/ai_learning/
    catalog.py
    service.py
    router.py
  src/backend/tests/systems/test_ai_learning_systems.py
  src/frontend/src/pages/SystemLearningPage.tsx
  scripts/validate-ai-learning.py
  src/scripts/system24_demo.py
  doc/learning_notes/system24_multi_model_comparison/README.md
```

system24専用のRouterやPageは作らず、system17～36で共有するAPI、画面、実行履歴を使う。system24固有の入力、比較処理、表示はカタログ、サービス、共有画面のsystem24分岐へ置く。

## 処理の流れ

```text
利用者
  ↓ 指示、モデル設定、評価基準、優先条件、実行モード、学習メモ
SystemLearningPage
  ↓ POST /api/system24/execute
ai_learning/router.py
  ↓
LearningSystemService
  ├─ model: モデル名ごとにOpenAI互換 /chat/completionsへ実通信
  └─ mock: 明示的な模擬回答を使用
  ↓
固定評価、実測時間、推定費用、採用・不採用理由
  ↓
data/ai_learning/system24_runs.jsonへ最新20件を保存
  ↓
比較表、判断メモ、保存状態を画面へ返す
```

## 入力

| 項目 | 内容 |
|---|---|
| `prompt` | すべてのモデルへ同じ内容で送る指示 |
| `models` | 2～5件の比較設定。比較ID、実モデル名、表示名、入出力単価、運用メモ、モック回答を持つ |
| `evaluation_rubric` | 必須語句、目標回答長、網羅率と簡潔さの重み |
| `priority` | `quality`、`latency`、`cost`、`balanced` |
| `temperature` | すべてのモデルへ共通して送るTemperature |
| `mode` | `model`または`mock`。既定は`model` |
| `learning_note` | 観察結果、採用判断、残る注意点 |

モデル名と比較IDは重複を禁止する。評価の重みは0以上で合計1とし、実モデル比較で通信に失敗した場合はエラーを返してモックへ切り替えない。

## 実モデル通信

`LLMClient.generate_text_with_metadata()`へモデル名を指定し、設定済みOpenAI互換APIの`/chat/completions`へ入力順に一件ずつ送信する。直前のモデルの応答完了後に次のモデルへ進む。すべてのモデルで同じ指示とTemperatureを使い、応答本文、実際に応答したモデル名、入出力トークン数、モデルごとの実測時間を取得する。

LM Studioを使う場合は、比較対象のモデルをAPIから指定できる状態にする。別のOpenAI互換APIを使う場合も、StudyAIの既存プロバイダー設定を使う。

## 固定評価

回答に含まれる必須語句の割合を網羅率とする。回答が目標文字数以内なら簡潔さを1、超えた場合は目標文字数を実際の文字数で割った値とする。品質点は、網羅率と簡潔さへ入力した重みを掛けて100点へ換算する。

この品質点は同じ規則で比較するための教材用評価であり、人手評価や業務評価を置き換えないことを画面に表示する。

## 応答時間と費用

応答時間は各モデルのAPI呼出し直前から応答取得までをミリ秒で測る。推定費用は、APIが返した入出力トークン数と、モデル設定に入力した100万トークン当たり単価から計算する。トークン数が返らない場合は推定費用を不明とする。ローカルモデルの単価を0と設定した場合は0になる。

## 選定と記録

`quality`は品質点の最大、`latency`は応答時間の最小、`cost`は既知の推定費用の最小、`balanced`は品質60％、応答時間20％、費用20％の教材用総合点で採用候補を決める。採用理由と、候補外になった各モデルの不採用理由を返す。利用者の学習メモと結果は最新20件をJSONへ保存し、起動時に読み戻す。

## 画面

画面には、比較方法、優先条件、採用候補、保存状態、固定した指示と評価基準、モデル別回答、品質点、網羅率、実測応答時間、入出力トークン数、推定費用、総合点、運用条件、採用・不採用理由、学習メモ、評価上の注意を表示する。

## 確認方法

- 実モデルモードで、指定したモデル名ごとにOpenAI互換APIへ通信する。
- 明示的なモックモードでは、API通信なしでも実モデル結果と同じ比較構造を返す。
- 同じ評価基準で品質点を計算し、優先条件に応じて採用候補が決まる。
- 実行結果がJSONへ保存され、再起動後に読み戻される。
- 不正な入力、重複モデル、重みの不整合を入力エラーにする。
