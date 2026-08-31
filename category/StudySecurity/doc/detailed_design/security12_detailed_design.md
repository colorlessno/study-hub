# security12 監査ログ 詳細設計
## 0. 関連文書

- `../requirements/security12_audit_log_requirements.md`
- `../basic_design/security12_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studysecurity/systems/security12_audit_log/
  Dockerfile
  package.json
  app/audit_logger.js
  app/demo.js
```

## 2. 主要設計
| 要素 | 内容 |
|---|---|
| 監査イベント | 認証、認可失敗、重要操作を記録する |
| 項目 | actor, action, target, result, reason, requestIdを含める |
| 出力 | JSON Lines形式で標準出力に出す |
| マスク | 全文字列項目の学習用秘密情報とemailを伏せる |

## 3. 安全制約
- 実個人情報、実秘密情報、サンプル鍵は置かない。
- 監査ログを通常ログの代替にしない。
- 改ざん不可性は設計論点として扱い、実装はローカル出力に限定する。
## 4. 確認手順
1. 成功イベントと失敗イベントを生成する。
2. JSON Linesとして読み取れることを確認する。
3. マスク対象が伏せられることを確認する。
4. requestIdで追跡できることを確認する。
## 5. 完了条件

- 通常ログと監査ログの違いを説明できる。
- 監査ログに残す項目を説明できる。
- マスク対象を確認できる。
