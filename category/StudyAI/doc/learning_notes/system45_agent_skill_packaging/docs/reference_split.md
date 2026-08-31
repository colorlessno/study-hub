# 参照確認の領域

## 領域方

| 置き場 | 役割 |
| --- | --- |
| `SKILL.md` | agentが最初に読む短い順|
| `references/checklist.md` | 確認順|
| `references/examples.md` | 入出力例|
| `src/scripts/` | 決定的に確認できる補助処理|

## 判断基準
- 毎回読むべき短い順 `SKILL.md`、- 必要な時だけ読む詳細は `references/`、- 人が読むと曖昧な確認の `src/scripts/`。
## 目的
skill本文書短く保ち、agentが必要な情だけを段階的に読む成にする。
