# System 29 詳細設計
## 文書断片のメタデータ設計

## 1. 実装構成

```text
src/backend/src/studyai/systems/ai_learning/
  catalog.py
  service.py
  router.py
src/backend/src/studyai/common/config/settings.py
src/frontend/src/pages/SystemLearningPage.tsx
src/scripts/system29_demo.py
src/backend/tests/systems/test_ai_learning_systems.py
data/ai_learning/system29_runs.json
```

- system29はsystem17からsystem36までの共通API・共通画面を使う。
- metadata付与、検索前フィルタ、検索語照合、根拠表示、履歴保存はバックエンドで実行する。
- 外部AIやLM Studioは使用しない。metadata設計と検索前フィルタの境界を観察する教材とする。
- 画面内だけで処理や保存を完結させない。

## 2. 入力データ

| 項目 | 型 | 必須 | 制約 |
|---|---|---|---|
| `document` | string | 必須 | 空文字不可 |
| `query` | string | 必須 | 空文字不可 |
| `metadata.source` | string | 必須 | 出典ファイル名または識別子 |
| `metadata.page` | integer | 必須 | 1以上 |
| `metadata.section` | string | 必須 | 章または節の見出し |
| `metadata.permission` | string | 必須 | `public`、`internal`、`restricted` |
| `metadata.updated_at` | string | 必須 | ISO 8601形式 |
| `metadata_filter` | object | 任意 | source、page、section、permission、updated_afterだけを許可 |
| `learning_note` | object | 任意 | observation、decision、risk_note |

`metadata_filter.updated_after`はISO 8601形式とし、文書の`updated_at`が指定日時より前の場合は検索対象外にする。

## 3. 処理設計

1. 文書、検索語、metadataの必須項目と型を検証する。
2. 文書とmetadataから安定した文書断片番号を生成する。
3. source、page、section、permissionを指定値と完全一致で比較する。
4. updated_afterがある場合はupdated_atと日時比較する。
5. 文書内に検索語が含まれるかを大文字・小文字を区別せず確認する。
6. すべて一致した文書だけを検索結果へ含める。
7. 検索結果へ出典、ページ、章見出しを組み合わせた根拠表示を付ける。
8. 入力、結果、学習メモを最新20件のJSON履歴へ保存する。

metadataへpermissionを保存するだけでは認可にならない。system29では、検索結果を組み立てる前にpermissionフィルタを適用する最小構成を扱う。

## 4. 出力データ

| 項目 | 内容 |
|---|---|
| `chunks` | 文書断片番号、本文、入力metadata |
| `metadata_json` | 入力metadataを保持したJSON |
| `query` | 使用した検索語 |
| `metadata_filter` | 使用したmetadataフィルタ |
| `filter_result.matched` | 検索対象になったか |
| `filter_result.rejected_reasons` | 対象外になった理由 |
| `search_results` | 対象文書、簡易一致度、根拠、metadata |
| `citation_preview` | 出典、ページ、章見出しの表示 |
| `traceability_fields` | 根拠追跡に使う5項目 |
| `learning_note` | 観察結果、設計判断、残る注意点 |
| `saved` | JSONへ保存したか |
| `storage_status` | 保存状態の説明 |

## 5. API設計

### 5.1 GET `/api/system29/metadata`

既定入力、入力例、テーマ名、説明を返す。

### 5.2 POST `/api/system29/execute`

request:

```json
{
  "input": {
    "document": "返品期限は商品到着後7日以内です。",
    "query": "返品期限",
    "metadata": {
      "source": "policy.md",
      "page": 1,
      "section": "返品条件",
      "permission": "internal",
      "updated_at": "2026-08-20T09:00:00+09:00"
    },
    "metadata_filter": {"permission": "internal"}
  }
}
```

成功時は共通実行情報とsystem29の出力データを返す。入力不正時はHTTP 400と日本語の理由を返す。

### 5.3 GET `/api/system29/runs`

保存済みの最新20件を新しい順に返す。

## 6. 保存設計

| 保存先 | 形式 | 内容 |
|---|---|---|
| `data/ai_learning/system29_runs.json` | UTF-8 JSON | run_id、入力、結果、学習メモ、作成日時 |

- 一時ファイルへ書き込んだ後に本ファイルへ置き換える。
- バックエンド起動時に読み込み、最新20件だけを保持する。
- 実行データは公開リポジトリへ登録しない。
- 将来DBへ移す場合も、画面とAPIの応答構造を維持する。

## 7. 画面設計

| 領域 | 表示内容 |
|---|---|
| 入力例 | 一致、公開範囲不一致、更新日時不一致 |
| 実験条件 | APIへ送るJSON |
| 結果概要 | フィルタ判定、検索結果件数、保存状態 |
| 文書断片 | 本文と5種類のmetadata |
| フィルタ | 指定値と対象外理由 |
| 検索結果 | 本文、一致度、根拠、公開範囲、更新日時 |
| 学習メモ | 観察結果、設計判断、残る注意点 |
| 履歴 | 保存済み実行結果の再表示 |

## 8. エラー設計

| 条件 | 処理 |
|---|---|
| documentまたはqueryが空 | 実行を拒否する |
| metadataがobjectでない | 実行を拒否する |
| metadata必須項目が不足 | 不足項目を表示して拒否する |
| pageが1未満または整数でない | 実行を拒否する |
| permissionが未対応 | 許可値を表示して拒否する |
| 日時がISO 8601でない | 対象項目を表示して拒否する |
| 未対応のfilter項目 | 項目名を表示して拒否する |
| JSON保存または読込に失敗 | 保存先を含むRuntimeErrorとする |

## 9. 確認方法

- 一致するpermissionで検索結果と根拠が1件返ることを確認する。
- 不一致のpermissionで検索結果が0件になり、理由が表示されることを確認する。
- updated_afterより古い文書が検索対象外になることを確認する。
- source、page、section、permission、updated_atが文書断片へ保持されることを確認する。
- 実行結果を保存し、バックエンド再起動後も履歴から読み戻せることを確認する。
- 対象テスト、validator、フロントエンドbuild、実API、実画面、UTF-8を確認する。
