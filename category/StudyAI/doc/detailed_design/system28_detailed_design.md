# System 28 詳細設計

## OCR結果の正規化

## 1. 対象ファイル

```text
src/backend/src/studyai/systems/ai_learning/catalog.py
src/backend/src/studyai/systems/ai_learning/service.py
src/backend/src/studyai/systems/ai_learning/router.py
src/backend/src/studyai/common/config/settings.py
src/frontend/src/pages/SystemLearningPage.tsx
src/scripts/system28_demo.py
src/backend/tests/systems/test_ai_learning_systems.py
scripts/validate-ai-learning.py
```

system28はsystem17からsystem36の共通実装を利用する。専用Routerや専用Pageは作らず、`system28` と `ocr_normalize` をキーにカタログ、処理、表示、保存を切り替える。

## 2. 既定入力

```json
{
  "ocr_text": "TEL O3-1234-５６７８  返晶　期限",
  "rules": ["space", "zenkaku", "dictionary", "ocr_o_zero"],
  "correction_dictionary": {
    "返晶": "返品"
  }
}
```

入力例として全規則を適用する入力と、`ocr_o_zero` を外して自動補正だけを確認する入力を返す。

## 3. 入力検証

| 検証 | エラー条件 | メッセージ方針 |
|---|---|---|
| `ocr_text` | 空文字または空白だけ | OCR文字列の入力を求める |
| `rules` | 配列でない、0件 | 1件以上の文字列配列を求める |
| 規則ID | 対応規則以外を含む | 未対応規則を列挙する |
| 規則の重複 | 同じ規則を複数指定 | 重複指定を拒否する |
| `correction_dictionary` | objectでない、51件以上 | object形式と最大50件を示す |
| 辞書項目 | 置換前または置換後が空 | 空文字を拒否する |
| `dictionary` 規則 | 辞書が0件 | 1件以上の辞書指定を求める |

入力不正はRouterがHTTP 400と次の形式へ変換する。

```json
{
  "detail": {
    "error_code": "system28_input_invalid",
    "message": "入力不正の説明"
  }
}
```

## 4. 正規化処理

規則は `rules` の配列順に適用する。文字列が変化した規則だけを `applied_rules` と `diffs` へ追加する。

### 4.1 `space`

- 改行は維持する。
- 各行の半角空白、タブ、全角空白の連続を半角空白1文字へ置換する。
- 各行の前後空白を除去する。
- 信頼度は高、人手確認は不要とする。

### 4.2 `zenkaku`

- `unicodedata.normalize("NFKC", text)` で全角半角を統一する。
- 信頼度は高、人手確認は不要とする。

### 4.3 `dictionary`

- `correction_dictionary` の登録順に、置換前文字列へ完全一致した箇所を置換する。
- 正規表現や部分推測は行わない。
- 利用者が明示した辞書なので信頼度は高、人手確認は不要とする。

### 4.4 `ocr_o_zero`

- 数字の直前または直後にある英字 `O`・`o` だけを数字 `0` へ置換する。
- 単語中の英字Oは置換しない。
- 信頼度は中、人手確認を必須とする。
- 変更時は「OCR元画像と照合する」注意を `review_flags` へ追加する。

## 5. 差分構造

規則適用前後を `SequenceMatcher` で比較し、equal以外の変更ブロック数を `change_count` とする。

```json
{
  "rule_id": "ocr_o_zero",
  "rule": "数字に隣接する英字Oの補正",
  "before": "TEL O3-1234-5678 返品 期限",
  "after": "TEL 03-1234-5678 返品 期限",
  "change_count": 1,
  "confidence": "中",
  "review_required": true,
  "review_note": "OCR元画像との照合が必要である理由"
}
```

## 6. 実行結果

| 項目 | 型 | 内容 |
|---|---|---|
| `original_text` | string | 入力されたOCR文字列 |
| `normalized_text` | string | 全規則適用後の文字列 |
| `selected_rules` | string array | 指定された規則IDと適用順 |
| `correction_dictionary` | object | 実行に使用した誤認識辞書 |
| `applied_rules` | string array | 実際に文字列を変更した規則名 |
| `diffs` | object array | 規則別の補正前後と判断情報 |
| `review_flags` | string array | OCR元画像と照合する箇所の注意 |
| `review_status` | string | `要確認` または `自動補正のみ` |
| `confidence_notes` | object array | 信頼度ごとの対象と確認方法 |
| `saved` | boolean | JSON永続保存の有無 |
| `storage_status` | string | 保存先の状態説明 |

## 7. API

### GET `/api/system28/metadata`

タイトル、カテゴリ、既定入力、観察点、入力例を返す。

### POST `/api/system28/execute`

```json
{
  "input": {
    "ocr_text": "文字列",
    "rules": ["space"],
    "correction_dictionary": {}
  }
}
```

入力を既定値へマージし、バックエンドで正規化して一つの実行履歴を返す。

### GET `/api/system28/runs`

新しい順に最大20件の実行履歴を返す。各履歴には入力、結果、観察点、UTCの実行日時を含める。

## 8. 保存処理

- 保存先は `Settings.system28_run_file` とする。
- 既定値は `./data/ai_learning/system28_runs.json` とする。
- 実行履歴を新しい順に最大20件保持する。
- `system28_runs.json.tmp` へUTF-8で書き込み、完了後に本ファイルへ置換する。
- バックエンド起動時にJSONを読み込み、配列・要素形式が不正な場合は起動時エラーとする。
- Docker Composeでは `src/backend/data` をbackendコンテナへマウントし、コンテナ再作成後も保存結果を残す。

## 9. 画面表示

- 入力欄はJSONとして編集し、入力例と既定値へ切り替えられるようにする。
- 実行結果の先頭に補正前、補正後、確認状態、保存状態を並べる。
- 規則別差分は表形式で表示する。
- 信頼度の扱いは高と中を別行で表示する。
- 人手確認対象と保存状態は省略せず表示する。
- 実行履歴の「結果を表示」で保存済み入力と結果を画面へ戻す。

## 10. 検証項目

- 全4規則で `TEL O3-１２　 返晶` が `TEL 03-12 返品` になる。
- 4規則が別々の差分として返る。
- 誤認識辞書は信頼度高、英字Oの補正は信頼度中かつ人手確認必須になる。
- 未対応規則と空の誤認識辞書を拒否する。
- JSON保存後、新しいServiceインスタンスで同じ実行履歴を復元できる。
- 検証スクリプトが既定入力の正規化、辞書補正、人手確認境界を確認する。
- フロントエンドをビルドし、実画面で入力例、実行結果、差分、保存状態、実行履歴を確認する。

## 11. 外部連携の境界

system28はOCRエンジン実行後の文字列を正規化するテーマであり、OCR画像の送信やLM Studio通信は対象外とする。ただし画面内だけで処理せず、入力はStudyAIバックエンドAPIへ送信し、結果はバックエンドのJSONファイルへ保存する。
