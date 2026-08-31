# security19 データ保持・削除 基本設計

## 0. 関連要件

- `../requirements/security19_data_retention_requirements.md`

## 1. 設計目的

保持policy、record age、legal holdから削除候補をdry runし、理由と境界値を確認する。

## 2. 成果物構成

```text
src/backend/src/studysecurity/systems/security19_data_retention/
  package.json
  app/retention_policy.js
  app/demo.js
doc/learning_notes/security19_data_retention/
  README.md
  deletion_workflow.md
```

## 3. 保持policy

| type | retention days |
|---|---:|
| order | 365 |
| inquiry | 180 |
| audit | 1095 |

## 4. 処理方針

1. typeとupdatedAtを検証する。
2. 判定日との差を日数へ変換する。
3. 保持日数以上かつlegal holdなしを削除候補にする。
4. delete可否、reason、ageDays、retentionDaysを返す。

## 5. 安全制約

- dry runだけで実dataを削除しない。
- unknown type・不正日付・未来日付は安全側に倒して削除しない。
- 実保持期間の法的妥当性を教材値から判断しない。

## 6. 確認観点

- ちょうど保持日数の境界
- legal holdが通常policyより優先されること
- backup、cache、search index、derived dataの削除差
