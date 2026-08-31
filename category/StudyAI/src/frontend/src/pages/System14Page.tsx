import { useState } from 'react'
import { createSystemClient } from '../api/client'

const client = createSystemClient('system14')

type Screen = 'upload' | 'dashboard' | 'analysis' | 'agent'

interface JobStatus {
  job_id: string
  status: string
  progress: number
  data_type: string
  source: string
  error_message?: string | null
}

interface UploadAcceptedResponse {
  job_id: string
  status: string
  estimated_minutes: number
  data_type: string
  file_count: number
}

interface VoiceRankingItem {
  rank: number
  group_label: string
  count: number
  sentiment?: string | null
  type?: string | null
  products?: string[]
  representative_text?: string | null
}

interface DashboardCard {
  key: string
  label: string
  value: number | string
  unit?: string | null
}

interface DashboardData {
  cards: DashboardCard[]
  sentiment_summary: Record<string, number>
  top_topics: VoiceRankingItem[]
  recent_jobs: JobStatus[]
}

interface VoiceRankingResponse {
  period: string
  total_data_count: number
  ranking: VoiceRankingItem[]
}

interface SalesScoreItem {
  staff_id?: string | null
  staff_name?: string | null
  overall_score: number
  breakdown: Record<string, number>
  top_questions: { question_type: string; count: number; example?: string | null }[]
}

interface SalesScoreResponse {
  period: string
  scores: SalesScoreItem[]
}

interface WinLossItem {
  rank: number
  reason: string
  result_type: string
  category?: string | null
  count: number
  representative_text?: string | null
}

interface WinLossResponse {
  period: string
  win_loss: WinLossItem[]
}

interface ActionProposalItem {
  priority: string
  issue: string
  evidence_count: number
  recommended_action: string
  target_department: string
}

interface ActionProposalResponse {
  product?: string | null
  proposals: ActionProposalItem[]
}

interface FAQGapItem {
  rank: number
  call_reason: string
  inquiry_count: number
  existing_faq?: string | null
  suggested_faq: {
    question: string
    answer: string
  }
}

interface FAQGapResponse {
  product?: string | null
  faq_gaps: FAQGapItem[]
}

interface AgentAnswer {
  answer_id: number
  question: string
  answer: string
  recommended_actions: string[]
  evidence: {
    total_utterances?: number
    top_group?: VoiceRankingItem | null
    top_sales_score?: SalesScoreItem | null
  }
  related_links: { label: string; endpoint: string }[]
}

interface AnalysisFilters {
  fromDate: string
  toDate: string
  product: string
  callReason: string
  sentiment: string
  staffId: string
  utteranceType: string
}

const COLOR = {
  panel: '#ffffff',
  border: '#dfe4ea',
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  danger: '#dc2626',
  ok: '#15803d',
  text: '#172033',
  muted: '#64748b',
  bg: '#f6f8fb',
  band: '#eef4ff',
}

const card = (): React.CSSProperties => ({
  background: COLOR.panel,
  border: `1px solid ${COLOR.border}`,
  borderRadius: 8,
  padding: '1rem',
  marginBottom: '1rem',
})

const field = (): React.CSSProperties => ({
  border: `1px solid ${COLOR.border}`,
  borderRadius: 6,
  padding: '0.5rem 0.65rem',
  fontSize: '0.9rem',
  width: '100%',
  boxSizing: 'border-box',
})

const button = (active = true): React.CSSProperties => ({
  background: active ? COLOR.primary : '#cbd5e1',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '0.58rem 1rem',
  cursor: active ? 'pointer' : 'not-allowed',
  minHeight: 36,
})

const tabButton = (active: boolean): React.CSSProperties => ({
  ...button(true),
  background: active ? COLOR.primaryDark : '#e2e8f0',
  color: active ? '#fff' : COLOR.text,
})

const tableCell = (): React.CSSProperties => ({
  padding: 8,
  borderBottom: `1px solid ${COLOR.border}`,
  verticalAlign: 'top',
})

const DATA_TYPE_LABELS: Record<string, string> = {
  chat: 'チャット',
  email: 'メール',
  call_log: '通話記録',
  audio: '音声',
  video: '動画',
}

const STATUS_LABELS: Record<string, string> = {
  pending: '受付済み',
  processing: '処理中',
  completed: '完了',
  failed: '失敗',
}

const SENTIMENT_LABELS: Record<string, string> = {
  positive: '肯定的',
  neutral: '中立',
  negative: '否定的',
}

const RESULT_LABELS: Record<string, string> = {
  win: '受注',
  loss: '失注',
  '受注': '受注',
  '失注': '失注',
}

