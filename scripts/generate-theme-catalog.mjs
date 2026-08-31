import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const repositoryRoot = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(repositoryRoot, 'THEME_CATALOG.md');
const outputPath = path.join(repositoryRoot, 'catalog', 'themes.json');
const checkOnly = process.argv.includes('--check');
const studyWebRoot = path.join(repositoryRoot, 'category', 'StudyWeb');
const studySecurityRoot = path.join(repositoryRoot, 'category', 'StudySecurity');
const studyDevOpsRoot = path.join(repositoryRoot, 'category', 'StudyDevOps');
const studyAwsRoot = path.join(repositoryRoot, 'category', 'StudyAWS');
const studyBaseRoot = path.join(repositoryRoot, 'category', 'StudyBase');
const studyArchitectureRoot = path.join(repositoryRoot, 'category', 'StudyArchitecture');
const ignoredDirectories = new Set(['.git', '.next', 'node_modules', 'dist', 'build', 'coverage']);

const fieldIds = {
  system: 'study-ai',
  web: 'study-web',
  security: 'study-security',
  devops: 'study-devops',
  aws: 'study-aws',
  base: 'study-base',
  db: 'study-db',
  arch: 'study-architecture',
  desktop: 'study-desktop'
};

const relatedFieldIds = {
  web51: ['study-db'],
  base12: ['study-architecture']
};

const themeAliases = {
  base12: 'arch01'
};

const materialOpenModes = {
  base08: 'new-window'
};

