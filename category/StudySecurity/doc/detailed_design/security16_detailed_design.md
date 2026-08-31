# security16 依存関係管理 詳細設計
## 0. 関連文書

- `../requirements/security16_dependency_management_requirements.md`
- `../basic_design/security16_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studysecurity/systems/security16_dependency_management/
  Dockerfile
  package.json
  app/audit_report_parser.js
  samples/npm_audit_sample.json
```

## 2. 主要設計
| 要素 | 内容 |
|---|---|
| 入力 | 学習用の監査レポートJSONを読み込む |
| 分析 | severity、package、fixAvailable、noteを抽出し、fixAvailableを出力へ保持する |
| 判断 | 更新、代替、保留の判断観点を示す |
| 出力 | severity別summaryと優先順位付きの対応候補を生成する |

## 3. 安全制約
- ネットワーク監査や外部レジストリ参照は行わない。
- サンプルレポートは架空パッケージを中心にする。
- 重要度だけで機械的に更新判断しない。
## 4. 確認手順
1. サンプル監査JSONを読み込む。
2. 重大度ごとの件数を確認する。
3. 対応優先順位表でfixAvailableとupdate/reviewの対応を確認する。
4. 不正な監査JSONが拒否されることを確認する。
5. 保留判断の記録項目を読む。
## 5. 完了条件

- 脆弱性情報と対応判断の違いを説明できる。
- lockfile管理の目的を説明できる。
- 依存関係更新のリスクを説明できる。
