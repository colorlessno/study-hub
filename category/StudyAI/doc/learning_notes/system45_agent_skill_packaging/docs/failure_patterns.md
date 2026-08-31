# 失敗pattern

| pattern | 何が起きるか | 対策 |
| --- | --- | --- |
| skill本文が長すぎる | agentが重要な手順を見落とす | `SKILL.md`を短くし、詳細はreferenceへ分ける |
| 入力契約が曖昧 | 出力形式がぶれる | input/output contractを書く |
| referenceが古い | agentが誤った手順を使う | versionや更新日を記録する |
| scriptが強すぎる | workspace外を壊すrisk | path制限とdry-runを入れる |
| 検証がない | 成功したか判断できない | deterministic checkを用意する |

## 確認

skillを追加するときは、上の失敗patternに1つずつ該当しないか確認する。
