import { useEffect, useMemo, useState } from 'react'
import { createSystemClient } from '../api/client'

type Metadata = {
  system_id: string
  title: string
  pattern: string
  default_input: Record<string, unknown>
  state_flow: string[]
  kpi_definitions: string[]
  risk_points: string[]
}

type RunResult = {
  run_id: string
  system_id: string
  title: string
  pattern: string
  state: string
  input: Record<string, unknown>
  result: Record<string, unknown>
  audit_log: Array<Record<string, unknown>>
  kpi_snapshot: Record<string, unknown>
  created_at: string
  storage?: {
    saved: boolean
    format: string
    retention_limit: number
    retained_runs: number
  }
}

type Props = { systemId: string }
type ScreenCopy = { description: string; inputGuide: string; resultGuide: string }

const screenCopy: Record<string, ScreenCopy> = {
  system37: {
    description: '希望条件、候補、本人確認、最終確認、変更・取消条件を照合し、教材上の取引結果を永続化します。',
    inputGuide: '例を選んで実行し、条件不足、確認待ち、実行、変更、取消、条件不一致を比較できます。',
    resultGuide: '候補順位、確認結果、取引状態、失敗理由、監査記録、KPI、JSON保存状態を確認します。',
  },
  system38: {
    description: '利用者の関心、行動履歴、商品の鮮度から推薦順位を作成し、推薦結果と反応を保存します。',
    inputGuide: '例を選び、関心タグ、在庫状態、推薦の偏り、実験条件、反応内容による違いを確認します。',
    resultGuide: '推薦順位、A/Bテストの割当、反応ログ、JSON保存状態を確認します。',
  },
  system39: {
    description: '問い合わせへの回答と、住所変更などの業務手続きを分け、受付結果と引継ぎを永続化します。',
    inputGuide: '例を選び、問い合わせ文、本人確認、出荷状態、要求手続きによる処理の違いを確認します。',
    resultGuide: '分類、回答、業務手続きの受付結果、チケット、担当者への引継ぎ、JSON保存状態を確認します。',
  },
  system40: {
    description: '販売履歴、季節性、販促条件から需要を予測し、人間の承認を経た補充候補を永続化します。',
    inputGuide: '例を選び、販促倍率、現在庫、棚容量、季節倍率、入荷予定、承認状態による違いを確認します。',
    resultGuide: '予測誤差、欠品リスク、補充理由、承認状態、発注候補、JSON保存状態を確認します。',
  },
  system41: {
    description: '棚・レシート画像、OCR、商品マスタ、センサーを照合し、確認待ちと人間確認結果を記録します。',
    inputGuide: '検出候補、OCR結果、商品マスタ、センサーイベント、しきい値、人間確認を変更して結果を比較します。',
    resultGuide: '商品照合、数量推定、異常候補、確認待ち一覧、人間確認結果、JSON保存状態を確認します。',
  },
  system42: {
    description: '取引・ログイン・端末・過去履歴から不正リスクを判定し、確認後の誤検知・見逃しとコストを記録します。',
    inputGuide: '取引条件、ログイン履歴、保留・拒否しきい値、確認結果、誤判定コストを変更して比較します。',
    resultGuide: '加点根拠、許可・保留・拒否、アラート、false positive／false negative、監査記録、JSON保存状態を確認します。',
  },
  system43: {
    description: '仕事、担当者、場所、優先度、時間枠、目的関数から候補解を作り、人間調整を記録します。',
    inputGuide: '仕事の場所・優先度・時間枠、担当者の開始位置と稼働時間、制約、コスト重み、人間調整を変更して比較します。',
    resultGuide: '担当割当、ルート、時間枠、制約違反、総コスト、人間調整結果、JSON保存状態を確認します。',
  },
  system44: {
    description: '比較実験の事業KPI、AI品質、コスト、応答時間、失敗をまとめ、改善と意思決定を記録します。',
    inputGuide: '利用者数、成果数、AI品質、コスト、失敗事例、判断条件、人間の確認結果を変更して比較します。',
    resultGuide: 'A/B差、AI品質、成果単価、安全側の条件、失敗分類、意思決定、JSON保存状態を確認します。',
  },
}

const stateLabels: Record<string, string> = {
  hearing: '条件確認中', proposed: '候補提示済み', confirming: '最終確認中', executed: '実行済み',
  changed: '変更済み', cancelled: '取消済み', escalated: '担当者確認へ移行', collected: '情報収集済み',
  scored: '採点済み', ranked: '順位付け済み', displayed: '表示済み', feedback_recorded: '反応記録済み',
  retrained_candidate: '再学習候補', received: '受付済み', classified: '分類済み', verification_required: '本人確認が必要', answered: '回答済み',
  processed: '手続き済み', closed: '終了',
  action_pending: '操作確認中', completed: '完了', loaded: '読込済み', forecasted: '予測済み',
  drafted: '候補作成前', optimized: '最適化済み', violation_found: '制約違反あり', reviewed: '確認対象', approved: '承認済み', exported: '出力済み',
  captured: '取得済み', prechecked: '事前確認済み', detected: '検出済み', accepted: '採用済み', rejected: '却下済み',
  ingested: '取込済み', flagged: '要調査', investigated: '調査済み', cleared: '問題なし', blocked: '停止',
  prepared: '準備済み', solved: '解決案作成済み', validated: '制約確認済み', adjusted: '調整済み',
  configured: '実験設定済み', collecting: '収集中', evaluated: '評価済み', planned: '計画済み', running: '実行中',
  measured: '計測済み', analyzed: '分析済み', decided: '判断済み', archived: '保存済み',
}

