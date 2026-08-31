# StudySecurity security01-security21 詳細設計索引

## 1. 目的

StudySecurityの`security01`から`security21`について、実装と学習noteへ進める詳細設計を一覧化する。

## 2. 対象

| 番号 | テーマ | 詳細設計 |
|---|---|---|
| security01 | Session認証 | `security01_detailed_design.md` |
| security02 | JWT認証 | `security02_detailed_design.md` |
| security03 | RBAC | `security03_detailed_design.md` |
| security04 | ABAC | `security04_detailed_design.md` |
| security05 | 入力検証 | `security05_detailed_design.md` |
| security06 | SQL Injection対策 | `security06_detailed_design.md` |
| security07 | CSRF対策 | `security07_detailed_design.md` |
| security08 | XSS対策 | `security08_detailed_design.md` |
| security09 | File upload制御 | `security09_detailed_design.md` |
| security10 | 秘密情報管理 | `security10_detailed_design.md` |
| security11 | Webhook署名検証 | `security11_detailed_design.md` |
| security12 | 監査ログ | `security12_detailed_design.md` |
| security13 | レート制限 | `security13_detailed_design.md` |
| security14 | CORS | `security14_detailed_design.md` |
| security15 | Security headers | `security15_detailed_design.md` |
| security16 | 依存関係管理 | `security16_detailed_design.md` |
| security17 | Prompt Injection対策 | `security17_detailed_design.md` |
| security18 | RAG安全対策 | `security18_detailed_design.md` |
| security19 | Data保持・削除 | `security19_detailed_design.md` |
| security20 | PII masking | `security20_detailed_design.md` |
| security21 | AI content moderation | `security21_detailed_design.md` |

## 3. 共通方針

- 実装はlocalの小さなsampleに限定する。
- 実secret、実個人情報、実破壊操作を扱わない。
- 危険例は抽象化し、防御例・制約・productionとの差を併記する。
- Node標準機能または静的HTML/JavaScriptを優先する。
- 各テーマの再開手順と確認観点は`doc/learning_notes/`へ集約する。
