# StudyBase 要件定義一覧

作成日: 2026-04-29

## 目的

`StudyBase` は、各 `StudyXX` の前提になる共通基礎を扱う。
対象は、要求分析、防御的ドキュメント、Git、CLI、npm、curl である。

この分野では、AI に生成させた成果物をそのまま受け取るのではなく、前提、未確定事項、差分、実行結果、確認事項を自分で追える状態を作る。

## 対象テーマ

| No | テーマ | 要件定義 |
|---|---|---|
| base01 | 曖昧依頼ヒアリング | `base01_ambiguous_request_hearing_requirements.md` |
| base02 | 情報不足時の暫定成果物 | `base02_incomplete_information_deliverable_requirements.md` |
| base03 | 見積もり根拠表 | `base03_estimate_basis_requirements.md` |
| base04 | テスト成立条件チェック | `base04_test_precondition_checklist_requirements.md` |
| base05 | RACI / 責任分界表 | `base05_raci_responsibility_matrix_requirements.md` |
| base06 | Git基本操作 | `base06_git_basic_requirements.md` |
| base07 | branch / merge / conflict | `base07_branch_merge_conflict_requirements.md` |
| base08 | Issue -> branch -> push -> PR -> merge -> sync | `base08_issue_branch_pr_merge_requirements.md` |
| base09 | npm scripts | `base09_npm_scripts_requirements.md` |
| base10 | curl API確認 | `base10_curl_api_check_requirements.md` |
| base11 | Portfolio demo presentation | `base11_portfolio_demo_presentation_requirements.md` |
| base12 | System anatomy walkthrough | `base12_system_anatomy_walkthrough_requirements.md`（重複候補。正規ルートは `StudyArchitecture arch01`） |

## 共通成果物

各テーマは、後続工程で次の成果物へ展開する。

```text
要件定義
基本設計
詳細設計
製造・環境構築
実行確認
学習メモ
実装と設計の整合性レビュー
```

## 共通完了条件

- 既存 `StudyAI` / `StudyWeb` / `StudyAWS` / `StudySecurity` の既存番号を変更しない
- 各テーマの目的、対象範囲、対象外、成果物、受入条件が明記されている
- 後続の基本設計に進める粒度で要件が整理されている
- 学習者が「何を作り、何を確認し、何を学ぶか」を説明できる

## 共通レビュー運用

各工程の区切りでは、必ず自己レビューを行う。
指摘事項が出た場合は、該当箇所だけでなく、同種の問題が他テーマにもないか横展開して確認する。

記録する内容:

- レビュー対象
- 確認観点
- 指摘事項
- 横展開確認範囲
- 対処内容
- 残課題

## 後続工程の配置

後続工程では、次の配置を使う。
2026-05-07 に、追加要件 `base11` と `base12` の基本設計を作成した。`base12` は `StudyArchitecture arch01` と重複するため、詳細設計の開始点にはしない。

```text
category/StudyBase/
  doc/
    requirements/
    basic_design/
    detailed_design/
    learning_notes/
    reviews/
```
