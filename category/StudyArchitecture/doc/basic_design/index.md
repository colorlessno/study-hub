# StudyArchitecture 基本設計一覧

作成日: 2026-05-07

## 目的

設計解剖系の正規ルートとして、システム構成を読む力と、実行証拠に基づく設計レビューを詳細設計へ渡せる構成に整理する。

## 対象テーマ

| No | テーマ | 基本設計 | 関連要件 |
|---|---|---|---|
| arch01 | System anatomy walkthrough | `arch01_basic_design.md` | `../requirements/arch01_system_anatomy_walkthrough_requirements.md` |
| arch02 | Evidence-driven design review | `arch02_basic_design.md` | `../requirements/arch02_evidence_driven_design_review_requirements.md` |

## 共通方針

- `StudyArchitecture arch01-arch02` を設計解剖系の正規ルートとする。
- `StudyBase base12` は重複候補として扱う。`StudyDevOps devops10` はリリース判定を扱う別テーマとする。
- 証拠と推測、findingと対処、残リスクを分けて記録する。
- 作成・更新するテキストファイルは UTF-8 BOMなしとする。

## 後続工程

2026-05-07 に `category/StudyArchitecture/doc/detailed_design/` へ `arch01`〜`arch02` の詳細設計を作成した。
同日に `category/StudyArchitecture/doc/learning_notes/` へテンプレートと記入例を作成した。
