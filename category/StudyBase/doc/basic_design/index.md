# StudyBase 基本設計一覧

作成日: 2026-04-29

## 目的

`StudyBase` の要件定義を、後続の詳細設計と製造・環境構築へ渡せる構成へ整理する。

## 対象テーマ

| No | テーマ | 要件定義 | 基本設計 |
|---|---|---|---|
| base01 | 曖昧依頼ヒアリング | `../requirements/base01_ambiguous_request_hearing_requirements.md` | `base01_basic_design.md` |
| base02 | 情報不足時の暫定成果物 | `../requirements/base02_incomplete_information_deliverable_requirements.md` | `base02_basic_design.md` |
| base03 | 見積もり根拠表 | `../requirements/base03_estimate_basis_requirements.md` | `base03_basic_design.md` |
| base04 | テスト成立条件チェック | `../requirements/base04_test_precondition_checklist_requirements.md` | `base04_basic_design.md` |
| base05 | RACI / 責任分界表 | `../requirements/base05_raci_responsibility_matrix_requirements.md` | `base05_basic_design.md` |
| base06 | Git基本操作 | `../requirements/base06_git_basic_requirements.md` | `base06_basic_design.md` |
| base07 | branch / merge / conflict | `../requirements/base07_branch_merge_conflict_requirements.md` | `base07_basic_design.md` |
| base08 | Issue -> branch -> push -> PR -> merge -> sync | `../requirements/base08_issue_branch_pr_merge_requirements.md` | `base08_basic_design.md` |
| base09 | npm scripts | `../requirements/base09_npm_scripts_requirements.md` | `base09_basic_design.md` |
| base10 | curl API確認 | `../requirements/base10_curl_api_check_requirements.md` | `base10_basic_design.md` |
| base11 | Portfolio demo presentation | `../requirements/base11_portfolio_demo_presentation_requirements.md` | `base11_basic_design.md` |
| base12 | System anatomy walkthrough | `../requirements/base12_system_anatomy_walkthrough_requirements.md` | `base12_basic_design.md`（重複候補。正規ルートは `StudyArchitecture arch01`） |

## 共通設計方針

- 実装詳細は詳細設計へ送る
- 基本設計では、成果物構成、入力、出力、処理方針、確認観点を定義する
- 各テーマは独立して学習できる粒度にする
- 既存 `StudyAI` / `StudyWeb` / `StudyAWS` / `StudySecurity` の成果物を変更しない
- 指摘事項があれば、同種問題を全テーマへ横展開して確認する

## 後続工程

2026-05-07 に `category/StudyBase/doc/detailed_design/` へ `base11` と `base12` の詳細設計を追加した。ただし `base12` は `StudyArchitecture arch01` と重複するため、教材実装の開始点にはしない。
同日に `base11` の学習メモを作成した。`base12` は引き続き重複候補のため製造対象外とする。
