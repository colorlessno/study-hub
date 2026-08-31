# StudyDesktop 要件定義一覧

作成日: 2026-05-06

## 目的
`StudyDesktop` は、Webブラウザ内ではなくローカルPC上で動くデスクトップアプリ、ローカル環境構築、OSコマンド実行、ログ表示、安全な権限境界を学ぶ分野である。
## 対象テーマ
| No | テーマ | 要件定義 |
|---|---|---|
| desktop01 | Electron local environment automation | `desktop01_electron_local_environment_automation_requirements.md` |

## 共通方針
- UIから直接危険なOS操作を実行しない。
- main / renderer / IPC の境界を明確にする。
- git clone、Python venv、install、ログ表示はローカル教材として扱う。
- 実秘密情報、実認証情報、破壊的コマンドを教材に含めない。
- 作成・更新するテキストファイルは UTF-8 BOMなしとする。
## 後続工程
2026-05-07 に `category/StudyDesktop/doc/basic_design/` へ `desktop01` の基本設計を作成した。同日に `category/StudyDesktop/doc/detailed_design/` へ `desktop01` の詳細設計を作成した。同日に `category/StudyDesktop/src/apps/desktop01_electron_local_environment_automation/` と学習メモを作成した。
