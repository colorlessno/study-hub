# StudySecurity security01-security21 基本設計一覧

作成日: 2026-04-29

## 目的

`security01`〜`security21` の要件定義を、詳細設計と製造・環境構築へ渡せる構成へ整理する。

## 対象テーマ

| No | 要件定義 | 基本設計 |
|---|---|---|
| security01 | `../requirements/security01_session_auth_requirements.md` | `security01_basic_design.md` |
| security02 | `../requirements/security02_jwt_auth_requirements.md` | `security02_basic_design.md` |
| security03 | `../requirements/security03_rbac_authorization_requirements.md` | `security03_basic_design.md` |
| security04 | `../requirements/security04_abac_requirements.md` | `security04_basic_design.md` |
| security05 | `../requirements/security05_input_validation_requirements.md` | `security05_basic_design.md` |
| security06 | `../requirements/security06_sql_injection_requirements.md` | `security06_basic_design.md` |
| security07 | `../requirements/security07_csrf_requirements.md` | `security07_basic_design.md` |
| security08 | `../requirements/security08_xss_requirements.md` | `security08_basic_design.md` |
| security09 | `../requirements/security09_file_upload_requirements.md` | `security09_basic_design.md` |
| security10 | `../requirements/security10_secret_management_requirements.md` | `security10_basic_design.md` |
| security11 | `../requirements/security11_webhook_signature_requirements.md` | `security11_basic_design.md` |
| security12 | `../requirements/security12_audit_log_requirements.md` | `security12_basic_design.md` |
| security13 | `../requirements/security13_rate_limit_requirements.md` | `security13_basic_design.md` |
| security14 | `../requirements/security14_cors_requirements.md` | `security14_basic_design.md` |
| security15 | `../requirements/security15_security_headers_requirements.md` | `security15_basic_design.md` |
| security16 | `../requirements/security16_dependency_management_requirements.md` | `security16_basic_design.md` |
| security17 | `../requirements/security17_prompt_injection_requirements.md` | `security17_basic_design.md` |
| security18 | `../requirements/security18_rag_safety_requirements.md` | `security18_basic_design.md` |
| security19 | `../requirements/security19_data_retention_requirements.md` | `security19_basic_design.md` |
| security20 | `../requirements/security20_pii_masking_requirements.md` | `security20_basic_design.md` |
| security21 | `../requirements/security21_ai_content_moderation_requirements.md` | `security21_basic_design.md` |

## 共通設計方針

- 攻撃例はローカル学習用途に限定する
- 危険例と防御例をセットにする
- 実秘密情報、実個人情報、実破壊操作は扱わない
- 実装詳細は詳細設計へ送る

## 後続工程

2026-05-07 に `category/StudySecurity/doc/detailed_design/` へ `security21` の詳細設計を追加した。
同日に `category/StudySecurity/doc/learning_notes/security21_ai_content_moderation/` を作成した。
