import { useState, useRef } from 'react'
import { isAxiosError } from 'axios'
import { createSystemClient } from '../api/client'

const client = createSystemClient('system02')

// ---- 型定義（基本設計書 IF仕様より） ----

type Severity = 'critical' | 'high' | 'medium' | 'low'
type InputMode = 'ファイル' | 'テキスト'

interface Issue {
  issue_id: number | null
  type: string
  severity: Severity
  article: string | null
  original_text: string | null
  description: string
  risk_explanation: string | null
  suggested_text: string | null
}

interface ReviewResultSummary {
  total_issues: number
  by_type: Record<string, number>
  by_severity: Record<string, number>
  overall_risk: string
  recommendation: string
  recommendation_note: string
  top_priorities: string[]
}

interface ReviewResult {
  review_id: number
  document_type: string
  perspective: string
  summary: ReviewResultSummary
  issues: Issue[]
}

interface CompareResult {
  comparison_id: number
  review_a: ReviewResultSummary
  review_b: ReviewResultSummary
  diff_issues: Issue[]
  recommendation_diff: Record<string, string>
}

interface ReviewSummary {
  review_id: number
  review_type: 'single' | 'compare'
  document_type: string | null
  overall_risk: string | null
  recommendation: string | null
  created_at: string
}

interface ReviewDetail {
  review_id: number
  review_type: 'single' | 'compare'
  document_type: string | null
  perspective: string | null
  summary: ReviewResultSummary
  issues: Issue[]
  created_at: string
}

interface SavedReviewComparison {
  review_id_a: number
  review_id_b: number
  overall_risk_diff: Record<string, string | null>
  recommendation_diff: Record<string, string | null>
  issue_count_diff: number
  added_issues: Issue[]
  removed_issues: Issue[]
}

const SAMPLE_CONTRACT_A = `第1条（業務内容）
乙は甲のWebシステム開発業務を行う。
第2条（委託料）
委託料は月額100,000円とし、甲は翌月末日までに支払う。
第3条（秘密保持）
乙は業務上知り得た秘密を第三者に漏えいしてはならない。
第4条（契約解除）
甲は30日前までに通知して本契約を解除できる。
第5条（準拠法）
本契約は日本法を準拠法とする。`

const SAMPLE_CONTRACT_B = `第1条（業務内容）
乙は甲のWebシステム開発および保守業務を行う。
第2条（委託料）
委託料は月額120,000円とし、甲は翌月末日までに支払う。
第3条（秘密保持）
乙は業務上知り得た秘密を第三者に漏えいしてはならない。
第4条（契約解除）
甲は通知なく本契約を解除できる。
第5条（損害賠償）
乙は甲に生じたすべての損害を賠償する。
第6条（準拠法）
本契約は日本法を準拠法とする。`

function apiErrorMessage(error: unknown, fallback: string) {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (detail && typeof detail === 'object' && typeof detail.message === 'string') return detail.message
    const responseMessage = error.response?.data?.message
    if (typeof responseMessage === 'string' && responseMessage) return responseMessage
    if (typeof error.message === 'string' && error.message) return error.message
  }
  return fallback
}

// ---- 画面種別（基本設計書 セクション10） ----
type Screen = '単一審査画面' | '比較審査画面' | '審査履歴画面'

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

// ---- Severity バッジ ----
function SeverityBadge({ value }: { value: Severity }) {
  const map: Record<Severity, [string, string]> = {
    critical: [COLOR.danger, '致命的'],
    high:     ['#c0392b',   '高'],
    medium:   [COLOR.warn,  '中'],
    low:      [COLOR.ok,    '低'],
  }
  const [color, label] = map[value] ?? ['#aaa', value]
  return (
    <span style={{ background: color, color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 'bold' }}>
      {label}
    </span>
  )
}

