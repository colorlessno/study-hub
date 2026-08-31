import { useState, useRef } from 'react'
import { createSystemClient } from '../api/client'

const client = createSystemClient('system06')

// ---- 型定義（基本設計書 IF仕様より） ----

type Channel = 'mail' | 'chat' | 'form'
type Priority = '緊急' | '高' | '中' | '低'
type ResponseType = 'auto' | 'escalated' | 'review'
type InquiryStatus = 'open' | 'answered' | 'escalated' | 'closed'

interface Classification {
  category: string
  priority: Priority
  confidence: '高' | '中' | '低'
}

interface ResponseBody {
  type: ResponseType
  message: string
  sources: string[]
  next_actions: string[]
  is_resolved_question: string | null
  escalation_reason: string | null
}

interface InquiryResponse {
  inquiry_id: number
  session_id: string
  classification: Classification
  response: ResponseBody
  escalated: boolean
  escalation_id: number | null
}

interface InquiryRecord {
  inquiry_id: number
  session_id: string | null
  user_id: string | null
  channel: string
  category: string | null
  priority: Priority | null
  confidence: '高' | '中' | '低' | null
  status: InquiryStatus
  escalated: boolean
  response_type: ResponseType | null
  created_at: string
}

interface StatsSummary {
  total_inquiries: number
  resolved_count: number
  escalation_count: number
  resolution_rate: number
  escalation_rate: number
  category_counts: { label: string; count: number }[]
  priority_counts: { label: string; count: number }[]
  top_faqs: { faq_id: number; faq_no: string | null; title: string; use_count: number }[]
  unanswered_topics: { category: string; count: number }[]
}

interface FAQCreateResponse {
  faq_id: number
  faq_no: string | null
  title: string
  category: string | null
}

interface FAQImportResponse {
  imported_count: number
  failed_rows: { row: number; reason: string }[]
}

// ---- 画面種別（基本設計書 セクション10） ----
type Screen = '問い合わせ受付・回答画面' | '問い合わせ一覧画面' | 'FAQ管理・統計画面'

// ---- FAQ カテゴリ ----
const FAQ_CATEGORIES = ['注文・購入', '配送・納期', 'キャンセル・変更', '返品・交換', '返金', '不具合・品質', 'アカウント', '請求・支払い', 'その他']

// ---- スタイル定数 ----
const COLOR = {
  panel: '#ffffff',
  border: '#e0e0e0',
  primary: '#6c8ebf',
  danger: '#e06c75',
  warn: '#e5c07b',
  ok: '#98c379',
  text: '#1e1e2e',
  muted: '#6c6f85',
}

const btn = (color: string, disabled = false): React.CSSProperties => ({
  background: disabled ? '#ccc' : color,
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  padding: '0.5rem 1.2rem',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: '0.9rem',
})

const field = (): React.CSSProperties => ({
  border: `1px solid ${COLOR.border}`,
  borderRadius: 4,
  padding: '0.4rem 0.6rem',
  fontSize: '0.9rem',
  width: '100%',
  boxSizing: 'border-box',
})

const lbl = (): React.CSSProperties => ({
  fontSize: '0.85rem',
  color: COLOR.muted,
  display: 'block',
  marginBottom: 4,
})

const card = (): React.CSSProperties => ({
  background: COLOR.panel,
  border: `1px solid ${COLOR.border}`,
  borderRadius: 8,
  padding: '1.5rem',
  marginBottom: '1rem',
})

// ---- 優先度バッジ ----
function PriorityBadge({ value }: { value: Priority }) {
  const map: Record<Priority, [string, string]> = {
    緊急: [COLOR.danger, '緊急'],
    高: ['#d27d4b', '高'],
    中: [COLOR.warn, '中'],
    低: [COLOR.ok, '低'],
  }
  const [color, label] = map[value] ?? ['#aaa', value]
  return (
    <span style={{ background: color, color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '0.78rem' }}>
      優先度: {label}
    </span>
  )
}

function channelLabel(value: string) {
  return ({ mail: 'メール', chat: 'チャット', form: 'フォーム' } as Record<string, string>)[value] ?? value
}

function responseTypeLabel(value: ResponseType | null) {
  if (value === 'auto') return '自動回答'
  if (value === 'review') return '担当者確認'
  if (value === 'escalated') return '担当者へ引き継ぎ'
  return '—'
}

