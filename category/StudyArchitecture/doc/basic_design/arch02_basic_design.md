# arch02 基本設計
## Evidence-driven design review

## 0. 関連要件

- `../requirements/arch02_evidence_driven_design_review_requirements.md`

## 1. 設計目的

Playwright、curl、DB確認、ログ、health check、trace、screenshot を組み合わせ、設計文書と実行結果の一致・不一致をレビューできる教材にする。

## 2. 対象範囲

- design review checklist
- evidence collection
- Playwright trace
- curl request / response
- DB state verification
- log and request id
- health / readiness
- finding / fix / residual risk

## 3. 成果物構成

```text
category/StudyArchitecture/
  src/apps/arch02_evidence_driven_design_review/
    app/server.js
    app/public/
    docs/review_target_design.md
    e2e/review.spec.js
    test/server.test.js
  doc/learning_notes/arch02_evidence_driven_design_review/
    README.md
    docs/
      review_target.md
      curl_evidence.md
      evidence_checklist.md
      evidence_mapping.md
      findings.md
      residual_risk.md
```

## 4. 入力

| 入力 | 内容 |
|---|---|
| レビュー対象 | arch02専用タスク登録システム、期待仕様、確認範囲 |
| UI証拠 | Playwright trace、screenshot、操作ログ |
| API証拠 | curl request / response、status、header、body |
| DB/log証拠 | DB状態、request id、application log、health |

## 5. 出力

| 出力 | 内容 |
|---|---|
| evidence checklist | UI、API、DB、ログ、health の確認観点 |
| evidence mapping | 設計記述と実行証拠の対応 |
| findings | 不一致、影響、原因仮説、対処候補 |
| residual risk | 未対処、再確認事項、残リスク |
| review record | 未対応、対応済み、リスク受容の状態と残リスクをSQLiteへ保存した記録 |

## 6. 処理方針

1. arch02専用のレビュー対象と確認観点を定義する
2. UI、API応答、SQLiteの保存結果、ログ、health、readinessの証拠を取得する
3. 期待するHTTP 201と実際のHTTP 202を含め、設計文書と実行証拠を対応付ける
4. 不一致をfinding、impact、fix candidateに分ける
5. 対処済み、未対処、残リスクをSQLiteのレビュー記録に残す

## 7. 確認観点

- 設計文書と実行証拠の対応を説明できるか
- Playwright、curl、DB、ログ、healthを組み合わせて確認できるか
- finding、対処、残リスクを分けて記録できるか

## 8. 後続工程への引き継ぎ

詳細設計では、証拠取得コマンド、artifact path、review finding書式、残リスク分類を定義する。
