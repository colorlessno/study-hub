# エスカレーションメモ

## escalation trigger

| trigger | action |
| --- | --- |
| 直近のpersonal safety risk | crisis-safe response と emergency guidance |
| 実在人物へのabuseの可能性 | human review |
| high impactでpolicy categoryが不明確 | human review |
| 繰り返しのboundary testing | rate limit または trust-and-safety review |
| privacy または account access conflict | verified support channel |

## human review packet

含めるもの:

- event ID
- category
- decision
- 短いneutral summary
- confidence
- reason code
- policy上許可される場合のみ、承認済みevidence storeへのlink

## 含めないもの

- 不要なfull sensitive content
- 推測による個人label
- decisionに無関係なprivate data
