# StudySecurity security01-security21 要件定義一覧

作成日: 2026-04-29

## 目的

Web / API / AIシステムで必要になる認証認可、攻撃対策、鍵、HTTPS、監査ログ、AI安全性を、`StudySecurity` の独立テーマとして整理する。

## 対象テーマ

| No | テーマ | 要件定義 |
|---|---|---|
| security01 | Session認証 | `security01_session_auth_requirements.md` |
| security02 | JWT認証 | `security02_jwt_auth_requirements.md` |
| security03 | RBAC認可 | `security03_rbac_authorization_requirements.md` |
| security04 | ABAC | `security04_abac_requirements.md` |
| security05 | 入力検証 | `security05_input_validation_requirements.md` |
| security06 | SQL Injection対策 | `security06_sql_injection_requirements.md` |
| security07 | CSRF体験と対策 | `security07_csrf_requirements.md` |
| security08 | XSS対策 | `security08_xss_requirements.md` |
| security09 | ファイルアップロード制御 | `security09_file_upload_requirements.md` |
| security10 | 秘密情報管理 | `security10_secret_management_requirements.md` |
| security11 | Webhook署名検証 | `security11_webhook_signature_requirements.md` |
| security12 | 監査ログ | `security12_audit_log_requirements.md` |
| security13 | レート制限 | `security13_rate_limit_requirements.md` |
| security14 | CORS | `security14_cors_requirements.md` |
| security15 | セキュリティヘッダー | `security15_security_headers_requirements.md` |
| security16 | 依存関係管理 | `security16_dependency_management_requirements.md` |
| security17 | Prompt Injection体験 | `security17_prompt_injection_requirements.md` |
| security18 | RAG安全対策 | `security18_rag_safety_requirements.md` |
| security19 | データ保持・削除 | `security19_data_retention_requirements.md` |
| security20 | PIIマスキング | `security20_pii_masking_requirements.md` |
| security21 | AI content moderation / NSFW classification | `security21_ai_content_moderation_requirements.md` |

## 共通方針

- 攻撃例はローカル学習用途に限定する
- 危険例を作る場合は、必ず対策例とセットにする
- 実秘密情報、実個人情報、実破壊操作は扱わない
- 既存 `StudyWeb` で扱ったWeb基礎とは重複しすぎず、攻撃・防御・運用観点を中心にする

## 後続工程

2026-05-07 に `category/StudySecurity/doc/basic_design/` へ `security21` の基本設計を追加し、`security01`〜`security21` の基本設計インデックスへ更新した。
同日に `category/StudySecurity/doc/detailed_design/` へ `security21` の詳細設計を作成した。
同日に `category/StudySecurity/doc/learning_notes/security21_ai_content_moderation/` を作成した。
