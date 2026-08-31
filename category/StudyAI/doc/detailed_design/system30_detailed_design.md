# System 30 詳細設計
## 重複文書の検出

## 1. 配置

```text
src/backend/src/studyai/systems/ai_learning/
  catalog.py
  service.py
  router.py
src/frontend/src/pages/SystemLearningPage.tsx
src/scripts/system30_demo.py
src/backend/tests/systems/test_ai_learning_systems.py
data/ai_learning/system30_runs.json
```

- system30は共通`ai_learning`モジュール内の`duplicate`処理を使う。
- 画面は共通`SystemLearningPage`のsystem30分岐を使う。
- 実行結果は最新20件をJSONへ保存する。

## 2. 入力データ

### 2.1 documents

2件以上20件以下の配列とする。各要素は次の項目を持つ。

| 項目 | 型 | 必須 | 内容 |
|---|---|---|---|
| `document_id` | string | 必須 | 文書内で一意の番号 |
| `title` | string | 必須 | 画面へ表示する題名 |
| `version` | string | 任意 | 版番号。省略時は`－` |
| `text` | string | 必須 | 比較対象の本文 |

既存の入力との互換性のため、文字列配列も受け付ける。文字列の場合は`doc-1`から順に番号を付ける。

### 2.2 比較条件と判断

| 項目 | 型 | 内容 |
|---|---|---|
| `query` | string | 検索偏りを確認する検索語 |
| `similarity_threshold` | number | 0から1の類似度しきい値 |
| `resolution.action` | string | `review`、`prefer`、`exclude` |
| `resolution.preferred_document_id` | string | 優先する文書番号 |
| `resolution.excluded_document_ids` | array | 除外する文書番号 |
| `resolution.decision_note` | string | 判断理由 |
| `learning_note` | object | 観察結果、設計判断、残る注意点 |

## 3. 比較処理

### 3.1 正規化

1. UnicodeをNFKCへ揃える。
2. 英字の大小文字を揃える。
3. 空白と記号を除いて比較用文字列を作る。
4. 比較用文字列からSHA-256を生成し、先頭12桁を確認用に返す。

### 3.2 類似度

正規化した2文書の文字列の並びを`SequenceMatcher`で比較し、0から1の値を返す。小数第4位へ丸める。

### 3.3 判定順

| 優先順 | 判定 | 条件 | 候補 |
|---|---|---|---|
| 1 | 完全一致 | 入力本文が同じ | 候補にする |
| 2 | 正規化後一致 | 正規化した本文が同じ | 候補にする |
| 3 | 類似文書 | 類似度がしきい値以上 | 候補にする |
| 4 | 候補外 | 上記以外 | 候補にしない |

完全一致と正規化後一致は、しきい値を上げても候補から外さない。

### 3.4 グループ化

候補になった組み合わせを無向グラフとして扱う。直接または別文書を介してつながる文書を同じ`group-N`へまとめる。候補を持たない文書は重複グループへ入れない。

## 4. 判断記録

| 条件 | 文書の表示 |
|---|---|
| 優先文書番号と一致 | 優先文書 |
| 除外文書番号に含まれる | 除外 |
| 重複グループに含まれる | 確認対象 |
| 候補を持たない | 登録候補 |

- `prefer`を指定する場合は優先文書番号を必須にする。
- 優先文書と除外文書へ同じ番号を指定できない。
- 存在しない文書番号を指定した場合は400相当の入力エラーにする。
- 判断は候補検出結果を上書きせず、別の`decision_records`へ保持する。

## 5. 検索偏りの確認

検索語と各文書本文の類似度を計算し、降順に並べる。各文書が属する重複グループも表示する。同じグループの文書が複数並ぶ場合、重複文書が検索上位を占める可能性があることを注意文で示す。

この一覧は検索偏りを学ぶための簡易比較であり、本番のEmbedding検索順位を再現するものではない。

## 6. 出力データ

| 項目 | 内容 |
|---|---|
| `documents` | 検証済み文書一覧 |
| `candidate_pairs` | 全組み合わせの題名、版、hash、類似度、判定 |
| `duplicate_groups` | 候補がつながる文書グループ |
| `candidate_count` | 重複候補の組数 |
| `exact_match_count` | 完全一致と正規化後一致の組数 |
| `similar_match_count` | 類似文書の組数 |
| `resolution` | 入力した判断と判断メモ |
| `decision_records` | 文書ごとの優先、除外、確認対象、登録候補 |
| `search_bias_preview` | 検索語との類似度と重複グループ |
| `bias_warning` | 検索偏りに関する注意文 |
| `learning_note` | 観察結果、設計判断、残る注意点 |
| `saved` | JSON保存の成否 |
| `storage_status` | 保存状態の表示文 |

## 7. API

### GET `/api/system30/metadata`

既定入力、説明、三つの入力例を返す。

### POST `/api/system30/execute`

```json
{
  "input": {
    "documents": [],
    "query": "返品期限",
    "similarity_threshold": 0.75,
    "resolution": {},
    "learning_note": {}
  }
}
```

入力を検証し、比較、グループ化、判断記録、検索偏りの確認、保存を行う。

### GET `/api/system30/runs`

保存済み実行履歴を新しい順に最大20件返す。

## 8. 保存

- 保存先は`data/ai_learning/system30_runs.json`とする。
- `run_id`、入力、結果、観察文、実行日時をUTF-8で保存する。
- 一時ファイルへ書き込んだ後に保存先を置き換える。
- バックエンド起動時にJSONを読み込み、最新20件を履歴へ戻す。
- 読み込めないJSONや配列以外の形式は起動時エラーにする。

## 9. エラー

| 条件 | メッセージ |
|---|---|
| 文書が2件未満または20件超 | `documentsは2件以上20件以下の配列で指定してください。` |
| 文書番号、題名、本文が空 | `各文書のdocument_id、title、textは空にできません。` |
| 文書番号が重複 | `document_idは重複しない値を指定してください。` |
| しきい値が範囲外 | `similarity_thresholdは0から1の範囲で指定してください。` |
| 判断方法が未対応 | `resolution.actionはreview、prefer、excludeのいずれかで指定してください。` |
| 判断対象の文書がない | `resolutionに存在しないdocument_idがあります。` |

## 10. 画面

- 既定入力と三つの入力例を切り替える。
- 比較組数、候補数、完全一致数、類似文書数、しきい値、保存状態を集計表示する。
- 文書の全組み合わせを表で表示する。
- 重複グループと文書ごとの判断を別の表で表示する。
- 検索偏り、注意文、学習メモ、保存状態、履歴を表示する。
- system30は情報量が多いため、入力と結果を上下に並べる。

## 11. 検証

- 既定入力で4文書から6組が作られることを確認する。
- 完全一致1組、版違いの類似候補、候補外を確認する。
- しきい値0.99で完全一致だけが候補として残ることを確認する。
- 優先文書と除外文書の判断を確認する。
- JSON保存と再起動後の読戻しを確認する。
- 文字列配列の既存入力も実行できることを確認する。
- 不正な文書数、文書番号、しきい値、判断対象を拒否することを確認する。

