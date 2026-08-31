# StudyDesktop 詳細設計一覧

作成日: 2026-05-07

## 目的
`StudyDesktop desktop01` の基本設計を、Electron教材の実装や学習メモ作成へ渡せる具体設計へ落とす。
## 対象テーマ
| No | テーマ | 詳細設計 | 関連基本設計 |
|---|---|---|---|
| desktop01 | Electron local environment automation | `desktop01_detailed_design.md` | `../basic_design/desktop01_basic_design.md` |

## 共通実装方針
- UIから任意コマンドを入力・実行できる設計にしない。
- main processだけがOSコマンド実行を担当し、rendererはIPCで定義済みtask idを送る。
- 作業対象は `category/StudyDesktop/src/apps/desktop01_electron_local_environment_automation/workspace/` 配下に限定する。
- 実秘密情報、実認証情報、個人情報をログに出さない。
- 作成・更新するテキストファイルは UTF-8 BOMなしとする。
