# arch02 詳細設計
## Evidence-driven design review

## 0. 関連文書

- `../requirements/arch02_evidence_driven_design_review_requirements.md`
- `../basic_design/arch02_basic_design.md`

## 1. 製造対象

```text
src/apps/arch02_evidence_driven_design_review/
  app/
    server.js                    レビュー対象API、SQLite、ログ、レビュー保存
    public/                      レビュー操作画面
  docs/review_target_design.md   レビュー対象の期待仕様
  e2e/review.spec.js             Playwright証拠取得
  test/server.test.js            API・DB・レビュー保存の単体テスト
doc/learning_notes/arch02_evidence_driven_design_review/
  README.md
  docs/
    review_target.md
    curl_evidence.md
    evidence_checklist.md
    evidence_mapping.md
    findings.md
    residual_risk.md
    review_result_template.md
```

## 2. review target 設計

| 項目 | 内容 |
|---|---|
| target system | レビュー対象 |
| design docs | 要件定義、基本設計、詳細設計など |
| review scope | UI、API、DB、logs、healthのうち対象にする範囲 |
| out of scope | 今回確認しない画面、API、非機能 |
| preconditions | 起動状態、seed data、必要コマンド |

レビュー対象は他テーマへ依存しない`arch02_evidence_driven_design_review`とする。期待仕様はタスク登録時のHTTP 201、教材実装はHTTP 202とし、この差を実行証拠から発見する。

## 3. 実行環境

| 項目 | 内容 |
|---|---|
| 起動入口 | `node app/server.js` |
| 画面 | `http://127.0.0.1:43702/` |
| 保存先 | arch02専用SQLiteファイル |
| API | `/api/tasks`、`/api/logs`、`/api/reviews` |
| 状態確認 | `/health`、`/ready` |
| UI証拠 | Playwright screenshot・trace |
| 他テーマとの依存 | なし |

## 4. evidence checklist 設計

| area | evidence | command / source | artifact |
|---|---|---|---|
| UI | 画面操作、表示結果 | Playwright | screenshot、trace |
| API | status、header、body | curl | response log |
| DB | table、row、state change | 画面のSQLite一覧、API一覧 | task / review row |
| logs | Trace ID、method、path、status | `GET /api/logs`、StudyHub実行ログ | log excerpt |
| health | liveness、readiness | `curl.exe`または画面 | health / ready応答 |

## 5. evidence mapping 設計

| design statement | expected evidence | actual evidence | result |
|---|---|---|---|
| 設計書の記述 | 期待する確認結果 | 実際の証拠 | match / mismatch / unknown |

`unknown` は証拠不足を表す。推測でmatch扱いにしない。

## 6. finding 設計

| field | 内容 |
|---|---|
| id | `F-001` 形式 |
| severity | high、medium、low |
| summary | 指摘の要約 |
| evidence | 証拠ファイルまたはコマンド結果 |
| impact | 影響 |
| fix candidate | 対処候補 |
| status | 未対応、対応済み、リスク受容 |

## 7. residual risk 設計

| risk | reason | next action |
|---|---|---|
| 未確認領域 | 時間や環境制約で証拠未取得 | 後続レビューで確認 |
| flaky evidence | 実行結果が安定しない | 再現条件を追加 |
| partial fix | 一部だけ対処済み | 残作業をissue化 |

## 8. 確認手順

1. arch02を起動し、review targetとscopeを確認する
2. 画面からタスク登録APIを実行する
3. HTTP 202、SQLiteの保存結果、Trace ID、health、readyを取得する
4. Playwrightで画面操作、screenshot、traceの証拠を取得する
5. 期待するHTTP 201と実際のHTTP 202をmappingする
6. mismatchをfinding、impact、fix candidateに分ける
7. 対応状態と残リスクをSQLiteへ保存する

## 9. 完了条件

- 設計文書と実行証拠を対応付けられる
- Playwright、curl、DB、logs、healthを組み合わせて確認できる
- finding、fix、residual riskを分けて記録できる
- 保存したタスク、ログ、レビュー結果を停止・再起動後も読み出せる

## 10. 安全性

- 証拠に秘密情報や個人情報を含めない
- 本番システムや実障害レビューを対象にしない
- 失敗を隠さず、再現条件と残リスクを記録する
