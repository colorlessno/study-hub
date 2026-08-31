# System 31 詳細設計
## 評価用正解データの作成

## 1. 実装配置

```text
category/StudyAI/
  src/backend/src/studyai/common/config/settings.py
  src/backend/src/studyai/systems/ai_learning/
    catalog.py
    service.py
    router.py
  src/backend/tests/systems/test_ai_learning_systems.py
  src/frontend/src/pages/SystemLearningPage.tsx
  src/scripts/system31_demo.py
  scripts/validate-ai-learning.py
  doc/learning_notes/system31_ground_truth_creation/README.md
```

- system31はsystem17からsystem36で共有する`ai_learning` APIと画面を使用する。
- テーマ固有処理は`LearningSystemService._ground_truth()`へ実装する。
- 外部AIへ送信せず、入力した原文と引用文をバックエンドで決定的に照合する。
- 実行結果はsystem31専用JSONへ保存し、他テーマの履歴と混在させない。

## 2. 入力設計

| 項目 | 型 | 必須 | 内容 |
|---|---|---|---|
| `dataset_name` | string | 必須 | 正解データセットの名称 |
| `source_document` | object | 必須 | 根拠文書 |
| `source_document.document_id` | string | 必須 | 根拠文書番号 |
| `source_document.title` | string | 必須 | 根拠文書の題名 |
| `source_document.version` | string | 任意 | 文書の版 |
| `source_document.text` | string | 必須 | 引用元となる本文 |
| `case_id` | string | 任意 | 未指定時は入力から生成する |
| `question` | string | 必須 | 評価時に使用する質問 |
| `expected_answer` | string | 必須 | 期待する回答 |
| `evidence` | array | 必須 | 1件以上の根拠 |
| `evidence[].document_id` | string | 必須 | 根拠文書番号 |
| `evidence[].quote` | string | 必須 | 原文から引用した文 |
| `evaluation_viewpoints` | array | 必須 | 1件以上の評価観点 |
| `evaluation_viewpoints[].viewpoint_id` | string | 必須 | 重複しない観点番号 |
| `evaluation_viewpoints[].label` | string | 必須 | 観点名 |
| `evaluation_viewpoints[].description` | string | 必須 | 確認内容 |
| `evaluation_viewpoints[].weight` | number | 必須 | 0以上1以下。合計は1 |
| `review.status` | string | 必須 | `draft`、`approved`、`rejected` |
| `review.reviewer` | string | 条件付き | 承認・差戻しでは必須 |
| `review.comment` | string | 条件付き | 承認・差戻しでは必須 |
| `tags` | string[] | 任意 | ケースの分類 |
| `learning_note` | object | 任意 | 観察結果、設計判断、残る注意点 |

`evidence`の各要素に文字列を指定した場合は、その文字列を引用文として扱い、`source_document.document_id`を参照先に設定する。

## 3. 入力検証

### 3.1 形式エラーとして拒否する条件

- `source_document`、`review`、`learning_note`がJSONオブジェクトではない。
- `evidence`、`evaluation_viewpoints`、`tags`が配列ではない。
- `evidence`または`evaluation_viewpoints`が10件を超える。
- 評価観点の`weight`が数値ではない、または0から1の範囲外である。
- `viewpoint_id`が重複している。
- `review.status`が定義外である。

形式エラーはHTTP 400として返し、実行履歴へ保存しない。

### 3.2 正解データの不足として返す条件

- データセット名、質問、期待する回答が空である。
- 根拠文書の文書番号、題名、本文が空である。
- 根拠が0件である。
- 根拠の文書番号または引用文が空である。
- 根拠が登録した文書番号を参照していない。
- 引用文が根拠文書の本文に存在しない。
- 評価観点が0件、または必須項目が空である。
- 評価観点の重み合計が1ではない。
- 承認・差戻しで確認者または確認記録が空である。

不足は`validation_issues`へ格納し、正解データの形と確認結果を画面へ返す。

## 4. 処理設計

### 4.1 根拠の追跡

各根拠へ`evidence-1`から始まる番号を付ける。根拠文書番号が`source_document.document_id`と一致する場合は`source_exists=true`とする。引用文が`source_document.text`へ含まれる場合は`quote_found=true`とする。

### 4.2 評価観点の固定

評価観点を入力順に保持し、`weight`の合計を小数4桁へ丸めて`rubric_weight_total`とする。合計が1でない場合は評価へ利用できない。

### 4.3 レビュー状態

