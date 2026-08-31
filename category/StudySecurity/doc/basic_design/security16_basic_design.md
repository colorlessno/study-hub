# security16 依存関係管理 基本設計

## 0. 関連要件

- `../requirements/security16_dependency_management_requirements.md`

## 1. 設計目的

監査reportをそのまま更新命令にせず、対応候補と判断材料へ変換する流れを確認する。

## 2. 成果物構成

```text
src/backend/src/studysecurity/systems/security16_dependency_management/
  package.json
  app/audit_report_parser.js
  samples/npm_audit_sample.json
doc/learning_notes/security16_dependency_management/
  README.md
  remediation_policy.md
```

## 3. 入出力

| 種別 | 内容 |
|---|---|
| 入力 | 架空packageの`vulnerabilities`配列 |
| summary | severity別件数 |
| actions | package、severity、fixAvailable、update/review、note |
| 並び順 | criticalからinfo、unknownの順 |

## 4. 処理方針

1. report rootと`vulnerabilities`配列を検証する。
2. packageとfixAvailableを検証し、必要項目を対応候補へ正規化する。
3. severity順に並べ、件数を集計する。
4. fix有無から`update`または`review`を提示する。

## 5. 安全制約

- 外部registryや実projectへ接続しない。
- parser出力だけで自動更新を行わない。
- sample packageを実在packageのadvisoryとして扱わない。

## 6. 確認観点

- severityと到達可能性・互換性影響を分けて判断できること
- direct dependencyとtransitive dependencyで更新経路が異なること
- 更新・代替・保留の各判断にownerと期限が必要なこと
