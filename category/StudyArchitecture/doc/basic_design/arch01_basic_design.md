# arch01 基本設計
## System anatomy walkthrough

## 0. 関連要件

- `../requirements/arch01_system_anatomy_walkthrough_requirements.md`

## 1. 設計目的

arch01専用の注文登録システムを、利用者、画面、API、SQLite、ログ、構成、障害時のふるまいに分解し、構成判断を証拠から説明できる教材にする。

## 2. 対象範囲

- context / container / component view
- data flow
- request flow
- state change
- failure mode
- operational boundary
- design decision note

## 3. 成果物構成

```text
category/StudyArchitecture/
  src/apps/arch01_system_anatomy_walkthrough/
    app/server.js
    app/public/
    test/server.test.js
  doc/learning_notes/arch01_system_anatomy_walkthrough/
    README.md
    docs/
      target_system_summary.md
      context_container_component.md
      request_data_flow.md
      failure_mode.md
      decision_notes.md
```

## 4. 入力

| 入力 | 内容 |
|---|---|
| 対象システム | arch01専用の注文登録教材システム |
| 利用者・ユースケース | 主要利用者、代表操作、業務目的 |
| 観察証拠 | 画面、API応答、DB状態、ログ、設定 |
| 制約 | 運用、セキュリティ、性能、復旧の制約 |

## 5. 出力

| 出力 | 内容 |
|---|---|
| system summary | 目的、利用者、主要ユースケース |
| component map | コンポーネント、データストア、外部境界 |
| request/data flow | 代表操作の画面、API、DB、ログの流れ |
| failure mode | 失敗時の挙動、復旧、再試行 |
| decision note | 構成判断と要件・制約の関係 |

## 6. 処理方針

1. arch01専用システムを起動する
2. context、container、componentの粒度で構成を整理する
3. 注文登録を画面、HTTP API、SQLite、ログで追跡する
4. 障害モードと復旧を実行し、失敗時の挙動と復旧境界を整理する
5. ソースと実行結果による証拠と推測を分けてdecision noteへ残す

## 7. 確認観点

- 構成要素とデータの流れを説明できるか
- 構成判断と要件・制約の関係を説明できるか
- 証拠と推測を分けて記録できるか

## 8. 後続工程への引き継ぎ

詳細設計では、対象システムの選定基準、観察項目、図表テンプレート、decision noteの書式を定義する。
