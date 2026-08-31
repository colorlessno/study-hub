# 安全性分類

## category

| category | 意味 | 例になるsignal |
| --- | --- | --- |
| Harassment | 個人や集団への侮辱・攻撃的要求 | target と hostile intent |
| Self-harm | userが自分を傷つけるrisk | crisis または intent signal |
| Violence | physical harm または threat | weapon、injury、threat context |
| Sexual content | sexual material または request | adult context または explicitness marker |
| Illegal activity | 違法行為を助けるrequest | evasion または misuse context |
| Privacy | personal data の露出や抽出 | identifying data |
| Safe | 通常のsupport、creative、educational request | restricted intentなし |

## decision label

| label | 意味 |
| --- | --- |
| `allow` | 通常通り続ける |
| `allow_with_boundary` | 境界を示して安全に答える |
| `caution` | 文脈を限定し、注意を示して答える |
| `refuse` | unsafe requestを断る |
| `escalate` | 人間または緊急processへつなぐ |

## 注意

この分類は学習用である。productionでは、その時点のplatform policyとbusiness policyを使う。