const themeResources = {
  security07: [
    { id: 'server-source', label: 'CSRF対策の実装', kind: 'source', format: 'source', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security07_csrf/app/server.js' },
    { id: 'page-source', label: 'CSRF攻撃と対策の確認画面', kind: 'source', format: 'source', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security07_csrf/public/index.html' },
    { id: 'csrf-flow', label: 'CookieとCSRF tokenの流れ', kind: 'material', format: 'markdown', path: 'category/StudySecurity/doc/learning_notes/security07_csrf/csrf_flow.md' }
  ],
  security08: [
    { id: 'page-source', label: 'XSS確認画面のHTML', kind: 'source', format: 'source', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security08_xss/public/index.html' },
    { id: 'browser-source', label: '安全な文字表示のJavaScript', kind: 'source', format: 'source', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security08_xss/public/app.js' },
    { id: 'server-source', label: '教材を配信するサーバー', kind: 'source', format: 'source', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security08_xss/app/server.js' },
    { id: 'escaping-rules', label: '出力先ごとの安全な処理', kind: 'material', format: 'markdown', path: 'category/StudySecurity/doc/learning_notes/security08_xss/escaping_rules.md' }
  ],
  security09: [
    { id: 'page-source', label: '入力画面のHTML', kind: 'source', format: 'source', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security09_file_upload/public/index.html' },
    { id: 'validation-source', label: '拡張子とサイズの検証処理', kind: 'source', format: 'source', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security09_file_upload/public/app.js' },
    { id: 'server-source', label: '教材を配信するサーバー', kind: 'source', format: 'source', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security09_file_upload/app/server.js' },
    { id: 'upload-policy', label: 'アップロード防御方針', kind: 'material', format: 'markdown', path: 'category/StudySecurity/doc/learning_notes/security09_file_upload/upload_policy.md' }
  ],
  security10: [
    { id: 'config-source', label: '必須環境変数の検証処理', kind: 'source', format: 'source', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security10_secret_management/app/config.js' },
    { id: 'env-example', label: '環境変数の記入例', kind: 'source', format: 'source', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security10_secret_management/.env.example' },
    { id: 'secret-rotation', label: '秘密情報のローテーション手順', kind: 'material', format: 'markdown', path: 'category/StudySecurity/doc/learning_notes/security10_secret_management/secret_rotation.md' }
  ],
  security11: [
    { id: 'server-source', label: 'Webhook受信サーバー', kind: 'source', format: 'source', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security11_webhook_signature/app/server.js' },
    { id: 'signature-source', label: 'HMAC署名の生成・比較処理', kind: 'source', format: 'source', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security11_webhook_signature/app/signature.js' },
    { id: 'validation-source', label: '期限と重複IDの検証処理', kind: 'source', format: 'source', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security11_webhook_signature/app/webhook.js' },
    { id: 'boundary-tests', label: '署名検証の境界値テスト', kind: 'source', format: 'source', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security11_webhook_signature/test/webhook.test.js' },
    { id: 'replay-protection', label: '再送防止の考え方', kind: 'material', format: 'markdown', path: 'category/StudySecurity/doc/learning_notes/security11_webhook_signature/replay_protection.md' }
  ],
  security12: [
    { id: 'audit-source', label: '監査ログの生成とマスク処理', kind: 'source', format: 'source', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security12_audit_log/app/audit_logger.js' },
    { id: 'demo-source', label: '成功・拒否ログの実行例', kind: 'source', format: 'source', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security12_audit_log/app/demo.js' },
    { id: 'audit-events', label: '監査イベントの記録項目', kind: 'material', format: 'markdown', path: 'category/StudySecurity/doc/learning_notes/security12_audit_log/audit_events.md' }
  ],
  security13: [
    { id: 'server-source', label: '要求受付と429応答', kind: 'source', format: 'source', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security13_rate_limit/app/server.js' },
    { id: 'limiter-source', label: '回数と時間窓の判定処理', kind: 'source', format: 'source', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security13_rate_limit/app/rate_limiter.js' },
    { id: 'limit-policy', label: 'レート制限の設計上の注意', kind: 'material', format: 'markdown', path: 'category/StudySecurity/doc/learning_notes/security13_rate_limit/limit_policy.md' }
  ],
  security14: [
    { id: 'server-source', label: '接続元と事前確認の判定処理', kind: 'source', format: 'source', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security14_cors/app/server.js' },
    { id: 'cors-matrix', label: 'CORSの許可・拒否対応表', kind: 'material', format: 'markdown', path: 'category/StudySecurity/doc/learning_notes/security14_cors/cors_matrix.md' }
  ],
  security15: [
    { id: 'server-source', label: '防御ヘッダーの設定処理', kind: 'source', format: 'source', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security15_security_headers/app/server.js' },
    { id: 'header-policy', label: '各ヘッダーの役割と適用方針', kind: 'material', format: 'markdown', path: 'category/StudySecurity/doc/learning_notes/security15_security_headers/header_policy.md' }
  ],
  security16: [
    { id: 'parser-source', label: '監査結果の集計と並べ替え', kind: 'source', format: 'source', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security16_dependency_management/app/audit_report_parser.js' },
    { id: 'sample-report', label: '監査結果の例', kind: 'source', format: 'text', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security16_dependency_management/samples/npm_audit_sample.json' },
    { id: 'remediation-policy', label: '更新・調査・保留の判断基準', kind: 'material', format: 'markdown', path: 'category/StudySecurity/doc/learning_notes/security16_dependency_management/remediation_policy.md' }
  ],
  security17: [
    { id: 'judge-source', label: '入力境界・判定・出力検証の処理', kind: 'source', format: 'source', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security17_prompt_injection/public/app.js' },
    { id: 'prompt-cases', label: '判定に使う入力例', kind: 'source', format: 'text', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security17_prompt_injection/samples/prompts.json' },
    { id: 'guardrail-policy', label: '入力境界と出力検証の方針', kind: 'material', format: 'markdown', path: 'category/StudySecurity/doc/learning_notes/security17_prompt_injection/guardrail_policy.md' }
  ],
  security18: [
    { id: 'search-source', label: '信頼区分ごとの検索処理', kind: 'source', format: 'source', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security18_rag_safety/public/app.js' },
    { id: 'document-cases', label: '検索に使う文書例', kind: 'source', format: 'text', path: 'category/StudySecurity/src/backend/src/studysecurity/systems/security18_rag_safety/samples/documents.json' },
    { id: 'trust-boundary', label: '検索文書の信頼境界', kind: 'material', format: 'markdown', path: 'category/StudySecurity/doc/learning_notes/security18_rag_safety/rag_trust_boundary.md' }
  ],
  system45: [
    { id: 'skill-definition', label: '技能定義', kind: 'source', format: 'markdown', path: 'category/StudyAI/src/apps/system45_agent_skill_packaging/sample_skill/SKILL.md' },
    { id: 'input-validator', label: '入力検証の処理', kind: 'source', format: 'source', path: 'category/StudyAI/src/apps/system45_agent_skill_packaging/sample_skill/scripts/validate_input.js' },
    { id: 'valid-input', label: '正常な入力例', kind: 'material', format: 'markdown', path: 'category/StudyAI/src/apps/system45_agent_skill_packaging/sample_skill/references/examples.md' },
    { id: 'input-checklist', label: '入力確認表', kind: 'material', format: 'markdown', path: 'category/StudyAI/src/apps/system45_agent_skill_packaging/sample_skill/references/checklist.md' }
  ],
  system46: [
    { id: 'success-fixture', label: '正常な作業入力', kind: 'material', format: 'text', path: 'category/StudyAI/src/apps/system46_ai_harness_engineering/fixtures/task_success.json' },
    { id: 'missing-input-fixture', label: '入力不足の作業入力', kind: 'material', format: 'text', path: 'category/StudyAI/src/apps/system46_ai_harness_engineering/fixtures/task_missing_input.json' },
    { id: 'forbidden-operation-fixture', label: '禁止操作を含む作業入力', kind: 'material', format: 'text', path: 'category/StudyAI/src/apps/system46_ai_harness_engineering/fixtures/task_forbidden_operation.json' },
    { id: 'fixture-check', label: '入力構造の検証処理', kind: 'source', format: 'source', path: 'category/StudyAI/src/apps/system46_ai_harness_engineering/checks/check_task_fixture.js' },
    { id: 'forbidden-check', label: '禁止操作の検証処理', kind: 'source', format: 'source', path: 'category/StudyAI/src/apps/system46_ai_harness_engineering/checks/check_no_forbidden_ops.js' },
    { id: 'output-check', label: '出力形式の検証処理', kind: 'source', format: 'source', path: 'category/StudyAI/src/apps/system46_ai_harness_engineering/checks/check_output_schema.js' },
    { id: 'output-sample', label: '期待する出力例', kind: 'material', format: 'markdown', path: 'category/StudyAI/src/apps/system46_ai_harness_engineering/samples/expected_output.md' }
  ],
  aws09: [
    { id: 'server-source', label: 'API本体', kind: 'source', format: 'source', path: 'category/StudyAWS/src/backend/src/studyaws/systems/aws09_simple_deploy/app/server.js' },
    { id: 'dockerfile', label: '本番相当起動のDockerfile', kind: 'source', format: 'text', path: 'category/StudyAWS/src/backend/src/studyaws/systems/aws09_simple_deploy/Dockerfile' },
    { id: 'env-example', label: '環境変数の設定例', kind: 'source', format: 'source', path: 'category/StudyAWS/src/backend/src/studyaws/systems/aws09_simple_deploy/.env.example' },
    { id: 'deploy-checklist', label: 'デプロイ前後の確認項目', kind: 'material', format: 'markdown', path: 'category/StudyAWS/doc/learning_notes/aws09_simple_deploy/docs/deploy_checklist.md' },
    { id: 'service-comparison', label: '公開先サービスの比較', kind: 'material', format: 'markdown', path: 'category/StudyAWS/doc/learning_notes/aws09_simple_deploy/docs/cloud_service_comparison.md' }
  ],
  aws10: [
    { id: 'recovery-drill', label: '復旧確認処理', kind: 'source', format: 'source', path: 'category/StudyAWS/src/backend/src/studyaws/systems/aws10_backup_restore/scripts/recovery_drill.js' },
    { id: 'backup-source', label: 'バックアップ処理', kind: 'source', format: 'source', path: 'category/StudyAWS/src/backend/src/studyaws/systems/aws10_backup_restore/scripts/backup.js' },
    { id: 'restore-source', label: '復元処理', kind: 'source', format: 'source', path: 'category/StudyAWS/src/backend/src/studyaws/systems/aws10_backup_restore/scripts/restore.js' },
    { id: 'sample-data', label: '復元対象のダミーデータ', kind: 'material', format: 'text', path: 'category/StudyAWS/src/backend/src/studyaws/systems/aws10_backup_restore/data/sample.json' },
    { id: 'recovery-checklist', label: '復元時の確認項目', kind: 'material', format: 'markdown', path: 'category/StudyAWS/doc/learning_notes/aws10_backup_restore/docs/recovery_checklist.md' },
    { id: 'rpo-rto-notes', label: 'RPOとRTO', kind: 'material', format: 'markdown', path: 'category/StudyAWS/doc/learning_notes/aws10_backup_restore/docs/rpo_rto_notes.md' }
  ],
  base01: [
    {
      id: 'ambiguous-request',
      label: '曖昧依頼サンプル',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyBase/src/samples/base01_ambiguous_request_hearing/ambiguous_request_case.md'
    },
    {
      id: 'completed-note',
      label: 'ヒアリング記入例',
      kind: 'artifact',
      format: 'markdown',
      path: 'category/StudyBase/src/samples/base01_ambiguous_request_hearing/completed_hearing_note.md'
    },
    {
      id: 'hearing-template',
      label: 'ヒアリングメモひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/templates/base01_ambiguous_request_hearing/request_hearing_note.md'
    },
    {
      id: 'summary-template',
      label: '要件定義入力メモひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/templates/base01_ambiguous_request_hearing/requirement_input_summary.md'
    },
    {
      id: 'html-source',
      label: 'HTML',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base01_ambiguous_request_hearing/app/index.html'
    },
    {
      id: 'javascript-source',
      label: '画面制御',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base01_ambiguous_request_hearing/app/src/main.js'
    },
    {
      id: 'note-source',
      label: 'メモ変換',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base01_ambiguous_request_hearing/app/src/hearing-note.js'
    },
    {
      id: 'css-source',
      label: 'CSS',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base01_ambiguous_request_hearing/app/src/style.css'
    },
    {
      id: 'requirements',
      label: '要件定義',
      kind: 'requirements',
      format: 'markdown',
      path: 'category/StudyBase/doc/requirements/base01_ambiguous_request_hearing_requirements.md'
    },
    {
      id: 'basic-design',
      label: '基本設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/basic_design/base01_basic_design.md'
    },
    {
      id: 'detailed-design',
      label: '詳細設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/detailed_design/base01_detailed_design.md'
    }
  ],
  base02: [
    {
      id: 'incomplete-case',
      label: '情報不足ケース',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyBase/src/samples/base02_incomplete_information_deliverable/incomplete_case.md'
    },
    {
      id: 'completed-deliverable',
      label: '暫定成果物記入例',
      kind: 'artifact',
      format: 'markdown',
      path: 'category/StudyBase/src/samples/base02_incomplete_information_deliverable/completed_provisional_deliverable.md'
    },
    {
      id: 'deliverable-template',
      label: '暫定成果物ひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/templates/base02_incomplete_information_deliverable/provisional_deliverable.md'
    },
    {
      id: 'assumption-template',
      label: '前提・仮定一覧ひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/templates/base02_incomplete_information_deliverable/assumption_list.md'
    },
    {
      id: 'unknown-template',
      label: '未確定事項一覧ひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/templates/base02_incomplete_information_deliverable/unknown_issues_list.md'
    },
    {
      id: 'limitation-template',
      label: '成果物限界メモひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/templates/base02_incomplete_information_deliverable/deliverable_limitation_note.md'
    },
    {
      id: 'html-source',
      label: 'HTML',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base02_incomplete_information_deliverable/app/index.html'
    },
    {
      id: 'javascript-source',
      label: '画面制御',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base02_incomplete_information_deliverable/app/src/main.js'
    },
    {
      id: 'deliverable-source',
      label: '文書変換',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base02_incomplete_information_deliverable/app/src/provisional-deliverable.js'
    },
    {
      id: 'css-source',
      label: 'CSS',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base02_incomplete_information_deliverable/app/src/style.css'
    },
    {
      id: 'requirements',
      label: '要件定義',
      kind: 'requirements',
      format: 'markdown',
      path: 'category/StudyBase/doc/requirements/base02_incomplete_information_deliverable_requirements.md'
    },
    {
      id: 'basic-design',
      label: '基本設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/basic_design/base02_basic_design.md'
    },
    {
      id: 'detailed-design',
      label: '詳細設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/detailed_design/base02_detailed_design.md'
    }
  ],
  base03: [
    {
      id: 'estimate-case',
      label: '見積りケース',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyBase/src/samples/base03_estimate_basis/estimate_case.md'
    },
    {
      id: 'completed-estimate',
      label: '見積り根拠記入例',
      kind: 'artifact',
      format: 'markdown',
      path: 'category/StudyBase/src/samples/base03_estimate_basis/completed_estimate_basis.md'
    },
    {
      id: 'estimate-template',
      label: '見積り根拠表ひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/templates/base03_estimate_basis/estimate_basis.md'
    },
    {
      id: 'work-template',
      label: '作業分解表ひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/templates/base03_estimate_basis/work_breakdown.md'
    },
    {
      id: 'risk-template',
      label: 'リスク一覧ひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/templates/base03_estimate_basis/risk_list.md'
    },
    {
      id: 'html-source',
      label: 'HTML',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base03_estimate_basis/app/index.html'
    },
    {
      id: 'javascript-source',
      label: '画面制御',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base03_estimate_basis/app/src/main.js'
    },
    {
      id: 'estimate-source',
      label: '見積り変換',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base03_estimate_basis/app/src/estimate.js'
    },
    {
      id: 'css-source',
      label: 'CSS',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base03_estimate_basis/app/src/style.css'
    },
    {
      id: 'requirements',
      label: '要件定義',
      kind: 'requirements',
      format: 'markdown',
      path: 'category/StudyBase/doc/requirements/base03_estimate_basis_requirements.md'
    },
    {
      id: 'basic-design',
      label: '基本設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/basic_design/base03_basic_design.md'
    },
    {
      id: 'detailed-design',
      label: '詳細設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/detailed_design/base03_detailed_design.md'
    }
  ],
  base04: [
    {
      id: 'precondition-case',
      label: 'テスト前提ケース',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyBase/src/samples/base04_test_precondition_checklist/test_precondition_case.md'
    },
    {
      id: 'completed-checklist',
      label: '成立条件チェック記入例',
      kind: 'artifact',
      format: 'markdown',
      path: 'category/StudyBase/src/samples/base04_test_precondition_checklist/completed_test_precondition_checklist.md'
    },
    {
      id: 'checklist-template',
      label: '成立条件チェックリストひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/templates/base04_test_precondition_checklist/test_precondition_checklist.md'
    },
    {
      id: 'environment-template',
      label: 'テスト環境確認表ひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/templates/base04_test_precondition_checklist/test_environment_check.md'
    },
    {
      id: 'data-template',
      label: 'テストデータ確認表ひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/templates/base04_test_precondition_checklist/test_data_check.md'
    },
    {
      id: 'html-source',
      label: 'HTML',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base04_test_precondition_checklist/app/index.html'
    },
    {
      id: 'javascript-source',
      label: '画面制御',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base04_test_precondition_checklist/app/src/main.js'
    },
    {
      id: 'preconditions-source',
      label: '成立条件の判定と文書変換',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base04_test_precondition_checklist/app/src/preconditions.js'
    },
    {
      id: 'css-source',
      label: 'CSS',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base04_test_precondition_checklist/app/src/style.css'
    },
    {
      id: 'requirements',
      label: '要件定義',
      kind: 'requirements',
      format: 'markdown',
      path: 'category/StudyBase/doc/requirements/base04_test_precondition_checklist_requirements.md'
    },
    {
      id: 'basic-design',
      label: '基本設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/basic_design/base04_basic_design.md'
    },
    {
      id: 'detailed-design',
      label: '詳細設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/detailed_design/base04_detailed_design.md'
    }
  ],
  base05: [
    {
      id: 'responsibility-case',
      label: '責任分担ケース',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyBase/src/samples/base05_raci_responsibility_matrix/responsibility_case.md'
    },
    {
      id: 'completed-raci',
      label: 'RACI記入例',
      kind: 'artifact',
      format: 'markdown',
      path: 'category/StudyBase/src/samples/base05_raci_responsibility_matrix/completed_raci_matrix.md'
    },
    {
      id: 'raci-template',
      label: 'RACI表ひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/templates/base05_raci_responsibility_matrix/raci_matrix.md'
    },
    {
      id: 'decision-template',
      label: '判断待ち事項一覧ひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/templates/base05_raci_responsibility_matrix/decision_pending_list.md'
    },
    {
      id: 'escalation-template',
      label: 'エスカレーションメモひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/templates/base05_raci_responsibility_matrix/escalation_note.md'
    },
    {
      id: 'html-source',
      label: 'HTML',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base05_raci_responsibility_matrix/app/index.html'
    },
    {
      id: 'javascript-source',
      label: '画面制御',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base05_raci_responsibility_matrix/app/src/main.js'
    },
    {
      id: 'raci-source',
      label: 'RACIの検証と文書変換',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base05_raci_responsibility_matrix/app/src/raci.js'
    },
    {
      id: 'css-source',
      label: 'CSS',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base05_raci_responsibility_matrix/app/src/style.css'
    },
    {
      id: 'requirements',
      label: '要件定義',
      kind: 'requirements',
      format: 'markdown',
      path: 'category/StudyBase/doc/requirements/base05_raci_responsibility_matrix_requirements.md'
    },
    {
      id: 'basic-design',
      label: '基本設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/basic_design/base05_basic_design.md'
    },
    {
      id: 'detailed-design',
      label: '詳細設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/detailed_design/base05_detailed_design.md'
    }
  ],
  base06: [
    {
      id: 'practice-readme',
      label: '練習原本の説明',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyBase/src/samples/base06_git_basic/practice_repo/README.md'
    },
    {
      id: 'practice-notes',
      label: '変更対象のテキスト',
      kind: 'material',
      format: 'text',
      path: 'category/StudyBase/src/samples/base06_git_basic/practice_repo/notes.txt'
    },
    {
      id: 'gitignore-source',
      label: '.gitignore',
      kind: 'source',
      format: 'text',
      path: 'category/StudyBase/src/samples/base06_git_basic/practice_repo/.gitignore'
    },
    {
      id: 'command-log',
      label: 'Gitコマンド記録ひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/learning_notes/base06_git_basic/notes/git_command_log.md'
    },
    {
      id: 'diff-note',
      label: '差分読解メモひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/learning_notes/base06_git_basic/notes/diff_reading_note.md'
    },
    {
      id: 'common-errors',
      label: 'よくある失敗と対処',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyBase/doc/learning_notes/base06_git_basic/notes/common_errors.md'
    },
    {
      id: 'practice-script',
      label: 'Git練習スクリプト',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/scripts/base06-git-practice.mjs'
    },
    {
      id: 'requirements',
      label: '要件定義',
      kind: 'requirements',
      format: 'markdown',
      path: 'category/StudyBase/doc/requirements/base06_git_basic_requirements.md'
    },
    {
      id: 'basic-design',
      label: '基本設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/basic_design/base06_basic_design.md'
    },
    {
      id: 'detailed-design',
      label: '詳細設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/detailed_design/base06_detailed_design.md'
    }
  ],
  base07: [
    {
      id: 'practice-readme',
      label: '練習原本の説明',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyBase/src/samples/base07_branch_merge_conflict/practice_repo/README.md'
    },
    {
      id: 'conflict-target',
      label: '競合対象のテキスト',
      kind: 'material',
      format: 'text',
      path: 'category/StudyBase/src/samples/base07_branch_merge_conflict/practice_repo/conflict_target.txt'
    },
    {
      id: 'branch-log',
      label: 'ブランチ操作記録ひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/learning_notes/base07_branch_merge_conflict/notes/branch_operation_log.md'
    },
    {
      id: 'conflict-reproduction',
      label: '競合再現記録ひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/learning_notes/base07_branch_merge_conflict/notes/conflict_reproduction.md'
    },
    {
      id: 'conflict-resolution',
      label: '競合解消記録ひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/learning_notes/base07_branch_merge_conflict/notes/conflict_resolution_note.md'
    },
    {
      id: 'practice-script',
      label: '競合練習スクリプト',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/scripts/base07-git-conflict-practice.mjs'
    },
    {
      id: 'requirements',
      label: '要件定義',
      kind: 'requirements',
      format: 'markdown',
      path: 'category/StudyBase/doc/requirements/base07_branch_merge_conflict_requirements.md'
    },
    {
      id: 'basic-design',
      label: '基本設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/basic_design/base07_basic_design.md'
    },
    {
      id: 'detailed-design',
      label: '詳細設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/detailed_design/base07_detailed_design.md'
    }
  ],
  base08: [
    {
      id: 'issue-example',
      label: 'Issue記入例',
      kind: 'artifact',
      format: 'markdown',
      path: 'category/StudyBase/src/samples/base08_issue_branch_pr_merge/sample_issue.md'
    },
    {
      id: 'pull-request-example',
      label: 'Pull Request記入例',
      kind: 'artifact',
      format: 'markdown',
      path: 'category/StudyBase/src/samples/base08_issue_branch_pr_merge/sample_pull_request.md'
    },
    {
      id: 'review-response-example',
      label: 'レビュー対応記入例',
      kind: 'artifact',
      format: 'markdown',
      path: 'category/StudyBase/src/samples/base08_issue_branch_pr_merge/sample_review_response.md'
    },
    {
      id: 'issue-template',
      label: 'Issueひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/templates/base08_issue_branch_pr_merge/issue_template.md'
    },
    {
      id: 'pull-request-template',
      label: 'Pull Requestひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/templates/base08_issue_branch_pr_merge/pull_request_template.md'
    },
    {
      id: 'review-response-template',
      label: 'レビュー対応ひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/templates/base08_issue_branch_pr_merge/review_response_note.md'
    },
    {
      id: 'gitea-guide',
      label: 'Gitea実操作手順',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyBase/src/samples/base08_issue_branch_pr_merge/gitea_lab/README.md'
    },
    {
      id: 'review-scenario',
      label: 'レビュー指摘シナリオ',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyBase/src/samples/base08_issue_branch_pr_merge/gitea_lab/review_scenario.md'
    },
    {
      id: 'compose-source',
      label: 'GiteaのCompose定義',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/samples/base08_issue_branch_pr_merge/gitea_lab/docker-compose.yml'
    },
    {
      id: 'workflow-source',
      label: '変更対象のチーム開発手順',
      kind: 'source',
      format: 'markdown',
      path: 'category/StudyBase/src/samples/base08_issue_branch_pr_merge/gitea_lab/seed_repository/docs/team-workflow.md'
    },
    {
      id: 'validation-source',
      label: '教材検証スクリプト',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/samples/base08_issue_branch_pr_merge/gitea_lab/seed_repository/scripts/check-workflow.mjs'
    },
    {
      id: 'practice-script',
      label: 'PR手順練習スクリプト',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/scripts/base08-pr-workflow-practice.mjs'
    },
    {
      id: 'requirements',
      label: '要件定義',
      kind: 'requirements',
      format: 'markdown',
      path: 'category/StudyBase/doc/requirements/base08_issue_branch_pr_merge_requirements.md'
    },
    {
      id: 'basic-design',
      label: '基本設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/basic_design/base08_basic_design.md'
    },
    {
      id: 'detailed-design',
      label: '詳細設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/detailed_design/base08_detailed_design.md'
    }
  ],
  base09: [
    {
      id: 'package-json',
      label: 'package.json',
      kind: 'source',
      format: 'text',
      path: 'category/StudyBase/src/samples/base09_npm_scripts/sample_node_project/package.json'
    },
    {
      id: 'main-source',
      label: '実行するJavaScript',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/samples/base09_npm_scripts/sample_node_project/src/index.js'
    },
    {
      id: 'test-source',
      label: '最小テスト',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/samples/base09_npm_scripts/sample_node_project/test/smoke.test.js'
    },
    {
      id: 'package-reading-note',
      label: 'package.json読解メモ',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyBase/doc/learning_notes/base09_npm_scripts/notes/package_json_reading_note.md'
    },
    {
      id: 'command-result-note',
      label: 'コマンドと確認結果',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyBase/doc/learning_notes/base09_npm_scripts/notes/npm_command_log.md'
    },
    {
      id: 'error-note',
      label: 'npmエラーの確認方法',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyBase/doc/learning_notes/base09_npm_scripts/notes/npm_error_note.md'
    },
    {
      id: 'requirements',
      label: '要件定義',
      kind: 'requirements',
      format: 'markdown',
      path: 'category/StudyBase/doc/requirements/base09_npm_scripts_requirements.md'
    },
    {
      id: 'basic-design',
      label: '基本設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/basic_design/base09_basic_design.md'
    },
    {
      id: 'detailed-design',
      label: '詳細設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/detailed_design/base09_detailed_design.md'
    }
  ],
  base10: [
    {
      id: 'api-source',
      label: 'サンプルAPIのソース',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/samples/base10_curl_api_check/sample_api/src/server.js'
    },
    {
      id: 'package-json',
      label: 'package.json',
      kind: 'source',
      format: 'text',
      path: 'category/StudyBase/src/samples/base10_curl_api_check/sample_api/package.json'
    },
    {
      id: 'get-examples',
      label: 'GET確認コマンド',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyBase/doc/learning_notes/base10_curl_api_check/commands/curl_get_examples.md'
    },
    {
      id: 'post-examples',
      label: 'POST確認コマンド',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyBase/doc/learning_notes/base10_curl_api_check/commands/curl_post_examples.md'
    },
    {
      id: 'error-examples',
      label: 'エラー確認コマンド',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyBase/doc/learning_notes/base10_curl_api_check/commands/curl_error_examples.md'
    },
    {
      id: 'api-check-log',
      label: 'API確認ログ',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/learning_notes/base10_curl_api_check/notes/api_check_log.md'
    },
    {
      id: 'screen-api-split-note',
      label: '画面とAPIの切り分け',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyBase/doc/learning_notes/base10_curl_api_check/notes/frontend_api_split_note.md'
    },
    {
      id: 'requirements',
      label: '要件定義',
      kind: 'requirements',
      format: 'markdown',
      path: 'category/StudyBase/doc/requirements/base10_curl_api_check_requirements.md'
    },
    {
      id: 'basic-design',
      label: '基本設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/basic_design/base10_basic_design.md'
    },
    {
      id: 'detailed-design',
      label: '詳細設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/detailed_design/base10_detailed_design.md'
    }
  ],
  base11: [
    {
      id: 'presentation-case',
      label: '説明対象の記入例',
      kind: 'material',
      format: 'text',
      path: 'category/StudyBase/src/samples/base11_portfolio_demo_presentation/presentation_case.json'
    },
    {
      id: 'completed-presentation',
      label: 'ポートフォリオ説明の完成例',
      kind: 'artifact',
      format: 'markdown',
      path: 'category/StudyBase/src/samples/base11_portfolio_demo_presentation/completed_presentation.md'
    },
    {
      id: 'target-selection',
      label: '説明対象の選び方',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyBase/doc/learning_notes/base11_portfolio_demo_presentation/docs/target_selection.md'
    },
    {
      id: 'script-60',
      label: '60秒の説明ひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/learning_notes/base11_portfolio_demo_presentation/docs/demo_script_60s.md'
    },
    {
      id: 'script-3',
      label: '3分の説明ひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/learning_notes/base11_portfolio_demo_presentation/docs/demo_script_3min.md'
    },
    {
      id: 'script-5',
      label: '5分の説明ひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/learning_notes/base11_portfolio_demo_presentation/docs/demo_script_5min.md'
    },
    {
      id: 'evidence-selection',
      label: '証拠の選び方',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyBase/doc/learning_notes/base11_portfolio_demo_presentation/docs/evidence_selection.md'
    },
    {
      id: 'limitation-note',
      label: '制限事項の書き方',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyBase/doc/learning_notes/base11_portfolio_demo_presentation/docs/limitation_note.md'
    },
    {
      id: 'video-structure',
      label: '録画構成の考え方',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyBase/doc/learning_notes/base11_portfolio_demo_presentation/docs/video_structure.md'
    },
    {
      id: 'html-source',
      label: 'HTML',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base11_portfolio_demo_presentation/app/index.html'
    },
    {
      id: 'main-source',
      label: '画面制御',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base11_portfolio_demo_presentation/app/src/main.js'
    },
    {
      id: 'presentation-source',
      label: '説明案の作成処理',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base11_portfolio_demo_presentation/app/src/presentation.js'
    },
    {
      id: 'css-source',
      label: 'CSS',
      kind: 'source',
      format: 'source',
      path: 'category/StudyBase/src/apps/base11_portfolio_demo_presentation/app/src/style.css'
    },
    {
      id: 'requirements',
      label: '要件定義',
      kind: 'requirements',
      format: 'markdown',
      path: 'category/StudyBase/doc/requirements/base11_portfolio_demo_presentation_requirements.md'
    },
    {
      id: 'basic-design',
      label: '基本設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/basic_design/base11_basic_design.md'
    },
    {
      id: 'detailed-design',
      label: '詳細設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/detailed_design/base11_detailed_design.md'
    }
  ],
  base12: [
    {
      id: 'arch01-readme',
      label: 'arch01の説明',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/learning_notes/arch01_system_anatomy_walkthrough/README.md'
    },
    {
      id: 'arch01-example',
      label: 'arch01専用システムの整理例',
      kind: 'artifact',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/learning_notes/arch01_system_anatomy_walkthrough/docs/target_system_summary.md'
    },
    {
      id: 'arch01-components',
      label: '構成要素の整理',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/learning_notes/arch01_system_anatomy_walkthrough/docs/context_container_component.md'
    },
    {
      id: 'arch01-flow',
      label: '処理とデータの流れ',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/learning_notes/arch01_system_anatomy_walkthrough/docs/request_data_flow.md'
    },
    {
      id: 'arch01-failure',
      label: '失敗時の動き',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/learning_notes/arch01_system_anatomy_walkthrough/docs/failure_mode.md'
    },
    {
      id: 'arch01-evidence',
      label: '事実と推測の整理',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/learning_notes/arch01_system_anatomy_walkthrough/docs/evidence_vs_inference.md'
    },
    {
      id: 'arch01-decisions',
      label: '構成判断の整理',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/learning_notes/arch01_system_anatomy_walkthrough/docs/decision_notes.md'
    },
    {
      id: 'requirements',
      label: '要件定義',
      kind: 'requirements',
      format: 'markdown',
      path: 'category/StudyBase/doc/requirements/base12_system_anatomy_walkthrough_requirements.md'
    },
    {
      id: 'basic-design',
      label: '基本設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/basic_design/base12_basic_design.md'
    },
    {
      id: 'detailed-design',
      label: '詳細設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyBase/doc/detailed_design/base12_detailed_design.md'
    }
  ],
  arch01: [
    {
      id: 'server-source',
      label: 'API・SQLite・ログ処理',
      kind: 'source',
      format: 'source',
      path: 'category/StudyArchitecture/src/apps/arch01_system_anatomy_walkthrough/app/server.js'
    },
    {
      id: 'html-source',
      label: '操作画面',
      kind: 'source',
      format: 'source',
      path: 'category/StudyArchitecture/src/apps/arch01_system_anatomy_walkthrough/app/public/index.html'
    },
    {
      id: 'javascript-source',
      label: '画面制御',
      kind: 'source',
      format: 'source',
      path: 'category/StudyArchitecture/src/apps/arch01_system_anatomy_walkthrough/app/public/main.js'
    },
    {
      id: 'test-source',
      label: '実行確認テスト',
      kind: 'source',
      format: 'source',
      path: 'category/StudyArchitecture/src/apps/arch01_system_anatomy_walkthrough/test/server.test.js'
    },
    {
      id: 'target-system-summary',
      label: '対象システムの整理',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/learning_notes/arch01_system_anatomy_walkthrough/docs/target_system_summary.md'
    },
    {
      id: 'components',
      label: '構成要素の整理',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/learning_notes/arch01_system_anatomy_walkthrough/docs/context_container_component.md'
    },
    {
      id: 'request-data-flow',
      label: '処理とデータの流れ',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/learning_notes/arch01_system_anatomy_walkthrough/docs/request_data_flow.md'
    },
    {
      id: 'failure-mode',
      label: '失敗時の動き',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/learning_notes/arch01_system_anatomy_walkthrough/docs/failure_mode.md'
    },
    {
      id: 'evidence-vs-inference',
      label: '事実と推測の整理',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/learning_notes/arch01_system_anatomy_walkthrough/docs/evidence_vs_inference.md'
    },
    {
      id: 'decision-notes',
      label: '構成判断メモ',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/learning_notes/arch01_system_anatomy_walkthrough/docs/decision_notes.md'
    },
    {
      id: 'requirements',
      label: '要件定義',
      kind: 'requirements',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/requirements/arch01_system_anatomy_walkthrough_requirements.md'
    },
    {
      id: 'basic-design',
      label: '基本設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/basic_design/arch01_basic_design.md'
    },
    {
      id: 'detailed-design',
      label: '詳細設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/detailed_design/arch01_detailed_design.md'
    }
  ],
  arch02: [
    {
      id: 'server-source',
      label: 'レビュー対象API・SQLite処理',
      kind: 'source',
      format: 'source',
      path: 'category/StudyArchitecture/src/apps/arch02_evidence_driven_design_review/app/server.js'
    },
    {
      id: 'html-source',
      label: 'レビュー操作画面',
      kind: 'source',
      format: 'source',
      path: 'category/StudyArchitecture/src/apps/arch02_evidence_driven_design_review/app/public/index.html'
    },
    {
      id: 'playwright-test',
      label: 'Playwright証拠取得テスト',
      kind: 'source',
      format: 'source',
      path: 'category/StudyArchitecture/src/apps/arch02_evidence_driven_design_review/e2e/review.spec.js'
    },
    {
      id: 'review-target-design',
      label: 'レビュー対象の期待仕様',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyArchitecture/src/apps/arch02_evidence_driven_design_review/docs/review_target_design.md'
    },
    {
      id: 'review-target',
      label: 'レビュー対象と範囲',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/learning_notes/arch02_evidence_driven_design_review/docs/review_target.md'
    },
    {
      id: 'curl-evidence',
      label: 'curlによるAPI証拠',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/learning_notes/arch02_evidence_driven_design_review/docs/curl_evidence.md'
    },
    {
      id: 'evidence-checklist',
      label: '証拠の確認表',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/learning_notes/arch02_evidence_driven_design_review/docs/evidence_checklist.md'
    },
    {
      id: 'evidence-mapping',
      label: '主張と証拠の対応',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/learning_notes/arch02_evidence_driven_design_review/docs/evidence_mapping.md'
    },
    {
      id: 'findings',
      label: '指摘の書き方',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/learning_notes/arch02_evidence_driven_design_review/docs/findings.md'
    },
    {
      id: 'residual-risk',
      label: '残るリスクの整理',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/learning_notes/arch02_evidence_driven_design_review/docs/residual_risk.md'
    },
    {
      id: 'review-result-template',
      label: 'レビュー結果のひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/learning_notes/arch02_evidence_driven_design_review/docs/review_result_template.md'
    },
    {
      id: 'requirements',
      label: '要件定義',
      kind: 'requirements',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/requirements/arch02_evidence_driven_design_review_requirements.md'
    },
    {
      id: 'basic-design',
      label: '基本設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/basic_design/arch02_basic_design.md'
    },
    {
      id: 'detailed-design',
      label: '詳細設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyArchitecture/doc/detailed_design/arch02_detailed_design.md'
    }
  ],
  db01: [
    {
      id: 'storage-comparison',
      label: '保存方式を比較する',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyDB/doc/learning_notes/db01_db_foundations/docs/storage_comparison.md'
    },
    {
      id: 'category-matrix',
      label: 'DBの種類を比較する',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyDB/doc/learning_notes/db01_db_foundations/docs/db_category_matrix.md'
    },
    {
      id: 'use-case-mapping',
      label: '用途ごとの選定例',
      kind: 'artifact',
      format: 'markdown',
      path: 'category/StudyDB/doc/learning_notes/db01_db_foundations/docs/use_case_mapping.md'
    },
    {
      id: 'selection-worksheet',
      label: '選定結果を記入する',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyDB/doc/learning_notes/db01_db_foundations/docs/storage_selection_worksheet.md'
    },
    {
      id: 'requirements',
      label: '要件定義',
      kind: 'requirements',
      format: 'markdown',
      path: 'category/StudyDB/doc/requirements/db01_db_foundations_requirements.md'
    },
    {
      id: 'basic-design',
      label: '基本設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyDB/doc/basic_design/db01_basic_design.md'
    },
    {
      id: 'detailed-design',
      label: '詳細設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyDB/doc/detailed_design/db01_detailed_design.md'
    }
  ],
  db02: [
    {
      id: 'schema-sql',
      label: 'テーブル定義SQL',
      kind: 'source',
      format: 'source',
      path: 'category/StudyDB/src/apps/db02_sql_crud_schema/sql/001_schema.sql'
    },
    {
      id: 'seed-sql',
      label: '初期データ登録SQL',
      kind: 'source',
      format: 'source',
      path: 'category/StudyDB/src/apps/db02_sql_crud_schema/sql/002_seed.sql'
    },
    {
      id: 'crud-sql',
      label: '検索・登録・更新・削除SQL',
      kind: 'source',
      format: 'source',
      path: 'category/StudyDB/src/apps/db02_sql_crud_schema/sql/003_crud_examples.sql'
    },
    {
      id: 'join-sql',
      label: 'テーブル結合SQL',
      kind: 'source',
      format: 'source',
      path: 'category/StudyDB/src/apps/db02_sql_crud_schema/sql/004_join_examples.sql'
    },
    {
      id: 'constraint-sql',
      label: '制約違反SQL',
      kind: 'source',
      format: 'source',
      path: 'category/StudyDB/src/apps/db02_sql_crud_schema/sql/005_constraint_errors.sql'
    },
    {
      id: 'schema-notes',
      label: 'テーブルと制約の整理',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyDB/doc/learning_notes/db02_sql_crud_schema/docs/schema_notes.md'
    },
    {
      id: 'execution-record',
      label: '実行結果を記録する',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyDB/doc/learning_notes/db02_sql_crud_schema/docs/command_log.md'
    },
    {
      id: 'constraint-record',
      label: '制約違反を記録する',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyDB/doc/learning_notes/db02_sql_crud_schema/docs/constraint_error_notes.md'
    },
    {
      id: 'requirements',
      label: '要件定義',
      kind: 'requirements',
      format: 'markdown',
      path: 'category/StudyDB/doc/requirements/db02_sql_crud_schema_requirements.md'
    },
    {
      id: 'basic-design',
      label: '基本設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyDB/doc/basic_design/db02_basic_design.md'
    },
    {
      id: 'detailed-design',
      label: '詳細設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyDB/doc/detailed_design/db02_detailed_design.md'
    }
  ],
  web29: [
    {
      id: 'readme-template',
      label: 'READMEひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyWeb/doc/templates/web29_readme_template/README.template.md'
    },
    {
      id: 'readme-example',
      label: 'README記入例',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyWeb/doc/templates/web29_readme_template/README.example.md'
    }
  ],
  web30: [
    {
      id: 'error-log-template',
      label: 'エラー記録ひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyWeb/doc/templates/web30_error_log_note/error-log-template.md'
    },
    {
      id: 'css-error-example',
      label: 'CSS読込エラー記入例',
      kind: 'artifact',
      format: 'markdown',
      path: 'category/StudyWeb/doc/learning_notes/web30_error_log_note/examples/css-not-loaded.md'
    },
    {
      id: 'api-404-example',
      label: 'API 404記入例',
      kind: 'artifact',
      format: 'markdown',
      path: 'category/StudyWeb/doc/learning_notes/web30_error_log_note/examples/api-404.md'
    }
  ],
  web31: [
    {
      id: 'issue-template',
      label: 'Issueひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyWeb/doc/templates/web31_issue_pr_style/issue-template.md'
    },
    {
      id: 'pr-template',
      label: 'PRひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyWeb/doc/templates/web31_issue_pr_style/pr-template.md'
    },
    {
      id: 'issue-example',
      label: 'Issue記入例',
      kind: 'artifact',
      format: 'markdown',
      path: 'category/StudyWeb/doc/learning_notes/web31_issue_pr_style/examples/sample-issue.md'
    },
    {
      id: 'pr-example',
      label: 'PR記入例',
      kind: 'artifact',
      format: 'markdown',
      path: 'category/StudyWeb/doc/learning_notes/web31_issue_pr_style/examples/sample-pr.md'
    },
    {
      id: 'gitea-practice-entry',
      label: 'Gitea演習案内',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyWeb/doc/learning_notes/web31_issue_pr_style/gitea-practice-entry.md'
    }
  ],
  web40: [
    {
      id: 'table-state-guide',
      label: '一覧状態の説明',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyWeb/doc/learning_notes/web40_table_search_pagination/docs/table_state.md'
    },
    {
      id: 'operation-check',
      label: '操作確認手順',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyWeb/doc/learning_notes/web40_table_search_pagination/docs/operation_check.md'
    },
    {
      id: 'html-source',
      label: 'HTML',
      kind: 'source',
      format: 'source',
      path: 'category/StudyWeb/src/frontend/static/studyweb/systems/web40_table_search_pagination/app/index.html'
    },
    {
      id: 'javascript-source',
      label: 'JavaScript',
      kind: 'source',
      format: 'source',
      path: 'category/StudyWeb/src/frontend/static/studyweb/systems/web40_table_search_pagination/app/src/main.js'
    },
    {
      id: 'table-state-source',
      label: '一覧計算',
      kind: 'source',
      format: 'source',
      path: 'category/StudyWeb/src/frontend/static/studyweb/systems/web40_table_search_pagination/app/src/table-state.js'
    },
    {
      id: 'css-source',
      label: 'CSS',
      kind: 'source',
      format: 'source',
      path: 'category/StudyWeb/src/frontend/static/studyweb/systems/web40_table_search_pagination/app/src/style.css'
    },
    {
      id: 'requirements',
      label: '要件定義',
      kind: 'requirements',
      format: 'markdown',
      path: 'category/StudyWeb/doc/requirements/web40_table_search_pagination_requirements.md'
    },
    {
      id: 'basic-design',
      label: '基本設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyWeb/doc/basic_design/web40_basic_design.md'
    },
    {
      id: 'detailed-design',
      label: '詳細設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyWeb/doc/detailed_design/web40_detailed_design.md'
    }
  ],
  web47: [
    {
      id: 'file-validation-guide',
      label: 'ファイル検証の説明',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyWeb/doc/learning_notes/web47_pdf_upload/docs/file_validation.md'
    },
    {
      id: 'metadata-guide',
      label: 'ファイル情報の説明',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyWeb/doc/learning_notes/web47_pdf_upload/docs/metadata_design.md'
    },
    {
      id: 'html-source',
      label: 'HTML',
      kind: 'source',
      format: 'source',
      path: 'category/StudyWeb/src/frontend/static/studyweb/systems/web47_pdf_upload/app/index.html'
    },
    {
      id: 'javascript-source',
      label: 'JavaScript',
      kind: 'source',
      format: 'source',
      path: 'category/StudyWeb/src/frontend/static/studyweb/systems/web47_pdf_upload/app/src/main.js'
    },
    {
      id: 'validation-source',
      label: 'ファイル判定',
      kind: 'source',
      format: 'source',
      path: 'category/StudyWeb/src/frontend/static/studyweb/systems/web47_pdf_upload/app/src/file-validation.js'
    },
    {
      id: 'css-source',
      label: 'CSS',
      kind: 'source',
      format: 'source',
      path: 'category/StudyWeb/src/frontend/static/studyweb/systems/web47_pdf_upload/app/src/style.css'
    },
    {
      id: 'requirements',
      label: '要件定義',
      kind: 'requirements',
      format: 'markdown',
      path: 'category/StudyWeb/doc/requirements/web47_pdf_upload_requirements.md'
    },
    {
      id: 'basic-design',
      label: '基本設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyWeb/doc/basic_design/web47_basic_design.md'
    },
    {
      id: 'detailed-design',
      label: '詳細設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyWeb/doc/detailed_design/web47_detailed_design.md'
    }
  ],
  web52: [
    {
      id: 'rendering-matrix',
      label: '表示方式比較表',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyWeb/doc/learning_notes/web52_modern_rendering_comparison/docs/rendering_mode_matrix.md'
    },
    {
      id: 'selection-scenarios',
      label: '利用場面の例',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyWeb/doc/learning_notes/web52_modern_rendering_comparison/docs/selection_scenarios.md'
    },
    {
      id: 'list-comparison',
      label: '一覧画面での比較',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyWeb/doc/learning_notes/web52_modern_rendering_comparison/docs/list_screen_comparison.md'
    },
    {
      id: 'data-boundary-guide',
      label: 'API・キャッシュ・認証',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyWeb/doc/learning_notes/web52_modern_rendering_comparison/docs/api_cache_auth_relation.md'
    },
    {
      id: 'studyweb-mapping',
      label: 'StudyWeb対応表',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyWeb/doc/learning_notes/web52_modern_rendering_comparison/docs/studyweb_mapping.md'
    },
    {
      id: 'html-source',
      label: 'HTML',
      kind: 'source',
      format: 'source',
      path: 'category/StudyWeb/src/frontend/static/studyweb/systems/web52_modern_rendering_comparison/app/index.html'
    },
    {
      id: 'javascript-source',
      label: 'JavaScript',
      kind: 'source',
      format: 'source',
      path: 'category/StudyWeb/src/frontend/static/studyweb/systems/web52_modern_rendering_comparison/app/src/main.js'
    },
    {
      id: 'decision-source',
      label: '判断メモ処理',
      kind: 'source',
      format: 'source',
      path: 'category/StudyWeb/src/frontend/static/studyweb/systems/web52_modern_rendering_comparison/app/src/decision-memo.js'
    },
    {
      id: 'css-source',
      label: 'CSS',
      kind: 'source',
      format: 'source',
      path: 'category/StudyWeb/src/frontend/static/studyweb/systems/web52_modern_rendering_comparison/app/src/style.css'
    },
    {
      id: 'requirements',
      label: '要件定義',
      kind: 'requirements',
      format: 'markdown',
      path: 'category/StudyWeb/doc/requirements/web52_modern_rendering_comparison_requirements.md'
    },
    {
      id: 'basic-design',
      label: '基本設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyWeb/doc/basic_design/web52_basic_design.md'
    },
    {
      id: 'detailed-design',
      label: '詳細設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyWeb/doc/detailed_design/web52_detailed_design.md'
    }
  ],
  devops09: [
    {
      id: 'runbook',
      label: '障害調査Runbook',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyDevOps/src/apps/devops09_incident_runbook/docs/runbook.md'
    },
    {
      id: 'report-template',
      label: '障害報告ひな形',
      kind: 'template',
      format: 'markdown',
      path: 'category/StudyDevOps/src/apps/devops09_incident_runbook/docs/incident_report_template.md'
    },
    {
      id: 'docker-checklist',
      label: 'Docker調査チェックリスト',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyDevOps/src/apps/devops09_incident_runbook/docs/docker_investigation_checklist.md'
    },
    {
      id: 'sample-report',
      label: '障害報告記入例',
      kind: 'artifact',
      format: 'markdown',
      path: 'category/StudyDevOps/src/apps/devops09_incident_runbook/docs/sample_incident_report.md'
    },
    {
      id: 'html-source',
      label: 'HTML',
      kind: 'source',
      format: 'source',
      path: 'category/StudyDevOps/src/apps/devops09_incident_runbook/app/index.html'
    },
    {
      id: 'javascript-source',
      label: '画面制御',
      kind: 'source',
      format: 'source',
      path: 'category/StudyDevOps/src/apps/devops09_incident_runbook/app/src/main.js'
    },
    {
      id: 'report-source',
      label: '記録変換',
      kind: 'source',
      format: 'source',
      path: 'category/StudyDevOps/src/apps/devops09_incident_runbook/app/src/report.js'
    },
    {
      id: 'css-source',
      label: 'CSS',
      kind: 'source',
      format: 'source',
      path: 'category/StudyDevOps/src/apps/devops09_incident_runbook/app/src/style.css'
    },
    {
      id: 'requirements',
      label: '要件定義',
      kind: 'requirements',
      format: 'markdown',
      path: 'category/StudyDevOps/doc/requirements/devops09_incident_runbook_requirements.md'
    },
    {
      id: 'basic-design',
      label: '基本設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyDevOps/doc/basic_design/devops09_basic_design.md'
    },
    {
      id: 'detailed-design',
      label: '詳細設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyDevOps/doc/detailed_design/devops09_detailed_design.md'
    }
  ],
  system47: [
    {
      id: 'sales-data',
      label: '売上データ',
      kind: 'material',
      format: 'text',
      path: 'category/StudyAI/src/apps/system47_sales_data_analysis_ai/data/sales_sample.csv'
    },
    {
      id: 'analysis-script',
      label: 'CSV集計との比較処理',
      kind: 'source',
      format: 'source',
      path: 'category/StudyAI/src/apps/system47_sales_data_analysis_ai/scripts/analyze_sales.js'
    },
    {
      id: 'database-definition',
      label: 'PostgreSQLの構成',
      kind: 'source',
      format: 'source',
      path: 'category/StudyAI/src/apps/system47_sales_data_analysis_ai/docker-compose.yml'
    },
    {
      id: 'schema-sql',
      label: '売上テーブル定義SQL',
      kind: 'source',
      format: 'source',
      path: 'category/StudyAI/src/apps/system47_sales_data_analysis_ai/sql/001_schema.sql'
    },
    {
      id: 'seed-sql',
      label: '売上データ登録SQL',
      kind: 'source',
      format: 'source',
      path: 'category/StudyAI/src/apps/system47_sales_data_analysis_ai/sql/002_seed.sql'
    },
    {
      id: 'sql-analysis-script',
      label: 'PostgreSQL集計の実行処理',
      kind: 'source',
      format: 'source',
      path: 'category/StudyAI/src/apps/system47_sales_data_analysis_ai/scripts/sql_analysis.js'
    },
    {
      id: 'explanation-script',
      label: 'AI説明の通信・保存処理',
      kind: 'source',
      format: 'source',
      path: 'category/StudyAI/src/apps/system47_sales_data_analysis_ai/scripts/explain_sales.js'
    },
    {
      id: 'explanation-prompt',
      label: 'AI説明の指示',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyAI/doc/learning_notes/system47_sales_data_analysis_ai/docs/ai_explanation_prompt.md'
    },
    {
      id: 'aggregation-results',
      label: '集計結果の例',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyAI/doc/learning_notes/system47_sales_data_analysis_ai/docs/aggregation_results.md'
    },
    {
      id: 'explanation-sample',
      label: 'AI説明の例',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyAI/doc/learning_notes/system47_sales_data_analysis_ai/docs/ai_explanation_sample.md'
    },
    {
      id: 'monthly-sql',
      label: '月別集計SQL',
      kind: 'source',
      format: 'source',
      path: 'category/StudyAI/src/apps/system47_sales_data_analysis_ai/sql/monthly_sales.sql'
    },
    {
      id: 'product-sql',
      label: '商品別集計SQL',
      kind: 'source',
      format: 'source',
      path: 'category/StudyAI/src/apps/system47_sales_data_analysis_ai/sql/product_sales.sql'
    },
    {
      id: 'customer-sql',
      label: '顧客区分別集計SQL',
      kind: 'source',
      format: 'source',
      path: 'category/StudyAI/src/apps/system47_sales_data_analysis_ai/sql/customer_sales.sql'
    },
    {
      id: 'readonly-check',
      label: '読み取り専用SQLの検証処理',
      kind: 'source',
      format: 'source',
      path: 'category/StudyAI/src/apps/system47_sales_data_analysis_ai/checks/readonly_sql_check.js'
    }
  ],
  system48: [
    {
      id: 'task-board',
      label: 'タスクボード',
      kind: 'artifact',
      format: 'text',
      path: 'category/StudyAI/src/apps/system48_local_llm_agent_organization/samples/task_board.json'
    },
    {
      id: 'role-catalog',
      label: '役割の定義',
      kind: 'material',
      format: 'text',
      path: 'category/StudyAI/src/apps/system48_local_llm_agent_organization/fixtures/role_catalog.json'
    },
    {
      id: 'shared-memory',
      label: '共有情報',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyAI/src/apps/system48_local_llm_agent_organization/fixtures/shared_memory.md'
    },
    {
      id: 'organization-runner',
      label: '役割の実行・通信・保存処理',
      kind: 'source',
      format: 'source',
      path: 'category/StudyAI/src/apps/system48_local_llm_agent_organization/scripts/run_organization.js'
    },
    {
      id: 'run-log-contract',
      label: '実行ログの記録形式',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyAI/doc/learning_notes/system48_local_llm_agent_organization/docs/run_log_template.md'
    },
    {
      id: 'task-check',
      label: '作業入力の検証処理',
      kind: 'source',
      format: 'source',
      path: 'category/StudyAI/src/apps/system48_local_llm_agent_organization/checks/check_task_fixture.js'
    },
    {
      id: 'output-check',
      label: '役割別成果物の検証処理',
      kind: 'source',
      format: 'source',
      path: 'category/StudyAI/src/apps/system48_local_llm_agent_organization/checks/check_role_outputs.js'
    },
    {
      id: 'approval-check',
      label: '承認境界の検証処理',
      kind: 'source',
      format: 'source',
      path: 'category/StudyAI/src/apps/system48_local_llm_agent_organization/checks/check_approval_boundary.js'
    }
  ],
  devops10: [
    {
      id: 'evidence-guide',
      label: 'リリース判定の証拠',
      kind: 'material',
      format: 'markdown',
      path: 'category/StudyDevOps/doc/learning_notes/devops10_evidence_driven_design_review/docs/evidence_guide.md'
    },
    {
      id: 'sample-decision',
      label: 'リリース判定記入例',
      kind: 'artifact',
      format: 'markdown',
      path: 'category/StudyDevOps/doc/learning_notes/devops10_evidence_driven_design_review/docs/sample_release_decision.md'
    },
    {
      id: 'html-source',
      label: 'HTML',
      kind: 'source',
      format: 'source',
      path: 'category/StudyDevOps/src/apps/devops10_evidence_driven_design_review/app/index.html'
    },
    {
      id: 'javascript-source',
      label: '画面制御',
      kind: 'source',
      format: 'source',
      path: 'category/StudyDevOps/src/apps/devops10_evidence_driven_design_review/app/src/main.js'
    },
    {
      id: 'decision-source',
      label: '判定記録変換',
      kind: 'source',
      format: 'source',
      path: 'category/StudyDevOps/src/apps/devops10_evidence_driven_design_review/app/src/decision-record.js'
    },
    {
      id: 'css-source',
      label: 'CSS',
      kind: 'source',
      format: 'source',
      path: 'category/StudyDevOps/src/apps/devops10_evidence_driven_design_review/app/src/style.css'
    },
    {
      id: 'requirements',
      label: '要件定義',
      kind: 'requirements',
      format: 'markdown',
      path: 'category/StudyDevOps/doc/requirements/devops10_evidence_driven_design_review_requirements.md'
    },
    {
      id: 'basic-design',
      label: '基本設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyDevOps/doc/basic_design/devops10_basic_design.md'
    },
    {
      id: 'detailed-design',
      label: '詳細設計',
      kind: 'design',
      format: 'markdown',
      path: 'category/StudyDevOps/doc/detailed_design/devops10_detailed_design.md'
    }
  ]
};

const rules = [
  rule('system', range(1, 14), 'web', 'shared'),
  rule('system', [15], 'web', 'process'),
  rule('system', [16, ...range(17, 44)], 'web', 'shared'),
  rule('system', [45, 46, 48], 'command', 'one-shot'),
  rule('system', [47], 'command', 'stack'),

  rule('web', range(1, 6), 'web', 'none'),
  rule('web', range(7, 12), 'web', 'process'),
  rule('web', range(13, 15), 'request', 'process'),
  rule('web', [16, 17], 'request', 'stack'),
  rule('web', [18], 'command', 'stack'),
  rule('web', range(19, 22), 'web', 'stack'),
  rule('web', [...range(23, 25), 45, 46], 'web', 'process'),
  rule('web', range(26, 28), 'web', 'stack'),
  rule('web', range(29, 31), 'document', 'none'),
  rule('web', [32, 33, 35], 'request', 'process'),
  rule('web', [...range(36, 40), 44, 47, 52], 'web', 'none'),
  rule('web', [...range(41, 43), 48, 49], 'request', 'process'),
  rule('web', [50], 'request', 'stack'),
  rule('web', [34], 'web', 'stack'),
  rule('web', [51], 'command', 'stack'),

  rule('security', [...range(1, 4), 7], 'request', 'process'),
  rule('security', [5, 6, 10, 12, 16, 19, 20, 21], 'command', 'one-shot'),
  rule('security', [8, 9, 17, 18], 'web', 'process'),
  rule('security', [11, 13, 14, 15], 'request', 'process'),

  rule('devops', [1, 2], 'command', 'one-shot'),
  rule('devops', [3, 4, 5, 8], 'command', 'stack'),
  rule('devops', [6, 7], 'request', 'process'),
  rule('devops', [9, 10], 'web', 'none'),

  rule('aws', [1, 5, 7, 10], 'command', 'one-shot'),
  rule('aws', [2, 3, 4], 'command', 'stack'),
  rule('aws', [6, 8], 'request', 'process'),
  rule('aws', [9], 'request', 'stack'),

  rule('base', [1, 2, 3, 4, 5, 11], 'web', 'none'),
  rule('base', [6, 7, 9], 'command', 'one-shot'),
  rule('base', [8], 'web', 'stack'),
  rule('base', [10], 'request', 'process'),
  rule('base', [12], 'document', 'none'),

  rule('db', [1, 3, 7], 'document', 'none'),
  rule('db', [2, 4, 5, 6], 'command', 'stack'),
  rule('arch', [1, 2], 'web', 'process'),
  rule('desktop', [1], 'external-app', 'process')
];

const expectedCombinationCounts = {
  'document/none': 7,
  'document/manual': 0,
  'web/none': 22,
  'web/process': 19,
  'web/stack': 9,
  'web/shared': 43,
  'request/process': 26,
  'request/stack': 4,
  'command/one-shot': 22,
  'command/stack': 14,
  'external-app/process': 1
};

const standaloneThemes = [
  {
    id: 'study-idea-forge',
    fieldId: 'study-idea-forge',
    name: 'IdeaForge 発想支援アプリ',
    entryFile: 'category/StudyIdeaForge/README.md',
    presentation: 'web',
    lifecycle: 'process',
    connection: {
      type: 'web-process',
      cwd: 'category/StudyIdeaForge/ideaforge/backend',
      command: 'python-venv',
      args: ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '43450'],
      url: 'http://127.0.0.1:43450/',
      healthUrl: 'http://127.0.0.1:43450/api/health'
    }
  },
  {
    id: 'study-ai-idea-generation',
    fieldId: 'study-ai-idea-generation',
    name: 'AI発想法の比較演習',
    entryFile: 'category/StudyAIIdeaGeneration/README.md',
    presentation: 'command',
    lifecycle: 'one-shot',
    connection: {
      type: 'command-one-shot',
      cwd: 'category/StudyAIIdeaGeneration',
      commands: [
        {
          id: 'validate-prompts',
          command: 'python',
          args: ['-X', 'utf8', 'verify/verify_prompts.py', '--check-only']
        },
        {
          id: 'unit-tests',
          command: 'python',
          args: ['-X', 'utf8', '-m', 'unittest', 'discover', '-s', 'verify', '-p', 'test_*.py']
        }
      ]
    }
  },
  {
    id: 'study-ai-corporate-employee',
    fieldId: 'study-ai-corporate-employee',
    name: '役割別AIアシスタント設計演習',
    entryFile: 'category/StudyAICorporateEmployee/README.md',
    presentation: 'command',
    lifecycle: 'one-shot',
    connection: {
      type: 'command-one-shot',
      cwd: 'category/StudyAICorporateEmployee',
      commands: [
        {
          id: 'validate-profiles',
          command: 'python',
          args: ['-X', 'utf8', 'exercise/scripts/validate_profiles.py']
        },
        {
          id: 'unit-tests',
          command: 'python',
          args: ['-X', 'utf8', '-m', 'unittest', 'discover', '-s', 'exercise/scripts', '-p', 'test_*.py']
        }
      ]
    }
  },
  {
    id: 'study-api',
    fieldId: 'study-api',
    name: 'Python標準ライブラリによるWeb API',
    entryFile: 'category/StudyAPI/README.md',
    presentation: 'request',
    lifecycle: 'process',
    connection: {
      type: 'request-process',
      cwd: 'category/StudyAPI',
      command: 'python',
      args: ['-X', 'utf8', 'src/simple_web_api.py'],
      env: {
        PORT: '43451',
        WEB_API_PORT: '43451'
      },
      url: 'http://127.0.0.1:43451/',
      healthUrl: 'http://127.0.0.1:43451/health',
      request: {
        method: 'GET',
        url: 'http://127.0.0.1:43451/fixed'
      }
    }
  }
];

function range(first, last) {
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

function rule(prefix, numbers, presentation, lifecycle) {
  return { prefix, numbers: new Set(numbers), presentation, lifecycle };
}

function readUtf8(filePath) {
  const bytes = fs.readFileSync(filePath);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    throw new Error(`UTF-8 BOMは使用できません: ${path.relative(repositoryRoot, filePath)}`);
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function readExistingUtf8(filePath) {
  const bytes = fs.readFileSync(filePath);
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

const formalDocumentDefinitions = [
  {
    id: 'requirements',
    label: '要件定義',
    kind: 'requirements',
    directory: 'requirements',
    matches(themeId, fileName) {
      return fileName.startsWith(`${themeId}_`)
        && fileName.endsWith('_requirements.md')
        && !fileName.endsWith('_requirements_index.md');
    }
  },
  {
    id: 'basic-design',
    label: '基本設計',
    kind: 'design',
    directory: 'basic_design',
    matches(themeId, fileName) {
      return fileName === `${themeId}_basic_design.md`;
    }
  },
  {
    id: 'detailed-design',
    label: '詳細設計',
    kind: 'design',
    directory: 'detailed_design',
    matches(themeId, fileName) {
      return fileName === `${themeId}_detailed_design.md`;
    }
  }
];

function findFormalDocumentResources(themeId, entryFile) {
  const fieldRoot = entryFile.split('/').slice(0, 2).join('/');
  if (!fieldRoot.startsWith('category/Study')) {
    throw new Error(`${themeId}の分野ルートを教材入口から判定できません: ${entryFile}`);
  }

  return formalDocumentDefinitions.map((definition) => {
    const relativeDirectory = `${fieldRoot}/doc/${definition.directory}`;
    const absoluteDirectory = path.join(repositoryRoot, ...relativeDirectory.split('/'));
    const fileNames = fs.readdirSync(absoluteDirectory)
      .filter((fileName) => definition.matches(themeId, fileName));
    if (fileNames.length !== 1) {
      throw new Error(`${themeId}の${definition.label}が一意ではありません: ${fileNames.join(', ') || '0件'}`);
    }
    const relativePath = `${relativeDirectory}/${fileNames[0]}`;
    readExistingUtf8(path.join(repositoryRoot, ...relativePath.split('/')));
    return {
      id: definition.id,
      label: definition.label,
      kind: definition.kind,
      format: 'markdown',
      path: relativePath
    };
  });
}

function mergeResourceDefinitions(currentResources = [], generatedResources = []) {
  const generatedById = new Map(generatedResources.map((resource) => [resource.id, resource]));
  const merged = currentResources.map((resource) => generatedById.get(resource.id) ?? resource);
  const mergedIds = new Set(merged.map((resource) => resource.id));
  for (const resource of generatedResources) {
    if (!mergedIds.has(resource.id)) {
      merged.push(resource);
      mergedIds.add(resource.id);
    }
  }
  return merged;
}

function collectFiles(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(filePath, files);
    if (entry.isFile()) files.push(filePath);
  }
  return files;
}

function collectHttpUrls(value, urls = [], parentKey = '') {
  if (parentKey === 'headers') return urls;
  if (typeof value === 'string' && /^https?:\/\//u.test(value)) {
    urls.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectHttpUrls(item, urls, parentKey);
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) collectHttpUrls(item, urls, key);
  }
  return urls;
}

function assertRuntimeUrlSafety(themes) {
  const portUsers = new Map();
  for (const theme of themes) {
    const runtimeId = theme.connection?.runtimeId ?? theme.id;
    for (const value of collectHttpUrls(theme.connection)) {
      const url = new URL(value);
      if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname)) {
        throw new Error(`実行URLはローカルHTTPだけを指定できます: ${theme.id} ${value}`);
      }
      if (!url.port) continue;
      const users = portUsers.get(url.port) ?? new Set();
      users.add(runtimeId);
      portUsers.set(url.port, users);
    }
  }
  const conflicts = [...portUsers]
    .filter(([, runtimeIds]) => runtimeIds.size > 1)
    .map(([port, runtimeIds]) => `${port} (${[...runtimeIds].join('、')})`);
  if (conflicts.length > 0) {
    throw new Error(`別々の実行環境でローカルポートが重複しています: ${conflicts.join(', ')}`);
  }
}

const studyWebFiles = collectFiles(studyWebRoot);
const studySecurityFiles = collectFiles(studySecurityRoot);
const studyDevOpsFiles = collectFiles(studyDevOpsRoot);
const studyAwsFiles = collectFiles(studyAwsRoot);
const studyBaseFiles = collectFiles(studyBaseRoot);
const studyArchitectureFiles = collectFiles(studyArchitectureRoot);

const requestProcessProfiles = {
  web13: profile(43313, ['node_modules/@nestjs/cli/bin/nest.js', 'start'], 'GET', '/hello'),
  web14: profile(43314, ['node_modules/@nestjs/cli/bin/nest.js', 'start'], 'POST', '/tasks', {
    input: { target: 'body', name: 'title' }
  }),
  web15: profile(43315, ['node_modules/@nestjs/cli/bin/nest.js', 'start'], 'GET', '/status/ok'),
  web32: requestProcessOperationsProfile(43332, ['server/src/server.js'], [
    requestOperation('get-hello', 'GET要求と応答ヘッダー', 'GET', '/api/hello', [], {
      headers: { 'X-Client': 'studyhub' }
    }),
    requestOperation('post-echo', 'POST本文と応答ヘッダー', 'POST', '/api/echo', [
      requestInput('message', '送信するメッセージ', 'body', {
        required: true,
        placeholder: 'hello'
      })
    ]),
    requestOperation('not-found', '存在しないURLへの要求', 'GET', '/api/not-found')
  ]),
  web33: requestProcessOperationsProfile(43333, ['server/src/server.js'], [
    requestOperation('login', 'ログインしてCookieを受け取る', 'POST', '/login'),
    requestOperation('me', 'ログイン状態を確認する', 'GET', '/me'),
    requestOperation('logout', 'ログアウトしてCookieを削除する', 'POST', '/logout'),
    requestOperation('me-after-logout', 'ログアウト後の状態を確認する', 'GET', '/me')
  ]),
  web35: requestProcessOperationsProfile(43335, ['api/src/server.js'], [
    requestOperation('list', '一覧取得（200）', 'GET', '/items'),
    requestOperation('create', '登録（201）', 'POST', '/items', [
      requestInput('name', '項目名', 'body', {
        required: true,
        placeholder: 'two'
      })
    ]),
    requestOperation('bad-request', '入力不正（400）', 'POST', '/items'),
    requestOperation('unauthorized', '未認証（401）', 'GET', '/private'),
    requestOperation('forbidden', '権限不足（403）', 'GET', '/admin'),
    requestOperation('not-found', '対象なし（404）', 'GET', '/items/999'),
    requestOperation('conflict', '同じ項目名を再登録（409）', 'POST', '/items', [
      requestInput('name', '登録済みの項目名', 'body', {
        required: true,
        placeholder: 'two'
      })
    ]),
    requestOperation('server-error', 'サーバーエラー（500）', 'GET', '/error')
  ], '/items'),
  web41: requestProcessOperationsProfile(43341, ['api/src/server.js'], [
    requestOperation('success', '正常応答', 'GET', '/'),
    requestOperation('validation', '入力エラー', 'GET', '/validation'),
    requestOperation('business', '業務エラー', 'GET', '/business'),
    requestOperation('system', 'システムエラー', 'GET', '/system')
  ]),
  web42: requestProcessOperationsProfile(43342, ['api/src/server.js'], [
    requestOperation('search', '絞り込み・並べ替え・ページング', 'GET', '/items', [
      requestInput('keyword', '検索語', 'query', { placeholder: 'Item 1' }),
      requestInput('status', '状態（open / closed）', 'query', { placeholder: 'open' }),
      requestInput('sort', '並べ替える項目（name / status / createdAt）', 'query', {
        placeholder: 'createdAt'
      }),
      requestInput('order', '並び順（asc / desc）', 'query', { placeholder: 'desc' }),
      requestInput('limit', '取得件数（1～50）', 'query', { placeholder: '5' }),
      requestInput('offset', '読み飛ばす件数（0以上）', 'query', { placeholder: '0' })
    ]),
    requestOperation('invalid-limit', '不正な取得件数', 'GET', '/items?limit=0'),
    requestOperation('invalid-sort', '不正な並べ替え項目', 'GET', '/items?sort=unknown'),
    requestOperation('invalid-method', '許可されていない操作', 'POST', '/items')
  ], '/items'),
  web43: requestProcessOperationsProfile(43343, ['api/src/server.js'], [
    requestOperation('missing-key', 'キーなしで登録', 'POST', '/orders', [], {
      body: { name: 'キーなしの注文' }
    }),
    requestOperation('first', '同じキーで初回登録', 'POST', '/orders', [], {
      headers: { 'Idempotency-Key': 'studyhub-web43-a' },
      body: { name: '同じ注文' }
    }),
    requestOperation('replay', '同じキーと内容で再送', 'POST', '/orders', [], {
      headers: { 'Idempotency-Key': 'studyhub-web43-a' },
      body: { name: '同じ注文' }
    }),
    requestOperation('conflict', '同じキーで異なる内容を送信', 'POST', '/orders', [], {
      headers: { 'Idempotency-Key': 'studyhub-web43-a' },
      body: { name: '異なる注文' }
    }),
    requestOperation('new-key', '別のキーで登録', 'POST', '/orders', [], {
      headers: { 'Idempotency-Key': 'studyhub-web43-b' },
      body: { name: '別の注文' }
    })
  ]),
  web48: requestProcessOperationsProfile(43348, ['api/src/server.js'], [
    requestOperation('create', 'ジョブを受け付ける', 'POST', '/jobs'),
    requestOperation('create-failed', '失敗するジョブを受け付ける', 'POST', '/jobs/fail'),
    requestOperation('status', 'ジョブの状態を確認する', 'GET', '/jobs/{id}', [
      requestInput('id', 'ジョブID', 'path', {
        required: true,
        placeholder: '登録結果のidを入力'
      })
    ]),
    requestOperation('missing', '存在しないジョブを確認する', 'GET', '/jobs/not-found')
  ]),
  web49: requestProcessOperationsProfile(43349, ['api/src/server.js'], [
    requestOperation('success', '正常応答', 'GET', '/?mode=success'),
    requestOperation('slow', '遅い応答を1秒で打ち切る', 'GET', '/?mode=slow', [], {
      timeoutMilliseconds: 1000
    }),
    requestOperation('temporary', '一時エラーを再試行する', 'GET', '/?mode=temporary&key=studyhub', [], {
      retry: {
        maxAttempts: 3,
        delayMilliseconds: 100,
        statusCodes: [503]
      }
    }),
    requestOperation('permanent', '恒久エラーを確認する', 'GET', '/?mode=permanent')
  ]),
  security01: requestProcessOperationsProfile(4101, ['app/server.js'], [
    requestOperation('before-login', 'ログイン前の本人情報を確認', 'GET', '/me'),
    requestOperation('invalid-login', '誤ったパスワードを拒否', 'POST', '/login', [], {
      body: { userId: 'u-demo', password: 'wrong-password' }
    }),
    requestOperation('login', 'ログインしてSessionを作成', 'POST', '/login', [], {
      body: { userId: 'u-demo', password: 'passw0rd' }
    }),
    requestOperation('after-login', 'ログイン後の本人情報を確認', 'GET', '/me'),
    requestOperation('logout', 'ログアウトしてSessionを削除', 'POST', '/logout'),
    requestOperation('after-logout', 'ログアウト後の本人情報を確認', 'GET', '/me')
  ], '/me'),
  security02: requestProcessOperationsProfile(4102, ['app/server.js'], [
    requestOperation('invalid-login', '誤ったパスワードでJWT発行を拒否', 'POST', '/token', [], {
      body: { userId: 'u-demo', password: 'wrong-password' }
    }),
    requestOperation('issue-token', 'ログインしてJWTを発行', 'POST', '/token', [], {
      body: { userId: 'u-demo', password: 'passw0rd' }
    }),
    requestOperation('valid-token', '正常なJWTを検証', 'GET', '/demo/valid'),
    requestOperation('tampered-token', '改ざんしたJWTを拒否', 'GET', '/demo/tampered'),
    requestOperation('expired-token', '期限切れJWTを拒否', 'GET', '/demo/expired'),
    requestOperation('missing-token', 'JWTなしの要求を拒否', 'GET', '/profile')
  ], '/demo/valid'),
  security03: requestProcessOperationsProfile(4103, ['app/server.js'], [
    requestOperation('unauthenticated', '利用者不明の要求を拒否', 'GET', '/orders'),
    requestOperation('viewer-read', 'viewerで注文を閲覧', 'GET', '/orders', [], {
      headers: { 'X-User': 'v-viewer' }
    }),
    requestOperation('viewer-cancel', 'viewerの注文取消を拒否', 'POST', '/orders/o-100/cancel', [], {
      headers: { 'X-User': 'v-viewer' }
    }),
    requestOperation('operator-cancel', 'operatorで注文を取消', 'POST', '/orders/o-100/cancel', [], {
      headers: { 'X-User': 'o-operator' }
    })
  ], '/demo'),
  security04: requestProcessOperationsProfile(4104, ['app/server.js'], [
    requestOperation('unauthenticated', '認証なしの注文閲覧を拒否', 'GET', '/orders/o-200'),
    requestOperation('alice-read-sales', 'aliceがsales注文を閲覧', 'GET', '/orders/o-200', [], {
      headers: { 'X-User': 'alice' }
    }),
    requestOperation('alice-update-draft', 'aliceがdraft注文を更新', 'PATCH', '/orders/o-200', [], {
      headers: { 'X-User': 'alice' },
      body: { note: 'StudyHubで更新' }
    }),
    requestOperation('alice-read-updated', '更新した注文を再取得', 'GET', '/orders/o-200', [], {
      headers: { 'X-User': 'alice' }
    }),
    requestOperation('bob-read-sales', 'bobのsales注文閲覧を拒否', 'GET', '/orders/o-200', [], {
      headers: { 'X-User': 'bob' }
    }),
    requestOperation('bob-read-support', 'bobがsupport注文を閲覧', 'GET', '/orders/o-201', [], {
      headers: { 'X-User': 'bob' }
    }),
    requestOperation('bob-update-confirmed', 'bobのconfirmed注文更新を拒否', 'PATCH', '/orders/o-201', [], {
      headers: { 'X-User': 'bob' },
      body: { note: '更新不可' }
    }),
    requestOperation('admin-read-support', 'adminがsupport注文を閲覧', 'GET', '/orders/o-201', [], {
      headers: { 'X-User': 'admin' }
    }),
    requestOperation('missing-order', '存在しない注文を確認', 'GET', '/orders/o-999', [], {
      headers: { 'X-User': 'alice' }
    })
  ], '/orders/o-200'),
  security07: requestProcessOperationsProfile(4107, ['app/server.js'], [
    requestOperation('reset-demo', '確認状態を初期化', 'POST', '/demo/reset'),
    requestOperation('without-session', 'Cookieなしの送信を拒否', 'POST', '/transfer', [], {
      body: { csrf: 'not-issued' }
    }),
    requestOperation('issue-token', 'CookieとCSRF tokenを発行', 'GET', '/token'),
    requestOperation('without-token', 'CSRF tokenなしの送信を拒否', 'POST', '/transfer', [], {
      body: {}
    }),
    requestOperation('valid-transfer', '発行されたtokenで送信', 'POST', '/transfer', [
      requestInput('csrf', '発行結果のtoken', 'body', {
        required: true,
        placeholder: 'tokenを貼り付ける'
      })
    ]),
    requestOperation('reuse-token', '同じtokenの再利用を拒否', 'POST', '/transfer', [
      requestInput('csrf', '使用済みのtoken', 'body', {
        required: true,
        placeholder: '直前に使用したtokenを貼り付ける'
      })
    ])
  ], '/demo'),
  security11: requestProcessOperationsProfile(4111, ['app/server.js'], [
    requestOperation('valid-signature', '正しい署名を受け付ける', 'POST', '/demo/valid'),
    requestOperation('tampered-body', '改ざんされた本文を拒否', 'POST', '/demo/tampered'),
    requestOperation('expired-timestamp', '期限切れの送信を拒否', 'POST', '/demo/expired'),
    requestOperation('missing-event-id', 'イベントID不足を拒否', 'POST', '/demo/missing-event-id'),
    requestOperation('replay-event', '同じイベントIDの再送を拒否', 'POST', '/demo/replay'),
    requestOperation('body-too-large', '64KiBを超える本文を拒否', 'POST', '/demo/body-too-large')
  ], '/health'),
  security13: requestProcessOperationsProfile(4113, ['app/server.js'], [
    requestOperation('burst-limit', '3回許可・4回目拒否', 'GET', '/demo/burst'),
    requestOperation('reset-window', '時間窓のリセット', 'GET', '/demo/reset-window'),
    requestOperation('key-isolation', '利用者ごとの回数分離', 'GET', '/demo/key-isolation'),
    requestOperation('single-request', '1回の要求と残り回数', 'GET', '/', [], {
      headers: { 'X-Demo-User': 'studyhub' }
    })
  ], '/health'),
  security14: requestProcessOperationsProfile(4114, ['app/server.js'], [
    requestOperation('allowed-preflight', '許可された事前確認', 'OPTIONS', '/', [], {
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    }),
    requestOperation('denied-origin', '許可されていない接続元', 'OPTIONS', '/', [], {
      headers: {
        Origin: 'https://not-allowed.example',
        'Access-Control-Request-Method': 'POST'
      }
    }),
    requestOperation('denied-method', '許可されていないメソッド', 'OPTIONS', '/', [], {
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'DELETE'
      }
    }),
    requestOperation('denied-header', '許可されていない要求ヘッダー', 'OPTIONS', '/', [], {
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'X-Internal-Secret'
      }
    }),
    requestOperation('allowed-get', '許可されたGET要求', 'GET', '/', [], {
      headers: { Origin: 'http://localhost:5173' }
    })
  ], '/health'),
  security15: requestProcessOperationsProfile(4115, ['app/server.js'], [
    requestOperation('protected-response', '防御ヘッダーあり', 'GET', '/'),
    requestOperation('unprotected-response', '比較用: 防御ヘッダーなし', 'GET', '/without-security-headers')
  ], '/health'),
  devops06: profile(43406, ['server.js'], 'GET', '/', {
    headers: { 'X-Request-Id': 'studyhub-request-01' }
  }),
  devops07: profile(43407, ['server.js'], 'GET', '/ready'),
  aws06: requestProcessOperationsProfile(43506, ['app/server.js'], [
    requestOperation('normal-request', '正常な要求', 'GET', '/health', [], {
      headers: { 'x-request-id': 'aws06-normal-001' }
    }),
    requestOperation('error-request', 'エラーになった要求', 'GET', '/error', [], {
      headers: { 'x-request-id': 'aws06-error-001' }
    }),
    requestOperation('sensitive-request', '機密値を残さない要求', 'GET', '/sensitive?token=local-example-secret&email=learner@example.com', [], {
      headers: { 'x-request-id': 'aws06-sensitive-001' }
    })
  ], '/health'),
  aws08: requestProcessOperationsProfile(43508, ['scripts/local_api.js'], [
    requestOperation('list-items', 'item一覧を取得', 'GET', '/items'),
    requestOperation('get-item', 'pathとqueryからitemを取得', 'GET', '/items/item-1?include=source'),
    requestOperation('create-item', 'itemを登録', 'POST', '/items', [], {
      body: { name: 'StudyHub item' }
    }),
    requestOperation('missing-name', 'nameなしで登録', 'POST', '/items', [], { body: {} }),
    requestOperation('invalid-json', '壊れたJSONを送信', 'POST', '/items', [], { body: '{' }),
    requestOperation('missing-route', '存在しない経路を取得', 'GET', '/missing')
  ], '/items'),
  base10: requestProcessOperationsProfile(43610, ['src/server.js'], [
    requestOperation('health', '起動確認（200）', 'GET', '/health'),
    requestOperation('list', '項目一覧（200）', 'GET', '/items'),
    requestOperation('create', '項目登録（201）', 'POST', '/items', [], {
      body: { name: 'StudyHubから登録した項目' }
    }),
    requestOperation('bad-request', '名前なしで登録（400）', 'POST', '/items', [], {
      body: {}
    }),
    requestOperation('unauthorized', '認証情報なし（401）', 'GET', '/private'),
    requestOperation('forbidden', '権限不足（403）', 'GET', '/forbidden'),
    requestOperation('not-found', '存在しないURL（404）', 'GET', '/missing'),
    requestOperation('method-not-allowed', '許可されていないHTTPメソッド（405）', 'POST', '/health'),
    requestOperation('payload-too-large', '大きすぎる本文（413）', 'POST', '/items', [], {
      body: { name: 'x'.repeat(160) }
    }),
    requestOperation('unsupported-media-type', '対応していないContent-Type（415）', 'POST', '/items', [], {
      headers: { 'Content-Type': 'text/plain' },
      body: { name: 'text request' }
    }),
    requestOperation('server-error', 'API内部のエラー（500）', 'GET', '/error'),
    requestOperation('bad-gateway', '接続先サービスのエラー（502）', 'GET', '/upstream-error')
  ])
};

const webProcessProfiles = {
  system15: {
    cwd: 'category/StudyAI/src/apps/system15_book_summarization_bridge',
    args: ['app/server.js'],
    port: 43715,
    healthPath: '/health'
  },
  web45: {
    cwd: 'category/StudyWeb/src/frontend/static/studyweb/systems/web45_optimistic_lock/app',
    args: ['server.js'],
    port: 43345,
    healthPath: '/api/record'
  },
  web46: {
    cwd: 'category/StudyWeb/src/frontend/static/studyweb/systems/web46_csv_upload/app',
    args: ['server.js'],
    port: 43346,
    healthPath: '/api/health'
  }
};

const commandOneShotProfiles = {
  system45: commandOperationsProfile(
    'category/StudyAI/src/apps/system45_agent_skill_packaging',
    [
      commandOperation('valid-input', '正常な入力例を検証', [
        nodeCommand('valid-input', [
          'sample_skill/scripts/validate_input.js',
          'sample_skill/references/examples.md'
        ])
      ]),
      commandOperation('missing-fields', '必須項目の不足を検出', [
        nodeCommand('missing-fields', [
          'sample_skill/scripts/validate_input.js',
          'sample_skill/references/missing_fields.md'
        ], { allowFailure: true })
      ]),
      commandOperation('sensitive-input', '秘密情報を含む入力を拒否', [
        nodeCommand('sensitive-input', [
          'sample_skill/scripts/validate_input.js',
          'sample_skill/references/sensitive_input.md'
        ], { allowFailure: true })
      ])
    ]
  ),
  system46: commandProfile(
    'category/StudyAI/src/apps/system46_ai_harness_engineering',
    [
      nodeCommand('check-forbidden-operations', [
        'checks/check_no_forbidden_ops.js',
        'fixtures/task_success.json'
      ]),
      nodeCommand('check-output-schema', [
        'checks/check_output_schema.js',
        'samples/expected_output.md'
      ])
    ]
  ),
  system48: commandOperationsProfile(
    'category/StudyAI/src/apps/system48_local_llm_agent_organization',
    [
      commandOperation('mock-success', '通常作業を模擬実行', [
        nodeCommand('mock-success', ['scripts/run_organization.js', 'mock', 'fixtures/task_success.json'])
      ]),
      commandOperation('mock-approval', '承認対象を模擬実行', [
        nodeCommand('mock-approval', ['scripts/run_organization.js', 'mock', 'fixtures/task_needs_approval.json'])
      ]),
      commandOperation('mock-missing-context', '情報不足を模擬実行', [
        nodeCommand('mock-missing-context', ['scripts/run_organization.js', 'mock', 'fixtures/task_missing_context.json'])
      ]),
      commandOperation('local-llm', 'LM Studioで実行', [
        nodeCommand('local-llm', ['scripts/run_organization.js', 'local_llm', 'fixtures/task_success.json'])
      ]),
      commandOperation('check-task-board', 'タスクボードを検証', [
        nodeCommand('check-task-board', ['checks/check_task_board.js', 'samples/task_board.json'])
      ]),
      commandOperation('check-success-task', '通常作業の入力を検証', [
        nodeCommand('check-success-task', ['checks/check_task_fixture.js', 'fixtures/task_success.json', 'success'])
      ]),
      commandOperation('check-approval-task', '承認が必要な作業を検証', [
        nodeCommand('check-approval-task', ['checks/check_task_fixture.js', 'fixtures/task_needs_approval.json', 'needs_approval'])
      ]),
      commandOperation('check-missing-context-task', '情報不足の作業を検証', [
        nodeCommand('check-missing-context-task', ['checks/check_task_fixture.js', 'fixtures/task_missing_context.json', 'missing_context'])
      ]),
      commandOperation('check-role-outputs', '役割別成果物を検証', [
        nodeCommand('check-role-outputs', ['checks/check_role_outputs.js', 'samples'])
      ]),
      commandOperation('check-approval-boundary', '承認境界を検証', [
        nodeCommand('check-approval-boundary', ['checks/check_approval_boundary.js', 'fixtures/task_needs_approval.json', 'samples'])
      ])
    ],
    {
      environment: ['Node.js', 'LM Studio（5858番、チャット用モデル。模擬実行はLM Studio不要）'],
      timeoutSeconds: 1800
    }
  ),
  security05: commandOperationsProfile(
    'category/StudySecurity/src/backend/src/studysecurity/systems/security05_input_validation',
    [
      commandOperation('validation-demo', '商品とCSVの入力検証を実行', [
        nodeCommand('validation-demo', ['app/server.js'])
      ]),
      commandOperation('boundary-tests', '境界値と異常値の自動テストを実行', [
        npmCommand('boundary-tests', ['test'])
      ])
    ]
  ),
  security06: commandOperationsProfile(
    'category/StudySecurity/src/backend/src/studysecurity/systems/security06_sql_injection',
    [
      commandOperation('attack-input', '攻撃文字列の危険・安全なSQLを比較', [
        nodeCommand('attack-input', ['app/demo.js', 'attack'])
      ]),
      commandOperation('name-only', '商品名だけの検索条件を確認', [
        nodeCommand('name-only', ['app/demo.js', 'name-only'])
      ]),
      commandOperation('status-only', '状態だけの検索条件を確認', [
        nodeCommand('status-only', ['app/demo.js', 'status-only'])
      ])
    ]
  ),
  security10: commandOperationsProfile(
    'category/StudySecurity/src/backend/src/studysecurity/systems/security10_secret_management',
    [
      commandOperation('missing-settings', '秘密情報が未設定の失敗を確認', [
        nodeCommand('missing-settings', ['app/config.js', 'expect-missing'])
      ]),
      commandOperation('configured-settings', '秘密情報を設定した成功を確認', [
        nodeCommand('configured-settings', ['app/config.js'], {
          env: {
            APP_SECRET: 'example-studyhub-local-app-secret',
            WEBHOOK_SECRET: 'example-studyhub-local-webhook-secret'
          }
        })
      ])
    ]
  ),
  security12: commandOperationsProfile(
    'category/StudySecurity/src/backend/src/studysecurity/systems/security12_audit_log',
    [
      commandOperation('all-events', '成功と拒否の監査ログを比較', [
        nodeCommand('all-events', ['app/demo.js', 'all'])
      ]),
      commandOperation('success-event', '成功した操作の監査ログを確認', [
        nodeCommand('success-event', ['app/demo.js', 'success'])
      ]),
      commandOperation('denied-event', '拒否された操作とマスクを確認', [
        nodeCommand('denied-event', ['app/demo.js', 'denied'])
      ])
    ]
  ),
  security16: commandOperationsProfile(
    'category/StudySecurity/src/backend/src/studysecurity/systems/security16_dependency_management',
    [
      commandOperation('full-plan', '監査結果と対応候補', [
        nodeCommand('full-plan', ['app/audit_report_parser.js', 'full'])
      ]),
      commandOperation('severity-summary', '重要度別の件数', [
        nodeCommand('severity-summary', ['app/audit_report_parser.js', 'summary'])
      ]),
      commandOperation('sorted-actions', '重要度順の対応候補', [
        nodeCommand('sorted-actions', ['app/audit_report_parser.js', 'actions'])
      ]),
      commandOperation('invalid-report', '不正な監査結果を拒否', [
        nodeCommand('invalid-report', ['app/audit_report_parser.js', 'invalid'])
      ])
    ]
  ),
  security19: packageCommandProfile([nodeCommand('data-retention-demo', ['app/demo.js'])]),
  security20: packageCommandProfile([nodeCommand('pii-masking-demo', ['app/demo.js'])]),
  security21: packageCommandProfile([nodeCommand('content-moderation-demo', ['app/demo.js'])]),
  devops01: packageCommandProfile([npmCommand('build-check', ['run', 'check'])]),
  devops02: packageCommandProfile([npmCommand('quality-check', ['run', 'check'])]),
  aws01: commandOperationsProfile(
    'category/StudyAWS/src/backend/src/studyaws/systems/aws01_iam_basics',
    [
      commandOperation('allowed-actions', '許可された操作', [
        nodeCommand('allowed-actions', ['app/policy_check.js', 'allow'])
      ]),
      commandOperation('implicit-deny', '許可の記述がない操作', [
        nodeCommand('implicit-deny', ['app/policy_check.js', 'implicit-deny'])
      ]),
      commandOperation('explicit-deny', '明示的に拒否された操作', [
        nodeCommand('explicit-deny', ['app/policy_check.js', 'explicit-deny'])
      ]),
      commandOperation('admin-risk', '管理者権限の危険性', [
        nodeCommand('admin-risk', ['app/policy_check.js', 'admin-risk'])
      ])
    ]
  ),
  aws05: commandOperationsProfile(
    'category/StudyAWS/src/backend/src/studyaws/systems/aws05_s3_file_storage',
    [
      commandOperation('save-read', '保存して読み出す', [
        nodeCommand('save-read', ['app/storage.js', 'save-read'], { temporaryDirectoryEnv: 'STUDYAWS_STORAGE_ROOT' })
      ]),
      commandOperation('list-objects', 'object一覧', [
        nodeCommand('list-objects', ['app/storage.js', 'list-objects'], { temporaryDirectoryEnv: 'STUDYAWS_STORAGE_ROOT' })
      ]),
      commandOperation('delete-object', 'objectを削除', [
        nodeCommand('delete-object', ['app/storage.js', 'delete-object'], { temporaryDirectoryEnv: 'STUDYAWS_STORAGE_ROOT' })
      ]),
      commandOperation('metadata-access', 'metadataと公開範囲', [
        nodeCommand('metadata-access', ['app/storage.js', 'metadata-access'], { temporaryDirectoryEnv: 'STUDYAWS_STORAGE_ROOT' })
      ]),
      commandOperation('reject-unsafe-key', '危険なkeyを拒否', [
        nodeCommand('reject-unsafe-key', ['app/storage.js', 'reject-unsafe-key'], { temporaryDirectoryEnv: 'STUDYAWS_STORAGE_ROOT' })
      ])
    ]
  ),
  aws07: commandOperationsProfile(
    'category/StudyAWS/src/backend/src/studyaws/systems/aws07_lambda_local_api',
    [
      commandOperation('valid-event', '正常なeventを渡す', [
        nodeCommand('valid-event', ['scripts/local_invoke.js', 'valid-event'])
      ]),
      commandOperation('missing-name', 'nameがないeventを渡す', [
        nodeCommand('missing-name', ['scripts/local_invoke.js', 'missing-name'])
      ]),
      commandOperation('runtime-settings', '環境変数・memory・timeout相当', [
        nodeCommand('runtime-settings', ['scripts/local_invoke.js', 'runtime-settings'])
      ])
    ]
  ),
  aws10: commandOperationsProfile(
    'category/StudyAWS/src/backend/src/studyaws/systems/aws10_backup_restore',
    [
      commandOperation('backup', 'バックアップを作成', [
        nodeCommand('backup', ['scripts/recovery_drill.js', 'backup'], { temporaryDirectoryEnv: 'STUDYAWS_BACKUP_ROOT' })
      ]),
      commandOperation('restore-dry-run', '復元前確認', [
        nodeCommand('restore-dry-run', ['scripts/recovery_drill.js', 'dry-run'], { temporaryDirectoryEnv: 'STUDYAWS_BACKUP_ROOT' })
      ]),
      commandOperation('restore', '変更後のデータを復元', [
        nodeCommand('restore', ['scripts/recovery_drill.js', 'restore'], { temporaryDirectoryEnv: 'STUDYAWS_BACKUP_ROOT' })
      ]),
      commandOperation('missing-backup', 'バックアップなしを確認', [
        nodeCommand('missing-backup', ['scripts/recovery_drill.js', 'missing-backup'], { temporaryDirectoryEnv: 'STUDYAWS_BACKUP_ROOT' })
      ])
    ]
  ),
  base06: commandOperationsProfile('category/StudyBase', [
    commandOperation('clean-state', '変更前の状態を確認', [
      nodeCommand('clean-state', ['scripts/base06-git-practice.mjs', 'clean-state'])
    ]),
    commandOperation('unstaged-diff', '未ステージの差分を確認', [
      nodeCommand('unstaged-diff', ['scripts/base06-git-practice.mjs', 'unstaged-diff'])
    ]),
    commandOperation('staged-diff', 'ステージ済みの差分を確認', [
      nodeCommand('staged-diff', ['scripts/base06-git-practice.mjs', 'staged-diff'])
    ]),
    commandOperation('commit-history', 'コミットと履歴を確認', [
      nodeCommand('commit-history', ['scripts/base06-git-practice.mjs', 'commit-history'])
    ]),
    commandOperation('ignored-file', '除外ファイルを確認', [
      nodeCommand('ignored-file', ['scripts/base06-git-practice.mjs', 'ignored-file'])
    ]),
    commandOperation('all-states', 'すべての状態を順番に確認', [
      nodeCommand('all-states', ['scripts/base06-git-practice.mjs', 'all-states'])
    ])
  ]),
  base07: commandOperationsProfile('category/StudyBase', [
    commandOperation('branch-creation', 'ブランチを作成', [
      nodeCommand('branch-creation', ['scripts/base07-git-conflict-practice.mjs', 'branch-creation'])
    ]),
    commandOperation('branch-commits', 'ブランチ別のコミットを確認', [
      nodeCommand('branch-commits', ['scripts/base07-git-conflict-practice.mjs', 'branch-commits'])
    ]),
    commandOperation('conflict-reproduction', '競合を発生', [
      nodeCommand('conflict-reproduction', ['scripts/base07-git-conflict-practice.mjs', 'conflict-reproduction'])
    ]),
    commandOperation('conflict-resolution', '競合を解消', [
      nodeCommand('conflict-resolution', ['scripts/base07-git-conflict-practice.mjs', 'conflict-resolution'])
    ]),
    commandOperation('resolution-check', '解消後を確認', [
      nodeCommand('resolution-check', ['scripts/base07-git-conflict-practice.mjs', 'resolution-check'])
    ]),
    commandOperation('all-steps', 'すべての手順を確認', [
      nodeCommand('all-steps', ['scripts/base07-git-conflict-practice.mjs', 'all-steps'])
    ])
  ]),
  base09: commandOperationsProfile(
    'category/StudyBase/src/samples/base09_npm_scripts/sample_node_project',
    [
      commandOperation('development', 'devを実行', [
        npmCommand('development', ['run', 'dev'])
      ]),
      commandOperation('build', 'buildを実行', [
        npmCommand('build', ['run', 'build'])
      ]),
      commandOperation('test', 'testを実行', [
        npmCommand('test', ['test'])
      ]),
      commandOperation('start', 'startを実行', [
        npmCommand('start', ['start'])
      ]),
      commandOperation('missing-script', '存在しないscriptのエラーを確認', [
        npmCommand('missing-script', ['--logs-max=0', 'run', 'missing-script'], { allowFailure: true })
      ])
    ]
  )
};

const commandStackProfiles = {
  system47: commandStackProfile(
    'category/StudyAI/src/apps/system47_sales_data_analysis_ai',
    [
      dockerCommand('previous-environment-cleanup', [
        'compose', '-p', 'studyhub-system47', 'down', '--volumes', '--remove-orphans'
      ], { execution: 'task', allowFailure: true }),
      dockerCommand('database', [
        'compose', '-p', 'studyhub-system47', 'up', '-d', '--wait', '--wait-timeout', '60', 'db'
      ], { execution: 'task' }),
      dockerCommand('schema', [
        'compose', '-p', 'studyhub-system47', 'exec', '-T', 'db',
        'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'system47', '-d', 'system47', '-f', '-'
      ], {
        execution: 'task',
        stdinFile: 'category/StudyAI/src/apps/system47_sales_data_analysis_ai/sql/001_schema.sql'
      }),
      dockerCommand('seed', [
        'compose', '-p', 'studyhub-system47', 'exec', '-T', 'db',
        'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'system47', '-d', 'system47', '-f', '-'
      ], {
        execution: 'task',
        stdinFile: 'category/StudyAI/src/apps/system47_sales_data_analysis_ai/sql/002_seed.sql'
      })
    ],
    commandOperationsRun([
      commandOperation('monthly-sales', '月別売上をSQLで集計', [
        nodeCommand('monthly-sales', ['scripts/sql_analysis.js', 'monthly'])
      ]),
      commandOperation('product-sales', '商品別売上をSQLで集計', [
        nodeCommand('product-sales', ['scripts/sql_analysis.js', 'product'])
      ]),
      commandOperation('customer-sales', '顧客区分別売上をSQLで集計', [
        nodeCommand('customer-sales', ['scripts/sql_analysis.js', 'customer'])
      ]),
      commandOperation('ai-explanation', 'SQL集計をAIで説明', [
        nodeCommand('ai-explanation', ['scripts/explain_sales.js'])
      ]),
      commandOperation('unsafe-sql', '更新SQLを拒否', [
        nodeCommand('unsafe-sql', ['checks/readonly_sql_check.js', 'sql/unsafe_update_sample.sql'], {
          allowFailure: true
        })
      ])
    ]),
    [
      dockerCommand('compose-down', [
        'compose', '-p', 'studyhub-system47', 'down', '--volumes', '--remove-orphans'
      ], { execution: 'task', allowFailure: true })
    ],
    ['Docker Desktop', 'Node.js', 'LM Studio（5858番、チャット用モデル。SQL集計はLM Studio不要）'],
    300
  ),
  web18: commandStackProfile(
    'category/StudyWeb/src/backend/src/studyweb/systems/web18_seed_and_migration',
    [
      dockerCommand('database', [
        'compose', '-p', 'studyhub-web18', 'up', '-d', '--wait', '--wait-timeout', '60', 'db'
      ], { execution: 'task' })
    ],
    commandOperationsRun([
      commandOperation('migration', 'Migrationを実行', [
        dockerCommand('migration', [
          'compose', '-p', 'studyhub-web18', 'run', '--rm',
          'migrate', 'npx', 'prisma', 'migrate', 'dev', '--name', 'studyhub'
        ])
      ]),
      commandOperation('migration-status', 'Migration状態を表示', [
        dockerCommand('migration-status', [
          'compose', '-p', 'studyhub-web18', 'run', '--rm',
          'migrate', 'npx', 'prisma', 'migrate', 'status'
        ])
      ]),
      commandOperation('seed', 'Seedを実行', [
        dockerCommand('seed', [
          'compose', '-p', 'studyhub-web18', 'run', '--rm', 'seed'
        ])
      ]),
      commandOperation('database-contents', 'DB内容と件数を表示', [
        dockerCommand('category-counts', [
          'compose', '-p', 'studyhub-web18', 'exec', '-T', 'db',
          'psql', '-U', 'postgres', '-d', 'web18', '-c',
          'SELECT c.name, COUNT(t.id) AS task_count FROM "Category" c LEFT JOIN "Task" t ON t."categoryId" = c.id GROUP BY c.id, c.name ORDER BY c.name;'
        ]),
        dockerCommand('tasks-with-category', [
          'compose', '-p', 'studyhub-web18', 'exec', '-T', 'db',
          'psql', '-U', 'postgres', '-d', 'web18', '-c',
          'SELECT t.title, t.done, c.name AS category FROM "Task" t JOIN "Category" c ON c.id = t."categoryId" ORDER BY t.title;'
        ])
      ])
    ]),
    [
      dockerCommand('compose-down', [
        'compose', '-p', 'studyhub-web18', 'down', '--remove-orphans'
      ], { execution: 'task', allowFailure: true })
    ],
    ['Docker Desktop'],
    180
  ),
  web51: studyDbStack('web51', commandOperationsRun([
    commandOperation('prepare', '比較用データを準備', [
      studyDbSqlFile('web51', 'schema',
        'category/StudyWeb/src/backend/src/studyweb/systems/web51_index_search_comparison/db/schema.sql'),
      studyDbSqlFile('web51', 'seed',
        'category/StudyWeb/src/backend/src/studyweb/systems/web51_index_search_comparison/db/seed.sql')
    ]),
    commandOperation('before-index', '索引作成前を計測', [
      studyDbSqlCommand('web51', 'analyze-before', 'ANALYZE products;'),
      studyDbSqlCommand('web51', 'explain-before',
        "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM products WHERE name = 'product-9999';")
    ]),
    commandOperation('create-index', '索引を作成', [
      studyDbSqlCommand('web51', 'create-index',
        'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);')
    ]),
    commandOperation('after-index', '索引作成後を計測', [
      studyDbSqlCommand('web51', 'analyze-after', 'ANALYZE products;'),
      studyDbSqlCommand('web51', 'explain-after',
        "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM products WHERE name = 'product-9999';")
    ])
  ])),
  devops03: commandStackProfile(
    'category/StudyDevOps/src/apps/devops03_api_test',
    [
      dockerCommand('build', ['compose', '-p', 'studyhub-devops03', 'build', 'api', 'test'], {
        execution: 'task'
      }),
      dockerCommand('api', ['compose', '-p', 'studyhub-devops03', 'up', '-d', 'api'], {
        execution: 'task',
        healthUrl: 'http://127.0.0.1:18083/health'
      })
    ],
    commandRun([
      dockerCommand('api-test', ['compose', '-p', 'studyhub-devops03', 'run', '--rm', 'test'])
    ]),
    [
      dockerCommand('compose-down', [
        'compose', '-p', 'studyhub-devops03', 'down', '--volumes', '--remove-orphans'
      ], { execution: 'task', allowFailure: true })
    ],
    ['Docker Desktop'],
    120
  ),
  devops04: commandStackProfile(
    'category/StudyDevOps/src/apps/devops04_playwright_e2e',
    [
      nodeCommand('web', ['app/src/server.js'], {
        healthUrl: 'http://127.0.0.1:5174/'
      })
    ],
    commandRun([npmCommand('playwright-test', ['run', 'test:e2e'])]),
    [],
    ['Node.js', 'テーマの依存パッケージ', 'Playwright Chromium'],
    120
  ),
  devops05: commandStackProfile(
    'category/StudyDevOps/src/apps/devops05_db_ci',
    [
      dockerCommand('build-test', ['compose', '-p', 'studyhub-devops05', 'build', 'test'], {
        execution: 'task'
      }),
      dockerCommand('database', [
        'compose', '-p', 'studyhub-devops05', 'up', '-d', '--wait', '--wait-timeout', '60', 'db'
      ], { execution: 'task' })
    ],
    commandRun([
      dockerCommand('database-test', [
        'compose', '-p', 'studyhub-devops05', 'run', '--rm', 'test'
      ])
    ]),
    [
      dockerCommand('compose-down', [
        'compose', '-p', 'studyhub-devops05', 'down', '--volumes', '--remove-orphans'
      ], { execution: 'task', allowFailure: true })
    ],
    ['Docker Desktop'],
    180
  ),
  devops08: commandStackProfile(
    'category/StudyDevOps/src/apps/devops08_docker_logs_investigation',
    [
      dockerCommand('applications', [
        'compose', '-p', 'studyhub-devops08', 'up', '-d', '--build'
      ], {
        execution: 'task',
        healthUrl: 'http://127.0.0.1:18088/work'
      })
    ],
    requestRun('GET', 'http://127.0.0.1:18089/work', {
      headers: { 'X-Request-Id': 'studyhub-investigation-01' }
    }),
    [
      dockerCommand('compose-down', [
        'compose', '-p', 'studyhub-devops08', 'down', '--remove-orphans'
      ], { execution: 'task', allowFailure: true })
    ],
    ['Docker Desktop'],
    180
  ),
  aws02: commandStackProfile(
    'category/StudyAWS/src/backend/src/studyaws/systems/aws02_security_group_port',
    [
      dockerCommand('network', ['compose', '--parallel', '1', '-p', 'studyhub-aws02', 'up', '-d'], {
        execution: 'task',
        env: { STUDYHUB_HOST_PORT: '43102' },
        healthUrl: 'http://127.0.0.1:43102/'
      })
    ],
    commandOperationsRun([
      commandOperation('public-web', 'ホストへ公開したWeb', [
        nodeCommand('public-web', ['scripts/check_host_port.js', 'public'])
      ]),
      commandOperation('internal-api', 'コンテナ間だけのAPI', [
        dockerCommand('internal-api', [
          'compose', '--parallel', '1', '-p', 'studyhub-aws02', 'exec', '-T', 'web',
          'node', '-e',
          "fetch('http://api:5102').then(async response => { console.log(JSON.stringify({ reachable: true, status: response.status, body: await response.json() }, null, 2)); if (!response.ok) process.exitCode = 1; })"
        ])
      ]),
      commandOperation('internal-database', 'APIからDBへの内部通信', [
        dockerCommand('internal-database', [
          'compose', '--parallel', '1', '-p', 'studyhub-aws02', 'exec', '-T', 'web',
          'node', '-e',
          "fetch('http://api:5102/database').then(async response => { console.log(JSON.stringify({ reachable: true, status: response.status, body: await response.json() }, null, 2)); if (!response.ok) process.exitCode = 1; })"
        ])
      ]),
      commandOperation('private-api-host-port', 'ホストへ公開していないAPI', [
        nodeCommand('private-api-host-port', ['scripts/check_host_port.js', 'private-api'])
      ]),
      commandOperation('private-database-host-port', 'ホストへ公開していないDB', [
        dockerCommand('database-publishers', [
          'compose', '--parallel', '1', '-p', 'studyhub-aws02', 'ps', '--format', 'json', 'db'
        ]),
        nodeCommand('private-database-host-port', ['scripts/check_host_port.js', 'private-database'])
      ])
    ]),
    [
      dockerCommand('compose-down', [
        'compose', '--parallel', '1', '-p', 'studyhub-aws02', 'down', '--remove-orphans'
      ], { execution: 'task', allowFailure: true })
    ],
    ['Docker Desktop'],
    120
  ),
  aws03: commandStackProfile(
    'category/StudyAWS/src/backend/src/studyaws/systems/aws03_ec2_ssh',
    [
      dockerCommand('previous-container-cleanup', ['rm', '-f', 'studyhub-aws03'], {
        execution: 'task',
        allowFailure: true
      }),
      dockerCommand('image', ['build', '-t', 'studyhub-aws03', '.'], { execution: 'task' }),
      dockerCommand('server', [
        'run', '--rm', '-d', '--name', 'studyhub-aws03',
        '-p', '127.0.0.1:43103:4103', 'studyhub-aws03'
      ], {
        execution: 'task',
        healthUrl: 'http://127.0.0.1:43103/health'
      })
    ],
    commandOperationsRun([
      commandOperation('health-response', 'healthの正常応答', [
        nodeCommand('health-response', ['app/check_health.js', 'up'])
      ]),
      commandOperation('container-logs', 'コンテナのログ', [
        dockerCommand('container-logs', ['logs', '--tail', '20', 'studyhub-aws03'])
      ]),
      commandOperation('published-port', 'ホストへ公開したポート', [
        dockerCommand('published-port', ['port', 'studyhub-aws03'])
      ]),
      commandOperation('container-diagnostics', 'コンテナ内のprocessと環境', [
        dockerCommand('container-diagnostics', ['exec', 'studyhub-aws03', 'node', 'app/container_diagnostics.js'])
      ]),
      commandOperation('stop-failure-recovery', '停止中の接続失敗と復旧', [
        dockerCommand('stop-container', ['stop', 'studyhub-aws03']),
        nodeCommand('stopped-health', ['app/check_health.js', 'down']),
        dockerCommand('recreate-container', [
          'run', '--rm', '-d', '--name', 'studyhub-aws03',
          '-p', '127.0.0.1:43103:4103', 'studyhub-aws03'
        ]),
        nodeCommand('recovered-health', ['app/check_health.js', 'up'])
      ])
    ]),
    [
      dockerCommand('container-stop', ['stop', 'studyhub-aws03'], {
        execution: 'task',
        allowFailure: true
      })
    ],
    ['Docker Desktop'],
    180
  ),
  aws04: commandStackProfile(
    'category/StudyAWS/src/backend/src/studyaws/systems/aws04_rds_connection',
    [
      dockerCommand('previous-environment-cleanup', [
        'compose', '--parallel', '1', '-p', 'studyhub-aws04', 'down', '--volumes', '--remove-orphans'
      ], { execution: 'task', allowFailure: true }),
      dockerCommand('application-image', [
        'compose', '--parallel', '1', '-p', 'studyhub-aws04', 'build', 'app'
      ], { execution: 'task' }),
      dockerCommand('database', [
        'compose', '--parallel', '1', '-p', 'studyhub-aws04', 'up', '-d', '--wait', '--wait-timeout', '60', 'db'
      ], { execution: 'task' })
    ],
    commandOperationsRun([
      commandOperation('successful-connection', 'DB接続に成功', [
        dockerCommand('successful-connection', [
          'compose', '--parallel', '1', '-p', 'studyhub-aws04', 'run', '--rm',
          'app', 'node', 'app/db_check.js', 'successful-connection'
        ])
      ]),
      commandOperation('authentication-failure', 'パスワード誤りで認証失敗', [
        dockerCommand('authentication-failure', [
          'compose', '--parallel', '1', '-p', 'studyhub-aws04', 'run', '--rm', '-e', 'DB_PASSWORD=wrong-password',
          'app', 'node', 'app/db_check.js', 'authentication-failure'
        ])
      ]),
      commandOperation('network-failure', '接続先ポート誤りで通信失敗', [
        dockerCommand('network-failure', [
          'compose', '--parallel', '1', '-p', 'studyhub-aws04', 'run', '--rm', '-e', 'DB_PORT=6543',
          'app', 'node', 'app/db_check.js', 'network-failure'
        ])
      ])
    ]),
    [
      dockerCommand('compose-down', [
        'compose', '--parallel', '1', '-p', 'studyhub-aws04', 'down', '--volumes', '--remove-orphans'
      ], { execution: 'task', allowFailure: true })
    ],
    ['Docker Desktop'],
    180
  ),
  db02: studyDbStack('db02', commandOperationsRun([
    commandOperation('prepare', 'スキーマと初期データを準備', [
      studyDbSqlFile('db02', 'schema',
        'category/StudyDB/src/apps/db02_sql_crud_schema/sql/001_schema.sql'),
      studyDbSqlFile('db02', 'seed',
        'category/StudyDB/src/apps/db02_sql_crud_schema/sql/002_seed.sql')
    ]),
    commandOperation('crud', '検索・登録・更新・削除を確認', [
      studyDbSqlFile('db02', 'crud',
        'category/StudyDB/src/apps/db02_sql_crud_schema/sql/003_crud_examples.sql')
    ]),
    commandOperation('join', 'テーブルの結合結果を確認', [
      studyDbSqlFile('db02', 'join',
        'category/StudyDB/src/apps/db02_sql_crud_schema/sql/004_join_examples.sql')
    ]),
    commandOperation('duplicate-email', 'メールアドレスの重複拒否を確認', [
      studyDbSqlCommand('db02', 'duplicate-email',
        "INSERT INTO db02.customers (name, email) VALUES ('Duplicate', 'customer-a@example.test');",
        'studydb', { allowFailure: true })
    ]),
    commandOperation('missing-name', '必須項目の拒否を確認', [
      studyDbSqlCommand('db02', 'missing-name',
        "INSERT INTO db02.customers (name, email) VALUES (NULL, 'missing-name@example.test');",
        'studydb', { allowFailure: true })
    ]),
    commandOperation('missing-customer', '存在しない顧客参照の拒否を確認', [
      studyDbSqlCommand('db02', 'missing-customer',
        "INSERT INTO db02.orders (customer_id, status) VALUES (999, 'created');",
        'studydb', { allowFailure: true })
    ]),
    commandOperation('negative-price', '負の価格の拒否を確認', [
      studyDbSqlCommand('db02', 'negative-price',
        "INSERT INTO db02.products (name, price) VALUES ('Invalid Price', -1);",
        'studydb', { allowFailure: true })
    ]),
    commandOperation('zero-quantity', '数量0の拒否を確認', [
      studyDbSqlCommand('db02', 'zero-quantity',
        'INSERT INTO db02.order_items (order_id, product_id, quantity, unit_price) VALUES (1, 1, 0, 800.00);',
        'studydb', { allowFailure: true })
    ])
  ])),
  db04: studyDbStack('db04', [
    studyDbSqlFile('db04', 'schema',
      'category/StudyDB/src/apps/db04_transaction_lock_isolation/sql/001_schema.sql'),
    studyDbSqlFile('db04', 'seed',
      'category/StudyDB/src/apps/db04_transaction_lock_isolation/sql/002_seed.sql'),
    studyDbSqlFile('db04', 'commit-rollback',
      'category/StudyDB/src/apps/db04_transaction_lock_isolation/sql/003_commit_rollback.sql'),
    studyDbSqlFile('db04', 'isolation',
      'category/StudyDB/src/apps/db04_transaction_lock_isolation/sql/006_isolation_observation.sql')
  ]),
  db05: studyDbStack('db05', [
    studyDbSqlFile('db05', 'schema',
      'category/StudyDB/src/apps/db05_index_explain_performance/sql/001_schema.sql'),
    studyDbSqlFile('db05', 'small-seed',
      'category/StudyDB/src/apps/db05_index_explain_performance/sql/002_seed_small.sql'),
    studyDbSqlFile('db05', 'large-seed',
      'category/StudyDB/src/apps/db05_index_explain_performance/sql/003_seed_large.sql'),
    studyDbSqlFile('db05', 'explain-before',
      'category/StudyDB/src/apps/db05_index_explain_performance/sql/004_explain_without_index.sql'),
    studyDbSqlFile('db05', 'create-indexes',
      'category/StudyDB/src/apps/db05_index_explain_performance/sql/005_create_indexes.sql'),
    studyDbSqlFile('db05', 'explain-after',
      'category/StudyDB/src/apps/db05_index_explain_performance/sql/006_explain_with_index.sql'),
    studyDbSqlFile('db05', 'ineffective-indexes',
      'category/StudyDB/src/apps/db05_index_explain_performance/sql/007_ineffective_index_examples.sql')
  ]),
  db06: studyDbStack('db06', [
    studyDbSqlFile('db06', 'schema',
      'category/StudyDB/src/apps/db06_backup_restore_migration/sql/001_schema.sql'),
    studyDbSqlFile('db06', 'seed',
      'category/StudyDB/src/apps/db06_backup_restore_migration/sql/002_seed.sql'),
    studyDbSqlFile('db06', 'check-before',
      'category/StudyDB/src/apps/db06_backup_restore_migration/sql/checks/001_before_migration_check.sql'),
    studyDbDocker('db06', 'backup', [
      'exec', '-T', 'db', 'pg_dump', '-U', 'postgres', '-d', 'studydb',
      '--schema=db06', '--file=/tmp/studyhub-db06.sql'
    ]),
    studyDbSqlCommand('db06', 'drop-restore-database',
      'DROP DATABASE IF EXISTS studydb_restore;', 'postgres'),
    studyDbSqlCommand('db06', 'create-restore-database',
      'CREATE DATABASE studydb_restore;', 'postgres'),
    studyDbDocker('db06', 'restore', [
      'exec', '-T', 'db', 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres',
      '-d', 'studydb_restore', '-f', '/tmp/studyhub-db06.sql'
    ]),
    studyDbSqlFile('db06', 'check-restore',
      'category/StudyDB/src/apps/db06_backup_restore_migration/sql/checks/003_after_restore_check.sql',
      'studydb_restore'),
    studyDbSqlFile('db06', 'migration-email',
      'category/StudyDB/src/apps/db06_backup_restore_migration/sql/migrations/001_add_customer_email.sql'),
    studyDbSqlFile('db06', 'migration-status',
      'category/StudyDB/src/apps/db06_backup_restore_migration/sql/migrations/002_add_order_status.sql'),
    studyDbSqlFile('db06', 'check-after',
      'category/StudyDB/src/apps/db06_backup_restore_migration/sql/checks/002_after_migration_check.sql')
  ])
};

const webStackProfiles = {
  base08: webStackProfile(
    'category/StudyBase',
    [
      dockerCommand('gitea', [
        'compose', '-f', 'src/samples/base08_issue_branch_pr_merge/gitea_lab/docker-compose.yml',
        '-p', 'studyhub-base08', 'up', '-d'
      ], {
        execution: 'task',
        url: 'http://127.0.0.1:3418/',
        healthUrl: 'http://127.0.0.1:3418/api/healthz'
      }),
      dockerCommand('gitea-ready', [
        'compose', '-f', 'src/samples/base08_issue_branch_pr_merge/gitea_lab/docker-compose.yml',
        '-p', 'studyhub-base08', 'ps'
      ], {
        execution: 'task',
        healthUrl: 'http://127.0.0.1:3418/api/healthz'
      })
    ],
    [
      dockerCommand('compose-down', [
        'compose', '-f', 'src/samples/base08_issue_branch_pr_merge/gitea_lab/docker-compose.yml',
        '-p', 'studyhub-base08', 'down', '--remove-orphans'
      ], { execution: 'task', allowFailure: true })
    ],
    ['Docker Desktop', 'Git', 'Node.js'],
    180,
    commandOperationsRun([
      commandOperation('local-workflow', 'Issueからマージ後の同期までを確認', [
        nodeCommand('local-workflow', [
          'scripts/base08-pr-workflow-practice.mjs', 'all-steps'
        ])
      ]),
      commandOperation('gitea-status', 'Giteaの状態を確認', [
        dockerCommand('gitea-status', [
          'compose', '-f', 'src/samples/base08_issue_branch_pr_merge/gitea_lab/docker-compose.yml',
          '-p', 'studyhub-base08', 'ps'
        ], { execution: 'task' })
      ]),
      commandOperation('gitea-logs', 'Giteaのログを確認', [
        dockerCommand('gitea-logs', [
          'compose', '-f', 'src/samples/base08_issue_branch_pr_merge/gitea_lab/docker-compose.yml',
          '-p', 'studyhub-base08', 'logs', '--tail', '80', 'server'
        ], { execution: 'task' })
      ]),
      commandOperation('validate-materials', '教材ファイルを検証', [
        nodeCommand('validate-materials', [
          'scripts/validate-studybase.mjs', 'base08'
        ])
      ])
    ])
  ),
  web19: composeWebStack(
    'web19',
    'category/StudyWeb/src/infra/compose/web19_fetch_task_list',
    'http://localhost:5179/',
    'http://127.0.0.1:13019/tasks',
    'http://127.0.0.1:5179/',
    { service: 'backend' }
  ),
  web20: web20Stack(),
  web21: composeWebStack(
    'web21',
    'category/StudyWeb/src/infra/compose/web21_network_debug',
    'http://localhost:5181/',
    'http://127.0.0.1:13021/debug/success',
    'http://127.0.0.1:5181/',
    { service: 'backend' }
  ),
  web22: composeWebStack(
    'web22',
    'category/StudyWeb/src/infra/compose/web22_tanstack_query',
    'http://localhost:5182/',
    'http://127.0.0.1:13022/tasks',
    'http://127.0.0.1:5182/',
    { service: 'backend' }
  ),
  web26: composeWebStack(
    'web26',
    'category/StudyWeb/src/infra/compose/web26_docker_compose_web_api_db',
    'http://localhost:5186/',
    'http://127.0.0.1:13026/health',
    'http://127.0.0.1:5186/',
    { removeVolumes: false, service: 'api' }
  ),
  web27: composeWebStack(
    'web27',
    'category/StudyWeb/src/infra/compose/web27_nginx_static_reverse_proxy',
    'http://localhost:8087/',
    'http://127.0.0.1:8087/api/health',
    'http://127.0.0.1:8087/',
    { removeVolumes: false, service: 'api' }
  ),
  web28: composeWebStack(
    'web28',
    'category/StudyWeb/src/infra/compose/web28_env_config',
    'http://localhost:5188/',
    'http://127.0.0.1:13028/health',
    'http://127.0.0.1:5188/',
    {
      envFile: '../../env/web28_env_config/.env.example',
      removeVolumes: false,
      service: 'backend',
      operations: web28Operations()
    }
  ),
  web34: webStackProfile(
    'category/StudyWeb/src/backend/src/studyweb/systems/web34_cors_success_failure',
    [
      nodeCommand('backend-deny', ['backend/src/server.js'], {
        env: { PORT: '3035' },
        healthUrl: 'http://127.0.0.1:3035/'
      }),
      nodeCommand('backend-allow', ['backend/src/server.js'], {
        env: { PORT: '3036', ALLOW_CORS: '1' },
        healthUrl: 'http://127.0.0.1:3036/'
      }),
      nodeCommand('frontend', ['frontend/src/server.js'], {
        url: 'http://127.0.0.1:3034/',
        healthUrl: 'http://127.0.0.1:3034/'
      })
    ],
    [],
    ['Node.js'],
    30
  )
};

const requestStackProfiles = {
  web16: stackOperationsProfile(13016, [
    requestOperation('create', '登録', 'POST', '/tasks', [
      requestInput('title', 'タスク名', 'body', { required: true, placeholder: '登録するタスク名' })
    ]),
    requestOperation('list', '一覧表示', 'GET', '/tasks'),
    requestOperation('get', '1件表示', 'GET', '/tasks/{id}', [
      requestInput('id', 'タスクID', 'path', { required: true, placeholder: '表示するタスクID' })
    ]),
    requestOperation('update', '更新', 'PATCH', '/tasks/{id}', [
      requestInput('id', 'タスクID', 'path', { required: true, placeholder: '更新するタスクID' }),
      requestInput('title', '新しいタスク名', 'body', { placeholder: '変更しない場合は空欄' }),
      requestInput('done', '完了状態', 'body', { type: 'boolean' })
    ]),
    requestOperation('delete', '削除', 'DELETE', '/tasks/{id}', [
      requestInput('id', 'タスクID', 'path', { required: true, placeholder: '削除するタスクID' })
    ])
  ]),
  web17: stackOperationsProfile(13017, [
    requestOperation('create-user', 'ユーザー登録', 'POST', '/users', [
      requestInput('name', 'ユーザー名', 'body', { required: true, placeholder: '登録するユーザー名' }),
      requestInput('email', 'メールアドレス', 'body', {
        required: true,
        placeholder: '重複していないメールアドレス'
      })
    ]),
    requestOperation('list-users', 'ユーザー一覧', 'GET', '/users'),
    requestOperation('get-user', 'ユーザー1件表示', 'GET', '/users/{id}', [
      requestInput('id', 'ユーザーID', 'path', { required: true, placeholder: '表示するユーザーID' })
    ]),
    requestOperation('create-task', 'タスク登録', 'POST', '/tasks', [
      requestInput('title', 'タスク名', 'body', { required: true, placeholder: '登録するタスク名' }),
      requestInput('userId', 'ユーザーID', 'body', {
        required: true,
        placeholder: 'タスクを関連付けるユーザーID'
      })
    ]),
    requestOperation('list-tasks', 'タスク一覧', 'GET', '/tasks')
  ]),
  aws09: {
    connection: {
      type: 'request-stack',
      cwd: 'category/StudyAWS/src/backend/src/studyaws/systems/aws09_simple_deploy',
      startup: [
        {
          id: 'image-build',
          command: 'docker',
          args: ['build', '-t', 'studyhub-aws09', '.'],
          execution: 'task'
        },
        {
          id: 'application',
          command: 'docker',
          args: [
            'run', '--rm', '-d', '--name', 'studyhub-aws09',
            '-p', '127.0.0.1:43509:4109',
            '-e', 'APP_NAME=studyaws-simple-deploy',
            '-e', 'DEPLOY_ENV=production-like',
            'studyhub-aws09'
          ],
          execution: 'task',
          url: 'http://127.0.0.1:43509/',
          healthUrl: 'http://127.0.0.1:43509/health'
        }
      ],
      cleanup: [
        {
          id: 'container-stop',
          command: 'docker',
          args: ['stop', 'studyhub-aws09'],
          execution: 'task'
        }
      ],
      requests: [
        requestOperation('health', '正常時のhealth', 'GET', '/health'),
        requestOperation('service', '利用者向け応答', 'GET', '/'),
        requestOperation('config', '設定内容を確認', 'GET', '/config'),
        requestOperation('missing-config', '必須設定不足を確認', 'GET', '/config?required=DEPLOY_TOKEN'),
        requestOperation('simulate-failure', '実行中の障害を発生', 'POST', '/simulate-failure'),
        requestOperation('failed-health', '障害後のhealth', 'GET', '/health'),
        requestOperation('recover', '復旧', 'POST', '/recover')
      ].map(({ requestPath, ...request }) => ({
        ...request,
        url: new URL(requestPath, 'http://127.0.0.1:43509/').toString()
      }))
    }
  },
  web50: {
    connection: {
      type: 'request-stack',
      cwd: 'category/StudyWeb/src/backend/src/studyweb/systems/web50_n_plus_one_reproduction',
      startup: [
        {
          id: 'application',
          command: 'docker',
          args: ['compose', 'up', '--build', '-d', 'app'],
          execution: 'task',
          url: 'http://127.0.0.1:43350/',
          healthUrl: 'http://127.0.0.1:43350/?mode=optimized&count=3'
        }
      ],
      cleanup: [
        {
          id: 'compose-down',
          command: 'docker',
          args: ['compose', 'down', '--remove-orphans'],
          execution: 'task'
        }
      ],
      requests: [
        requestOperation('n-plus-one', 'N+1の処理を実行する', 'GET', '/?mode=n_plus_one', [
          requestInput('count', '親データの件数（1～20）', 'query', { placeholder: '3' })
        ]),
        requestOperation('optimized', '改善後の処理を実行する', 'GET', '/?mode=optimized', [
          requestInput('count', '親データの件数（1～20）', 'query', { placeholder: '3' })
        ])
      ].map(({ requestPath, ...request }) => ({
        ...request,
        url: new URL(requestPath, 'http://127.0.0.1:43350/').toString()
      }))
    }
  }
};

function profile(port, args, method, requestPath, request = {}) {
  return { port, args, method, requestPath, request };
}

function requestProcessOperationsProfile(port, args, requests, materialPath = '/') {
  return { port, args, requests, materialPath };
}

function stackProfile(port, method, requestPath, request = {}) {
  return { port, method, requestPath, request };
}

function stackOperationsProfile(port, requests) {
  return { port, requests };
}

function requestOperation(id, label, method, requestPath, inputs = [], options = {}) {
  return { id, label, method, requestPath, ...(inputs.length ? { inputs } : {}), ...options };
}

function requestInput(name, label, target, options = {}) {
  return { name, label, target, ...options };
}

function commandProfile(cwd, commands) {
  return { cwd, commands };
}

function commandOperationsProfile(cwd, operations, options = {}) {
  return { cwd, operations, ...options };
}

function packageCommandProfile(commands) {
  return { commands };
}

function nodeCommand(id, args, options = {}) {
  return { id, command: 'node', args, ...options };
}

function npmCommand(id, args, options = {}) {
  return { id, command: 'npm', args, ...options };
}

function dockerCommand(id, args, options = {}) {
  return { id, command: 'docker', args, ...options };
}

function commandStackProfile(cwd, startup, run, cleanup, environment, timeoutSeconds) {
  return { cwd, startup, run, cleanup, environment, timeoutSeconds };
}

function webStackProfile(cwd, startup, cleanup, environment, timeoutSeconds, run) {
  return { cwd, startup, cleanup, environment, timeoutSeconds, ...(run ? { run } : {}) };
}

function studyAiSharedConnection(themeId) {
  const prefix = ['compose', '-p', 'studyhub-studyai'];
  const applicationServices = [
    'backend',
    'frontend',
    ...range(2, 14).map((number) => `system${String(number).padStart(2, '0')}`),
    'system16'
  ];
  return {
    type: 'web-shared',
    runtimeId: 'actual-study-ai-shared',
    cwd: 'category/StudyAI',
    startup: [
      dockerCommand('database', [
        ...prefix, 'up', '-d', '--build', '--wait', '--wait-timeout', '60', 'db'
      ], { execution: 'task' }),
      dockerCommand('migration', [
        ...prefix, 'run', '--rm', '--build', 'migrate'
      ], { execution: 'task' }),
      dockerCommand('applications', [
        ...prefix, 'up', '-d', '--build', ...applicationServices
      ], {
        execution: 'task',
        url: `http://127.0.0.1:15173/${themeId}`,
        healthUrl: 'http://127.0.0.1:15173/'
      })
    ],
    cleanup: [
      dockerCommand('compose-down', [
        ...prefix, 'down', '--remove-orphans'
      ], { execution: 'task', allowFailure: true })
    ],
    environment: ['Docker Desktop'],
    timeoutSeconds: 300
  };
}

function desktopConnection(themeId) {
  if (themeId !== 'desktop01') throw new Error(`${themeId}の外部アプリ接続定義がありません。`);
  const cwd = 'category/StudyDesktop/src/apps/desktop01_electron_local_environment_automation';
  const workingDirectory = path.resolve(repositoryRoot, cwd);
  if (!fs.existsSync(workingDirectory) || !fs.statSync(workingDirectory).isDirectory()) {
    throw new Error(`${themeId}の外部アプリ作業フォルダが見つかりません。`);
  }
  return {
    type: 'external-process',
    cwd,
    command: 'electron',
    args: ['.'],
    environment: ['Node.js', 'テーマの依存パッケージ', 'デスクトップセッション']
  };
}

function composePrefix(themeId, envFile) {
  return [
    'compose',
    ...(envFile ? ['--env-file', envFile] : []),
    '-p', `studyhub-${themeId}`
  ];
}

function composeServiceOperations(themeId, service, envFile, healthUrl) {
  const prefix = composePrefix(themeId, envFile);
  return [
    commandOperation('stop-service', `${service}を停止`, [
      dockerCommand('stop-service', [...prefix, 'stop', service], { execution: 'task' })
    ]),
    commandOperation('start-service', `${service}を再起動`, [
      dockerCommand('start-service', [...prefix, 'up', '-d', service], {
        execution: 'task',
        ...(healthUrl ? { healthUrl } : {})
      })
    ]),
    commandOperation('service-status', `${service}の状態を確認`, [
      dockerCommand('service-status', [...prefix, 'ps', service], { execution: 'task' })
    ]),
    commandOperation('service-logs', `${service}のログを確認`, [
      dockerCommand('service-logs', [...prefix, 'logs', '--tail', '80', service], {
        execution: 'task'
      })
    ])
  ];
}

function web28Operations() {
  const envFile = '../../env/web28_env_config/.env.example';
  const prefix = composePrefix('web28', envFile);
  return [
    commandOperation('show-config', 'Composeへ渡る設定を確認', [
      dockerCommand('show-config', [...prefix, 'config'], { execution: 'task' })
    ]),
    commandOperation('missing-required-value', '必須値不足のエラーを確認', [
      dockerCommand('missing-required-value', [...prefix, 'config'], {
        execution: 'task',
        env: {
          VITE_API_URL: '',
          FRONTEND_PORT: '',
          API_PORT: '',
          DATABASE_URL: ''
        }
      })
    ])
  ];
}

function composeWebStack(
  themeId,
  cwd,
  url,
  apiHealthUrl,
  webHealthUrl,
  options = {}
) {
  const prefix = composePrefix(themeId, options.envFile);
  const downArgs = [...prefix, 'down', '--remove-orphans'];
  if (options.removeVolumes !== false) downArgs.push('--volumes');
  const operations = [
    ...(options.service
      ? composeServiceOperations(themeId, options.service, options.envFile, apiHealthUrl)
      : []),
    ...(options.operations ?? [])
  ];
  return webStackProfile(
    cwd,
    [
      dockerCommand('stack', [...prefix, 'up', '-d', '--build'], {
        execution: 'task',
        url,
        healthUrl: apiHealthUrl
      }),
      dockerCommand('web-ready', [...prefix, 'ps'], {
        execution: 'task',
        healthUrl: webHealthUrl
      })
    ],
    [
      dockerCommand('compose-down', downArgs, {
        execution: 'task',
        allowFailure: true
      })
    ],
    ['Docker Desktop'],
    180,
    operations.length ? commandOperationsRun(operations) : undefined
  );
}

function web20Stack() {
  const prefix = composePrefix('web20');
  return webStackProfile(
    'category/StudyWeb/src/infra/compose/web20_create_task_form',
    [
      dockerCommand('build', [...prefix, 'build', 'migrate', 'backend', 'frontend'], {
        execution: 'task'
      }),
      dockerCommand('database', [
        ...prefix, 'up', '-d', '--wait', '--wait-timeout', '60', 'db'
      ], { execution: 'task' }),
      dockerCommand('migration', [
        ...prefix, 'run', '--rm', 'migrate', 'npx', 'prisma', 'migrate', 'deploy'
      ], { execution: 'task' }),
      dockerCommand('stack', [...prefix, 'up', '-d', 'backend', 'frontend'], {
        execution: 'task',
        url: 'http://localhost:5180/',
        healthUrl: 'http://127.0.0.1:13020/tasks'
      }),
      dockerCommand('web-ready', [...prefix, 'ps'], {
        execution: 'task',
        healthUrl: 'http://127.0.0.1:5180/'
      })
    ],
    [
      dockerCommand('compose-down', [
        ...prefix, 'down', '--volumes', '--remove-orphans'
      ], { execution: 'task', allowFailure: true })
    ],
    ['Docker Desktop'],
    180,
    commandOperationsRun([
      commandOperation('database-contents', 'DBへ保存されたタスクを確認', [
        dockerCommand('database-contents', [
          ...prefix, 'exec', '-T', 'db',
          'psql', '-U', 'postgres', '-d', 'web20',
          '-c', 'SELECT id, title, done, "createdAt" FROM "Task" ORDER BY "createdAt";'
        ], { execution: 'task' })
      ]),
      commandOperation('backend-logs', 'backendのログを確認', [
        dockerCommand('backend-logs', [...prefix, 'logs', '--tail', '80', 'backend'], {
          execution: 'task'
        })
      ])
    ])
  );
}

function commandRun(commands) {
  return { type: 'commands', commands };
}

function commandOperationsRun(operations) {
  return { type: 'operations', operations };
}

function commandOperation(id, label, processes, input) {
  return { id, label, processes, ...(input ? { input } : {}) };
}

function requestRun(method, url, request = {}) {
  return { type: 'request', request: { method, url, ...request } };
}

function studyDbStack(themeId, runDefinition) {
  return commandStackProfile(
    'category/StudyDB',
    [
      studyDbDocker(themeId, 'database', [
        'up', '-d', '--wait', '--wait-timeout', '60', 'db'
      ], { execution: 'task' })
    ],
    Array.isArray(runDefinition) ? commandRun(runDefinition) : runDefinition,
    [
      studyDbDocker(themeId, 'compose-down', [
        'down', '--volumes', '--remove-orphans'
      ], { execution: 'task', allowFailure: true })
    ],
    ['Docker Desktop'],
    180
  );
}

function studyDbDocker(themeId, id, args, options = {}) {
  return dockerCommand(id, [
    'compose',
    '-p', `studyhub-${themeId}`,
    '-f', 'src/apps/common/docker-compose.yml',
    ...args
  ], {
    env: { STUDYDB_PORT: '0' },
    ...options
  });
}

function studyDbSqlFile(themeId, id, stdinFile, database = 'studydb') {
  return studyDbDocker(themeId, id, [
    'exec', '-T', 'db',
    'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', database, '-f', '-'
  ], { stdinFile });
}

function studyDbSqlCommand(themeId, id, sql, database = 'studydb', options = {}) {
  return studyDbDocker(themeId, id, [
    'exec', '-T', 'db',
    'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', database, '-c', sql
  ], options);
}

function containsThemeDirectory(filePath, root, themeId) {
  return path.relative(root, filePath).split(path.sep).some((part) => {
    const lower = part.toLowerCase();
    return lower === themeId || lower.startsWith(`${themeId}_`) || lower.startsWith(`${themeId}-`);
  });
}

function findStaticWebConnection(themeId) {
  const [root, files] = packageSearch(themeId);
  const indexFiles = files.filter((filePath) => {
    if (path.basename(filePath).toLowerCase() !== 'index.html') return false;
    return containsThemeDirectory(filePath, root, themeId);
  });
  if (indexFiles.length !== 1) {
    throw new Error(`${themeId}の静的Web入口が${indexFiles.length}件です。`);
  }
  return {
    type: 'static-web',
    root: path.relative(repositoryRoot, path.dirname(indexFiles[0])).replaceAll('\\', '/'),
    entryFile: 'index.html'
  };
}

function findPackageRoot(themeId, root, files) {
  const packageFiles = files.filter((filePath) =>
    path.basename(filePath) === 'package.json' && containsThemeDirectory(filePath, root, themeId)
  );
  if (packageFiles.length !== 1) {
    throw new Error(`${themeId}のpackage.jsonが${packageFiles.length}件です。`);
  }
  return path.dirname(packageFiles[0]);
}

function packageSearch(themeId) {
  if (themeId.startsWith('web')) return [studyWebRoot, studyWebFiles];
  if (themeId.startsWith('security')) return [studySecurityRoot, studySecurityFiles];
  if (themeId.startsWith('devops')) return [studyDevOpsRoot, studyDevOpsFiles];
  if (themeId.startsWith('aws')) return [studyAwsRoot, studyAwsFiles];
  if (themeId.startsWith('base')) return [studyBaseRoot, studyBaseFiles];
  if (themeId.startsWith('arch')) return [studyArchitectureRoot, studyArchitectureFiles];
  throw new Error(`${themeId}のpackage.json検索先がありません。`);
}

function findRequestProcessConnection(themeId) {
  const requestProfile = requestProcessProfiles[themeId];
  if (!requestProfile) throw new Error(`${themeId}のAPI接続定義がありません。`);
  const [root, files] = packageSearch(themeId);
  const packageRoot = findPackageRoot(themeId, root, files);
  const url = `http://127.0.0.1:${requestProfile.port}/`;
  const requestUrl = requestProfile.requestPath
    ? new URL(requestProfile.requestPath, url).toString()
    : undefined;
  const requests = requestProfile.requests?.map(({ requestPath, ...request }) => ({
    ...request,
    url: new URL(requestPath, url).toString()
      .replaceAll('%7B', '{')
      .replaceAll('%7D', '}')
  }));
  return {
    type: 'request-process',
    cwd: path.relative(repositoryRoot, packageRoot).replaceAll('\\', '/'),
    command: 'node',
    args: requestProfile.args,
    env: { PORT: String(requestProfile.port) },
    url: requestProfile.materialPath
      ? new URL(requestProfile.materialPath, url).toString()
      : requestProfile.method === 'GET' && requestUrl
        ? requestUrl
        : url,
    healthUrl: url,
    ...(requests
      ? { requests }
      : {
          request: {
            method: requestProfile.method,
            url: requestUrl,
            ...requestProfile.request
          }
        })
  };
}

function findRequestStackConnection(themeId) {
  const stackProfileDefinition = requestStackProfiles[themeId];
  if (!stackProfileDefinition) throw new Error(`${themeId}のAPI・DB接続定義がありません。`);
  if (stackProfileDefinition.connection) return stackProfileDefinition.connection;
  const [root, files] = packageSearch(themeId);
  const packageRoot = findPackageRoot(themeId, root, files);
  const url = `http://127.0.0.1:${stackProfileDefinition.port}/`;
  return {
    type: 'request-stack',
    cwd: path.relative(repositoryRoot, packageRoot).replaceAll('\\', '/'),
    startup: [
      {
        id: 'database',
        command: 'docker',
        args: ['compose', 'up', '--build', '-d', 'db'],
        execution: 'task'
      },
      {
        id: 'migration',
        command: 'docker',
        args: ['compose', 'run', '--rm', 'migrate', 'npx', 'prisma', 'migrate', 'deploy'],
        execution: 'task'
      },
      {
        id: 'backend',
        command: 'docker',
        args: ['compose', 'up', '--build', '-d', 'backend'],
        execution: 'task',
        url,
        healthUrl: url
      }
    ],
    cleanup: [
      {
        id: 'compose-down',
        command: 'docker',
        args: ['compose', 'down', '--remove-orphans'],
        execution: 'task'
      }
    ],
    ...(stackProfileDefinition.requests
      ? {
          requests: stackProfileDefinition.requests.map(({ requestPath, ...request }) => ({
            ...request,
            url: new URL(requestPath, url).toString()
              .replaceAll('%7B', '{')
              .replaceAll('%7D', '}')
          }))
        }
      : {
          request: {
            method: stackProfileDefinition.method,
            url: new URL(stackProfileDefinition.requestPath, url).toString(),
            ...stackProfileDefinition.request
          }
        })
  };
}

function findCommandOneShotConnection(themeId) {
  const commandProfileDefinition = commandOneShotProfiles[themeId];
  if (!commandProfileDefinition) throw new Error(`${themeId}のコマンド接続定義がありません。`);
  let workingDirectory;
  if (commandProfileDefinition.cwd) {
    workingDirectory = path.resolve(repositoryRoot, commandProfileDefinition.cwd);
    if (!workingDirectory.startsWith(`${repositoryRoot}${path.sep}`)
      || !fs.existsSync(workingDirectory)
      || !fs.statSync(workingDirectory).isDirectory()) {
      throw new Error(`${themeId}のコマンド作業フォルダが見つかりません。`);
    }
  } else {
    const [root, files] = packageSearch(themeId);
    workingDirectory = findPackageRoot(themeId, root, files);
  }
  return {
    type: 'command-one-shot',
    cwd: path.relative(repositoryRoot, workingDirectory).replaceAll('\\', '/'),
    ...(commandProfileDefinition.operations
      ? { operations: commandProfileDefinition.operations }
      : { commands: commandProfileDefinition.commands }),
    ...(commandProfileDefinition.environment
      ? { environment: commandProfileDefinition.environment }
      : {}),
    ...(commandProfileDefinition.timeoutSeconds
      ? { timeoutSeconds: commandProfileDefinition.timeoutSeconds }
      : {})
  };
}

function findCommandStackConnection(themeId) {
  const commandProfileDefinition = commandStackProfiles[themeId];
  if (!commandProfileDefinition) throw new Error(`${themeId}の複合コマンド接続定義がありません。`);
  const workingDirectory = path.resolve(repositoryRoot, commandProfileDefinition.cwd);
  if (!workingDirectory.startsWith(`${repositoryRoot}${path.sep}`)
    || !fs.existsSync(workingDirectory)
    || !fs.statSync(workingDirectory).isDirectory()) {
    throw new Error(`${themeId}の複合コマンド作業フォルダが見つかりません。`);
  }
  return {
    type: 'command-stack',
    cwd: path.relative(repositoryRoot, workingDirectory).replaceAll('\\', '/'),
    startup: commandProfileDefinition.startup,
    run: commandProfileDefinition.run,
    cleanup: commandProfileDefinition.cleanup,
    environment: commandProfileDefinition.environment,
    timeoutSeconds: commandProfileDefinition.timeoutSeconds
  };
}

function findWebStackConnection(themeId) {
  const webProfileDefinition = webStackProfiles[themeId];
  if (!webProfileDefinition) throw new Error(`${themeId}の複合Web接続定義がありません。`);
  const workingDirectory = path.resolve(repositoryRoot, webProfileDefinition.cwd);
  if (!workingDirectory.startsWith(`${repositoryRoot}${path.sep}`)
    || !fs.existsSync(workingDirectory)
    || !fs.statSync(workingDirectory).isDirectory()) {
    throw new Error(`${themeId}の複合Web作業フォルダが見つかりません。`);
  }
  return {
    type: 'web-stack',
    cwd: path.relative(repositoryRoot, workingDirectory).replaceAll('\\', '/'),
    startup: webProfileDefinition.startup,
    cleanup: webProfileDefinition.cleanup,
    environment: webProfileDefinition.environment,
    timeoutSeconds: webProfileDefinition.timeoutSeconds,
    ...(webProfileDefinition.run ? { run: webProfileDefinition.run } : {})
  };
}

function findWebProcessConnection(themeId) {
  const explicitProfile = webProcessProfiles[themeId];
  if (explicitProfile) {
    const workingDirectory = path.resolve(repositoryRoot, explicitProfile.cwd);
    if (!workingDirectory.startsWith(`${repositoryRoot}${path.sep}`)
      || !fs.existsSync(workingDirectory)
      || !fs.statSync(workingDirectory).isDirectory()) {
      throw new Error(`${themeId}のWeb作業フォルダが見つかりません。`);
    }
    const url = `http://127.0.0.1:${explicitProfile.port}/`;
    return {
      type: 'web-process',
      cwd: explicitProfile.cwd,
      command: 'node',
      args: explicitProfile.args,
      url,
      healthUrl: new URL(explicitProfile.healthPath, url).toString()
    };
  }
  const number = Number(themeId.replace(/^\D+/, ''));
  let packageRoot;
  let args;
  let port;

  if (themeId.startsWith('arch')) {
    packageRoot = findPackageRoot(themeId, studyArchitectureRoot, studyArchitectureFiles);
    port = 43700 + number;
    args = ['app/server.js'];
  } else if (themeId.startsWith('web')) {
    packageRoot = findPackageRoot(themeId, studyWebRoot, studyWebFiles);
    port = 43200 + number;
    args = number <= 12
      ? [
          'node_modules/vite/bin/vite.js',
          '--host',
          '127.0.0.1',
          '--port',
          String(port),
          '--strictPort'
        ]
      : [
          'node_modules/next/dist/bin/next',
          'dev',
          '--hostname',
          '127.0.0.1',
          '--port',
          String(port)
        ];
  } else {
    packageRoot = findPackageRoot(themeId, studySecurityRoot, studySecurityFiles);
    port = 4100 + number;
    args = ['app/server.js'];
  }

  const url = `http://127.0.0.1:${port}/`;
  return {
    type: 'web-process',
    cwd: path.relative(repositoryRoot, packageRoot).replaceAll('\\', '/'),
    command: 'node',
    args,
    url,
    healthUrl: themeId.startsWith('arch') ? `${url}ready` : url
  };
}

function classify(prefix, number) {
  const matches = rules.filter((item) => item.prefix === prefix && item.numbers.has(number));
  if (matches.length !== 1) {
    throw new Error(`${prefix}${String(number).padStart(2, '0')} の分類数が${matches.length}件です。`);
  }
  return matches[0];
}

function buildCatalog() {
  const source = readUtf8(sourcePath);
  const pattern = /^- \[(system|web|security|devops|aws|base|db|arch|desktop)(\d+) ([^\]]+)\]\(([^)]+)\)$/gm;
  const themes = [];
  let match;

  while ((match = pattern.exec(source)) !== null) {
    const prefix = match[1];
    const number = Number(match[2]);
    const classification = classify(prefix, number);
    const entryFile = match[4].replace(/^\.\//, '');
    const integrationStatus = (
      classification.lifecycle === 'none'
      && ['document', 'web'].includes(classification.presentation)
    ) || (
      classification.presentation === 'web'
      && classification.lifecycle === 'process'
    ) || (
      classification.presentation === 'web'
      && classification.lifecycle === 'stack'
    ) || (
      classification.presentation === 'web'
      && classification.lifecycle === 'shared'
    ) || (
      classification.presentation === 'document'
      && classification.lifecycle === 'manual'
    ) || (
      classification.presentation === 'external-app'
      && classification.lifecycle === 'process'
    ) || (
      classification.presentation === 'request'
      && classification.lifecycle === 'process'
    ) || (
      classification.presentation === 'request'
      && classification.lifecycle === 'stack'
    ) || (
      classification.presentation === 'command'
      && ['one-shot', 'stack'].includes(classification.lifecycle)
    )
      ? 'connected'
      : 'metadata-only';
    const theme = {
      id: `${prefix}${match[2]}`,
      fieldId: fieldIds[prefix],
      name: match[3],
      entryFile,
      presentation: classification.presentation,
      lifecycle: classification.lifecycle,
      integrationStatus
    };
    if (materialOpenModes[theme.id]) theme.materialOpenMode = materialOpenModes[theme.id];
    if (relatedFieldIds[theme.id]) theme.relatedFieldIds = relatedFieldIds[theme.id];
    if (themeAliases[theme.id]) theme.aliasOf = themeAliases[theme.id];
    const generatedResources = mergeResourceDefinitions(
      themeResources[theme.id] ?? [],
      findFormalDocumentResources(theme.id, entryFile)
    );
    if (generatedResources.length > 0) theme.resources = generatedResources;
    if (integrationStatus === 'connected') {
      if (classification.presentation === 'document') {
        theme.connection = { type: 'markdown', file: entryFile };
      } else if (classification.presentation === 'command') {
        theme.connection = classification.lifecycle === 'stack'
          ? findCommandStackConnection(theme.id)
          : findCommandOneShotConnection(theme.id);
      } else if (classification.presentation === 'request') {
        theme.connection = classification.lifecycle === 'stack'
          ? findRequestStackConnection(theme.id)
          : findRequestProcessConnection(theme.id);
      } else if (classification.presentation === 'external-app') {
        theme.connection = desktopConnection(theme.id);
      } else if (classification.lifecycle === 'shared') {
        theme.connection = studyAiSharedConnection(theme.id);
      } else if (classification.lifecycle === 'stack') {
        theme.connection = findWebStackConnection(theme.id);
      } else if (classification.lifecycle === 'process') {
        theme.connection = findWebProcessConnection(theme.id);
      } else {
        theme.connection = findStaticWebConnection(theme.id);
      }
    }
    themes.push(theme);
  }

  themes.push(...standaloneThemes.map((theme) => ({
    ...theme,
    presentation: theme.presentation ?? 'document',
    lifecycle: theme.lifecycle ?? 'none',
    integrationStatus: 'connected',
    connection: theme.connection ?? { type: 'markdown', file: theme.entryFile }
  })));

  if (themes.length !== 167) throw new Error(`実カタログのテーマ数が167件ではありません: ${themes.length}`);
  if (new Set(themes.map((theme) => theme.id)).size !== themes.length) {
    throw new Error('テーマIDが重複しています。');
  }
  const connectedThemes = themes.filter((theme) => theme.integrationStatus === 'connected');
  if (connectedThemes.length !== 167) {
    throw new Error(`接続するテーマ数が167件ではありません: ${connectedThemes.length}`);
  }
  if (connectedThemes.filter((theme) => theme.connection.type === 'static-web').length !== 22) {
    throw new Error('静的Webへ接続するテーマ数が22件ではありません。');
  }
  if (connectedThemes.filter((theme) => theme.connection.type === 'web-process').length !== 19) {
    throw new Error('Web処理へ接続するテーマ数が19件ではありません。');
  }
  if (connectedThemes.filter((theme) => theme.connection.type === 'request-process').length !== 26) {
    throw new Error('API処理へ接続するテーマ数が26件ではありません。');
  }
  if (connectedThemes.filter((theme) => theme.connection.type === 'request-stack').length !== 4) {
    throw new Error('API・DB処理へ接続するテーマ数が4件ではありません。');
  }
  if (connectedThemes.filter((theme) => theme.connection.type === 'command-one-shot').length !== 22) {
    throw new Error('単発コマンドへ接続するテーマ数が22件ではありません。');
  }
  if (connectedThemes.filter((theme) => theme.connection.type === 'command-stack').length !== 14) {
    throw new Error('複合コマンドへ接続するテーマ数が14件ではありません。');
  }
  if (connectedThemes.filter((theme) => theme.connection.type === 'web-stack').length !== 9) {
    throw new Error('複合Webへ接続するテーマ数が9件ではありません。');
  }
  if (connectedThemes.filter((theme) => theme.connection.type === 'web-shared').length !== 43) {
    throw new Error('共有Webへ接続するテーマ数が43件ではありません。');
  }
  if (connectedThemes.filter((theme) => theme.connection.type === 'external-process').length !== 1) {
    throw new Error('外部アプリへ接続するテーマ数が1件ではありません。');
  }
  for (const theme of themes) {
    const entryPath = path.resolve(repositoryRoot, theme.entryFile);
    if (!entryPath.startsWith(`${repositoryRoot}${path.sep}`) || !fs.existsSync(entryPath)) {
      throw new Error(`教材入口が見つかりません: ${theme.id} ${theme.entryFile}`);
    }
  }
  assertRuntimeUrlSafety(themes);

  const actualCounts = Object.fromEntries(
    Object.keys(expectedCombinationCounts).map((combination) => [
      combination,
      themes.filter((theme) => `${theme.presentation}/${theme.lifecycle}` === combination).length
    ])
  );
  if (JSON.stringify(actualCounts) !== JSON.stringify(expectedCombinationCounts)) {
    throw new Error(`動作分類の件数が一致しません: ${JSON.stringify(actualCounts)}`);
  }

  return {
    schemaVersion: 1,
    catalogType: 'actual',
    source: 'THEME_CATALOG.md',
    behaviorSource: 'scripts/generate-theme-catalog.mjs',
    themeCount: themes.length,
    themes
  };
}

function generatedThemeDefinition(theme) {
  return {
    id: theme.id,
    fieldId: theme.fieldId,
    presentation: theme.presentation,
    lifecycle: theme.lifecycle,
    integrationStatus: theme.integrationStatus,
    materialOpenMode: theme.materialOpenMode,
    relatedFieldIds: theme.relatedFieldIds,
    aliasOf: theme.aliasOf,
    connectionType: theme.connection?.type
  };
}

function assertGeneratedDefinitionMatchesCurrent(generatedCatalog, currentCatalog) {
  const currentThemes = new Map(currentCatalog.themes.map((theme) => [theme.id, theme]));
  const differentThemeIds = generatedCatalog.themes
    .filter((theme) => {
      const currentTheme = currentThemes.get(theme.id);
      return !currentTheme || !isDeepStrictEqual(
        generatedThemeDefinition(currentTheme),
        generatedThemeDefinition(theme)
      );
    })
    .map((theme) => {
      const currentDefinition = generatedThemeDefinition(currentThemes.get(theme.id) ?? {});
      const generatedDefinition = generatedThemeDefinition(theme);
      const fields = Object.keys(generatedDefinition)
        .filter((key) => !isDeepStrictEqual(currentDefinition[key], generatedDefinition[key]));
      return `${theme.id}[${fields.join(',')}]`;
    });
  for (const currentTheme of currentCatalog.themes) {
    if (!generatedCatalog.themes.some((theme) => theme.id === currentTheme.id)) {
      differentThemeIds.push(currentTheme.id);
    }
  }
  if (differentThemeIds.length > 0) {
    throw new Error(`catalog/themes.jsonの分野・分類・起動種別が生成元と一致しません: ${differentThemeIds.join(', ')}`);
  }
}

function preserveCuratedThemeMetadata(generatedCatalog, currentCatalog) {
  const currentThemes = new Map(currentCatalog.themes.map((theme) => [theme.id, theme]));
  return {
    ...generatedCatalog,
    themes: generatedCatalog.themes.map((theme) => {
      const currentTheme = currentThemes.get(theme.id);
      if (!currentTheme) return theme;
      const mergedResources = mergeResourceDefinitions(currentTheme.resources, theme.resources);
      const curatedTheme = {};
      for (const [key, value] of Object.entries(currentTheme)) {
        if (['relatedFieldIds', 'aliasOf', 'resources'].includes(key)) continue;
        if (key === 'connection' && mergedResources.length > 0) {
          curatedTheme.resources = mergedResources;
        }
        curatedTheme[key] = value;
      }
      if (mergedResources.length > 0 && !curatedTheme.resources) {
        curatedTheme.resources = mergedResources;
      }
      return {
        ...curatedTheme,
        ...(theme.relatedFieldIds ? { relatedFieldIds: theme.relatedFieldIds } : {}),
        ...(theme.aliasOf ? { aliasOf: theme.aliasOf } : {})
      };
    })
  };
}

function validateFinalCatalog(catalog) {
  if (catalog.themes.length !== 167 || new Set(catalog.themes.map((theme) => theme.id)).size !== 167) {
    throw new Error('統合後の実カタログは重複のない167テーマである必要があります。');
  }
  for (const theme of catalog.themes) {
    if (/^[a-z]+\d{2}$/u.test(theme.id)) {
      for (const expectedResource of findFormalDocumentResources(theme.id, theme.entryFile)) {
        const matchingResources = (theme.resources ?? [])
          .filter((resource) => resource.id === expectedResource.id);
        if (matchingResources.length !== 1
          || !isDeepStrictEqual(matchingResources[0], expectedResource)) {
          throw new Error(`統合後の実カタログに${theme.id}の${expectedResource.label}が正しく登録されていません。`);
        }
      }
    }
    const paths = [theme.entryFile, ...(theme.resources ?? []).map((resource) => resource.path)];
    for (const relativePath of paths) {
      const targetPath = path.resolve(repositoryRoot, relativePath);
      if (!targetPath.startsWith(`${repositoryRoot}${path.sep}`) || !fs.existsSync(targetPath)) {
        throw new Error(`統合後の実カタログが存在しないファイルを参照しています: ${theme.id} ${relativePath}`);
      }
    }
  }
}

const generatedCatalog = buildCatalog();
const currentText = fs.existsSync(outputPath) ? readUtf8(outputPath) : undefined;
const currentCatalog = currentText ? JSON.parse(currentText) : undefined;
if (currentCatalog) assertGeneratedDefinitionMatchesCurrent(generatedCatalog, currentCatalog);
const catalog = currentCatalog
  ? preserveCuratedThemeMetadata(generatedCatalog, currentCatalog)
  : generatedCatalog;
validateFinalCatalog(catalog);
const output = `${JSON.stringify(catalog, null, 2)}\n`;

if (checkOnly) {
  if (!currentText) throw new Error('catalog/themes.jsonがありません。');
  if (!isDeepStrictEqual(JSON.parse(currentText), catalog)) {
    throw new Error('catalog/themes.jsonが生成元と一致しません。生成コマンドを実行してください。');
  }
  console.log('テーマカタログの分野、分類、起動種別、正式文書参照は生成元と一致しています。番号付き163件と単独教材4件を確認しました。');
} else {
  if (currentText !== output) {
    fs.writeFileSync(outputPath, output, { encoding: 'utf8' });
  }
  console.log('catalog/themes.jsonへ番号付き163件と単独教材4件を出力しました。');
}