// ---- 変更種別バッジ ----
function ChangeTypeBadge({ value }: { value: string }) {
  const map: Record<string, [string, string]> = {
    added:    [COLOR.ok,      '追加'],
    removed:  [COLOR.danger,  '削除'],
    changed:  [COLOR.primary, '変更'],
  }
  const [color, label] = map[value] ?? ['#aaa', value]
  return (
    <span style={{ background: color, color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '0.75rem' }}>
      {label}
    </span>
  )
}

// ---- 一次審査結果バッジ ----
function RecommendationBadge({ value }: { value: string }) {
  const isRed = value.includes('不推奨') || value.includes('修正') || value.includes('問題')
  const isYellow = value.includes('要確認') || value.includes('注意')
  const color = isRed ? COLOR.danger : isYellow ? COLOR.warn : COLOR.ok
  return (
    <span style={{ background: color, color: '#fff', borderRadius: 4, padding: '3px 10px', fontSize: '0.85rem', fontWeight: 'bold' }}>
      {value}
    </span>
  )
}

// ---- 指摘一覧テーブル ----
function IssuesTable({ issues }: { issues: Issue[] }) {
  if (issues.length === 0) return <div style={{ color: COLOR.ok, fontSize: '0.9rem' }}>指摘事項なし</div>
  const sortOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  const sorted = [...issues].sort((a, b) => sortOrder[a.severity] - sortOrder[b.severity])
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
      <thead>
        <tr style={{ background: '#f0f0f0' }}>
          {['深刻度', 'リスク種別', '条番号', '根拠条文', '指摘内容', 'リスク説明', '修正案'].map(h => (
            <th key={h} style={{ padding: '5px 8px', textAlign: 'left', border: `1px solid ${COLOR.border}`, whiteSpace: 'nowrap' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sorted.map(issue => (
          <tr key={`${issue.issue_id ?? 'new'}-${issue.type}-${issue.article ?? ''}-${issue.description}`}>
            <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
              <SeverityBadge value={issue.severity} />
            </td>
            <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, whiteSpace: 'nowrap' }}>{issue.type}</td>
            <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, whiteSpace: 'nowrap', color: COLOR.primary }}>{issue.article ?? '—'}</td>
            <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, maxWidth: 260, lineHeight: 1.5 }}>{issue.original_text ?? '—'}</td>
            <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, maxWidth: 280, lineHeight: 1.5 }}>{issue.description}</td>
            <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, color: COLOR.muted, maxWidth: 260, lineHeight: 1.5 }}>
              {issue.risk_explanation ?? '—'}
            </td>
            <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, color: COLOR.muted, maxWidth: 220, lineHeight: 1.5 }}>
              {issue.suggested_text ?? '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ============================================================
// メインコンポーネント
// ============================================================
export default function System02Page() {
  const [screen, setScreen] = useState<Screen>('単一審査画面')

  // ---- 単一審査画面（基本設計書 14.1） ----
  const [inputMode, setInputMode] = useState<InputMode>('ファイル')
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [sourceText, setSourceText] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const singleFileRef = useRef<HTMLInputElement>(null)

  // ---- 比較審査画面（基本設計書 14.2） ----
  const [fileA, setFileA] = useState<File | null>(null)
  const [fileB, setFileB] = useState<File | null>(null)
  const [perspective, setPerspective] = useState('委託者')
  const [comparing, setComparing] = useState(false)
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null)
  const [compareError, setCompareError] = useState<string | null>(null)
  const fileARef = useRef<HTMLInputElement>(null)
  const fileBRef = useRef<HTMLInputElement>(null)

  // ---- 審査履歴画面（基本設計書 14.3） ----
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [histDocType, setHistDocType] = useState('')
  const [histRecommendation, setHistRecommendation] = useState('')
  const [reviewList, setReviewList] = useState<ReviewSummary[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [selectedReviewIds, setSelectedReviewIds] = useState<number[]>([])
  const [reviewDetail, setReviewDetail] = useState<ReviewDetail | null>(null)
  const [savedComparison, setSavedComparison] = useState<SavedReviewComparison | null>(null)
  const [historyActionLoading, setHistoryActionLoading] = useState(false)

  // ---- 単一審査実行 ----
  async function handleReview() {
    const hasInput = inputMode === 'ファイル' ? !!sourceFile : !!sourceText.trim()
    if (!hasInput) return
    setReviewing(true)
    setReviewResult(null)
    setReviewError(null)
    try {
      const reviewFile = inputMode === 'ファイル'
        ? sourceFile
        : new File([sourceText], 'input-contract.txt', { type: 'text/plain' })
      if (!reviewFile) return
      const formData = new FormData()
      formData.append('file', reviewFile)
      formData.append('perspective', perspective)
      const res = await client.post<ReviewResult>('/review', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setReviewResult(res.data)
    } catch (error) {
      setReviewError(apiErrorMessage(error, '契約書の審査に失敗しました。'))
    } finally {
      setReviewing(false)
    }
  }

  // ---- 比較審査実行 ----
  async function handleCompare() {
    if (!fileA || !fileB) return
    setComparing(true)
    setCompareResult(null)
    setCompareError(null)
    try {
      const formData = new FormData()
      formData.append('file_a', fileA)
      formData.append('file_b', fileB)
      formData.append('perspective', perspective)
      const res = await client.post<CompareResult>('/compare', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setCompareResult(res.data)
    } catch (error) {
      setCompareError(apiErrorMessage(error, '契約書の比較に失敗しました。'))
    } finally {
      setComparing(false)
    }
  }

  // ---- 審査履歴取得 ----
  async function handleLoadHistory() {
    setListLoading(true)
    setHistoryError(null)
    setReviewDetail(null)
    setSavedComparison(null)
    setSelectedReviewIds([])
    try {
      const params: Record<string, string> = {}
      if (fromDate) params.from_date = fromDate
      if (toDate) params.to_date = toDate
      if (histDocType) params.document_type = histDocType
      if (histRecommendation) params.overall_risk = histRecommendation
      const res = await client.get<{ items: ReviewSummary[] }>('/reviews', { params })
      setReviewList(res.data.items ?? [])
    } catch (error) {
      setHistoryError(apiErrorMessage(error, '審査履歴の読込に失敗しました。'))
    } finally {
      setListLoading(false)
    }
  }

  async function handleLoadReviewDetail(reviewId: number) {
    setHistoryActionLoading(true)
    setHistoryError(null)
    setSavedComparison(null)
    try {
      const res = await client.get<ReviewDetail>(`/reviews/${reviewId}`)
      setReviewDetail(res.data)
    } catch (error) {
      setHistoryError(apiErrorMessage(error, '審査結果の詳細読込に失敗しました。'))
    } finally {
      setHistoryActionLoading(false)
    }
  }

  async function handleCompareSavedReviews() {
    if (selectedReviewIds.length !== 2) return
    setHistoryActionLoading(true)
    setHistoryError(null)
    setReviewDetail(null)
    try {
      const [reviewIdA, reviewIdB] = selectedReviewIds
      const res = await client.get<SavedReviewComparison>('/reviews/compare', {
        params: { review_id_a: reviewIdA, review_id_b: reviewIdB },
      })
      setSavedComparison(res.data)
    } catch (error) {
      setHistoryError(apiErrorMessage(error, '保存済み審査結果の比較に失敗しました。'))
    } finally {
      setHistoryActionLoading(false)
    }
  }

  function toggleReviewSelection(reviewId: number) {
    setSelectedReviewIds(current => {
      if (current.includes(reviewId)) return current.filter(id => id !== reviewId)
      if (current.length >= 2) return current
      return [...current, reviewId]
    })
  }

  function handleUseSampleContract() {
    setInputMode('テキスト')
    setSourceText(SAMPLE_CONTRACT_A)
    setReviewResult(null)
    setReviewError(null)
  }

  function handleUseSampleComparison() {
    setFileA(new File([SAMPLE_CONTRACT_A], 'contract-current.txt', { type: 'text/plain' }))
    setFileB(new File([SAMPLE_CONTRACT_B], 'contract-revised.txt', { type: 'text/plain' }))
    setCompareResult(null)
    setCompareError(null)
  }

  // ============================================================
  // 画面レンダリング
  // ============================================================
  return (
    <div style={{ maxWidth: 1040 }}>
      <h2 style={{ color: COLOR.text, marginBottom: 4 }}>System02</h2>
      <p style={{ color: COLOR.muted, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        契約書・文書 リスク審査システム
        <span style={{ marginLeft: 10, fontSize: '0.8rem', color: COLOR.warn }}>
          ※ 本システムの出力は一次審査参考情報であり、法的確定判断ではありません
        </span>
      </p>

      {/* 画面タブナビゲーション（基本設計書 セクション10） */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', borderBottom: `2px solid ${COLOR.border}`, paddingBottom: 8 }}>
        {(['単一審査画面', '比較審査画面', '審査履歴画面'] as Screen[]).map(s => (
          <button
            key={s}
            onClick={() => {
              setScreen(s)
              if (s === '審査履歴画面') handleLoadHistory()
            }}
            style={{ ...btn(screen === s ? COLOR.primary : '#ccc'), fontSize: '0.85rem' }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ========== 単一審査画面 ========== */}
      {screen === '単一審査画面' && (
        <div>
          <div style={card()}>
            <h3 style={{ margin: '0 0 1rem', color: COLOR.text }}>単一審査画面</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              {/* 審査視点（APIの perspective） */}
              <div>
                <span style={lbl()}>審査視点（当事者ロール）</span>
                <select style={field()} value={perspective} onChange={e => setPerspective(e.target.value)}>
                  {['委託者', '受託者', '買主', '売主', '賃借人', '賃貸人', '労働者', '使用者', '中立'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* 入力方法（基本設計書 14.1 input_mode） */}
              <div>
                <span style={lbl()}>入力方法</span>
                <div style={{ display: 'flex', gap: 16, paddingTop: 6 }}>
                  {(['ファイル', 'テキスト'] as InputMode[]).map(m => (
                    <label key={m} style={{ cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input
                        type="radio"
                        name="input_mode"
                        value={m}
                        checked={inputMode === m}
                        onChange={() => setInputMode(m)}
                      />
                      {m}
                    </label>
                  ))}
                </div>
              </div>

              {/* ファイル選択 or テキスト（基本設計書 14.1 source_file / source_text） */}
              {inputMode === 'ファイル' ? (
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={lbl()}>審査対象ファイル（PDF・docx・txt）</span>
                  <input
                    ref={singleFileRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={e => setSourceFile(e.target.files?.[0] ?? null)}
                    style={field()}
                  />
                </div>
              ) : (
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={lbl()}>審査対象本文</span>
                  <textarea
                    style={{ ...field(), minHeight: 160, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.83rem' }}
                    value={sourceText}
                    onChange={e => setSourceText(e.target.value)}
                    placeholder="契約書本文を貼り付けてください"
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" onClick={handleUseSampleContract} disabled={reviewing} style={btn(COLOR.muted, reviewing)}>
                疑似契約書を入力
              </button>
              <button
                onClick={handleReview}
                disabled={(inputMode === 'ファイル' ? !sourceFile : !sourceText.trim()) || reviewing}
                style={btn(COLOR.primary, (inputMode === 'ファイル' ? !sourceFile : !sourceText.trim()) || reviewing)}
              >
                {reviewing ? '審査実行中...' : '審査実行'}
              </button>
            </div>
            {reviewError && (
              <div role="alert" style={{ marginTop: 12, color: COLOR.danger, fontSize: '0.9rem' }}>{reviewError}</div>
            )}
          </div>

          {/* 審査結果（基本設計書 14.1 summary / recommendation / issues_grid） */}
          {reviewResult && (
            <div style={card()}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
                <h4 style={{ margin: 0, color: COLOR.text }}>審査結果</h4>
                <RecommendationBadge value={reviewResult.summary.recommendation} />
                <span style={{ fontSize: '0.82rem', color: COLOR.muted }}>
                  文書種別: {reviewResult.document_type} / 審査視点: {reviewResult.perspective} / 指摘数: {reviewResult.summary.total_issues}
                </span>
              </div>

              {/* 全体要約 */}
              <div style={{ background: '#f8f8f2', borderRadius: 6, padding: '1rem', marginBottom: '1.2rem', fontSize: '0.9rem', lineHeight: 1.7 }}>
                <div><strong>全体リスク:</strong> {reviewResult.summary.overall_risk}</div>
                <div><strong>推奨判断:</strong> {reviewResult.summary.recommendation}</div>
                <div style={{ color: COLOR.muted }}>{reviewResult.summary.recommendation_note}</div>
                {reviewResult.summary.top_priorities.length > 0 && (
                  <ul style={{ marginBottom: 0 }}>
                    {reviewResult.summary.top_priorities.map(priority => <li key={priority}>{priority}</li>)}
                  </ul>
                )}
              </div>

              {/* 指摘一覧 */}
              <span style={lbl()}>指摘一覧（severity 降順）</span>
              <IssuesTable issues={reviewResult.issues} />
            </div>
          )}
        </div>
      )}

      {/* ========== 比較審査画面 ========== */}
      {screen === '比較審査画面' && (
        <div>
          <div style={card()}>
            <h3 style={{ margin: '0 0 1rem', color: COLOR.text }}>比較審査画面</h3>

            {/* 基本設計書 14.2 入力項目 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <span style={lbl()}>比較対象A（現行版・pdf/docx/txt）</span>
                <input
                  ref={fileARef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={e => setFileA(e.target.files?.[0] ?? null)}
                  style={field()}
                />
                {fileA && <div style={{ fontSize: '0.8rem', color: COLOR.ok, marginTop: 4 }}>✓ {fileA.name}</div>}
              </div>
              <div>
                <span style={lbl()}>比較対象B（改訂版・pdf/docx/txt）</span>
                <input
                  ref={fileBRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={e => setFileB(e.target.files?.[0] ?? null)}
                  style={field()}
                />
                {fileB && <div style={{ fontSize: '0.8rem', color: COLOR.ok, marginTop: 4 }}>✓ {fileB.name}</div>}
              </div>
              <div>
                <span style={lbl()}>審査視点（当事者ロール）</span>
                <select style={field()} value={perspective} onChange={e => setPerspective(e.target.value)}>
                  {['委託者', '受託者', '買主', '売主', '賃借人', '賃貸人', '労働者', '使用者', '中立'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" onClick={handleUseSampleComparison} disabled={comparing} style={btn(COLOR.muted, comparing)}>
                疑似比較文書を用意
              </button>
              <button
                onClick={handleCompare}
                disabled={!fileA || !fileB || comparing}
                style={btn(COLOR.primary, !fileA || !fileB || comparing)}
              >
                {comparing ? '比較審査実行中（各AI処理は最大90秒）...' : '比較実行'}
              </button>
            </div>
            {compareError && (
              <div role="alert" style={{ marginTop: 12, color: COLOR.danger, fontSize: '0.9rem' }}>{compareError}</div>
            )}
          </div>

          {/* 比較審査結果（APIの review_a / review_b / diff_issues） */}
          {compareResult && (
            <div style={card()}>
              <h4 style={{ margin: '0 0 1rem', color: COLOR.text }}>
                比較審査結果
                <span style={{ marginLeft: 10, fontSize: '0.85rem', color: COLOR.muted, fontWeight: 'normal' }}>
                  比較ID: {compareResult.comparison_id}
                </span>
              </h4>

              {/* 差分要約 */}
              <div style={{ background: '#f8f8f2', borderRadius: 6, padding: '1rem', marginBottom: '1.2rem', fontSize: '0.9rem', lineHeight: 1.7 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <strong>現行版</strong>
                    <div>全体リスク: {compareResult.review_a.overall_risk}</div>
                    <div>推奨判断: {compareResult.review_a.recommendation}</div>
                    <div>指摘数: {compareResult.review_a.total_issues}</div>
                  </div>
                  <div>
                    <strong>改訂版</strong>
                    <div>全体リスク: {compareResult.review_b.overall_risk}</div>
                    <div>推奨判断: {compareResult.review_b.recommendation}</div>
                    <div>指摘数: {compareResult.review_b.total_issues}</div>
                  </div>
                </div>
                {Object.keys(compareResult.recommendation_diff).length > 0 && (
                  <div style={{ marginTop: '0.8rem' }}>
                    <strong>推奨判断の変化:</strong>{' '}
                    {compareResult.recommendation_diff.from ?? '—'} → {compareResult.recommendation_diff.to ?? '—'}
                  </div>
                )}
              </div>

              {/* 差分指摘一覧 */}
              <span style={lbl()}>差分指摘一覧（{compareResult.diff_issues.length}件）</span>
              {compareResult.diff_issues.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#f0f0f0' }}>
                      {['変更種別', '深刻度', '条番号', '指摘内容', '修正案'].map(h => (
                        <th key={h} style={{ padding: '5px 8px', textAlign: 'left', border: `1px solid ${COLOR.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {compareResult.diff_issues.map((issue, index) => (
                      <tr key={issue.issue_id ?? `${issue.type}-${index}`}>
                        <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                          <ChangeTypeBadge value={issue.type} />
                        </td>
                        <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                          <SeverityBadge value={issue.severity} />
                        </td>
                        <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, color: COLOR.primary, whiteSpace: 'nowrap' }}>
                          {issue.article ?? '—'}
                        </td>
                        <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, maxWidth: 300, lineHeight: 1.5 }}>
                          {issue.description}
                        </td>
                        <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, color: COLOR.muted, maxWidth: 220, lineHeight: 1.5 }}>
                          {issue.suggested_text ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ color: COLOR.ok, fontSize: '0.9rem' }}>差分指摘なし</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========== 審査履歴画面 ========== */}
      {screen === '審査履歴画面' && (
        <div>
          {/* 検索条件（基本設計書 14.3） */}
          <div style={card()}>
            <h3 style={{ margin: '0 0 1rem', color: COLOR.text }}>審査履歴画面</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.8rem', marginBottom: '1rem' }}>
              <div>
                <span style={lbl()}>開始日</span>
                <input type="date" style={field()} value={fromDate} onChange={e => setFromDate(e.target.value)} />
              </div>
              <div>
                <span style={lbl()}>終了日</span>
                <input type="date" style={field()} value={toDate} onChange={e => setToDate(e.target.value)} />
              </div>
              <div>
                <span style={lbl()}>文書種別</span>
                <select style={field()} value={histDocType} onChange={e => setHistDocType(e.target.value)}>
                  <option value="">（すべて）</option>
                  {['業務委託契約書', '売買契約書', 'NDA（秘密保持契約）', '賃貸借契約書', '雇用契約書', 'その他'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <span style={lbl()}>全体リスク</span>
                <select style={field()} value={histRecommendation} onChange={e => setHistRecommendation(e.target.value)}>
                  <option value="">（すべて）</option>
                  <option value="高リスク">高リスク</option>
                  <option value="中リスク">中リスク</option>
                  <option value="低リスク">低リスク</option>
                </select>
              </div>
            </div>
            <button onClick={handleLoadHistory} disabled={listLoading} style={btn(COLOR.primary, listLoading)}>
              {listLoading ? '読込中...' : '検索'}
            </button>
            {historyError && (
              <div role="alert" style={{ marginTop: 12, color: COLOR.danger, fontSize: '0.9rem' }}>{historyError}</div>
            )}
          </div>

          {/* 審査一覧（基本設計書 14.3 review_grid） */}
          <div style={card()}>
            {reviewList.length > 0 ? (
              <>
                <div style={{ marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleCompareSavedReviews}
                    disabled={selectedReviewIds.length !== 2 || historyActionLoading}
                    style={btn(COLOR.primary, selectedReviewIds.length !== 2 || historyActionLoading)}
                  >
                    選択した2件を比較
                  </button>
                  <span style={{ color: COLOR.muted, fontSize: '0.82rem' }}>
                    比較対象 {selectedReviewIds.length}/2件
                  </span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                  <thead>
                    <tr style={{ background: '#f0f0f0' }}>
                      {['比較', 'ID', '審査種別', '文書種別', '全体リスク', '推奨判断', '実行日', '詳細'].map(h => (
                        <th key={h} style={{ padding: '5px 8px', textAlign: 'left', border: `1px solid ${COLOR.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reviewList.map(r => (
                      <tr key={r.review_id}>
                        <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            aria-label={`審査${r.review_id}を比較対象に選択`}
                            checked={selectedReviewIds.includes(r.review_id)}
                            disabled={!selectedReviewIds.includes(r.review_id) && selectedReviewIds.length >= 2}
                            onChange={() => toggleReviewSelection(r.review_id)}
                          />
                        </td>
                        <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{r.review_id}</td>
                        <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                          <span style={{ background: r.review_type === 'compare' ? COLOR.primary : COLOR.muted, color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '0.75rem' }}>
                            {r.review_type === 'compare' ? '比較' : '単一'}
                          </span>
                        </td>
                        <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{r.document_type ?? '—'}</td>
                        <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{r.overall_risk ?? '—'}</td>
                        <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                          {r.recommendation ? <RecommendationBadge value={r.recommendation} /> : '—'}
                        </td>
                        <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{r.created_at?.slice(0, 10) ?? '—'}</td>
                        <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                          <button
                            onClick={() => handleLoadReviewDetail(r.review_id)}
                            disabled={historyActionLoading}
                            style={{ ...btn(COLOR.muted, historyActionLoading), padding: '0.3rem 0.7rem' }}
                          >
                            詳細
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              !listLoading && (
                <div style={{ color: COLOR.muted, fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem' }}>
                  該当する審査履歴がありません
                </div>
              )
            )}
          </div>

          {reviewDetail && (
            <div style={card()}>
              <h3 style={{ marginTop: 0 }}>保存済み審査結果 #{reviewDetail.review_id}</h3>
              <div style={{ fontSize: '0.88rem', lineHeight: 1.7, marginBottom: 12 }}>
                <div>審査種別: {reviewDetail.review_type === 'compare' ? '比較' : '単一'}</div>
                <div>文書種別: {reviewDetail.document_type ?? '—'}</div>
                <div>審査視点: {reviewDetail.perspective ?? '—'}</div>
                <div>全体リスク: {reviewDetail.summary.overall_risk}</div>
                <div>推奨判断: {reviewDetail.summary.recommendation}</div>
                <div style={{ color: COLOR.muted }}>{reviewDetail.summary.recommendation_note}</div>
              </div>
              <div style={{ color: COLOR.muted, fontSize: '0.8rem', marginBottom: 8 }}>
                原文と原文抜粋は保存しないため、履歴では指摘、理由、修正案を再表示します。
              </div>
              <IssuesTable issues={reviewDetail.issues} />
            </div>
          )}

          {savedComparison && (
            <div style={card()}>
              <h3 style={{ marginTop: 0 }}>
                保存済み審査結果の比較 #{savedComparison.review_id_a} → #{savedComparison.review_id_b}
              </h3>
              <div style={{ fontSize: '0.88rem', lineHeight: 1.7, marginBottom: 12 }}>
                <div>全体リスク: {savedComparison.overall_risk_diff.from ?? '—'} → {savedComparison.overall_risk_diff.to ?? '—'}</div>
                <div>推奨判断: {savedComparison.recommendation_diff.from ?? '—'} → {savedComparison.recommendation_diff.to ?? '—'}</div>
                <div>指摘件数の増減: {savedComparison.issue_count_diff}</div>
              </div>
              <h4>追加された指摘</h4>
              <IssuesTable issues={savedComparison.added_issues} />
              <h4>解消された指摘</h4>
              <IssuesTable issues={savedComparison.removed_issues} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
