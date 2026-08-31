# security12 監査ログ 基本設計

## 0. 関連要件

- `../requirements/security12_audit_log_requirements.md`

## 1. 設計目的

重要操作の判断経路を構造化eventとして残し、追跡可能性とdata最小化を両立する。

## 2. 成果物構成

```text
src/backend/src/studysecurity/systems/security12_audit_log/
  package.json
  app/audit_logger.js
  app/demo.js
doc/learning_notes/security12_audit_log/
  README.md
  audit_events.md
```

## 3. event schema

| 項目 | 内容 |
|---|---|
| `at` | UTC timestamp |
| `actor` | 操作者の識別子 |
| `action` | 実行した操作 |
| `target` | 操作対象 |
| `result` | successまたはdenied等 |
| `reason` | 判断理由 |
| `requestId` | request横断の追跡ID |

## 4. 処理方針

1. eventを固定schemaへ写す。
2. 全文字列項目のemailと学習用secretをmaskする。
3. 1 eventを1行のJSONとして出力する。
4. successだけでなくdeniedも記録する。

## 5. 安全制約

- 実PII・実secretを入力しない。
- local標準出力は改ざん耐性storageではない。
- reasonへrequest body全体を保存しない。

## 6. 確認観点

- requestIdで関連eventを追えること
- 調査に必要な項目と保存してはいけない値を区別できること
- 通常のapplication logとの目的の違い