const kpiLabels: Record<string, string> = {
  execution_success_rate: '実行成功率', confirmation_rate: '最終確認率', cancellation_rate: '取消率',
  policy_violation_count: 'ルール違反数', average_response_ms: '平均応答時間', click_through_rate: 'クリック率',
  conversion_rate: '成果率', diversity_score: '推薦の多様性', freshness_score: '鮮度点', latency_ms: '処理時間',
  automation_rate: '自動処理率', escalation_rate: '担当者確認率', first_contact_resolution: '初回解決率',
  policy_block_count: 'ルールによる停止数', answer_quality_score: '回答品質点', forecast_error: '予測誤差',
  stockout_risk_rate: '欠品リスク率', surplus_cost: '余剰在庫コスト', service_level: '在庫充足率',
  replenishment_count: '補充回数', risk_flag_count: '注意点の数',
  precision_proxy: '適合率の参考値', recall_proxy: '再現率の参考値', review_rate: '確認対象率',
  false_positive_count: '誤検知数', processing_ms: '処理時間', alert_precision_proxy: '警告適合率の参考値',
  blocked_count: '停止件数', investigation_rate: '調査率', false_positive_rate: '誤検知率', response_ms: '応答時間',
  cost_reduction_rate: 'コスト削減率', constraint_satisfaction_rate: '制約充足率', route_count: '割当数',
  overtime_minutes: '超過時間', solve_ms: '計算時間', uplift: '改善幅', confidence_proxy: '確からしさの参考値',
  guardrail_violation_count: '安全条件違反数', sample_size: '対象人数', decision_cycle_days: '判断までの日数',
  experiment_count: '実験数', ab_difference: 'A/B差', kpi_improvement_rate: 'KPI改善率',
  decision_completion_rate: '意思決定完了率',
}

const valueLabels: Record<string, string> = {
  accepted: '採用', review: '確認対象', allow: '許可', block: '停止',
  rollout: '展開する', continue_test: '検証を続ける',
  pending: '承認待ち', approved: '承認済み', rejected: '却下済み',
  address_change: '住所変更', refund: '返金', general_question: '一般的な質問',
  update_address: '住所変更を受け付ける', request_refund: '返金を受け付ける', answer: '回答する', escalate: '担当者確認へ移す',
  resolved: '解決済み', handoff_required: '担当者確認が必要', blocked: '停止', not_required: '手続き不要',
}

const styles = {
  panel: { background: '#fff', border: '1px solid #d9e2ec', borderRadius: 8, padding: '1rem' },
  label: { display: 'block', fontWeight: 700, marginBottom: 6, color: '#1f2937' },
  textarea: {
    width: '100%', minHeight: 220, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: '0.86rem', border: '1px solid #cbd5e1', borderRadius: 6, padding: '0.75rem', boxSizing: 'border-box',
  },
  button: { background: '#0f766e', color: '#fff', border: 0, borderRadius: 6, padding: '0.65rem 1rem', fontWeight: 700, cursor: 'pointer' },
  secondaryButton: { background: '#fff', color: '#334155', border: '1px solid #94a3b8', borderRadius: 6, padding: '0.6rem 0.9rem', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' },
  cell: { border: '1px solid #d9e2ec', padding: '0.55rem', textAlign: 'left', verticalAlign: 'top' },
} as const

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function asRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.map(asRecord) : []
}

function displayValue(value: unknown): string {
  if (value === true) return 'はい'
  if (value === false) return 'いいえ'
  if (value === null || value === undefined || value === '') return '-'
  if (Array.isArray(value)) return value.map(displayValue).join('、') || '-'
  if (typeof value === 'object') return JSON.stringify(value)
  const text = String(value)
  return valueLabels[text] ?? text
}