| 入力状態 | 不足 | 出力状態 | 評価へ利用可能 |
|---|---|---|---|
| `approved` | なし | `approved`／承認済み | true |
| `approved` | あり | `draft`／下書き・要確認 | false |
| `draft` | 任意 | `draft`／下書き・要確認 | false |
| `rejected` | 任意 | `rejected`／差戻し | false |

自動検証だけで承認済みに変更しない。利用者が`approved`、確認者、確認記録を明示し、入力に不足がない場合だけ評価へ利用可能とする。

### 4.4 品質確認

`quality_checks`へ、質問と期待する回答、根拠の追跡、引用文の一致、評価観点の重み、人による確認の5項目を返す。

## 5. 出力設計

| 項目 | 内容 |
|---|---|
| `case_id` | 入力または入力内容から生成したケース番号 |
| `dataset_name` | データセット名 |
| `source_document` | 登録した根拠文書 |
| `ground_truth_case` | 質問、期待する回答、根拠、タグ |
| `evaluation_viewpoints` | 固定した評価観点と重み |
| `rubric_weight_total` | 評価観点の重み合計 |
| `review_status` | `draft`、`approved`、`rejected` |
| `review_status_label` | 日本語表示名 |
| `review_history` | 確認者と確認記録 |
| `quality_checks` | 品質確認の結果 |
| `validation_issues` | 不足または不一致の一覧 |
| `ready_for_evaluation` | 評価へ利用可能か |
| `dataset_record` | 後続評価へ渡せる正解データ一式 |
| `learning_note` | 観察結果、設計判断、残る注意点 |
| `saved` | JSON保存の成否 |
| `storage_status` | 保存状態の説明 |

## 6. API設計

### GET `/api/system31/metadata`

題名、分類、既定入力、入力例、確認内容を返す。

### POST `/api/system31/execute`

```json
{
  "input": {
    "dataset_name": "support-ground-truth-v1",
    "question": "返品期限は？"
  }
}
```

入力は既定値へ上書きして実行する。成功時は共通実行情報とsystem31の結果を返す。

### GET `/api/system31/runs`

保存済みの実行履歴を新しい順で最大20件返す。

## 7. 保存設計

- 保存先は`data/ai_learning/system31_runs.json`とする。
- UTF-8、インデント2、末尾改行ありで保存する。
- 一時ファイルへ全履歴を書き込み、置換して更新する。
- 最新20件だけを保持する。
- バックエンド起動時にJSONを読み込み、形式が配列またはオブジェクト履歴でない場合は起動エラーとする。
- 保存先を明示しない単体テストではインメモリ履歴を使用する。

## 8. 画面設計

- system31は入力と結果を縦に並べ、横幅を狭くしない。
- 入力例として承認済み、根拠不足、引用不一致を表示する。
- 概要にデータセット、ケース番号、確認状態、利用可否、重み合計、保存状態を表示する。
- 正解データ、根拠文書、根拠追跡、評価観点、品質確認、レビュー履歴、不足項目、学習メモを分けて表示する。
- 実行履歴から入力と結果を再表示できるようにする。

## 9. エラー設計

| 条件 | HTTP | 表示 |
|---|---|---|
| JSON入力の形式不正 | 400 | `JSON の形式を確認してください。` |
| system31入力の型・範囲不正 | 400 | バックエンドの検証メッセージ |
| 保存済みJSONの読込失敗 | 起動失敗 | 保存先を含むエラー |
| 予期しない実行失敗 | 500 | 共通エラー応答 |

## 10. テスト設計

- 既定入力から承認済み正解データを作成し、根拠追跡、引用一致、重み合計、利用可否を確認する。
- JSONへ保存し、新しいserviceインスタンスで同じrunを再読込する。
- 根拠なしを下書き・利用不可として返す。
- 原文にない引用文を差戻し・利用不可として返す。
- 旧形式の文字列根拠を受け付ける。
- 不正な重み、レビュー状態、根拠型を拒否する。
- validatorで既定入力の構造と承認状態を確認する。
- フロントエンドproduction buildと実ブラウザで表示を確認する。

## 11. 実行コマンド

```bat
cd /d C:\work\work20260617\category\StudyAI
rtk docker compose exec -T backend python -m pytest backend/tests/systems/test_ai_learning_systems.py -q -k system31
rtk docker compose exec -T backend python scripts/validate-ai-learning.py --system system31
rtk docker compose exec -T frontend npm run build
```

## 12. このテーマの範囲

- 正解データの構造、根拠追跡、評価観点、レビュー、保存を扱う。
- 生成回答の採点やRAG評価セットの一括実行は後続テーマで扱う。
- 引用文の文字列一致だけで内容の正しさを自動確定しない。
- 本番クラウド、課金が発生する外部API、統合ポートフォリオは対象外とする。
