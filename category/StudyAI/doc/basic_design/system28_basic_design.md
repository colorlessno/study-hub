# System 28 基本設計

## OCR結果の正規化

## 1. 設計目的

OCR後の文字列へ決められた規則と誤認識辞書を適用し、自動補正できる表記とOCR元画像の確認が必要な文字を分ける。処理はStudyAIバックエンドで実行し、結果をJSONファイルへ保存して画面から参照できる構成とする。

## 2. 実装配置

```text
category/StudyAI/
  src/backend/src/studyai/
    common/config/settings.py
    systems/ai_learning/
      catalog.py
      router.py
      service.py
  src/frontend/src/pages/SystemLearningPage.tsx
  src/scripts/system28_demo.py
  src/backend/tests/systems/test_ai_learning_systems.py
  scripts/validate-ai-learning.py
  doc/learning_notes/system28_ocr_result_normalization/README.md
```

- system17からsystem36は共通のAPI・画面・実行履歴構造を利用する。
- system28固有の既定入力、正規化処理、表示項目、テストは上記の共通実装内でsystem28をキーとして定義する。
- 保存先は `settings.py` の `system28_run_file` で指定し、既定値を `./data/ai_learning/system28_runs.json` とする。

## 3. 処理の流れ

```text
利用者
  ↓ OCR文字列・規則・誤認識辞書を入力
SystemLearningPage
  ↓ POST /api/system28/execute
LearningSystemService
  ↓ 入力検証 → 規則を指定順に適用 → 差分と確認対象を作成
system28_runs.json
  ↓ 最新20件を保存
SystemLearningPage
  ← 正規化結果・差分・信頼度・保存状態・実行履歴
```

## 4. 入力設計

| 項目 | 型 | 内容 |
|---|---|---|
| `ocr_text` | string | OCRエンジンから受け取った正規化前の文字列 |
| `rules` | string array | `space`、`zenkaku`、`dictionary`、`ocr_o_zero` の適用順 |
| `correction_dictionary` | object | 誤認識文字列をキー、補正後文字列を値とする最大50件の辞書 |

- `ocr_text` は空文字を許可しない。
- `rules` は1件以上とし、未対応規則と重複規則を拒否する。
- `dictionary` を指定する場合は空でない `correction_dictionary` を必須とする。

## 5. 正規化規則

| 規則 | 処理 | 信頼度 | 人手確認 |
|---|---|---|---|
| `space` | 行内の半角・全角空白を1文字へ統一する | 高 | 不要 |
| `zenkaku` | Unicode NFKCで全角半角を統一する | 高 | 不要 |
| `dictionary` | 利用者が明示した誤認識辞書へ完全一致する文字列を置換する | 高 | 不要 |
| `ocr_o_zero` | 数字に隣接する英字O・oだけを数字0へ置換する | 中 | OCR元画像との照合が必要 |

規則を適用して文字列が変化した場合だけ、規則名、補正前、補正後、変更箇所数、信頼度、確認方法を差分として返す。

## 6. API設計

| メソッド | パス | 用途 |
|---|---|---|
| GET | `/api/system28/metadata` | 既定入力、画面説明、入力例を取得する |
| POST | `/api/system28/execute` | バックエンドで正規化を実行し、結果を保存する |
| GET | `/api/system28/runs` | 保存済みの最新20件を取得する |

入力不正はHTTP 400と `system28_input_invalid` を返す。

## 7. 出力設計

| 項目 | 内容 |
|---|---|
| `original_text` | 補正前文字列 |
| `normalized_text` | 全規則適用後の文字列 |
| `selected_rules` | 利用者が指定した規則ID |
| `applied_rules` | 実際に文字列を変更した規則名 |
| `diffs` | 規則別の補正前後、変更箇所数、信頼度、確認要否 |
| `review_status` | `要確認` または `自動補正のみ` |
| `review_flags` | OCR元画像と照合する理由 |
| `confidence_notes` | 高・中の信頼度ごとの対象と扱い方 |
| `saved` / `storage_status` | JSON保存の成否と保存状態 |

## 8. 保存設計

- 一つの実行履歴に入力、結果、観察メモ、実行日時を保存する。
- `system28_runs.json` へUTF-8で最新20件を保存する。
- 一時ファイルへ書き込んでから置換し、書き込み途中のJSONを残さない。
- バックエンド起動時に保存済みJSONを読み込み、画面の実行履歴へ戻す。

## 9. 画面設計

| 領域 | 表示内容 |
|---|---|
| 入力 | OCR文字列、規則の適用順、誤認識辞書をJSONで編集する |
| 実行結果 | 補正前後、確認状態、保存状態を並べて表示する |
| 規則別差分 | 規則、補正前後、変更箇所数、信頼度、人手確認、扱い方を表示する |
| 信頼度 | 自動補正とOCR元画像照合の境界を表示する |
| 実行履歴 | 保存済み実行を選び、入力と結果を再表示する |

## 10. 実行・検証方針

- Docker Composeのbackend・frontendを利用する。
- system28はOCR後処理のテーマであり、外部OCRエンジンやLM Studioへの通信は行わない。
- 画面からの実行は必ずバックエンドAPIへ送信し、ブラウザ内だけで正規化・保存を完結させない。
- 単体テスト、system28検証スクリプト、フロントエンドビルド、API実行、バックエンド再起動後の履歴復元、実画面を確認する。
