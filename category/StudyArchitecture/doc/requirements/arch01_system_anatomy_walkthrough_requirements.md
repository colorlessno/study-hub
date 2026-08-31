# arch01 要件定義
## System anatomy walkthrough

## 1. 目的

arch01専用の注文登録システムを、利用者、画面、API、SQLite、ログ、構成、障害時のふるまいに分解し、なぜその構成が必要かを実行証拠から説明する力を学ぶ。

## 2. 学習対象

- context / container / component view
- data flow
- request flow
- state change
- failure mode
- operational boundary
- design decision note

## 3. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | 対象システムの目的、利用者、主要ユースケースを整理する |
| FR-02 | ブラウザ、Node.jsサーバー、SQLite、システム境界を図または表にする |
| FR-03 | 代表操作の画面、API、DB、ログの流れを追う |
| FR-04 | 障害モードを実行し、`/health`、`/ready`、注文登録の挙動と復旧を整理する |
| FR-05 | 構成判断をADR形式またはdecision note形式で記録する |
| FR-06 | 注文と要求ログをarch01専用SQLiteへ保存し、停止・再起動後も読み出せる |

## 4. 非機能要件

- 実行証拠と設計説明を分けて記録する。
- 実企業秘密、実個人情報、実障害情報を含めない。
- 作成するテキストファイルは UTF-8 BOMなしとする。

## 5. 対象外

- バックグラウンドジョブ、外部サービス、他テーマとの連携
- 本番用途の注文管理機能
- 書籍内容の転載
- 本番環境の調査

## 6. 成果物

```text
category/StudyArchitecture/
  doc/requirements/arch01_system_anatomy_walkthrough_requirements.md
  doc/basic_design/arch01_basic_design.md
  doc/detailed_design/arch01_detailed_design.md
  doc/learning_notes/arch01_system_anatomy_walkthrough/
```

## 7. 受入条件

- システムの構成要素とデータの流れを説明できる。
- 構成判断と要件・制約の関係を説明できる。
- 証拠と推測を分けて記録できる。
- 画面、HTTP API、SQLite、Trace ID付きログ、障害復旧をarch01だけで確認できる。