const WORKFLOW_TRIGGER_LABELS: Record<string, string> = {
  manual: '手動',
  realtime: 'リアルタイム',
  daily: '毎日',
  weekly: '毎週',
}

const WORKFLOW_OUTPUT_LABELS: Record<string, string> = {
  voice_ranking: '顧客の声ランキング',
  sales_score: '営業スコア',
  win_loss: '受注・失注要因',
  action_proposals: '改善提案',
  faq_gaps: 'FAQ不足候補',
  dashboard: 'ダッシュボード',
}

const WORKFLOW_DELIVERY_LABELS: Record<string, string> = {
  dashboard: 'ダッシュボードに保存',
  webhook: 'Webhookへ送信',
  email: 'メール送信',
  crm: 'CRM連携（コネクター未実装）',
}

const SAMPLE_ROWS = [
  { speaker: 'customer', text: '配送が遅くて困っています。至急確認してください。', product: '商品A', staff_id: 'staff_001', staff_name: '中村', call_reason: '配送遅延', outcome: 'loss' },
  { speaker: 'customer', text: '商品Aの配送が遅くて困っています。', product: '商品A', staff_id: 'staff_001', staff_name: '中村', call_reason: '配送遅延', outcome: 'loss' },
  { speaker: 'customer', text: '配送が遅いので不満です。', product: '商品A', staff_id: 'staff_002', staff_name: '佐藤', call_reason: '配送遅延', outcome: 'loss' },
  { speaker: 'customer', text: '配送予定日はいつですか？', product: '商品A', staff_id: 'staff_001', staff_name: '中村', call_reason: '配送予定', outcome: 'win' },
  { speaker: 'customer', text: '商品Aはどこから発送されますか？', product: '商品A', staff_id: 'staff_002', staff_name: '佐藤', call_reason: '発送元', outcome: 'win' },
  { speaker: 'customer', text: '料金プランの違いを教えてください。', product: '商品B', staff_id: 'staff_002', staff_name: '佐藤', call_reason: '料金確認', outcome: 'win' },
  { speaker: 'customer', text: 'チャットの対応が早くて助かりました。', product: '商品B', staff_id: 'staff_001', staff_name: '中村', call_reason: 'サポート評価', outcome: 'win' },
  { speaker: 'customer', text: '操作画面をもっと使いやすく改善してほしいです。', product: '商品B', staff_id: 'staff_002', staff_name: '佐藤', call_reason: '操作改善', outcome: 'loss' },
  { speaker: 'staff', text: '現在の課題と背景は何ですか？解決プランを提案し、次回の日程を連絡します。', product: '商品A', staff_id: 'staff_001', staff_name: '中村', call_reason: '提案', outcome: 'win' },
  { speaker: 'staff', text: 'どの程度お困りですか？改善案と見積を送付します。', product: '商品B', staff_id: 'staff_002', staff_name: '佐藤', call_reason: '提案', outcome: 'win' },
]

function getErrorMessage(error: unknown, fallback: string) {
  const data = (error as {
    response?: { data?: { message?: string; detail?: string | { message?: string }; error?: { message?: string } } }
  }).response?.data
  if (typeof data?.detail === 'string') return data.detail
  if (typeof data?.detail === 'object' && data.detail?.message) return data.detail.message
  return data?.error?.message ?? data?.message ?? (error instanceof Error ? error.message : fallback)
}

function labelOf(labels: Record<string, string>, value?: string | null) {
  if (!value) return '-'
  return labels[value] ?? value
}

const emptyFilters: AnalysisFilters = {
  fromDate: '',
  toDate: '',
  product: '',
  callReason: '',
  sentiment: '',
  staffId: '',
  utteranceType: '',
}

function cleanValue(value: string) {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function compactParams(params: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined))
}

function buildFilterPayload(filters: AnalysisFilters) {
  return compactParams({
    from_date: cleanValue(filters.fromDate),
    to_date: cleanValue(filters.toDate),
    product: cleanValue(filters.product),
    call_reason: cleanValue(filters.callReason),
    sentiment: cleanValue(filters.sentiment),
    staff_id: cleanValue(filters.staffId),
    type: cleanValue(filters.utteranceType),
  })
}

function buildVoiceRankingParams(filters: AnalysisFilters) {
  return compactParams({
    from_date: cleanValue(filters.fromDate),
    to_date: cleanValue(filters.toDate),
    product: cleanValue(filters.product),
    call_reason: cleanValue(filters.callReason),
    sentiment: cleanValue(filters.sentiment),
    type: cleanValue(filters.utteranceType),
  })
}

