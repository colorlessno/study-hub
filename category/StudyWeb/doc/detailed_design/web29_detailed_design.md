# web29 詳細設計
## READMEテンプレート

---

## 1. 実装ディレクトリ構成

```text
doc/learning_notes/web29_readme_template/
└── README.md
doc/templates/web29_readme_template/
├── README.template.md
└── README.example.md
```

## 2. モジュール詳細

| ファイル | 役割 | 主な内容 |
|---|---|---|
| `README.template.md` | テンプレート | 見出し、記入欄、実行コマンドのひな形 |
| `README.example.md` | 記入例 | web20を例にした具体的なサンプル値 |
| 学習用`README.md` | 使い方 | StudyHubでの確認手順とREADME作成手順 |

## 3. API 詳細

HTTP API は使用しない。Markdown項目をIFとして定義する。

## 4. 詳細API I/O 定義

| 項目 | 必須 | 内容 |
|---|---|---|
| 概要 | ○ | 何を作ったか |
| 使用技術 | ○ | 技術一覧 |
| 起動方法 | ○ | コマンド |
| 確認方法 | ○ | ブラウザ/API |
| 学習ポイント | ○ | 学んだこと |
| 詰まった点 |  | 問題と解決 |
| 改善案 |  | 次にやること |

## 5. 入力チェック仕様

| 対象 | ルール |
|---|---|
| コマンド | code blockで記載 |
| URL | monospaceで記載 |
| 秘密情報 | 記載しない |

## 6. エラー応答仕様

| error_code | 発生条件 | 対応 |
|---|---|---|
| `missing_required_section` | 必須見出しなし | 追記 |
| `secret_in_readme` | 秘密情報記載 | 削除 |

## 7. バリデーション一覧

| 対象 | 確認 |
|---|---|
| 見出し | Markdown階層 |
| コマンド | fenced code block |
| 例 | テンプレートと対応 |

## 8. データベース詳細

DBは使用しない。

## 9. AI 処理詳細

AI処理は使用しない。

## 10. エラー・監査設計

- READMEレビュー時に秘密情報と起動手順の不足を確認する
- 監査ログは扱わない

## 11. DDL

DBを使用しないため DDL はない。

## 12. 実装メモ

- `README.template.md`を対象テーマの`README.md`へコピーし、対象の実測結果を記入する
- 長くしすぎず、確認に必要な情報を優先する
- ひな形と記入例はStudyHubから読み取り専用で表示し、実際の作成と保存は対象テーマのファイルに対して行う
