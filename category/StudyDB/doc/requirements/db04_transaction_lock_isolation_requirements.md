# db04 要件定義
## トランザクション・ロック・分離レベル

## 1. 目的

更新を安全に扱うために、トランザクション、commit、rollback、lock、分離レベルを逐次操作で学ぶ。

## 2. 学習対象

- ACID
- BEGIN / COMMIT / ROLLBACK
- 更新ロック
- dirty read、non-repeatable read、phantom read
- 分離レベル
- 更新処理と業務整合性

## 3. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | 注文作成と在庫減算を同一トランザクションで扱う例を作る |
| FR-02 | 途中失敗時に rollback される例を作る |
| FR-03 | 単一セッション内で更新時に取得されるロックを観察する |
| FR-04 | ロック状態を確認した後にrollbackして元の状態へ戻す |
| FR-05 | 分離レベルの違いを表で整理する |

## 4. 非機能要件

- 実データや本番DBを使わず、ローカル教材DBで確認する。
- 危険な削除や破壊操作は教材データに限定する。
- psqlセッションは常に1つだけ開き、すべての操作を一つずつ順番に実行する。
- 作成するテキストファイルは UTF-8 BOMなしとする。

## 5. 対象外

- 分散トランザクション
- 高度なDB内部実装
- 本番障害対応

## 6. 成果物

```text
category/StudyDB/
  doc/requirements/db04_transaction_lock_isolation_requirements.md
  doc/basic_design/db04_basic_design.md
  doc/detailed_design/db04_detailed_design.md
  doc/learning_notes/db04_transaction_lock_isolation/
```

## 7. 受入条件

- commit と rollback の違いを説明できる。
- 更新時に取得されるロックとrollback後の状態を説明できる。
- 業務処理でトランザクション境界を決める理由を説明できる。