function buildSalesScoreParams(filters: AnalysisFilters) {
  return compactParams({
    from_date: cleanValue(filters.fromDate),
    to_date: cleanValue(filters.toDate),
    staff_id: cleanValue(filters.staffId),
  })
}

function buildDateRangeParams(filters: AnalysisFilters) {
  return compactParams({
    from_date: cleanValue(filters.fromDate),
    to_date: cleanValue(filters.toDate),
  })
}

function buildProductParams(filters: AnalysisFilters) {
  return compactParams({
    product: cleanValue(filters.product),
  })
}

function buildActionProposalParams(filters: AnalysisFilters) {
  return compactParams({
    from_date: cleanValue(filters.fromDate),
    to_date: cleanValue(filters.toDate),
    product: cleanValue(filters.product),
  })
}

export default function System14Page() {
  const [screen, setScreen] = useState<Screen>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [dataType, setDataType] = useState('chat')
  const [source, setSource] = useState('chat_support')
  const [metadata, setMetadata] = useState(
    '{"product":"商品A","staff_id":"staff_001","staff_name":"中村","call_reason":"配送確認"}',
  )
  const [job, setJob] = useState<JobStatus | null>(null)
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [dashboardMessage, setDashboardMessage] = useState('')
  const [voiceRanking, setVoiceRanking] = useState<VoiceRankingResponse | null>(null)
  const [salesScore, setSalesScore] = useState<SalesScoreResponse | null>(null)
  const [winLoss, setWinLoss] = useState<WinLossResponse | null>(null)
  const [actionProposals, setActionProposals] = useState<ActionProposalResponse | null>(null)
  const [faqGaps, setFaqGaps] = useState<FAQGapResponse | null>(null)
  const [analysisMessage, setAnalysisMessage] = useState('')
  const [filters, setFilters] = useState<AnalysisFilters>(emptyFilters)
  const [question, setQuestion] = useState('ネガティブな声が多いトピックと次のアクションを教えて')
  const [answer, setAnswer] = useState<AgentAnswer | null>(null)
  const [answerMessage, setAnswerMessage] = useState('')
  const [workflowName, setWorkflowName] = useState('製品改善向け週次レポート')
  const [workflowTrigger, setWorkflowTrigger] = useState('weekly')
  const [workflowOutputType, setWorkflowOutputType] = useState('voice_ranking')
  const [workflowDeliveryMethod, setWorkflowDeliveryMethod] = useState('dashboard')
  const [workflowEndpoint, setWorkflowEndpoint] = useState('')
  const [workflowRecipients, setWorkflowRecipients] = useState('')
  const [workflowResult, setWorkflowResult] = useState('')

  async function uploadFile(targetFile: File, targetDataType = dataType, targetSource = source, targetMetadata = metadata) {
    setUploading(true)
    setMessage('アップロード中...')
    const form = new FormData()
    form.append('file', targetFile)
    form.append('data_type', targetDataType)
    form.append('source', targetSource)
    if (targetMetadata.trim()) {
      form.append('metadata', targetMetadata)
    }
    try {
      const res = await client.post<UploadAcceptedResponse>('/data/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const data = res.data
      setJob({
        job_id: data.job_id,
        status: data.status,
        progress: data.status === 'completed' || data.status === 'failed' ? 100 : 0,
        data_type: data.data_type,
        source: targetSource,
      })
      setMessage(
        data.status === 'failed'
          ? `取込処理に失敗しました。状態を更新して詳細を確認してください: ${data.job_id}`
          : `取込処理が完了しました: ${data.job_id}`,
      )
    } catch (error) {
      setMessage(getErrorMessage(error, 'アップロードに失敗しました'))
    } finally {
      setUploading(false)
    }
  }

  async function upload() {
    if (!file) return
    await uploadFile(file)
  }

  async function uploadSample() {
    const sampleFile = new File(
      [JSON.stringify({ items: SAMPLE_ROWS }, null, 2)],
      'system14_customer_voice_sample.json',
      { type: 'application/json' },
    )
    setDataType('chat')
    setSource('studyhub_sample')
    setMetadata('{}')
    await uploadFile(sampleFile, 'chat', 'studyhub_sample', '{}')
  }

  async function pollJob() {
    if (!job) return
    setMessage('取込状態を確認中...')
    try {
      const res = await client.get<JobStatus>(`/jobs/${job.job_id}`)
      setJob(res.data)
      setMessage(res.data.status === 'completed' ? '取込処理が完了しました。' : '取込状態を更新しました。')
    } catch (error) {
      setMessage(getErrorMessage(error, '取込状態を取得できませんでした'))
    }
  }

  async function loadDashboard() {
    setDashboardMessage('ダッシュボードを更新中...')
    try {
      const res = await client.get<DashboardData>('/dashboard')
      setDashboard(res.data)
      setDashboardMessage('')
    } catch (error) {
      setDashboardMessage(getErrorMessage(error, 'ダッシュボードを取得できませんでした'))
    }
  }

  async function loadAnalysis() {
    setAnalysisMessage('分析結果を更新中...')
    try {
      const rankingRes = await client.get<VoiceRankingResponse>('/insights/voice-ranking', { params: buildVoiceRankingParams(filters) })
      const salesRes = await client.get<SalesScoreResponse>('/insights/sales-score', { params: buildSalesScoreParams(filters) })
      const winLossRes = await client.get<WinLossResponse>('/insights/win-loss', { params: buildDateRangeParams(filters) })
      const actionRes = await client.get<ActionProposalResponse>('/agent/action-proposals', { params: buildActionProposalParams(filters) })
      const faqRes = await client.get<FAQGapResponse>('/agent/faq-gaps', { params: buildProductParams(filters) })
      setVoiceRanking(rankingRes.data)
      setSalesScore(salesRes.data)
      setWinLoss(winLossRes.data)
      setActionProposals(actionRes.data)
      setFaqGaps(faqRes.data)
      setAnalysisMessage('')
    } catch (error) {
      setAnalysisMessage(getErrorMessage(error, '分析結果の取得に失敗しました'))
    }
  }

  function updateFilter(key: keyof AnalysisFilters, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  function clearFilters() {
    setFilters(emptyFilters)
  }

  async function askAgent() {
    setAnswer(null)
    setAnswerMessage('回答生成中...')
    try {
      const res = await client.post<AgentAnswer>('/agent/chat', {
        session_id: 'frontend',
        question,
        filters: buildFilterPayload(filters),
      })
      setAnswer(res.data)
      setAnswerMessage('')
    } catch (error) {
      setAnswerMessage(getErrorMessage(error, '回答取得に失敗しました'))
    }
  }

  async function createWorkflow() {
    setWorkflowResult('保存中...')
    try {
      const recipients = workflowRecipients
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
      const res = await client.post('/workflows', {
        name: workflowName,
        trigger: workflowTrigger,
        data_sources: ['chat_support', 'callcenter'],
        analysis_steps: ['sentiment', 'topic_extraction', 'grouping', 'ranking'],
        output_type: workflowOutputType,
        filters: buildFilterPayload(filters),
        delivery: {
          method: workflowDeliveryMethod,
          endpoint: workflowEndpoint.trim() || undefined,
          recipients,
        },
      })
      const delivery = res.data.delivery_result
      const deliveryMessage = delivery
        ? ` / 実行結果=${labelOf({ success: '成功', skipped: '見送り', failed: '失敗' }, delivery.status)}${delivery.error_message ? ` (${delivery.error_message})` : ''}`
        : ''
      setWorkflowResult(`ワークフローID ${res.data.workflow_id} を保存しました${deliveryMessage}`)
    } catch (error) {
      setWorkflowResult(getErrorMessage(error, 'ワークフロー保存に失敗しました'))
    }
  }

  return (
    <div style={{ maxWidth: 1120 }}>
      <h2 style={{ color: COLOR.text, marginBottom: 4 }}>System14</h2>
      <p style={{ color: COLOR.muted, marginBottom: '1.2rem' }}>
        顧客接点データ 全量分析＆インサイト配信エージェント
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: '1rem' }}>
        {[
          ['upload', 'データ取込'],
          ['dashboard', 'ダッシュボード'],
          ['analysis', '分析'],
          ['agent', 'エージェント'],
        ].map(([key, label]) => (
          <button
            key={key}
            data-testid={`tab-${key}`}
            onClick={() => setScreen(key as Screen)}
            style={tabButton(screen === key)}
          >
            {label}
          </button>
        ))}
      </div>

      {screen === 'upload' && (
        <section style={card()}>
          <h3 style={{ marginTop: 0 }}>データ取込</h3>
          <div style={{ background: COLOR.band, borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
            <strong>最初に教材用データを取り込む</strong>
            <p style={{ color: COLOR.muted, lineHeight: 1.6, margin: '0.5rem 0' }}>
              配送への不満、問い合わせ、評価、営業担当者の発言を含む10件を取り込みます。個人情報は含みません。
            </p>
            <button data-testid="upload-sample" style={button(!uploading)} disabled={uploading} onClick={uploadSample}>
              教材用データを取り込む
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label>取込種別</label>
              <select data-testid="data-type" style={field()} value={dataType} onChange={e => setDataType(e.target.value)}>
                {Object.entries(DATA_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label>取得元</label>
              <input data-testid="source" style={field()} value={source} onChange={e => setSource(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>取込ファイル</label>
            <input data-testid="file-input" style={field()} type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label>共通情報（JSON）</label>
            <textarea
              data-testid="metadata"
              style={{ ...field(), minHeight: 90, fontFamily: 'monospace' }}
              value={metadata}
              onChange={e => setMetadata(e.target.value)}
            />
          </div>
          <button data-testid="upload-button" style={button(Boolean(file) && !uploading)} disabled={!file || uploading} onClick={upload}>
            選択したファイルを取り込む
          </button>
          {message && <p data-testid="upload-message" style={{ color: COLOR.muted }}>{message}</p>}
          {job && (
            <div data-testid="job-status" style={{ background: COLOR.bg, borderRadius: 8, padding: '1rem', marginTop: '1rem' }}>
              <div>ジョブID: {job.job_id}</div>
              <div>状態: {labelOf(STATUS_LABELS, job.status)}</div>
              <div>進捗: {job.progress}%</div>
              <div>取込種別: {labelOf(DATA_TYPE_LABELS, job.data_type)} / 取得元: {job.source}</div>
              {job.error_message && <div style={{ color: COLOR.danger }}>{job.error_message}</div>}
              <button data-testid="poll-job" style={{ ...button(true), marginTop: 8 }} onClick={pollJob}>状態更新</button>
            </div>
          )}
        </section>
      )}

      {screen === 'dashboard' && (
        <section>
          <div style={card()}>
            <button data-testid="load-dashboard" style={button(true)} onClick={loadDashboard}>ダッシュボード更新</button>
            {dashboardMessage && <p data-testid="dashboard-message" style={{ color: COLOR.muted }}>{dashboardMessage}</p>}
          </div>
          {dashboard && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.8rem' }}>
                {dashboard.cards.map(item => (
                  <div key={item.key} style={card()}>
                    <div style={{ color: COLOR.muted, fontSize: '0.82rem' }}>{item.label}</div>
                    <div data-testid={`dashboard-card-${item.key}`} style={{ color: COLOR.text, fontSize: '1.8rem', fontWeight: 'bold' }}>
                      {item.value}{item.unit ?? ''}
                    </div>
                  </div>
                ))}
              </div>
              <div style={card()}>
                <h3 style={{ marginTop: 0 }}>感情別の発言数</h3>
                {Object.keys(dashboard.sentiment_summary).length === 0 ? (
                  <EmptyText>取込済みの発言はありません。</EmptyText>
                ) : (
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {Object.entries(dashboard.sentiment_summary).map(([key, count]) => (
                      <div key={key} style={{ background: COLOR.bg, borderRadius: 8, padding: '0.8rem 1rem', minWidth: 120 }}>
                        <div style={{ color: COLOR.muted }}>{labelOf(SENTIMENT_LABELS, key)}</div>
                        <strong>{count}件</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={card()}>
                <h3 style={{ marginTop: 0 }}>顧客の声ランキング</h3>
                <RankingTable items={dashboard.top_topics} />
              </div>
              <div style={card()}>
                <h3 style={{ marginTop: 0 }}>直近ジョブ</h3>
                {dashboard.recent_jobs.length === 0 ? <EmptyText>取込履歴はありません。</EmptyText> : dashboard.recent_jobs.map(item => (
                  <div key={item.job_id} style={{ padding: '0.4rem 0', borderBottom: `1px solid ${COLOR.border}` }}>
                    {item.job_id} / {labelOf(STATUS_LABELS, item.status)} / {item.progress}% / {labelOf(DATA_TYPE_LABELS, item.data_type)}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {screen === 'analysis' && (
        <section>
          <div style={card()}>
            <h3 style={{ marginTop: 0 }}>分析フィルタ</h3>
            <AnalysisFilterPanel filters={filters} onChange={updateFilter} onClear={clearFilters} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: '1rem' }}>
              <button data-testid="load-analysis" style={button(true)} onClick={loadAnalysis}>分析結果更新</button>
              <button data-testid="clear-analysis-filters" style={{ ...button(true), background: '#475569' }} onClick={clearFilters}>
                フィルタをクリア
              </button>
            </div>
            {analysisMessage && <p data-testid="analysis-message" style={{ color: COLOR.muted }}>{analysisMessage}</p>}
          </div>
          {voiceRanking && (
            <div style={card()}>
              <h3 style={{ marginTop: 0 }}>顧客の声ランキング</h3>
              <p style={{ color: COLOR.muted }}>対象発言数: {voiceRanking.total_data_count}件 / 対象期間: {voiceRanking.period === 'all' ? '全期間' : voiceRanking.period}</p>
              <RankingTable items={voiceRanking.ranking} />
            </div>
          )}
          {salesScore && (
            <div style={card()}>
              <h3 style={{ marginTop: 0 }}>営業スコア</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.8rem' }}>
                {salesScore.scores.map((item, index) => (
                  <div key={`${item.staff_id ?? 'staff'}-${index}`} style={{ background: COLOR.bg, borderRadius: 8, padding: '1rem' }}>
                    <div style={{ fontWeight: 'bold' }}>{item.staff_name ?? item.staff_id ?? '担当者未設定'}</div>
                    <div data-testid="sales-score" style={{ fontSize: '1.6rem', color: COLOR.primary, fontWeight: 'bold' }}>{item.overall_score}点</div>
                    <dl style={{ color: COLOR.muted, fontSize: '0.84rem', lineHeight: 1.8, marginBottom: 0 }}>
                      <div><dt style={{ display: 'inline' }}>傾聴比率: </dt><dd style={{ display: 'inline', margin: 0 }}>{item.breakdown.listening_ratio ?? '-'}</dd></div>
                      <div><dt style={{ display: 'inline' }}>課題の深掘り: </dt><dd style={{ display: 'inline', margin: 0 }}>{item.breakdown.issue_exploration ?? '-'}点</dd></div>
                      <div><dt style={{ display: 'inline' }}>提案内容: </dt><dd style={{ display: 'inline', margin: 0 }}>{item.breakdown.proposal_quality ?? '-'}点</dd></div>
                      <div><dt style={{ display: 'inline' }}>次の行動: </dt><dd style={{ display: 'inline', margin: 0 }}>{item.breakdown.next_step_clarity ?? '-'}点</dd></div>
                    </dl>
                    {item.top_questions.length > 0 && (
                      <div style={{ marginTop: '0.7rem', fontSize: '0.84rem' }}>
                        <strong>質問の傾向</strong>
                        <ul style={{ paddingLeft: '1.2rem', marginBottom: 0 }}>
                          {item.top_questions.map(question => (
                            <li key={`${question.question_type}-${question.example}`}>{question.question_type} {question.count}件: {question.example ?? '-'}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {salesScore.scores.length === 0 && <EmptyText>該当する営業スコアはありません。</EmptyText>}
            </div>
          )}
          {winLoss && (
            <div style={card()}>
              <h3 style={{ marginTop: 0 }}>勝敗要因</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead>
                  <tr>{['順位', '要因', '結果', '件数', '代表発言'].map(h => <th key={h} style={{ ...tableCell(), textAlign: 'left' }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {winLoss.win_loss.map(item => (
                    <tr key={`${item.rank}-${item.reason}`}>
                      <td style={tableCell()}>{item.rank}</td>
                      <td style={tableCell()}>{item.reason}</td>
                      <td style={tableCell()}>{labelOf(RESULT_LABELS, item.result_type)}</td>
                      <td style={tableCell()}>{item.count}</td>
                      <td style={{ ...tableCell(), color: COLOR.muted }}>{item.representative_text ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {winLoss.win_loss.length === 0 && <EmptyText>受注・失注情報を持つ発言はありません。</EmptyText>}
            </div>
          )}
          {actionProposals && (
            <div style={card()}>
              <h3 style={{ marginTop: 0 }}>改善提案</h3>
              {actionProposals.proposals.length === 0 ? (
                <EmptyText>該当する改善提案はありません。</EmptyText>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.8rem' }}>
                  {actionProposals.proposals.map(item => (
                    <div key={`${item.priority}-${item.issue}-${item.target_department}`} data-testid="action-proposal" style={{ background: COLOR.bg, borderRadius: 8, padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                        <strong>{item.issue}</strong>
                        <span style={{ color: item.priority === '高' ? COLOR.danger : COLOR.primary, fontWeight: 'bold' }}>{item.priority}</span>
                      </div>
                      <div style={{ color: COLOR.muted, fontSize: '0.84rem', marginBottom: 8 }}>
                        {item.target_department} / 根拠 {item.evidence_count} 件
                      </div>
                      <div style={{ color: COLOR.text, lineHeight: 1.6 }}>{item.recommended_action}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {faqGaps && (
            <div style={card()}>
              <h3 style={{ marginTop: 0 }}>FAQ不足候補</h3>
              {faqGaps.faq_gaps.length === 0 ? (
                <EmptyText>該当する FAQ 不足候補はありません。</EmptyText>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem', minWidth: 760 }}>
                    <thead>
                      <tr>{['順位', '問い合わせ', '件数', 'FAQ案', '回答案'].map(h => <th key={h} style={{ ...tableCell(), textAlign: 'left' }}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {faqGaps.faq_gaps.map(item => (
                        <tr key={`${item.rank}-${item.call_reason}`}>
                          <td style={tableCell()}>{item.rank}</td>
                          <td style={{ ...tableCell(), fontWeight: 'bold' }}>{item.call_reason}</td>
                          <td style={tableCell()}>{item.inquiry_count}</td>
                          <td style={tableCell()}>{item.suggested_faq.question}</td>
                          <td style={{ ...tableCell(), color: COLOR.muted }}>{item.suggested_faq.answer}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {screen === 'agent' && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <div style={card()}>
            <h3 style={{ marginTop: 0 }}>分析AIチャット</h3>
            <AnalysisFilterPanel filters={filters} onChange={updateFilter} onClear={clearFilters} compact />
            <textarea
              data-testid="agent-question"
              style={{ ...field(), minHeight: 100, marginTop: '1rem' }}
              value={question}
              onChange={e => setQuestion(e.target.value)}
            />
            <button data-testid="ask-agent" style={{ ...button(Boolean(question.trim())), marginTop: 8 }} disabled={!question.trim()} onClick={askAgent}>
              質問する
            </button>
            {answerMessage && <p style={{ color: COLOR.muted }}>{answerMessage}</p>}
            {answer && (
              <div data-testid="agent-answer" style={{ background: COLOR.band, borderRadius: 8, padding: '1rem', marginTop: '1rem' }}>
                <p style={{ lineHeight: 1.7, color: COLOR.text }}>{answer.answer}</p>
                {answer.recommended_actions.length > 0 && (
                  <ul style={{ color: COLOR.text, paddingLeft: '1.2rem' }}>
                    {answer.recommended_actions.map(action => <li key={action}>{action}</li>)}
                  </ul>
                )}
                <div style={{ marginTop: '0.8rem', color: COLOR.muted, fontSize: '0.84rem' }}>
                  <strong>回答の根拠</strong>
                  <div>対象発言数: {answer.evidence.total_utterances ?? 0}件</div>
                  {answer.evidence.top_group && <div>最多の話題: {answer.evidence.top_group.group_label}（{answer.evidence.top_group.count}件）</div>}
                  {answer.evidence.top_sales_score && <div>最高営業スコア: {answer.evidence.top_sales_score.overall_score}点</div>}
                </div>
                {answer.related_links.length > 0 && (
                  <div style={{ marginTop: '0.8rem', fontSize: '0.84rem' }}>
                    <strong>関連する分析</strong>
                    <ul style={{ paddingLeft: '1.2rem', marginBottom: 0 }}>
                      {answer.related_links.map(link => <li key={link.endpoint}>{link.label}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          <div style={card()}>
            <h3 style={{ marginTop: 0 }}>ワークフロー設定</h3>
            <input data-testid="workflow-name" style={field()} value={workflowName} onChange={e => setWorkflowName(e.target.value)} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem', marginTop: '0.8rem' }}>
              <div>
                <label>実行タイミング</label>
                <select data-testid="workflow-trigger" style={field()} value={workflowTrigger} onChange={e => setWorkflowTrigger(e.target.value)}>
                  {Object.entries(WORKFLOW_TRIGGER_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <label>出力</label>
                <select data-testid="workflow-output-type" style={field()} value={workflowOutputType} onChange={e => setWorkflowOutputType(e.target.value)}>
                  {Object.entries(WORKFLOW_OUTPUT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <label>配信方法</label>
                <select data-testid="workflow-delivery-method" style={field()} value={workflowDeliveryMethod} onChange={e => setWorkflowDeliveryMethod(e.target.value)}>
                  {Object.entries(WORKFLOW_DELIVERY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
            </div>
            {(workflowDeliveryMethod === 'webhook' || workflowDeliveryMethod === 'crm') && (
              <div style={{ marginTop: '0.8rem' }}>
                <label>送信先URL</label>
                <input data-testid="workflow-endpoint" style={field()} value={workflowEndpoint} onChange={e => setWorkflowEndpoint(e.target.value)} placeholder="https://example.com/webhook" />
              </div>
            )}
            {workflowDeliveryMethod === 'email' && (
              <div style={{ marginTop: '0.8rem' }}>
                <label>送信先メールアドレス</label>
                <input data-testid="workflow-recipients" style={field()} value={workflowRecipients} onChange={e => setWorkflowRecipients(e.target.value)} placeholder="team@example.com, manager@example.com" />
              </div>
            )}
            <button data-testid="save-workflow" style={{ ...button(Boolean(workflowName.trim())), marginTop: 8 }} disabled={!workflowName.trim()} onClick={createWorkflow}>
              保存して実行する
            </button>
            <p style={{ color: workflowDeliveryMethod === 'crm' ? COLOR.danger : COLOR.muted, fontSize: '0.82rem', lineHeight: 1.6 }}>
              {workflowDeliveryMethod === 'dashboard' && '配信内容と実行結果をStudyAIのDBに保存します。'}
              {workflowDeliveryMethod === 'webhook' && '保存時にバックエンドから指定したURLへHTTP POSTし、実行結果をDBに記録します。'}
              {workflowDeliveryMethod === 'email' && '保存時にバックエンドから設定済みのSMTPサーバーへ送信し、実行結果をDBに記録します。'}
              {workflowDeliveryMethod === 'crm' && 'CRMコネクターは未実装です。設定と未実装エラーを配信結果としてDBに記録します。'}
            </p>
            {workflowResult && <p data-testid="workflow-result" style={{ color: COLOR.muted }}>{workflowResult}</p>}
          </div>
        </section>
      )}
    </div>
  )
}

function AnalysisFilterPanel({
  filters,
  onChange,
  onClear,
  compact = false,
}: {
  filters: AnalysisFilters
  onChange: (key: keyof AnalysisFilters, value: string) => void
  onClear: () => void
  compact?: boolean
}) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: compact ? 'repeat(auto-fit, minmax(150px, 1fr))' : 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.8rem' }}>
        <div>
          <label>開始日</label>
          <input data-testid="filter-from-date" type="date" style={field()} value={filters.fromDate} onChange={e => onChange('fromDate', e.target.value)} />
        </div>
        <div>
          <label>終了日</label>
          <input data-testid="filter-to-date" type="date" style={field()} value={filters.toDate} onChange={e => onChange('toDate', e.target.value)} />
        </div>
        <div>
          <label>商品</label>
          <input data-testid="filter-product" style={field()} value={filters.product} onChange={e => onChange('product', e.target.value)} placeholder="商品A" />
        </div>
        <div>
          <label>問い合わせ理由</label>
          <input data-testid="filter-call-reason" style={field()} value={filters.callReason} onChange={e => onChange('callReason', e.target.value)} placeholder="配送確認" />
        </div>
        <div>
          <label>感情</label>
          <select data-testid="filter-sentiment" style={field()} value={filters.sentiment} onChange={e => onChange('sentiment', e.target.value)}>
            <option value="">すべて</option>
            {Object.entries(SENTIMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div>
          <label>担当者ID</label>
          <input data-testid="filter-staff-id" style={field()} value={filters.staffId} onChange={e => onChange('staffId', e.target.value)} placeholder="staff_001" />
        </div>
        <div>
          <label>発言種別</label>
          <select data-testid="filter-utterance-type" style={field()} value={filters.utteranceType} onChange={e => onChange('utteranceType', e.target.value)}>
            <option value="">すべて</option>
            <option value="質問">質問</option>
            <option value="要望">要望</option>
            <option value="クレーム">クレーム</option>
            <option value="お褒め">お褒め</option>
            <option value="その他">その他</option>
          </select>
        </div>
      </div>
      {compact && (
        <button data-testid="clear-agent-filters" style={{ ...button(true), background: '#475569', marginTop: '0.8rem' }} onClick={onClear}>
          フィルタをクリア
        </button>
      )}
    </div>
  )
}

function EmptyText({ children }: { children: React.ReactNode }) {
  return <p style={{ color: COLOR.muted, marginBottom: 0 }}>{children}</p>
}

function RankingTable({ items }: { items: VoiceRankingItem[] }) {
  if (items.length === 0) return <EmptyText>該当する発言はありません。</EmptyText>
  return (
    <table data-testid="ranking-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
      <thead>
        <tr>{['順位', 'グループ', '件数', '感情', '種別', '代表発言'].map(h => <th key={h} style={{ ...tableCell(), textAlign: 'left' }}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={`${item.rank}-${item.group_label}`}>
            <td style={tableCell()}>{item.rank}</td>
            <td style={{ ...tableCell(), fontWeight: 'bold' }}>{item.group_label}</td>
            <td style={tableCell()}>{item.count}</td>
            <td style={tableCell()}>{labelOf(SENTIMENT_LABELS, item.sentiment)}</td>
            <td style={tableCell()}>{item.type ?? '-'}</td>
            <td style={{ ...tableCell(), color: COLOR.muted }}>{item.representative_text ?? '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
