# db01 詳細設計

## カタログ接続

db01は文書表示、起動不要として接続します。初期表示は次のREADMEです。

```text
category/StudyDB/doc/learning_notes/db01_db_foundations/README.md
```

## 教材リソース

| 識別子 | 表示名 | 参照先 |
|---|---|---|
| storage-comparison | 保存方式を比較する | `docs/storage_comparison.md` |
| category-matrix | DBの種類を比較する | `docs/db_category_matrix.md` |
| use-case-mapping | 用途ごとの選定例 | `docs/use_case_mapping.md` |
| selection-worksheet | 選定結果を記入する | `docs/storage_selection_worksheet.md` |
| requirements | 要件定義 | `doc/requirements/db01_db_foundations_requirements.md` |
| basic-design | 基本設計 | `doc/basic_design/db01_basic_design.md` |
| detailed-design | 詳細設計 | `doc/detailed_design/db01_detailed_design.md` |

READMEは初期表示されるため、リソースとして重複登録しません。

## チェック項目

チェック設定の版は2とし、次の6項目を別々に記録します。

- DB以外を含む保存方式の比較
- DBの種類ごとの用途の比較
- OLTPとOLAPの比較
- 指定された3用途の選定
- 自分が扱ったシステムの分類
- 採用しない保存先と理由

## 実行状態

`lifecycle`は`none`です。起動定義、終了定義、実行定義を持ちません。画面には起動、停止、状態更新、実行結果、実行ログを表示しません。

## 検証

- db01の名称、初期表示、リソース数をカタログ読込テストで確認する
- 各リソースを読取APIから取得できることを確認する
- READMEと記入ひな形の主要な説明をAPIテストで確認する
- チェック設定が版2、6項目であることを確認する
- StudyDB検証をdb01だけ指定した場合、Dockerを起動せず文書構成を確認する

## エラー時の表示

教材を読み取れない場合はStudyHubの教材読込エラーを表示します。外部サービスへ接続しないため、環境準備や再起動の案内は表示しません。
