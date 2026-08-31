-- ============================================================
-- StudyAI 最小確認用 Seed Data
-- 対象: System 01〜13, 16
-- 用途: R-026 seed整備 / R-005 スモークテスト / R-023 フルパイプライン確認
--
-- 実行方法:
--   docker cp doc/seed_data.sql studyai-db:/tmp/seed_data.sql
--   docker compose exec db psql -U postgres -d studyai -f /tmp/seed_data.sql
--
-- 更新履歴:
--   2026-04-16  初版作成（テーブル名をマイグレーション実装と整合）
-- ============================================================

-- ----------------------------------------------------------------
-- System03 / System13 共通: プロジェクト
-- テーブル: system03_projects はないため System03 は project_id をそのまま利用
-- System13 のみ system13_projects テーブルを持つ
-- ----------------------------------------------------------------

INSERT INTO system13_projects (id, name, overview, status, created_at, updated_at)
VALUES
  ('project_001', 'ECサイトリニューアル',
   '既存ECサイトのフルリニューアル。FastAPI + React + PostgreSQL構成。',
   '進行中', NOW(), NOW()),
  ('project_002', '基幹システム刷新',
   '老朽化した基幹システムをクラウドネイティブに移行するプロジェクト。',
   '計画中', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------
-- System05: 患者データ
-- テーブル: system05_patients
-- 目的: voice → SOAP フルパイプライン確認（R-023）
-- ----------------------------------------------------------------

INSERT INTO system05_patients
  (name, name_kana, phone, birth_date, gender, contraindications, visit_count, created_at, updated_at)
VALUES
  ('山田 太郎', 'やまだ たろう', '090-1234-5678', '1980-05-15', '男性',
   NULL, 3, NOW(), NOW()),
  ('鈴木 花子', 'すずき はなこ', '080-9876-5432', '1975-11-20', '女性',
   '腰椎椎間板ヘルニア既往あり。前屈施術注意。', 1, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------
-- System06: FAQ データ
-- テーブル: system06_faqs
-- ----------------------------------------------------------------

INSERT INTO system06_faqs (question, answer, category, is_active, created_at, updated_at)
VALUES
  ('注文のキャンセルはできますか？',
   '注文後24時間以内であればキャンセル可能です。マイページの注文詳細からキャンセル手続きをお願いします。',
   '注文・購入', true, NOW(), NOW()),
  ('返品・返金の手順を教えてください',
   '商品到着後7日以内であれば返品を承ります。カスタマーサポートまでご連絡ください。',
   '配送・返品', true, NOW(), NOW()),
  ('領収書の発行はできますか？',
   'マイページの注文詳細からPDFでダウンロードできます。',
   '決済・請求', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------
-- System07: タグデータ
-- テーブル: system07_tags
-- ----------------------------------------------------------------

INSERT INTO system07_tags (normalized_name, synonyms, created_at)
VALUES
  ('API設計',    '["API","エンドポイント","REST","OpenAPI"]', NOW()),
  ('DB設計',     '["データベース設計","DDL","スキーマ"]',     NOW()),
  ('テスト',     '["QA","テストケース","テスト計画"]',        NOW()),
  ('インフラ',   '["Docker","Kubernetes","CI/CD"]',           NOW())
ON CONFLICT (normalized_name) DO NOTHING;

-- ----------------------------------------------------------------
-- System12: 商品・シーン・NGルール
-- テーブル: system12_products, system12_scenes, system12_ng_rules
-- ----------------------------------------------------------------

INSERT INTO system12_products
  (name, price, category, tags, is_active, created_at, updated_at)
VALUES
  ('プレミアムチョコレート詰め合わせ', 3500, 'スイーツ・菓子',
   '["高級","贈答用","個包装","常温保存可"]', true, NOW(), NOW()),
  ('季節のフルーツセット', 4800, '食品・グルメ',
   '["新鮮","産地直送","要冷蔵"]', true, NOW(), NOW()),
  ('プレミアムバスタオルセット', 5500, '雑貨・インテリア',
   '["実用的","高品質","今治タオル"]', true, NOW(), NOW()),
  ('国産はちみつギフトBOX', 3200, '食品・グルメ',
   '["純粋蜂蜜","国産","アレルギー対応"]', true, NOW(), NOW()),
  ('カフェインレスコーヒーギフト', 4200, '飲料・酒',
   '["カフェインレス","妊婦OK","デカフェ"]', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO system12_scenes (name, created_at)
VALUES
  ('母の日', NOW()), ('父の日', NOW()),
  ('誕生日', NOW()), ('結婚祝い', NOW()),
  ('出産祝い', NOW()), ('退職祝い', NOW()),
  ('お中元', NOW()), ('お歳暮', NOW())
ON CONFLICT (name) DO NOTHING;

-- scene_id / recipient_id は NULL（全シーン・全受取人に共通して適用される汎用ルール）。
-- Alembic では両カラムとも nullable=True であり、NULL = シーン非依存のグローバルNG条件を意味する。
INSERT INTO system12_ng_rules (scene_id, recipient_id, ng_attribute, reason, created_at)
VALUES
  (NULL, NULL, 'アルコール含む',  '未成年・宗教・健康上の理由で除外', NOW()),
  (NULL, NULL, 'ナッツ類含む',    'ナッツアレルギー対応として除外',   NOW()),
  (NULL, NULL, '生もの・要冷凍',  '送付先の保管条件が不明な場合は除外', NOW())
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------
-- System13: ナレッジデータ（project_001 = ECサイトリニューアル）
-- テーブル: system13_knowledge
-- ----------------------------------------------------------------

INSERT INTO system13_knowledge
  (project_id, category, title, content, importance, is_landmine,
   registered_by, source_type, is_active, created_at, updated_at)
VALUES
  ('project_001', 'リスク・地雷情報', '認証モジュールの既知バグ',
   'JWT有効期限処理に既知バグあり（Issue #234）。修正時は必ずQAチームに事前連絡すること。本番での副作用が過去2回発生している。',
   'high', true, 'admin', 'official', true, NOW(), NOW()),

  ('project_001', 'ルール・制約', '本番デプロイルール',
   '本番デプロイは毎週水曜日22:00〜翌2:00のみ可能。緊急時はSREリーダー田中に連絡。デプロイ前にステージング確認必須。',
   'high', false, 'admin', 'official', true, NOW(), NOW()),

  ('project_001', '設計・アーキテクチャ', 'システム全体構成',
   'FastAPI（Python）+ PostgreSQL（pgvector）+ React+TypeScript。LM Studioでローカル推論（Qwen3-27B）。Dockerで全サービスを管理。',
   'medium', false, 'admin', 'official', true, NOW(), NOW()),

  ('project_001', '関係者情報', 'キーパーソン一覧',
   'QAリーダー：田中（testers-channel）、インフラ：佐藤（infra-channel）、PO：鈴木。意思決定はPO鈴木を通じて行うこと。',
   'medium', false, 'admin', 'official', true, NOW(), NOW()),

  ('project_001', '用語・略語集', 'プロジェクト固有用語',
   'DI=データインポート処理の略。LT=ロードテスト。FT=機能テスト。EC基盤=既存ECプラットフォーム（リニューアル前の旧システム）。',
   'low', false, 'admin', 'informal', true, NOW(), NOW()),

  ('project_002', 'ルール・制約', '移行ルール',
   '旧システムとの並行稼働期間は最低3ヶ月。切り替えは段階的に行う。データ移行は毎週日曜深夜に実施。',
   'high', false, 'admin', 'official', true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- System13: チェックリスト初期データ（user01 / project_001）
INSERT INTO system13_checklist_items
  (project_id, user_id, role, title, category, status, due_days, created_at, updated_at)
VALUES
  ('project_001', 'user01', 'developer', 'システム設計書を読む',           '設計', '未確認', 3, NOW(), NOW()),
  ('project_001', 'user01', 'developer', '開発環境をセットアップする',      '環境', '未確認', 1, NOW(), NOW()),
  ('project_001', 'user01', 'developer', 'キーパーソンに挨拶する',          '人間関係', '未確認', 2, NOW(), NOW()),
  ('project_001', 'user01', 'developer', '認証モジュールの既知バグを確認する', 'リスク', '未確認', 1, NOW(), NOW()),
  ('project_001', 'user01', 'developer', 'デプロイ手順書を確認する',        'ルール', '未確認', 3, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------
-- System16: 過去事例データ
-- テーブル: system16_past_knowledge
-- ----------------------------------------------------------------

INSERT INTO system16_past_knowledge
  (requirement_summary, candidate_profile, result, notes, created_at)
VALUES
  ('Java 5年以上、Spring Boot必須。設計〜結合テスト。バックエンドエンジニア。',
   '経験8年。Java/Spring Boot/AWSで実績あり。マイクロサービス設計3案件。チームリーダー経験あり。',
   'アサイン成功',
   '技術面申し分なし。コミュニケーション力も高評価。即戦力として活躍。',
   NOW()),

  ('Python 3年以上、FastAPI/PostgreSQL。バックエンド中心。',
   '経験4年。Python/Django専門。FastAPIは業務未経験。自己学習中とのこと。',
   '不採用',
   'FastAPI業務経験不足が懸念点。スキルアップ後に再挑戦推奨。',
   NOW()),

  ('React 3年以上、TypeScript必須。フロントエンドエンジニア。',
   '経験5年。React/TypeScript/Next.js実績多数。デザインシステム構築経験あり。',
   'アサイン成功',
   'フロント要件を完全カバー。UI品質への意識が高く現場から好評。',
   NOW())
ON CONFLICT DO NOTHING;

-- ----------------------------------------------------------------
-- 確認クエリ（実行後に件数を確認する場合）
-- ----------------------------------------------------------------
-- SELECT 'system13_projects'   AS tbl, COUNT(*) FROM system13_projects   UNION ALL
-- SELECT 'system05_patients',         COUNT(*) FROM system05_patients    UNION ALL
-- SELECT 'system06_faqs',             COUNT(*) FROM system06_faqs        UNION ALL
-- SELECT 'system07_tags',             COUNT(*) FROM system07_tags         UNION ALL
-- SELECT 'system12_products',         COUNT(*) FROM system12_products     UNION ALL
-- SELECT 'system12_scenes',           COUNT(*) FROM system12_scenes       UNION ALL
-- SELECT 'system12_ng_rules',         COUNT(*) FROM system12_ng_rules     UNION ALL
-- SELECT 'system13_knowledge',        COUNT(*) FROM system13_knowledge    UNION ALL
-- SELECT 'system13_checklist_items',  COUNT(*) FROM system13_checklist_items UNION ALL
-- SELECT 'system16_past_knowledge',   COUNT(*) FROM system16_past_knowledge;