function getErrorMessage(error: unknown) {
  const value = error as {
    message?: string
    response?: { data?: { message?: string; error?: { message?: string } } }
  }
  return value.response?.data?.error?.message ?? value.response?.data?.message ?? value.message ?? '処理に失敗しました。'
}

// ---- ステータスバッジ ----
function StatusBadge({ value }: { value: InquiryStatus }) {
  const map: Record<InquiryStatus, [string, string]> = {
    open: [COLOR.primary, '未対応'],
    answered: [COLOR.ok, '回答済み'],
    escalated: [COLOR.danger, 'エスカレーション'],
    closed: ['#aaa', '完了'],
  }
  const [color, label] = map[value] ?? ['#aaa', value]
  return (
    <span style={{ background: color, color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '0.78rem' }}>
      {label}
    </span>
  )
}

// ============================================================
// メインコンポーネント
// ============================================================
export default function System06Page() {
  const [screen, setScreen] = useState<Screen>('問い合わせ受付・回答画面')

  // ---- 問い合わせ受付・回答画面（基本設計書 14.1） ----
  const [channel, setChannel] = useState<Channel>('form')
  const [customerText, setCustomerText] = useState('')
  const [userId, setUserId] = useState('lesson-user-01')
  const [sessionId, setSessionId] = useState('lesson-session-01')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<InquiryResponse | null>(null)
  const [screenError, setScreenError] = useState('')
  const [screenNotice, setScreenNotice] = useState('')
  // フィードバック
  const [feedbackResolved, setFeedbackResolved] = useState<boolean | null>(null)
  const [feedbackRating, setFeedbackRating] = useState<number>(3)
  const [feedbackComment, setFeedbackComment] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)

  // ---- 問い合わせ一覧画面（基本設計書 14.2） ----
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | ''>('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<Priority | ''>('')
  const [inquiryList, setInquiryList] = useState<InquiryRecord[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [newStatus, setNewStatus] = useState<Record<number, InquiryStatus>>({})

  // ---- FAQ管理・統計画面（基本設計書 14.3） ----
  const [faqTitle, setFaqTitle] = useState('')
  const [faqQuestion, setFaqQuestion] = useState('')
  const [faqAnswer, setFaqAnswer] = useState('')
  const [faqCategory, setFaqCategory] = useState('')
  const [faqFile, setFaqFile] = useState<File | null>(null)
  const [faqSubmitting, setFaqSubmitting] = useState(false)
  const [faqImporting, setFaqImporting] = useState(false)
  const [faqResult, setFaqResult] = useState<FAQCreateResponse | null>(null)
  const [faqImportResult, setFaqImportResult] = useState<FAQImportResponse | null>(null)
  const [stats, setStats] = useState<StatsSummary | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const faqFileRef = useRef<HTMLInputElement>(null)

  // ---- 問い合わせ送信 ----
  async function handleSubmitInquiry() {
    if (!customerText.trim() || !userId.trim() || !sessionId.trim()) return
    setSubmitting(true)
    setResult(null)
    setScreenError('')
    setScreenNotice('')
    setFeedbackSent(false)
    setFeedbackResolved(null)
    setFeedbackComment('')
    try {
      const res = await client.post<InquiryResponse>('/inquiries', {
        session_id: sessionId.trim(),
        user_id: userId.trim(),
        channel,
        message: customerText.trim(),
      })
      setResult(res.data)
      setScreenNotice(`問い合わせID ${res.data.inquiry_id} を登録しました。`)
    } catch (error) {
      setScreenError(getErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  function prepareInquirySample(kind: 'auto' | 'escalated') {
    const suffix = Date.now().toString().slice(-8)
    setUserId(`lesson-user-${suffix}`)
    setSessionId(`lesson-session-${suffix}`)
    setChannel('form')
    setCustomerText(kind === 'auto'
      ? '注文した商品の配送状況を確認したいです。いつ届きますか。'
      : '返金を希望しています。決済トラブルなので至急、担当者と話したいです。')
    setResult(null)
    setScreenError('')
    setScreenNotice(kind === 'auto'
      ? '自動回答を確認する問い合わせを入力しました。'
      : '担当者への引き継ぎを確認する問い合わせを入力しました。')
  }

  // ---- フィードバック送信 ----
  async function handleFeedback() {
    if (!result || feedbackResolved === null) return
    setScreenError('')
    try {
      await client.post(`/inquiries/${result.inquiry_id}/feedback`, {
        is_resolved: feedbackResolved,
        rating: feedbackRating,
        comment: feedbackComment,
      })
      setFeedbackSent(true)
      setScreenNotice(`問い合わせID ${result.inquiry_id} の評価を登録しました。`)
    } catch (error) {
      setScreenError(getErrorMessage(error))
    }
  }

  // ---- 問い合わせ一覧取得 ----
  async function handleLoadInquiries() {
    setListLoading(true)
    setScreenError('')
    try {
      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      if (categoryFilter) params.category = categoryFilter
      if (priorityFilter) params.priority = priorityFilter
      const res = await client.get<{ items: InquiryRecord[] }>('/inquiries', { params })
      setInquiryList(res.data.items ?? [])
    } catch (error) {
      setScreenError(getErrorMessage(error))
    } finally {
      setListLoading(false)
    }
  }

  // ---- ステータス更新 ----
  async function handleUpdateStatus(inquiryId: number) {
    const status = newStatus[inquiryId]
    if (!status) return
    setUpdatingId(inquiryId)
    setScreenError('')
    try {
      await client.patch(`/inquiries/${inquiryId}/status`, { status })
      setInquiryList(prev => prev.map(i => i.inquiry_id === inquiryId ? { ...i, status } : i))
      setScreenNotice(`問い合わせID ${inquiryId} の状態を更新しました。`)
    } catch (error) {
      setScreenError(getErrorMessage(error))
    } finally {
      setUpdatingId(null)
    }
  }

  // ---- FAQ 登録 ----
  async function handleSubmitFaq() {
    if (!faqTitle.trim() || !faqQuestion.trim() || !faqAnswer.trim()) return
    setFaqSubmitting(true)
    setFaqResult(null)
    setScreenError('')
    try {
      const res = await client.post<FAQCreateResponse>('/faq', {
        title: faqTitle.trim(),
        question: faqQuestion,
        answer: faqAnswer,
        category: faqCategory || null,
      })
      setFaqResult(res.data)
      setFaqTitle('')
      setFaqQuestion('')
      setFaqAnswer('')
      setScreenNotice(`FAQ ID ${res.data.faq_id} を登録しました。`)
      await handleLoadStats()
    } catch (error) {
      setScreenError(getErrorMessage(error))
    } finally {
      setFaqSubmitting(false)
    }
  }

  function prepareFaqSample() {
    setFaqTitle('配送状況の確認方法')
    setFaqQuestion('注文した商品がいつ届くか確認する方法を教えてください。')
    setFaqAnswer('注文履歴から配送状況と追跡番号を確認できます。発送後は配送会社の追跡画面も利用できます。')
    setFaqCategory('配送・納期')
    setScreenError('')
    setScreenNotice('教材用のFAQを入力しました。内容を確認して登録してください。')
  }

  function prepareFaqCsv() {
    const csv = [
      'faq_no,title,question,answer,category',
      'FAQ-SAMPLE-01,返品手順,商品を返品する方法を教えてください。,返品受付後に案内される返送先へ商品を送付してください。,返品・交換',
      'FAQ-SAMPLE-02,領収書の発行,領収書はどこで発行できますか。,注文履歴の領収書ボタンから発行できます。,請求・支払い',
    ].join('\n')
    setFaqFile(new File([csv], 'system06_sample_faq.csv', { type: 'text/csv;charset=utf-8' }))
    setFaqImportResult(null)
    setScreenError('')
    setScreenNotice('教材用CSVを用意しました。')
  }

  // ---- FAQ 一括取込 ----
  async function handleImportFaq() {
    if (!faqFile) return
    setFaqImporting(true)
    setFaqImportResult(null)
    setScreenError('')
    try {
      const formData = new FormData()
      formData.append('file', faqFile)
      const res = await client.post<FAQImportResponse>('/faq/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setFaqImportResult(res.data)
      setFaqFile(null)
      if (faqFileRef.current) faqFileRef.current.value = ''
      setScreenNotice(`FAQを${res.data.imported_count}件取り込みました。`)
      await handleLoadStats()
    } catch (error) {
      setScreenError(getErrorMessage(error))
    } finally {
      setFaqImporting(false)
    }
  }

  // ---- 統計取得 ----
  async function handleLoadStats() {
    setStatsLoading(true)
    setScreenError('')
    try {
      const res = await client.get<StatsSummary>('/stats/summary')
      setStats(res.data)
    } catch (error) {
      setScreenError(getErrorMessage(error))
    } finally {
      setStatsLoading(false)
    }
  }

  // ============================================================
  // 画面レンダリング
  // ============================================================
  return (
    <div style={{ maxWidth: 1000 }}>
      <h2 style={{ color: COLOR.text, marginBottom: 4 }}>System06</h2>
      <p style={{ color: COLOR.muted, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        カスタマーサポート 自動応答＆エスカレーションシステム
      </p>

      {screenError && (
        <div role="alert" style={{ ...card(), borderColor: COLOR.danger, color: COLOR.danger, padding: '0.8rem 1rem' }}>
          {screenError}
        </div>
      )}
      {screenNotice && (
        <div role="status" style={{ ...card(), borderColor: COLOR.ok, color: '#52713f', padding: '0.8rem 1rem' }}>
          {screenNotice}
        </div>
      )}

      {/* 画面タブナビゲーション（基本設計書 セクション10） */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', borderBottom: `2px solid ${COLOR.border}`, paddingBottom: 8 }}>
        {(['問い合わせ受付・回答画面', '問い合わせ一覧画面', 'FAQ管理・統計画面'] as Screen[]).map(s => (
          <button
            key={s}
            onClick={() => {
              setScreen(s)
              setScreenError('')
              setScreenNotice('')
              if (s === '問い合わせ一覧画面') handleLoadInquiries()
              if (s === 'FAQ管理・統計画面') handleLoadStats()
            }}
            style={{ ...btn(screen === s ? COLOR.primary : '#ccc'), fontSize: '0.82rem' }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ========== 問い合わせ受付・回答画面 ========== */}
      {screen === '問い合わせ受付・回答画面' && (
        <div>
          <div style={card()}>
            <h3 style={{ margin: '0 0 1rem', color: COLOR.text }}>問い合わせ受付・回答画面</h3>

            {/* 基本設計書 14.1 入力項目 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <span style={lbl()}>受付チャネル</span>
                <select style={field()} value={channel} onChange={e => setChannel(e.target.value as Channel)}>
                  {(['mail', 'chat', 'form'] as Channel[]).map(c => (
                    <option key={c} value={c}>{channelLabel(c)}</option>
                  ))}
                </select>
              </div>
              <div>
                <span style={lbl()}>利用者ID ＊</span>
                <input
                  type="text"
                  style={field()}
                  value={userId}
                  onChange={e => setUserId(e.target.value)}
                  placeholder="lesson-user-01"
                />
              </div>
              <div>
                <span style={lbl()}>セッションID ＊</span>
                <input
                  type="text"
                  style={field()}
                  value={sessionId}
                  onChange={e => setSessionId(e.target.value)}
                  placeholder="lesson-session-01"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={lbl()}>問い合わせ本文</span>
                <textarea
                  style={{ ...field(), minHeight: 100, resize: 'vertical' }}
                  value={customerText}
                  onChange={e => setCustomerText(e.target.value)}
                  placeholder="お客様の問い合わせ内容を入力してください"
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={handleSubmitInquiry}
                disabled={!customerText.trim() || !userId.trim() || !sessionId.trim() || submitting}
                style={btn(COLOR.primary, !customerText.trim() || !userId.trim() || !sessionId.trim() || submitting)}
              >
                {submitting ? '回答生成中（最大60秒）...' : '問い合わせ送信'}
              </button>
              <button onClick={() => prepareInquirySample('auto')} disabled={submitting} style={btn(COLOR.ok, submitting)}>
                自動回答用サンプル
              </button>
              <button onClick={() => prepareInquirySample('escalated')} disabled={submitting} style={btn(COLOR.warn, submitting)}>
                担当者引き継ぎ用サンプル
              </button>
            </div>
          </div>

          {/* 自動回答結果（基本設計書 14.1 出力項目） */}
          {result && (
            <div style={card()}>
              {/* 分類結果・優先度・エスカレーション（category / priority / escalated） */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <span style={{ background: '#e8f0fe', color: COLOR.primary, borderRadius: 4, padding: '2px 8px', fontSize: '0.82rem' }}>
                  分類: {result.classification.category}
                </span>
                <PriorityBadge value={result.classification.priority} />
                <span style={{ background: result.classification.confidence === '高' ? COLOR.ok : result.classification.confidence === '中' ? COLOR.warn : COLOR.danger, color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '0.78rem' }}>
                  信頼度: {result.classification.confidence}
                </span>
                {result.escalated && (
                  <span style={{ background: COLOR.danger, color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '0.82rem', fontWeight: 'bold' }}>
                    🚨 エスカレーション
                  </span>
                )}
                {!result.escalated && (
                  <span style={{ background: COLOR.ok, color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '0.82rem' }}>
                    ✓ 自動回答
                  </span>
                )}
              </div>

              {/* 自動回答本文（response_text） */}
              {result.response.message && (
                <div style={{ background: '#f0f4ff', borderRadius: 6, padding: '1rem', marginBottom: '1rem', fontSize: '0.9rem', lineHeight: 1.7 }}>
                  {result.response.message}
                </div>
              )}

              {result.response.escalation_reason && (
                <div style={{ background: '#fff1f1', color: COLOR.danger, borderRadius: 6, padding: '0.8rem 1rem', marginBottom: '1rem', fontSize: '0.88rem' }}>
                  引き継ぎ理由: {result.response.escalation_reason}
                </div>
              )}

              {/* 根拠 FAQ */}
              {result.response.sources.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <span style={lbl()}>根拠 FAQ</span>
                  {result.response.sources.map((source, i) => (
                    <div key={i} style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, fontSize: '0.84rem' }}>{source}</div>
                  ))}
                </div>
              )}

              {/* 次アクション */}
              {result.response.next_actions.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <span style={lbl()}>次アクション</span>
                  {result.response.next_actions.map((a, i) => (
                    <div key={i} style={{ fontSize: '0.85rem', color: COLOR.text, padding: '2px 0' }}>• {a}</div>
                  ))}
                </div>
              )}

              {/* フィードバック（feedback_resolved / feedback_rating / feedback_comment） */}
              {!result.escalated && !feedbackSent ? (
                <div style={{ borderTop: `1px solid ${COLOR.border}`, paddingTop: '1rem', marginTop: '1rem' }}>
                  <span style={lbl()}>解決可否フィードバック</span>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: '0.8rem' }}>
                    <label style={{ cursor: 'pointer', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input type="radio" name="resolved" onChange={() => setFeedbackResolved(true)} checked={feedbackResolved === true} />
                      解決した
                    </label>
                    <label style={{ cursor: 'pointer', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input type="radio" name="resolved" onChange={() => setFeedbackResolved(false)} checked={feedbackResolved === false} />
                      解決しなかった
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '0.8rem' }}>
                    <div>
                      <span style={lbl()}>満足度（1〜5）</span>
                      <input
                        type="number"
                        min={1} max={5}
                        style={{ ...field(), width: 80 }}
                        value={feedbackRating}
                        onChange={e => setFeedbackRating(Number(e.target.value))}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={lbl()}>コメント（任意）</span>
                      <input
                        type="text"
                        style={field()}
                        value={feedbackComment}
                        onChange={e => setFeedbackComment(e.target.value)}
                        placeholder="ご意見をお聞かせください"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleFeedback}
                    disabled={feedbackResolved === null}
                    style={btn(COLOR.ok, feedbackResolved === null)}
                  >
                    フィードバック送信
                  </button>
                </div>
              ) : feedbackSent ? (
                <div style={{ marginTop: '1rem', color: COLOR.ok, fontSize: '0.88rem' }}>
                  ✓ フィードバックを送信しました
                </div>
              ) : (
                <div style={{ marginTop: '1rem', color: COLOR.muted, fontSize: '0.88rem' }}>
                  担当者へ引き継いだ問い合わせには、自動回答への評価は登録しません。
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========== 問い合わせ一覧画面 ========== */}
      {screen === '問い合わせ一覧画面' && (
        <div>
          {/* 検索フィルター（基本設計書 14.2） */}
          <div style={card()}>
            <h3 style={{ margin: '0 0 1rem', color: COLOR.text }}>問い合わせ一覧画面</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem', marginBottom: '1rem' }}>
              <div>
                <span style={lbl()}>状態</span>
                <select style={field()} value={statusFilter} onChange={e => setStatusFilter(e.target.value as InquiryStatus | '')}>
                  <option value="">（すべて）</option>
                  <option value="open">未対応</option>
                  <option value="answered">回答済み</option>
                  <option value="escalated">エスカレーション</option>
                  <option value="closed">完了</option>
                </select>
              </div>
              <div>
                <span style={lbl()}>分類</span>
                <input type="text" style={field()} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} placeholder="例：注文・購入" />
              </div>
              <div>
                <span style={lbl()}>優先度</span>
                <select style={field()} value={priorityFilter} onChange={e => setPriorityFilter(e.target.value as Priority | '')}>
                  <option value="">（すべて）</option>
                  <option value="緊急">緊急</option>
                  <option value="高">高</option>
                  <option value="中">中</option>
                  <option value="低">低</option>
                </select>
              </div>
            </div>
            <button onClick={handleLoadInquiries} disabled={listLoading} style={btn(COLOR.primary, listLoading)}>
              {listLoading ? '読込中...' : '絞り込み'}
            </button>
          </div>

          {/* 問い合わせ一覧（基本設計書 14.2 inquiry_grid / update_status） */}
          <div style={card()}>
            {inquiryList.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    {['ID', 'チャネル', '分類', '優先度', '信頼度', '振り分け', '状態', '受付日', '状態更新', ''].map(h => (
                      <th key={h} style={{ padding: '5px 8px', textAlign: 'left', border: `1px solid ${COLOR.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inquiryList.map(inq => (
                    <tr key={inq.inquiry_id}>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{inq.inquiry_id}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{channelLabel(inq.channel)}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{inq.category ?? '—'}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                        {inq.priority ? <PriorityBadge value={inq.priority} /> : '—'}
                      </td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{inq.confidence ?? '—'}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{responseTypeLabel(inq.response_type)}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                        <StatusBadge value={inq.status} />
                      </td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                        {inq.created_at?.slice(0, 10) ?? '—'}
                      </td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                        <select
                          style={{ ...field(), width: 120 }}
                          value={newStatus[inq.inquiry_id] ?? inq.status}
                          onChange={e => setNewStatus(prev => ({ ...prev, [inq.inquiry_id]: e.target.value as InquiryStatus }))}
                        >
                          <option value="open">未対応</option>
                          <option value="answered">回答済み</option>
                          <option value="escalated">エスカレーション</option>
                          <option value="closed">完了</option>
                        </select>
                      </td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                        <button
                          onClick={() => handleUpdateStatus(inq.inquiry_id)}
                          disabled={updatingId === inq.inquiry_id}
                          style={{ ...btn(COLOR.primary, updatingId === inq.inquiry_id), fontSize: '0.78rem', padding: '2px 10px' }}
                        >
                          更新
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              !listLoading && (
                <div style={{ color: COLOR.muted, fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>
                  該当する問い合わせがありません
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ========== FAQ管理・統計画面 ========== */}
      {screen === 'FAQ管理・統計画面' && (
        <div>
          {/* FAQ登録（基本設計書 14.3 faq_question / faq_answer / faq_category） */}
          <div style={card()}>
            <h3 style={{ margin: '0 0 1rem', color: COLOR.text }}>FAQ管理・統計画面</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={lbl()}>FAQタイトル</span>
                <input
                  type="text"
                  style={field()}
                  value={faqTitle}
                  onChange={e => setFaqTitle(e.target.value)}
                  placeholder="FAQの内容を表す短いタイトル"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={lbl()}>FAQ質問</span>
                <input
                  type="text"
                  style={field()}
                  value={faqQuestion}
                  onChange={e => setFaqQuestion(e.target.value)}
                  placeholder="よくある質問を入力してください"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={lbl()}>FAQ回答</span>
                <textarea
                  style={{ ...field(), minHeight: 80, resize: 'vertical' }}
                  value={faqAnswer}
                  onChange={e => setFaqAnswer(e.target.value)}
                  placeholder="回答内容を入力してください"
                />
              </div>
              <div>
                <span style={lbl()}>FAQカテゴリ</span>
                <select style={field()} value={faqCategory} onChange={e => setFaqCategory(e.target.value)}>
                  <option value="">（選択）</option>
                  {FAQ_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={handleSubmitFaq}
                disabled={!faqTitle.trim() || !faqQuestion.trim() || !faqAnswer.trim() || faqSubmitting}
                style={btn(COLOR.primary, !faqTitle.trim() || !faqQuestion.trim() || !faqAnswer.trim() || faqSubmitting)}
              >
                {faqSubmitting ? '登録中...' : 'FAQ登録'}
              </button>
              <button onClick={prepareFaqSample} disabled={faqSubmitting} style={btn(COLOR.ok, faqSubmitting)}>
                教材用FAQを入力
              </button>
            </div>

            {faqResult && (
              <div style={{ marginTop: '1rem', padding: '0.8rem', background: '#f3faef', borderRadius: 6, fontSize: '0.88rem' }}>
                登録済みFAQ: ID {faqResult.faq_id} / {faqResult.title} / {faqResult.category ?? '分類なし'}
              </div>
            )}

            {/* FAQ一括取込（faq_file） */}
            <div style={{ borderTop: `1px solid ${COLOR.border}`, marginTop: '1.5rem', paddingTop: '1.5rem' }}>
              <span style={lbl()}>FAQ一括取込ファイル（CSV）</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  ref={faqFileRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={e => setFaqFile(e.target.files?.[0] ?? null)}
                  style={{ ...field(), flex: 1 }}
                />
                <button onClick={prepareFaqCsv} disabled={faqImporting} style={btn(COLOR.ok, faqImporting)}>
                  教材用CSVを用意
                </button>
                <button
                  onClick={handleImportFaq}
                  disabled={!faqFile || faqImporting}
                  style={btn(COLOR.warn, !faqFile || faqImporting)}
                >
                  {faqImporting ? '取込中...' : '一括取込'}
                </button>
              </div>
              {faqFile && <div style={{ marginTop: 8, fontSize: '0.84rem', color: COLOR.muted }}>取込対象: {faqFile.name}</div>}
              {faqImportResult && (
                <div style={{ marginTop: 8, fontSize: '0.84rem' }}>
                  取込成功: {faqImportResult.imported_count}件 / 失敗: {faqImportResult.failed_rows.length}件
                  {faqImportResult.failed_rows.map(item => <div key={item.row}>行{item.row}: {item.reason}</div>)}
                </div>
              )}
            </div>
          </div>

          {/* サマリ統計（基本設計書 14.3 stats_summary） */}
          <div style={card()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, color: COLOR.text }}>サマリ統計</h4>
              <button onClick={handleLoadStats} disabled={statsLoading} style={{ ...btn('#6c6f85', statsLoading), fontSize: '0.85rem' }}>
                {statsLoading ? '読込中...' : '更新'}
              </button>
            </div>

            {stats && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.8rem', marginBottom: '1.5rem' }}>
                  {[
                    ['総問い合わせ数', stats.total_inquiries, COLOR.text],
                    ['解決済み', stats.resolved_count, COLOR.ok],
                    ['担当者へ引き継ぎ', stats.escalation_count, COLOR.danger],
                    ['解決率', `${(stats.resolution_rate * 100).toFixed(0)}%`, COLOR.primary],
                    ['引き継ぎ率', `${(stats.escalation_rate * 100).toFixed(0)}%`, COLOR.warn],
                  ].map(([label, value, color]) => (
                    <div key={label as string} style={{ textAlign: 'center', padding: '0.8rem', background: '#f8f8f2', borderRadius: 6 }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: color as string }}>{value as string | number}</div>
                      <div style={{ fontSize: '0.82rem', color: COLOR.muted, marginTop: 4 }}>{label as string}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <span style={lbl()}>カテゴリ別件数</span>
                    {stats.category_counts.map(item => <div key={item.label} style={{ fontSize: '0.84rem' }}>{item.label}: {item.count}件</div>)}
                  </div>
                  <div>
                    <span style={lbl()}>優先度別件数</span>
                    {stats.priority_counts.map(item => <div key={item.label} style={{ fontSize: '0.84rem' }}>{item.label}: {item.count}件</div>)}
                  </div>
                </div>

                {stats.top_faqs.length > 0 && (
                  <div>
                    <span style={lbl()}>利用されたFAQ</span>
                    {stats.top_faqs.map(item => (
                      <div key={item.faq_id} style={{ fontSize: '0.84rem' }}>
                        {item.faq_no ? `${item.faq_no}: ` : ''}{item.title}（{item.use_count}回）
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 未回答傾向（基本設計書 14.3 unanswered_list） */}
          <div style={card()}>
            <h4 style={{ margin: '0 0 1rem', color: COLOR.text }}>未解決の問い合わせ傾向</h4>
            {stats?.unanswered_topics.length ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    {['分類', '件数'].map(h => (
                      <th key={h} style={{ padding: '5px 8px', textAlign: 'left', border: `1px solid ${COLOR.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.unanswered_topics.map(item => (
                    <tr key={item.category}>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{item.category}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{item.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ color: COLOR.muted, fontSize: '0.9rem' }}>データがありません</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
