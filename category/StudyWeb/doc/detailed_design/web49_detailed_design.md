# web49 retry / timeout 詳細設計

## 0. 関連文書

- `../requirements/web49_retry_timeout_requirements.md`
- `../basic_design/web49_basic_design.md`

## 1. 製造対象

```text
src/backend/src/studyweb/systems/web49_retry_timeout/
  Dockerfile
  package.json
  api/src/server.js
doc/learning_notes/web49_retry_timeout/
  README.md
  docs/retry_policy.md
  docs/timeout_check.md
```

## 2. Mode

| mode | Status / 時間 | Body・用途 |
|---|---|---|
| `success` | 200即時 | 正常系 |
| `slow` | 2秒後に200 | client timeout確認 |
| `temporary` | 2回503、3回目200 | retry可能な一時失敗 |
| `permanent` | 400即時 | retry対象外の恒久失敗 |
| その他 | 400即時 | `unknown_mode`と許可mode一覧を返す |

## 3. 処理手順

1. URL queryからmodeを取得し、未指定ならsuccessとする。
2. slowは2秒のtimer後にresponseする。
3. temporaryはkeyごとのcounterを1増やす。
4. 同じkeyの1・2回目は503を返す。
5. 同じkeyの3回目は200 recoveredを返し、次回から新しい3回周期を始める。
6. permanentは400・retryable falseを返す。
7. その他は400 `unknown_mode`を返す。

## 4. StudyHubの呼出処理

serverは失敗patternと`Retry-After`を提供し、StudyHubの呼出処理が次を実行する。

- slowは1回の要求を1,000msで打ち切る。
- temporaryは最大3回、100ms間隔で呼び、503だけを再試行する。
- permanentの400は再試行しない。
- 各試行の状態番号、失敗理由、最終結果を`attempts`と実行ログへ残す。

実システムへ応用する場合は、全体の制限時間、待ち時間の増加、jitter、副作用操作の冪等性も設計する。

## 5. 要件との差分・既知の課題

- timeoutはserver設定ではなくclient側で指定する。
- temporary counterは全clientで共有する。
- StudyHubの待ち時間は固定100msで、`Retry-After`を自動採用しない。
- GET `/`以外は404、未知modeは400を返す。
- circuit breakerや分散traceは対象外。

## 6. 確認手順

1. successの即時200を確認する。
2. slowを1秒timeoutで打ち切る。
3. temporaryを3回呼び、503・503・200を確認する。
4. permanentの400・retryable falseを確認する。
5. StudyHubの実行結果に、最大3回の試行履歴と最終結果が残ることを確認する。

## 7. 完了条件

- timeoutを呼出側で制御できる。
- 一時失敗と恒久失敗を区別できる。
- retry上限・backoffを説明できる。
- 副作用操作に冪等性が必要な理由を説明できる。
