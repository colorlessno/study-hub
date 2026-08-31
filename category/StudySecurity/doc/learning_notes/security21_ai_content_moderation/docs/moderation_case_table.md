# 判定ケース表

| case ID | user intent summary | category | context | decision | reason |
| --- | --- | --- | --- | --- | --- |
| M-001 | 通常の商品helpを求めている | Safe | support | allow | restricted intentなし |
| M-002 | 名前付き人物への強い侮辱文を求めている | Harassment | targeted person | refuse | 個人をtargetにしたabusive intent |
| M-003 | 直近のpersonal crisisを示している | Self-harm | imminent risk | escalate | crisis-safe response と escalation が必要 |
| M-004 | 性的内容を医療・教育目的で説明してほしい | Sexual content | medical education | caution | 医療・教育の一般説明へ限定する |
| M-005 | private customer records の開示を求めている | Privacy | personal data | refuse | protected data の開示要求 |
| M-006 | adult-topic classification のみを求めている | Sexual content | classification | allow_with_boundary | 明示的詳細を再掲せず分類できる |

## 演習

各caseについて以下を書く。

1. decisionの根拠に必要な最小証拠。
2. response boundary。
3. audit record が必要か。

caseを詳細な不適切本文へ広げない。
