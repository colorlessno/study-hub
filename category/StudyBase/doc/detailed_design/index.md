# StudyBase 詳細設計一覧

作成日: 2026-04-29

## 目的

`StudyBase` の基本設計を、製造・環境構築で作成するファイル、テンプレート項目、サンプル、確認手順へ落とし込む。

## 対象テーマ

| No | テーマ | 基本設計 | 詳細設計 |
|---|---|---|---|
| base01 | 曖昧依頼ヒアリング | `../basic_design/base01_basic_design.md` | `base01_detailed_design.md` |
| base02 | 情報不足時の暫定成果物 | `../basic_design/base02_basic_design.md` | `base02_detailed_design.md` |
| base03 | 見積もり根拠表 | `../basic_design/base03_basic_design.md` | `base03_detailed_design.md` |
| base04 | テスト成立条件チェック | `../basic_design/base04_basic_design.md` | `base04_detailed_design.md` |
| base05 | RACI / 責任分界表 | `../basic_design/base05_basic_design.md` | `base05_detailed_design.md` |
| base06 | Git基本操作 | `../basic_design/base06_basic_design.md` | `base06_detailed_design.md` |
| base07 | branch / merge / conflict | `../basic_design/base07_basic_design.md` | `base07_detailed_design.md` |
| base08 | Issue -> branch -> push -> PR -> merge -> sync | `../basic_design/base08_basic_design.md` | `base08_detailed_design.md` |
| base09 | npm scripts | `../basic_design/base09_basic_design.md` | `base09_detailed_design.md` |
| base10 | curl API確認 | `../basic_design/base10_basic_design.md` | `base10_detailed_design.md` |
| base11 | Portfolio demo presentation | `../basic_design/base11_basic_design.md` | `base11_detailed_design.md` |
| base12 | System anatomy walkthrough | `../basic_design/base12_basic_design.md` | `base12_detailed_design.md`（重複候補。正規ルートは `StudyArchitecture arch01`） |

## 共通方針

- 製造対象ファイルを明確にする
- テンプレートは Markdown 中心にする
- コマンド練習系は PowerShell を主対象にし、必要に応じて Git Bash の読み替えを記載する
- 実行可能なNodeサンプルはDocker実行入口を製造対象に含める
- 実装やファイル作成は製造フェーズで行う
- 詳細設計では、作るものと確認するものを定義する

## 後続工程

2026-05-07 に `base11` と `base12` の詳細設計を追加した。ただし `base12` は `StudyArchitecture arch01` と重複するため、教材実装の開始点にはしない。
同日に `base11` の学習メモを作成した。`base12` は引き続き重複候補のため製造対象外とする。
