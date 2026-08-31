# StudyArchitecture 要件定義一覧

作成日: 2026-05-06

## 目的

`StudyArchitecture` は、個別技術ではなく、実在または実在相当のシステム構成を観察し、要件・制約・障害モードから構成判断を説明する力を学ぶ分野である。

## 対象テーマ

`StudyArchitecture arch01-arch02` を、設計解剖系の正規ルートとする。`StudyBase base12` は同系統の重複候補である。`StudyDevOps devops10` は、実行証拠からリリース可否を判断する別テーマとして扱う。

| No | テーマ | 要件定義 |
|---|---|---|
| arch01 | System anatomy walkthrough | `arch01_system_anatomy_walkthrough_requirements.md` |
| arch02 | Evidence-driven design review | `arch02_evidence_driven_design_review_requirements.md` |

## 共通方針

- 設計項目の暗記ではなく、構成と判断理由を証拠から説明する。
- Playwright、curl、DB確認、ログ、health check、ADR を横断的に使う。
- 既存 Study の成果物を題材にしてよいが、既存成果物は変更しない。
- 実企業秘密、実個人情報、実障害情報を扱わない。
- 作成・更新するテキストファイルは UTF-8 BOMなしとする。

## 後続工程

2026-05-07 に `category/StudyArchitecture/doc/basic_design/` へ `arch01`〜`arch02` の基本設計を作成した。
同日に `category/StudyArchitecture/doc/detailed_design/` へ `arch01`〜`arch02` の詳細設計を作成した。
同日に `category/StudyArchitecture/doc/learning_notes/` へ `arch01`〜`arch02` のテンプレートと記入例を作成した。
