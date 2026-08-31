# System 30 基本設計

## 重複文書の検出

---

## 1. 設計目的

文書の全組み合わせをバックエンドで比較し、完全一致、正規化後一致、版違いを含む類似文書を重複候補として返す。利用者は候補を確認して優先文書と除外文書を記録し、検索偏りと登録前確認の関係を画面で確認する。

## 2. 配置方針

```text
category/StudyAI/
  src/backend/src/studyai/systems/ai_learning/
    catalog.py
    service.py
    router.py
  src/frontend/src/pages/SystemLearningPage.tsx
  src/scripts/system30_demo.py
  src/backend/tests/systems/test_ai_learning_systems.py
  doc/basic_design/system30_basic_design.md
```

- system17からsystem36は共通の`ai_learning`モジュールを使う。
- system30の入力定義と処理分岐は同モジュールへ置く。
- フロントエンドは共通画面`SystemLearningPage.tsx`でsystem30専用結果を表示する。
- 実行履歴は`data/ai_learning/system30_runs.json`へ保存する。

## 3. 全体構成

```text
利用者
  ↓ SystemLearningPage
  ↓ POST /api/system30/execute
  ↓ ai_learning/router.py
  ↓ LearningSystemService._duplicate
  ↓ 全組み合わせ比較・候補グループ化・判断記録・検索偏り確認
  ↓ data/ai_learning/system30_runs.json
```

## 4. コンポーネント設計

| コンポーネント | 役割 |
|---|---|
| `ai_learning/router.py` | 共通API入口、入力受付、エラー応答を行う |
| `LearningSystemService._duplicate` | 入力検証、本文正規化、全組み合わせ比較、グループ化、判断記録を行う |
| JSON履歴保存 | 最新20件の入力、結果、学習メモを保存・読込する |
| `SystemLearningPage` | JSON入力、入力例、比較結果、判断、検索偏り、履歴を表示する |
| `system30_demo.py` | CLIからsystem30の既定入力を実行する |

## 5. 入出力設計

| 区分 | 内容 |
|---|---|
| 入力 | documents, query, similarity_threshold, resolution, learning_note |
| 処理 | 入力検証、NFKCと表記整理、SHA-256、文字列類似度、候補グループ化、判断記録、検索偏り確認 |
| 出力 | candidate_pairs, duplicate_groups, decision_records, search_bias_preview, bias_warning |
| 保存 | 最新20件の実行履歴をUTF-8 JSONへ保存 |

## 6. API設計

| メソッド | パス | 目的 |
|---|---|---|
| GET | `/api/system30/metadata` | 既定入力と入力例を取得する |
| POST | `/api/system30/execute` | 重複候補検出と判断記録を実行する |
| GET | `/api/system30/runs` | 保存済み実行履歴を取得する |

- API prefixは`/api/system30`とする。
- 入力不正時は共通エラー形式で400を返す。
- 外部AI APIへは通信せず、ローカルで再現可能な比較規則を使う。

## 7. 画面設計

| 領域 | 内容 |
|---|---|
| 入力領域 | 文書集合、検索語、しきい値、判断、学習メモをJSONで入力する |
| 集計領域 | 比較組数、候補数、完全一致数、類似文書数、しきい値、保存状態を表示する |
| 比較領域 | 文書名、版、類似度、判定、候補判定を全組み合わせで表示する |
| 判断領域 | 重複グループと文書ごとの優先、除外、確認状態を表示する |
| 検索偏り領域 | 検索語との類似度と重複グループを並べる |
| 学習メモ領域 | 観察結果、設計判断、残る注意点を表示する |

## 8. 判定方針

| 判定 | 条件 |
|---|---|
| 完全一致 | 入力本文が同じ |
| 正規化後一致 | NFKC、大小文字、空白・記号整理後の本文が同じ |
| 類似文書 | 文字列類似度がしきい値以上 |
| 候補外 | 上記のいずれにも該当しない |

- 完全一致と正規化後一致はしきい値に関係なく候補とする。
- 類似度は候補抽出にだけ使い、削除を確定しない。
- 候補の連結関係を一つの重複グループとして表示する。

## 9. データ設計

| データ | 主な項目 |
|---|---|
| `system30_runs.json` | `run_id`, `input`, `result`, `observation`, `created_at` |
| `resolution` | `action`, `preferred_document_id`, `excluded_document_ids`, `decision_note` |
| `learning_note` | `observation`, `decision`, `risk_note` |

- 現行実装はUTF-8 JSONへ最新20件を保存し、バックエンド起動時に読み戻す。
- 保存は一時ファイル作成後の置き換えで行う。
- 将来DBへ置き換える場合は`system30_` prefixを付ける。

## 10. Docker・ローカル実行方針

- StudyAI既存の`docker-compose.yml`へ統合する。
- バックエンドAPIとフロントエンドの画面を分離して起動する。
- 対象テストとvalidatorはDocker内で実行できる。
- 作成・更新するテキストファイルは既存の文字コードと改行コードを維持する。
