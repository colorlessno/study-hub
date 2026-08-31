# arch02 要件定義
## Evidence-driven design review

## 1. 目的

Playwright、curl、DB確認、ログ、health check、trace、screenshot を組み合わせて、設計文書と実行結果の一致・不一致をレビューする。

## 2. 学習対象

- design review checklist
- evidence collection
- Playwright trace
- curl request / response
- DB state verification
- log and request id
- health / readiness
- finding / fix / residual risk

## 3. 機能要件

| ID | 要件 |
|---|---|
| FR-01 | レビュー対象システムと確認観点を定義する |
| FR-02 | UI、API、DB、ログ、health の証拠を取得する |
| FR-03 | 設計文書の記述と実行証拠を対応付ける |
| FR-04 | 不一致を finding、impact、fix candidate に分ける |
| FR-05 | 対処済み、未対処、残リスクをレビュー記録として残す |
| FR-06 | タスク、要求ログ、レビュー結果をarch02専用SQLiteへ保存し、停止・再起動後も読み出せる |

## 4. 非機能要件

- 証拠に秘密情報や個人情報を含めない。
- 失敗を隠さず、再現条件を記録する。
- 作成するテキストファイルは UTF-8 BOMなしとする。

## 5. 対象外

- 本番障害レビュー
- セキュリティ監査の代替
- 全画面・全APIの網羅テスト

## 6. 成果物

```text
category/StudyArchitecture/
  doc/requirements/arch02_evidence_driven_design_review_requirements.md
  doc/basic_design/arch02_basic_design.md
  doc/detailed_design/arch02_detailed_design.md
  doc/learning_notes/arch02_evidence_driven_design_review/
```

## 7. 受入条件

- 設計文書と実行証拠の対応を説明できる。
- Playwright、curl、DB、ログ、health を組み合わせて確認できる。
- finding、対処、残リスクを分けて記録できる。
- arch02単体で画面、HTTP通信、SQLite、ログ、health / readinessの証拠を取得できる。