function ResultTable({ headers, rows }: { headers: string[], rows: unknown[][] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={styles.table}>
        <thead><tr>{headers.map((header) => <th key={header} style={{ ...styles.cell, background: '#f8fafc' }}>{header}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}>{row.map((value, cellIndex) => <td key={cellIndex} style={styles.cell}>{displayValue(value)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

function ResultDetails({ run }: { run: RunResult }) {
  const recommendations = asRecords(run.result.recommendations)
  const risks = Array.isArray(run.result.risk_flags) ? run.result.risk_flags : []
  let content: JSX.Element

  if (run.system_id === 'system37') {
    const questions = recommendations.filter((item) => item.type === 'question')
    const candidate = asRecord(run.result.selected_candidate)
    const confirmation = asRecord(run.result.confirmation)
    const changeCancel = asRecord(run.result.change_cancel_decision)
    const transaction = asRecord(run.result.transaction_record)
    const aiAssessment = asRecord(run.result.ai_assessment)
    content = <div style={{ display: 'grid', gap: '0.75rem' }}>
      {questions.length > 0
        ? <ResultTable headers={['不足している条件', '追加で確認する内容']} rows={questions.map((item) => [item.field, item.question])} />
        : <ResultTable headers={['順位', '候補', '価格', '予算内', '変更可能']} rows={recommendations.map((item) => [item.rank, item.id, item.price, item.within_budget, item.changeable])} />}
      <ResultTable headers={['選択候補', '価格', '予算内', '変更可能']} rows={[[candidate.id, candidate.price, candidate.within_budget, candidate.changeable]]} />
      <ResultTable headers={['本人確認', '最終確認が必要', '最終確認済み']} rows={[[confirmation.identity_verified, confirmation.required, confirmation.confirmed]]} />
      <ResultTable headers={['要求操作', '変更可能', '取消可能', '候補を変更可能', '操作可能', '判定理由']} rows={[[changeCancel.requested_action, changeCancel.change_allowed, changeCancel.cancel_allowed, changeCancel.candidate_changeable, changeCancel.allowed, changeCancel.reason]]} />
      <ResultTable headers={['取引番号', '操作', '候補', '取引状態', '記録済み', '結果・失敗理由']} rows={[[transaction.transaction_id, transaction.action, transaction.candidate_id, transaction.status, transaction.recorded, transaction.reason]]} />
      <ResultTable headers={['履歴保存', '保存形式', '保存上限', '保存件数']} rows={[[run.storage?.saved, run.storage?.format, run.storage?.retention_limit, run.storage?.retained_runs]]} />
      {aiAssessment.summary ? <ResultTable headers={['AIによる評価']} rows={[[aiAssessment.summary]]} /> : null}
    </div>
  } else if (run.system_id === 'system38') {
    const assignment = asRecord(run.result.variant_assignment)
    const reaction = asRecord(run.result.reaction_log)
    content = <div style={{ display: 'grid', gap: '0.75rem' }}>
      <ResultTable headers={['順位', '商品', '一致した関心', '関心点', '鮮度点', '合計点', '在庫状態']} rows={recommendations.map((item) => [item.rank, item.id, item.interest_matches, item.interest_score, item.freshness_score, item.score, item.status])} />
      <ResultTable headers={['実験ID', '利用者キー', '割当variant']} rows={[[assignment.experiment_id, assignment.user_key, assignment.variant]]} />
      <ResultTable headers={['反応ID', '商品', '反応', '記録済み']} rows={[[reaction.event_id, reaction.item_id, reaction.event, reaction.recorded]]} />
      <ResultTable headers={['履歴保存', '保存形式', '保存上限', '保存件数']} rows={[[run.storage?.saved, run.storage?.format, run.storage?.retention_limit, run.storage?.retained_runs]]} />
    </div>
  } else if (run.system_id === 'system39') {
    const action = asRecord(run.result.business_action)
    const supportCase = asRecord(run.result.support_case)
    const procedure = asRecord(supportCase.procedure_result)
    const ticket = asRecord(supportCase.ticket)
    const handoff = asRecord(supportCase.handoff_summary)
    const procedureStatus = procedure.status === 'accepted' ? '受付済み' : procedure.status
    content = <div style={{ display: 'grid', gap: '0.75rem' }}>
      <ResultTable headers={['問い合わせ分類', '回答', '要求された操作', '操作可能', '次の処理', '本人確認', '出荷状態確認']} rows={[[action.intent, action.answer, action.requested_action, action.action_allowed, action.next_action, action.authentication_checked, action.shipping_status_checked]]} />
      <ResultTable headers={['案件ID', '手続き', '受付結果', '顧客ID', '注文ID', '記録済み']} rows={[[supportCase.case_id, procedure.action, procedureStatus, procedure.customer_id, procedure.order_id, procedure.recorded]]} />
      <ResultTable headers={['チケットID', '状態', '理由', '記録済み']} rows={[[ticket.ticket_id, ticket.status, ticket.reason, ticket.recorded]]} />
      <ResultTable headers={['担当者引継ぎ', '理由', '引継ぎ要約']} rows={[[handoff.required, handoff.reason, handoff.summary]]} />
      <ResultTable headers={['履歴保存', '保存形式', '保存上限', '保存件数']} rows={[[run.storage?.saved, run.storage?.format, run.storage?.retention_limit, run.storage?.retained_runs]]} />
    </div>
  } else if (run.system_id === 'system40') {
    const proposal = asRecord(run.result.replenishment_proposal)
    content = <div style={{ display: 'grid', gap: '0.75rem' }}>
      <ResultTable headers={['基礎予測', '季節倍率', '販促倍率', '需要予測', '実績値', '予測誤差率', '現在庫', '入荷予定', '利用可能在庫', 'リードタイム中の需要', '棚容量', '目標在庫', '補充量']} rows={recommendations.map((item) => [item.base_forecast, item.seasonality_factor, item.promotion_lift, item.forecast, item.validation_actual, item.forecast_error_rate, item.current_stock, item.incoming_within_lead_time, item.available_stock, item.demand_during_lead_time, item.shelf_capacity, item.target_stock, item.reorder_quantity])} />
      <ResultTable headers={['提案ID', '需要予測', '欠品リスク', '補充量', '補充理由', '承認状態', '承認者', '発注候補へ記録']} rows={[[proposal.proposal_id, proposal.forecast, proposal.shortage_risk, proposal.reorder_quantity, proposal.reason, proposal.approval_status, proposal.approver, proposal.order_candidate_recorded]]} />
      <ResultTable headers={['履歴保存', '保存形式', '保存上限', '保存件数']} rows={[[run.storage?.saved, run.storage?.format, run.storage?.retention_limit, run.storage?.retained_runs]]} />
    </div>
  } else if (run.system_id === 'system41') {
    const confirmationQueue = asRecords(run.result.confirmation_queue)
    const anomalies = asRecords(run.result.anomaly_candidates)
    const reviewRecord = asRecord(run.result.human_review_record)
    content = <div style={{ display: 'grid', gap: '0.75rem' }}>
      <ResultTable headers={['検出候補', '商品ID', 'マスタ一致', '画像数量', 'OCR数量', 'センサー数量', '推定数量', '数量不一致', '信頼度', 'しきい値以上', 'OCRの裏付け', 'センサーの裏付け', '確認結果']} rows={recommendations.map((item) => [item.object, item.product_id, item.master_matched, item.image_quantity, item.ocr_quantity, item.sensor_quantity, item.estimated_quantity, item.quantity_mismatch, item.confidence, item.above_threshold, item.ocr_supported, item.sensor_supported, item.disposition])} />
      <ResultTable headers={['確認待ち候補', '商品ID', '確認理由', '推定数量']} rows={confirmationQueue.length > 0 ? confirmationQueue.map((item) => [item.object, item.product_id, item.reasons, item.estimated_quantity]) : [['なし', '-', '-', '-']]} />
      <ResultTable headers={['異常候補', '異常理由']} rows={anomalies.length > 0 ? anomalies.map((item) => [item.object, item.reasons]) : [['なし', '-']]} />
      <ResultTable headers={['確認ID', '確認状態', '確認者', '確認結果', '履歴へ保存']} rows={[[reviewRecord.review_id, reviewRecord.status, reviewRecord.reviewer, reviewRecord.decisions, reviewRecord.recorded]]} />
      <ResultTable headers={['履歴保存', '保存形式', '保存上限', '保存件数']} rows={[[run.storage?.saved, run.storage?.format, run.storage?.retention_limit, run.storage?.retained_runs]]} />
    </div>
  } else if (run.system_id === 'system42') {
    const alert = asRecord(run.result.alert)
    const confirmation = asRecord(run.result.confirmation_record)
    const evaluation = asRecord(run.result.evaluation_record)
    content = <div style={{ display: 'grid', gap: '0.75rem' }}>
      <ResultTable headers={['金額倍率', '金額の加点', '国の加点', '時間帯の加点', '新端末の加点', 'IP評価の加点', 'ログイン履歴の加点', '過去履歴の加点', 'リスク点', '保留しきい値', '拒否しきい値', '判定', '判定根拠']} rows={recommendations.map((item) => [item.amount_ratio, item.amount_points, item.country_points, item.time_points, item.new_device_points, item.reputation_points, item.login_points, item.history_points, item.risk_score, item.hold_threshold, item.reject_threshold, item.action, item.signals])} />
      <ResultTable headers={['アラートID', 'アラート作成', '判定', 'リスク点', '理由']} rows={[[alert.alert_id, alert.created, alert.action, alert.risk_score, alert.reasons]]} />
      <ResultTable headers={['確認状態', '確認者', '実際の結果', '履歴へ保存']} rows={[[confirmation.status, confirmation.reviewer, confirmation.actual_outcome, confirmation.recorded]]} />
      <ResultTable headers={['評価結果', '推定コスト', '誤検知コスト', '見逃しコスト']} rows={[[evaluation.classification, evaluation.estimated_cost, evaluation.false_positive_cost, evaluation.false_negative_cost]]} />
      <ResultTable headers={['履歴保存', '保存形式', '保存上限', '保存件数']} rows={[[run.storage?.saved, run.storage?.format, run.storage?.retention_limit, run.storage?.retained_runs]]} />
    </div>
  } else if (run.system_id === 'system43') {
    const summary = recommendations.find((item) => item.type === 'summary') ?? {}
    const assignments = recommendations.filter((item) => item.type === 'assignment')
    const routes = asRecords(run.result.route_plan)
    const violations = asRecords(run.result.violations)
    const costs = asRecord(run.result.cost_summary)
    const candidates = asRecords(run.result.adjustment_candidates)
    const adjustment = asRecord(run.result.human_adjustment_record)
    content = <div style={{ display: 'grid', gap: '0.75rem' }}>
      <ResultTable headers={['担当者', '割り当てた仕事', '割当件数', '件数上限', '所要時間', '時間上限', '時間内', 'ルート距離', '距離上限', '距離内']} rows={assignments.map((item) => [item.resource, item.jobs, item.job_count, item.capacity, item.total_duration, item.max_duration, item.within_duration, item.route_distance, item.max_route_distance, item.within_route_distance])} />
      <ResultTable headers={['目的関数', '未割当の仕事', '見つからない必須の仕事', '制約違反数', '総コスト', '人間調整を使用']} rows={[[summary.objective, summary.unassigned_jobs, summary.missing_required_jobs, summary.violation_count, summary.total_cost, summary.manual_plan_used]]} />
      <ResultTable headers={['担当者', '開始位置', '訪問順', '距離', '遅延（分）', '時間超過（分）']} rows={routes.map((item) => [item.resource, item.start_location, item.route, item.distance, item.delay_minutes, item.overtime_minutes])} />
      <ResultTable headers={['違反種別', '担当者', '対象の仕事', '理由']} rows={violations.length > 0 ? violations.map((item) => [item.type, item.resource, item.jobs, item.reason]) : [['なし', '-', '-', '-']]} />
      <ResultTable headers={['距離コスト', '遅延コスト', '未割当コスト', '時間超過コスト', '総コスト']} rows={[[costs.distance_cost, costs.delay_cost, costs.unassigned_cost, costs.overtime_cost, costs.total_cost]]} />
      <ResultTable headers={['調整方法', '対象の違反', '理由']} rows={candidates.length > 0 ? candidates.map((item) => [item.action, item.violation_type, item.reason]) : [['調整不要', '-', '制約違反はありません。']]} />
      <ResultTable headers={['調整ID', '状態', '調整者', '調整内容', '履歴へ保存']} rows={[[adjustment.adjustment_id, adjustment.status, adjustment.operator, adjustment.assignments, adjustment.recorded]]} />
      <ResultTable headers={['履歴保存', '保存形式', '保存上限', '保存件数']} rows={[[run.storage?.saved, run.storage?.format, run.storage?.retention_limit, run.storage?.retained_runs]]} />
    </div>
  } else if (run.system_id === 'system44') {
    const quality = asRecord(run.result.quality_comparison)
    const costs = asRecord(run.result.cost_comparison)
    const guardrails = asRecord(run.result.guardrail_summary)
    const failures = asRecords(run.result.failure_classifications)
    const improvements = asRecords(run.result.improvement_candidates)
    const memo = asRecord(run.result.decision_memo)
    content = <div style={{ display: 'grid', gap: '0.75rem' }}>
      <ResultTable headers={['基準側人数', '基準側成果数', '基準側成果率', '変更側人数', '変更側成果数', '変更側成果率', '成果率の差', '相対改善率', '合計人数', '必要人数', '自動判断']} rows={recommendations.map((item) => [item.control_users, item.control_conversions, item.control_rate, item.variant_users, item.variant_conversions, item.variant_rate, item.absolute_uplift, item.relative_uplift, item.total_sample, item.minimum_sample, item.decision])} />
      <ResultTable headers={['基準側AI品質', '変更側AI品質', '品質差', '最低品質', '基準側失敗数', '変更側失敗数', '品質条件']} rows={[[quality.control_accuracy, quality.variant_accuracy, quality.accuracy_difference, quality.minimum_variant_quality, quality.control_failure_count, quality.variant_failure_count, quality.quality_condition_met]]} />
      <ResultTable headers={['基準側総コスト', '変更側総コスト', '基準側成果単価', '変更側成果単価', '成果単価の差', '成果単価上限', 'コスト条件']} rows={[[costs.control_total, costs.variant_total, costs.control_cost_per_conversion, costs.variant_cost_per_conversion, costs.cost_per_conversion_difference, costs.maximum_variant_cost_per_conversion, costs.cost_condition_met]]} />
      <ResultTable headers={['応答時間', '応答時間上限', '応答時間条件', '苦情率', '苦情率上限', '苦情率条件']} rows={[[guardrails.latency_ms, guardrails.maximum_latency_ms, guardrails.latency_condition_met, guardrails.complaint_rate, guardrails.maximum_complaint_rate, guardrails.complaint_condition_met]]} />
      <ResultTable headers={['比較対象', '失敗分類', '件数', '改善対象']} rows={failures.length > 0 ? failures.map((item) => [item.variant, item.category, item.count, item.requires_improvement]) : [['なし', '-', 0, false]]} />
      <ResultTable headers={['改善元', '改善内容', '優先度']} rows={improvements.length > 0 ? improvements.map((item) => [item.source, item.action, item.priority]) : [['なし', '追加の改善は不要です。', '-']]} />
      <ResultTable headers={['記録ID', '状態', '確認者', '自動判断', '人間の判断', '判断理由', '改善内容', '次の実験', '履歴へ保存']} rows={[[memo.memo_id, memo.status, memo.reviewer, memo.automatic_decision, memo.decision, memo.reason, memo.improvement_action, memo.next_experiment, memo.recorded]]} />
      <ResultTable headers={['履歴保存', '保存形式', '保存上限', '保存件数']} rows={[[run.storage?.saved, run.storage?.format, run.storage?.retention_limit, run.storage?.retained_runs]]} />
    </div>
  } else {
    content = <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.82rem' }}>{JSON.stringify(run.result, null, 2)}</pre>
  }

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <p style={{ margin: 0 }}>{displayValue(run.result.summary)}</p>
      {content}
      <p style={{ margin: 0 }}><strong>注意点:</strong> {risks.length > 0 ? risks.map(displayValue).join('、') : 'なし'}</p>
    </div>
  )
}

export default function EnterpriseAiSystemPage({ systemId }: Props) {
  const client = useMemo(() => createSystemClient(systemId), [systemId])
  const [metadata, setMetadata] = useState<Metadata | null>(null)
  const [inputText, setInputText] = useState('{}')
  const [mode, setMode] = useState<'mock' | 'lmstudio'>('mock')
  const [result, setResult] = useState<RunResult | null>(null)
  const [runs, setRuns] = useState<RunResult[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const copy = screenCopy[systemId] ?? { description: '', inputGuide: '', resultGuide: '' }

  useEffect(() => {
    let active = true
    setError('')
    setResult(null)
    client.get<Metadata>('/metadata')
      .then((res) => {
        if (!active) return
        setMetadata(res.data)
        setInputText(JSON.stringify(res.data.default_input, null, 2))
      })
      .catch(() => { if (active) setError('テーマ情報の取得に失敗しました。') })
    client.get<{ runs: RunResult[] }>('/runs')
      .then((res) => { if (active) setRuns(res.data.runs) })
      .catch(() => undefined)
    return () => { active = false }
  }, [client])

  async function execute() {
    setLoading(true)
    setError('')
    try {
      const parsed = JSON.parse(inputText)
      const res = await client.post<RunResult>('/execute', { input: parsed, mode, operator: 'learner' })
      setResult(res.data)
      const history = await client.get<{ runs: RunResult[] }>('/runs')
      setRuns(history.data.runs)
    } catch (err) {
      setError(err instanceof SyntaxError ? 'JSONの形式を確認してください。' : '実行に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  function resetInput() {
    if (metadata) setInputText(JSON.stringify(metadata.default_input, null, 2))
    setResult(null)
    setError('')
  }

  function applySystem37Example(example: 'execute' | 'missing' | 'confirming' | 'change' | 'cancel') {
    if (!metadata) return
    const input = JSON.parse(JSON.stringify(metadata.default_input)) as Record<string, unknown>
    const request = asRecord(input.transaction_request)
    if (example === 'missing') {
      const conditions = asRecord(input.request_conditions)
      delete conditions.route
      input.request_conditions = conditions
    }
    if (example === 'confirming') input.user_confirmation = false
    if (example === 'change') input.transaction_request = { ...request, action: 'change' }
    if (example === 'cancel') input.transaction_request = { ...request, action: 'cancel' }
    setInputText(JSON.stringify(input, null, 2))
    setResult(null)
    setError('')
  }

  function applySystem38Example(example: 'default' | 'interest' | 'outOfStock' | 'homogeneous' | 'user' | 'reaction') {
    if (!metadata) return
    const input = JSON.parse(JSON.stringify(metadata.default_input)) as Record<string, unknown>
    if (example === 'interest') input.user_profile = { ...asRecord(input.user_profile), interests: ['tea', 'gift'] }
    if (example === 'outOfStock') {
      const items = asRecords(input.item_catalog)
      input.item_catalog = items.map((item, index) => index === 0 ? { ...item, status: 'out_of_stock' } : item)
    }
    if (example === 'homogeneous') {
      const items = asRecords(input.item_catalog)
      input.item_catalog = items.map((item, index) => index < 2 ? { ...item, tags: ['coffee'] } : item)
    }
    if (example === 'user') input.experiment = { ...asRecord(input.experiment), user_key: 'learner-002' }
    if (example === 'reaction') input.feedback = { item_id: 'item-c', event: 'purchase' }
    setInputText(JSON.stringify(input, null, 2))
    setResult(null)
    setError('')
  }

  function applySystem39Example(example: 'default' | 'unauthenticated' | 'general' | 'shipped' | 'refund') {
    if (!metadata) return
    const input = JSON.parse(JSON.stringify(metadata.default_input)) as Record<string, unknown>
    if (example === 'unauthenticated') {
      input.customer_context = { ...asRecord(input.customer_context), authenticated: false }
    }
    if (example === 'general') {
      input.inquiry_text = '注文状況を確認したいです'
      input.requested_procedure = { type: 'answer' }
    }
    if (example === 'shipped') {
      input.order_info = { ...asRecord(input.order_info), shipping_status: 'shipped' }
    }
    if (example === 'refund') {
      input.inquiry_text = '返品して返金を受けたいです'
      input.requested_procedure = { type: 'request_refund' }
    }
    setInputText(JSON.stringify(input, null, 2))
    setResult(null)
    setError('')
  }

  function applySystem40Example(example: 'default' | 'promotion' | 'inventory' | 'capacity' | 'supply' | 'approved') {
    if (!metadata) return
    const input = JSON.parse(JSON.stringify(metadata.default_input)) as Record<string, unknown>
    if (example === 'promotion') input.promotion_calendar = [{ date: '2026-05-20', lift: 1.6 }]
    if (example === 'inventory') input.inventory_snapshot = { 'sku-100': 12 }
    if (example === 'capacity') input.store_constraints = { ...asRecord(input.store_constraints), shelf_capacity: 45 }
    if (example === 'supply') {
      input.seasonality_factor = 1.4
      input.incoming_schedule = [{ quantity: 30, arrives_within_lead_time: true }]
    }
    if (example === 'approved') input.approval = { status: 'approved', approver: 'inventory-manager' }
    setInputText(JSON.stringify(input, null, 2))
    setResult(null)
    setError('')
  }

  function applySystem41Example(example: 'default' | 'lowQuality' | 'mismatch' | 'highThreshold' | 'confirmed') {
    if (!metadata) return
    const input = JSON.parse(JSON.stringify(metadata.default_input)) as Record<string, unknown>
    if (example === 'lowQuality') {
      const images = asRecord(input.image_inputs)
      input.image_inputs = { ...images, shelf_image: { ...asRecord(images.shelf_image), quality: 'low' } }
    }
    if (example === 'mismatch') {
      input.ocr_results = [{ text: '商品A', quantity: 5, confidence: 0.92 }]
      input.sensor_events = [{ type: 'weight_change', product_id: 'sku-100', quantity_delta: -1 }]
    }
    if (example === 'highThreshold') input.confidence_threshold = 0.95
    if (example === 'confirmed') input.human_review = { status: 'confirmed', reviewer: 'store-reviewer', decisions: { unknown_box: 'confirmed' } }
    setInputText(JSON.stringify(input, null, 2))
    setResult(null)
    setError('')
  }

  function applySystem42Example(example: 'default' | 'normal' | 'hold' | 'falsePositive' | 'falseNegative') {
    if (!metadata) return
    const input = JSON.parse(JSON.stringify(metadata.default_input)) as Record<string, unknown>
    if (example === 'normal' || example === 'falseNegative') {
      input.transaction_event = { amount: 12000, country: 'JP', hour: 12 }
      input.device_signal = { new_device: false, ip_reputation: 'low' }
      input.login_history = { failed_attempts: 0, new_location: false }
      input.historical_patterns = { chargeback_count: 0 }
    }
    if (example === 'hold') input.rule_thresholds = { ...asRecord(input.rule_thresholds), risk_reject: 0.95 }
    if (example === 'falsePositive') input.confirmation_result = { status: 'reviewed', reviewer: 'fraud-analyst', actual_outcome: 'legitimate' }
    if (example === 'falseNegative') input.confirmation_result = { status: 'reviewed', reviewer: 'fraud-analyst', actual_outcome: 'fraud' }
    setInputText(JSON.stringify(input, null, 2))
    setResult(null)
    setError('')
  }

  function applySystem43Example(example: 'default' | 'unassigned' | 'duration' | 'missingRequired' | 'adjusted') {
    if (!metadata) return
    const input = JSON.parse(JSON.stringify(metadata.default_input)) as Record<string, unknown>
    if (example === 'unassigned') {
      input.jobs = [...asRecords(input.jobs), { id: 'job-3', duration: 30, location: { x: 8, y: 3 }, priority: 1 }]
      input.resources = [{ id: 'driver-a', capacity: 1, start_location: { x: 0, y: 0 }, available_window: '09:00-13:00' }]
    }
    if (example === 'duration') input.constraints = { ...asRecord(input.constraints), max_duration: 20 }
    if (example === 'missingRequired') input.constraints = { ...asRecord(input.constraints), must_visit: ['job-1', 'job-missing'] }
    if (example === 'adjusted') input.human_adjustment = { status: 'applied', operator: 'dispatcher', assignments: [{ resource: 'driver-a', jobs: ['job-2'] }, { resource: 'driver-b', jobs: ['job-1'] }] }
    setInputText(JSON.stringify(input, null, 2))
    setResult(null)
    setError('')
  }

  function applySystem44Example(example: 'default' | 'quality' | 'cost' | 'latency' | 'decided') {
    if (!metadata) return
    const input = JSON.parse(JSON.stringify(metadata.default_input)) as Record<string, unknown>
    if (example === 'quality') {
      const metrics = asRecord(input.ai_quality_metrics)
      input.ai_quality_metrics = { ...metrics, variant: { ...asRecord(metrics.variant), accuracy: 0.7 } }
    }
    if (example === 'cost') input.cost_metrics = { ...asRecord(input.cost_metrics), variant_total: 30000 }
    if (example === 'latency') input.guardrail_metrics = { ...asRecord(input.guardrail_metrics), latency_ms: 700 }
    if (example === 'decided') input.human_review_result = { status: 'decided', reviewer: 'product-owner', decision: 'continue_test', reason: '関連性エラーを減らしてから再評価する', improvement_action: '失敗事例を追加して品質を再評価する', next_experiment: 'recommendation-v3' }
    setInputText(JSON.stringify(input, null, 2))
    setResult(null)
    setError('')
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <header>
        <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{systemId}</div>
        <h1 style={{ margin: '0.2rem 0', color: '#111827' }}>{metadata?.title ?? '企業AI教材'}</h1>
        <p style={{ margin: 0, color: '#475569' }}>{copy.description || metadata?.pattern}</p>
      </header>

      {error && <div style={{ ...styles.panel, borderColor: '#fca5a5', color: '#991b1b', background: '#fef2f2' }}>{error}</div>}

      <section style={{ ...styles.panel, display: 'grid', gap: '0.75rem' }}>
        <div><label style={styles.label}>実行条件（JSON）</label><p style={{ margin: 0, color: '#64748b' }}>{copy.inputGuide}</p></div>
        {systemId === 'system37' && <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => applySystem37Example('execute')} style={styles.secondaryButton}>実行例</button>
          <button onClick={() => applySystem37Example('missing')} style={styles.secondaryButton}>条件不足例</button>
          <button onClick={() => applySystem37Example('confirming')} style={styles.secondaryButton}>確認待ち例</button>
          <button onClick={() => applySystem37Example('change')} style={styles.secondaryButton}>変更例</button>
          <button onClick={() => applySystem37Example('cancel')} style={styles.secondaryButton}>取消例</button>
        </div>}
        {systemId === 'system38' && <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => applySystem38Example('default')} style={styles.secondaryButton}>既定の推薦</button>
          <button onClick={() => applySystem38Example('interest')} style={styles.secondaryButton}>関心変更例</button>
          <button onClick={() => applySystem38Example('outOfStock')} style={styles.secondaryButton}>在庫切れ例</button>
          <button onClick={() => applySystem38Example('homogeneous')} style={styles.secondaryButton}>推薦偏り例</button>
          <button onClick={() => applySystem38Example('user')} style={styles.secondaryButton}>利用者変更例</button>
          <button onClick={() => applySystem38Example('reaction')} style={styles.secondaryButton}>反応変更例</button>
        </div>}
        {systemId === 'system39' && <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => applySystem39Example('default')} style={styles.secondaryButton}>住所変更の受付例</button>
          <button onClick={() => applySystem39Example('unauthenticated')} style={styles.secondaryButton}>本人確認不足例</button>
          <button onClick={() => applySystem39Example('general')} style={styles.secondaryButton}>回答のみの例</button>
          <button onClick={() => applySystem39Example('shipped')} style={styles.secondaryButton}>出荷後の停止例</button>
          <button onClick={() => applySystem39Example('refund')} style={styles.secondaryButton}>返金受付例</button>
        </div>}
        {systemId === 'system40' && <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => applySystem40Example('default')} style={styles.secondaryButton}>既定の予測</button>
          <button onClick={() => applySystem40Example('promotion')} style={styles.secondaryButton}>販促変更例</button>
          <button onClick={() => applySystem40Example('inventory')} style={styles.secondaryButton}>在庫不足例</button>
          <button onClick={() => applySystem40Example('capacity')} style={styles.secondaryButton}>棚容量変更例</button>
          <button onClick={() => applySystem40Example('supply')} style={styles.secondaryButton}>季節・入荷変更例</button>
          <button onClick={() => applySystem40Example('approved')} style={styles.secondaryButton}>承認済み例</button>
        </div>}
        {systemId === 'system41' && <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => applySystem41Example('default')} style={styles.secondaryButton}>既定の照合</button>
          <button onClick={() => applySystem41Example('lowQuality')} style={styles.secondaryButton}>低画質例</button>
          <button onClick={() => applySystem41Example('mismatch')} style={styles.secondaryButton}>数量不一致例</button>
          <button onClick={() => applySystem41Example('highThreshold')} style={styles.secondaryButton}>高いしきい値例</button>
          <button onClick={() => applySystem41Example('confirmed')} style={styles.secondaryButton}>人間確認済み例</button>
        </div>}
        {systemId === 'system42' && <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => applySystem42Example('default')} style={styles.secondaryButton}>拒否判定例</button>
          <button onClick={() => applySystem42Example('normal')} style={styles.secondaryButton}>通常取引例</button>
          <button onClick={() => applySystem42Example('hold')} style={styles.secondaryButton}>保留判定例</button>
          <button onClick={() => applySystem42Example('falsePositive')} style={styles.secondaryButton}>誤検知例</button>
          <button onClick={() => applySystem42Example('falseNegative')} style={styles.secondaryButton}>見逃し例</button>
        </div>}
        {systemId === 'system43' && <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => applySystem43Example('default')} style={styles.secondaryButton}>既定の割当</button>
          <button onClick={() => applySystem43Example('unassigned')} style={styles.secondaryButton}>未割当例</button>
          <button onClick={() => applySystem43Example('duration')} style={styles.secondaryButton}>時間超過例</button>
          <button onClick={() => applySystem43Example('missingRequired')} style={styles.secondaryButton}>必須仕事不足例</button>
          <button onClick={() => applySystem43Example('adjusted')} style={styles.secondaryButton}>人間調整例</button>
        </div>}
        {systemId === 'system44' && <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => applySystem44Example('default')} style={styles.secondaryButton}>既定の実験</button>
          <button onClick={() => applySystem44Example('quality')} style={styles.secondaryButton}>品質低下例</button>
          <button onClick={() => applySystem44Example('cost')} style={styles.secondaryButton}>コスト超過例</button>
          <button onClick={() => applySystem44Example('latency')} style={styles.secondaryButton}>応答遅延例</button>
          <button onClick={() => applySystem44Example('decided')} style={styles.secondaryButton}>意思決定済み例</button>
        </div>}
        <textarea aria-label="実行条件" value={inputText} onChange={(event) => setInputText(event.target.value)} style={styles.textarea} />
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label htmlFor={`${systemId}-mode`} style={{ fontWeight: 700 }}>実行方式</label>
          <select id={`${systemId}-mode`} value={mode} onChange={(event) => setMode(event.target.value as 'mock' | 'lmstudio')} style={{ border: '1px solid #cbd5e1', borderRadius: 6, padding: '0.6rem' }}>
            <option value="mock">モックで実行</option>
            <option value="lmstudio">LM Studio接続を試す（未接続時はモック）</option>
          </select>
          <button onClick={execute} disabled={loading} style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}>{loading ? '実行中...' : '実行'}</button>
          <button onClick={resetInput} style={styles.secondaryButton}>既定値へ戻す</button>
        </div>
      </section>

      <section style={{ ...styles.panel, display: 'grid', gap: '0.75rem' }}>
        <div><label style={styles.label}>実行結果</label><p style={{ margin: 0, color: '#64748b' }}>{copy.resultGuide}</p></div>
        {result ? <ResultDetails run={result} /> : <p style={{ margin: 0 }}>「実行」を押すと、ここに結果が表示されます。</p>}
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        <div style={styles.panel}>
          <label style={styles.label}>現在の状態</label>
          <div style={{ fontWeight: 700, color: '#0f766e' }}>{result ? (stateLabels[result.state] ?? result.state) : '-'}</div>
          <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: 6 }}>{metadata?.state_flow.map((state) => stateLabels[state] ?? state).join(' → ')}</div>
        </div>
        <div style={styles.panel}>
          <label style={styles.label}>評価指標</label>
          {result ? <ResultTable headers={['指標', '値']} rows={Object.entries(result.kpi_snapshot).map(([name, value]) => [kpiLabels[name] ?? name, value])} /> : <p style={{ margin: 0 }}>実行後に表示されます。</p>}
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        <div style={styles.panel}>
          <label style={styles.label}>監査記録</label>
          {result ? <ResultTable headers={['操作', '実行者', '理由']} rows={result.audit_log.map((entry) => [entry.action, entry.actor, entry.reason])} /> : <p style={{ margin: 0 }}>実行後に表示されます。</p>}
        </div>
        <div style={styles.panel}>
          <label style={styles.label}>実行履歴</label>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {runs.length === 0 && <div style={{ color: '#64748b' }}>実行履歴はまだありません。</div>}
            {runs.map((run) => (
              <button key={`${run.run_id}-${run.created_at}`} onClick={() => setResult(run)} style={{ ...styles.secondaryButton, textAlign: 'left' }}>
                <strong>{run.run_id}</strong><br /><span style={{ fontSize: '0.82rem' }}>{new Date(run.created_at).toLocaleString('ja-JP')}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
