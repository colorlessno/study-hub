# StudyDesktop 基本設計一覧

作成日: 2026-05-07

## 目的
ローカルPC上で動くデスクトップアプリと環境自動化の学習テーマを、詳細設計へ渡せる構成に整理する。
## 対象テーマ
| No | テーマ | 基本設計 | 関連要件 |
|---|---|---|---|
| desktop01 | Electron local environment automation | `desktop01_basic_design.md` | `../requirements/desktop01_electron_local_environment_automation_requirements.md` |

## 共通方針
- UIから任意コマンドを直接入力・実行できる形にしない。
- 作業ディレクトリは教材用に限定する。
- 実ユーザー環境や秘密情報、個人情報を壊したり漏らしたりしない。
- 作成・更新するテキストファイルは UTF-8 BOMなしとする。
## 後続工程
2026-05-07 に `category/StudyDesktop/doc/detailed_design/` へ `desktop01` の詳細設計を作成した。同日に `category/StudyDesktop/src/apps/desktop01_electron_local_environment_automation/` と学習メモを作成した。
