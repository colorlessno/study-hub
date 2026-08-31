# StudyArchitecture 詳細設計一覧

作成日: 2026-05-07

## 目的

設計解剖系の正規ルートである `arch01`〜`arch02` の基本設計を、教材実装・学習メモへ渡せる具体設計へ落とす。

## 対象テーマ

| No | テーマ | 詳細設計 | 関連基本設計 |
|---|---|---|---|
| arch01 | System anatomy walkthrough | `arch01_detailed_design.md` | `../basic_design/arch01_basic_design.md` |
| arch02 | Evidence-driven design review | `arch02_detailed_design.md` | `../basic_design/arch02_basic_design.md` |

## 共通方針

- `StudyArchitecture arch01-arch02` を設計解剖系の正規ルートとする。
- `StudyBase base12` は重複候補である。`StudyDevOps devops10` はリリース判定を扱う別テーマとする。
- 実行証拠、推測、設計判断、残リスクを分けて記録する。
- 実企業秘密、実個人情報、実障害情報を扱わない。
