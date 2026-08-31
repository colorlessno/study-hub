# 監査ログ項目

## 最小項目

| field | type | 目的 |
| --- | --- | --- |
| `event_id` | string | moderation decision を追跡する |
| `occurred_at` | timestamp | event順序を把握する |
| `source` | string | chat、upload、comment、APIなど |
| `category` | string | moderation category |
| `decision` | string | allow、allow_with_boundary、caution、refuse、escalate |
| `reason_code` | string | 安定したpolicy reason |
| `confidence` | string | low、medium、high |
| `sample_hash` | string | full contentを保存せず証拠参照する |
| `review_required` | boolean | human review flag |

## 保存ルール

decisionを説明・auditするために必要な最小限だけ保存する。full user content は、category、短いsummary、hashで足りるなら保存しない。

## review質問

- 後からdecisionを説明できるか。
- sensitive contentを最小化しているか。
- human reviewを追跡できるか。
