# db06 要件定義
## バックアップ・リストア・マイグレーション安全性

## 1. 目的

DBは作るだけでなく、壊れたときに戻せること、変更時にデータを壊さないことが重要である。バックアップ、リストア、migration、seed、rollback計画を学ぶ。

## 2. 学習対象

- dump / restore
- seed data
- migration
- schema変更の危険
- rollback plan
- バックアップ確認

## 3. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | 小さいDBをdumpし、別DBへrestoreする手順を用意する |
| FR-02 | migrationでカラム追加・制約追加を行う例を作る |
| FR-03 | 破壊的変更の危険と事前確認項目を整理する |
| FR-04 | restoreできることを確認する検証記録を作る |
| FR-05 | `StudyAWS aws10` のバックアップ / リストア学習との関係を明記する |

## 4. 非機能要件

- バックアップ対象は教材データに限定する。
- 実顧客情報や秘密情報をdumpに含めない。
- 作成するテキストファイルは UTF-8 BOMなしとする。

## 5. 対象外

- 本番DBのDR設計
- クラウドバックアップ設定
- 高可用クラスタ設計

## 6. 成果物

```text
category/StudyDB/
  doc/requirements/db06_backup_restore_migration_requirements.md
  doc/basic_design/db06_basic_design.md
  doc/detailed_design/db06_detailed_design.md
  doc/learning_notes/db06_backup_restore_migration/
```

## 7. 受入条件

- backup と restore の確認手順を説明できる。
- migration前に確認すべき項目を説明できる。
- schema変更とデータ保全を分けて考えられる。
