# StudyWeb web32-web52 基本設計一覧

作成日: 2026-04-29

## 目的

`web32`〜`web52` の要件定義を、詳細設計と製造・環境構築へ渡せる構成へ整理する。

## 対象テーマ

| No | テーマ | 要件定義 | 基本設計 |
|---|---|---|---|
| web32 | HTTPヘッダー観察 | `../requirements/web32_http_headers_requirements.md` | `web32_basic_design.md` |
| web33 | Cookie / Session 最小サンプル | `../requirements/web33_cookie_session_requirements.md` | `web33_basic_design.md` |
| web34 | CORS成功・失敗サンプル | `../requirements/web34_cors_success_failure_requirements.md` | `web34_basic_design.md` |
| web35 | HTTPステータス設計 | `../requirements/web35_http_status_design_requirements.md` | `web35_basic_design.md` |
| web36 | localStorage注意点 | `../requirements/web36_localstorage_notes_requirements.md` | `web36_basic_design.md` |
| web37 | 業務フォーム完全版 | `../requirements/web37_business_form_complete_requirements.md` | `web37_basic_design.md` |
| web38 | React Router CRUD | `../requirements/web38_react_router_crud_requirements.md` | `web38_basic_design.md` |
| web39 | Error Boundary | `../requirements/web39_error_boundary_requirements.md` | `web39_basic_design.md` |
| web40 | テーブル検索・ページング | `../requirements/web40_table_search_pagination_requirements.md` | `web40_basic_design.md` |
| web41 | APIエラーレスポンス共通化 | `../requirements/web41_api_error_response_common_requirements.md` | `web41_basic_design.md` |
| web42 | pagination / sort / filter API | `../requirements/web42_pagination_sort_filter_api_requirements.md` | `web42_basic_design.md` |
| web43 | idempotency key | `../requirements/web43_idempotency_key_requirements.md` | `web43_basic_design.md` |
| web44 | 注文ステータス遷移 | `../requirements/web44_order_status_transition_requirements.md` | `web44_basic_design.md` |
| web45 | 楽観ロック | `../requirements/web45_optimistic_lock_requirements.md` | `web45_basic_design.md` |
| web46 | CSVアップロード | `../requirements/web46_csv_upload_requirements.md` | `web46_basic_design.md` |
| web47 | PDFアップロード | `../requirements/web47_pdf_upload_requirements.md` | `web47_basic_design.md` |
| web48 | job status API | `../requirements/web48_job_status_api_requirements.md` | `web48_basic_design.md` |
| web49 | retry / timeout | `../requirements/web49_retry_timeout_requirements.md` | `web49_basic_design.md` |
| web50 | N+1問題の再現 | `../requirements/web50_n_plus_one_reproduction_requirements.md` | `web50_basic_design.md` |
| web51 | indexあり/なし検索比較 | `../requirements/web51_index_search_comparison_requirements.md` | `web51_basic_design.md` |
| web52 | Modern web rendering comparison | `../requirements/web52_modern_rendering_comparison_requirements.md` | `web52_basic_design.md` |

## 共通設計方針

- 実装詳細は詳細設計へ送る
- 既存 `web01`〜`web31` は変更しない
- 各テーマは独立して起動・確認できる構成にする
- セキュリティ深掘りは `StudySecurity` に寄せ、`StudyWeb` ではWeb実装と切り分けを中心にする

## 後続工程

2026-05-07 に `category/StudyWeb/doc/detailed_design/` へ `web52` の詳細設計を追加した。
同日に `category/StudyWeb/doc/learning_notes/web52_modern_rendering_comparison/` を作成した。
