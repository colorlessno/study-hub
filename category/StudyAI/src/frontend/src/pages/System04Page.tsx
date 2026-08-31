import { useState, useRef } from 'react'
import { createSystemClient } from '../api/client'

const client = createSystemClient('system04')

// ---- 型定義（基本設計書 IF仕様より） ----

type Sentiment = 'positive' | 'negative' | 'neutral'

interface SentimentSummary {
  positive: number
  negative: number
  neutral: number
  average_score: number
}

interface Topic {
  topic: string
  positive_count: number
  negative_count: number
  representative_text: string | null
}

interface Improvement {
  priority: 'high' | 'medium' | 'low'
  issue: string
  suggestion: string
}

interface IndividualResult {
  source_id: string | null
  text: string
  sentiment: Sentiment
  sentiment_score: number
  intensity: string
  topics: string[]
  review_score: number | null
  review_date: string | null
}

interface AnalysisInsights {
  positive_summary: string
  negative_summary: string
  keywords: Record<string, unknown>
  improvements: Improvement[]
  representative_reviews: {
    positive: string[]
    negative: string[]
  }
  trend_analysis: string | null
}

interface AnalysisResult {
  analysis_id: number
  product_name: string
  total_reviews: number
  sentiment_summary: SentimentSummary
  topics: Topic[]
  insights: AnalysisInsights
  individual_results: IndividualResult[]
  created_at: string
}

interface CompareProduct {
  product_name: string
  total_reviews: number
  sentiment_summary: SentimentSummary
  strengths: string[]
  weaknesses: string[]
}

interface CompareDiffPoint {
  topic: string
  summary: string
  better_product: string | null
}

interface CompareResult {
  comparison_id: number
  products: CompareProduct[]
  diff_points: CompareDiffPoint[]
  recommendations: Improvement[]
  created_at: string
}

interface AnalysisDetail extends AnalysisResult {
  compare_flag: boolean
  comparison_payload: {
    products?: CompareProduct[]
    diff_points?: CompareDiffPoint[]
    recommendations?: Improvement[]
  }
}

interface AnalysisSummary {
  analysis_id: number
  product_name: string
  total_reviews: number
  compare_flag: boolean
  created_at: string
}

// ---- 画面種別（基本設計書 セクション10） ----
type Screen = '単一分析画面' | 'ファイル分析画面' | '比較分析画面' | '分析履歴画面'

// ---- サンプル JSON ----
const SAMPLE_REVIEWS_JSON = `[
  {"text": "使いやすくて操作が直感的です", "score": 5, "date": "2025-01-10"},
  {"text": "バッテリーの持ちが短いのが残念", "score": 2, "date": "2025-01-12"},
  {"text": "デザインはとても良いと思います", "score": 4, "date": "2025-01-15"}
]`

const SAMPLE_COMPARE_JSON = `[
  {
    "product_name": "商品A",
    "reviews": [
      {"text": "使いやすい", "score": 5},
      {"text": "値段が高い", "score": 2}
    ]
  },
  {
    "product_name": "商品B",
    "reviews": [
      {"text": "コスパが良い", "score": 4},
      {"text": "耐久性が低い", "score": 2}
    ]
  }
]`

const SAMPLE_PRODUCT_NAME = 'ワイヤレスイヤホン Pro X'

const SAMPLE_FILE_JSON = JSON.stringify({
  product_name: 'モバイルバッテリー Sample',
  reviews: [
    { text: '容量が大きく、外出先でも安心して使えます', score: 5, date: '2025-02-01' },
    { text: '本体が少し重く、持ち運びにくいです', score: 2, date: '2025-02-03' },
    { text: '充電速度は標準的です', score: 3, date: '2025-02-05' },
  ],
}, null, 2)

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

function getErrorMessage(error: unknown, fallback: string) {
  const data = (error as {
    response?: { data?: { message?: string; detail?: string | { message?: string }; error?: { message?: string } } }
  }).response?.data
  if (typeof data?.detail === 'string') return data.detail
  if (typeof data?.detail === 'object' && data.detail?.message) return data.detail.message
  return data?.error?.message ?? data?.message ?? fallback
}

// ---- 感情バッジ ----
function SentimentBadge({ value }: { value: Sentiment }) {
  const map: Record<Sentiment, [string, string]> = {
    positive: [COLOR.ok,      'ポジティブ'],
    negative: [COLOR.danger,  'ネガティブ'],
    neutral:  [COLOR.muted,   '中立'],
  }
  const [color, label] = map[value] ?? ['#aaa', value]
  return (
    <span style={{ background: color, color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '0.75rem' }}>
      {label}
    </span>
  )
}

// ---- 優先度バッジ ----
function PriorityBadge({ value }: { value: 'high' | 'medium' | 'low' }) {
  const map: Record<string, [string, string]> = {
    high:   [COLOR.danger, '高'],
    medium: [COLOR.warn,   '中'],
    low:    [COLOR.ok,     '低'],
  }
  const [color, label] = map[value] ?? ['#aaa', value]
  return (
    <span style={{ background: color, color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '0.75rem', fontWeight: 'bold' }}>
      {label}
    </span>
  )
}

// ---- 分析結果パネル（単一・ファイル共通） ----
function AnalysisResultPanel({ result }: { result: AnalysisResult }) {
  const [showIndividual, setShowIndividual] = useState(false)
  const total = result.sentiment_summary.positive + result.sentiment_summary.negative + result.sentiment_summary.neutral || 1

  return (
    <div>
      {/* 感情サマリ（基本設計書 14.1 sentiment_summary） */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.8rem', marginBottom: '1.2rem' }}>
        {[
          ['ポジティブ', result.sentiment_summary.positive, COLOR.ok],
          ['ネガティブ', result.sentiment_summary.negative, COLOR.danger],
          ['中立', result.sentiment_summary.neutral, COLOR.muted],
          ['平均感情スコア', result.sentiment_summary.average_score.toFixed(2), COLOR.primary],
        ].map(([label, value, color]) => (
          <div key={label as string} style={{ textAlign: 'center', padding: '0.8rem', background: '#f8f8f2', borderRadius: 6 }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: color as string }}>{value as string | number}</div>
            <div style={{ fontSize: '0.78rem', color: COLOR.muted, marginTop: 2 }}>{label as string}</div>
          </div>
        ))}
      </div>

      {/* 感情比率バー */}
      <div style={{ marginBottom: '1.2rem', borderRadius: 4, overflow: 'hidden', height: 12, display: 'flex' }}>
        <div style={{ width: `${(result.sentiment_summary.positive / total) * 100}%`, background: COLOR.ok }} />
        <div style={{ width: `${(result.sentiment_summary.neutral / total) * 100}%`, background: COLOR.muted }} />
        <div style={{ width: `${(result.sentiment_summary.negative / total) * 100}%`, background: COLOR.danger }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1.2rem' }}>
        <div style={{ padding: '0.8rem', border: `1px solid ${COLOR.border}`, borderRadius: 6 }}>
          <strong style={{ color: COLOR.ok, fontSize: '0.82rem' }}>良い評価の要約</strong>
          <div style={{ marginTop: 4, fontSize: '0.85rem', lineHeight: 1.6 }}>{result.insights.positive_summary || '該当なし'}</div>
        </div>
        <div style={{ padding: '0.8rem', border: `1px solid ${COLOR.border}`, borderRadius: 6 }}>
          <strong style={{ color: COLOR.danger, fontSize: '0.82rem' }}>改善点の要約</strong>
          <div style={{ marginTop: 4, fontSize: '0.85rem', lineHeight: 1.6 }}>{result.insights.negative_summary || '該当なし'}</div>
        </div>
      </div>

      {/* トピック一覧（基本設計書 14.1 topics_grid） */}
      <div style={{ marginBottom: '1.2rem' }}>
        <span style={lbl()}>トピック一覧（{result.topics.length}件）</span>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              {['トピック', '感情傾向', '件数', '代表レビュー'].map(h => (
                <th key={h} style={{ padding: '5px 8px', textAlign: 'left', border: `1px solid ${COLOR.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.topics.map((topic, i) => {
              const sentiment: Sentiment = topic.positive_count > topic.negative_count
                ? 'positive'
                : topic.negative_count > topic.positive_count ? 'negative' : 'neutral'
              return (
              <tr key={i}>
                <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, fontWeight: 'bold' }}>{topic.topic}</td>
                <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                  <SentimentBadge value={sentiment} />
                </td>
                <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, textAlign: 'center' }}>
                  {topic.positive_count + topic.negative_count}
                </td>
                <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, color: COLOR.muted, maxWidth: 300 }}>
                  {topic.representative_text ?? '—'}
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 改善提案（基本設計書 14.1 insights_panel） */}
      {result.insights.improvements.length > 0 && (
        <div style={{ marginBottom: '1.2rem' }}>
          <span style={lbl()}>改善提案</span>
          {result.insights.improvements.map((imp, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '0.6rem 0', borderBottom: `1px solid ${COLOR.border}` }}>
              <PriorityBadge value={imp.priority} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 'bold', color: COLOR.text, marginBottom: 2 }}>{imp.issue}</div>
                <div style={{ fontSize: '0.83rem', color: COLOR.muted }}>{imp.suggestion}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 個別結果（基本設計書 14.1 individual_results_grid） */}
      <div>
        <button
          onClick={() => setShowIndividual(s => !s)}
          style={{ ...btn('#6c6f85'), fontSize: '0.82rem', padding: '4px 12px', marginBottom: 8 }}
        >
          {showIndividual ? '個別結果を閉じる' : `個別結果を表示（${result.individual_results.length}件）`}
        </button>
        {showIndividual && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                {['レビュー本文', '感情', 'スコア', 'トピック'].map(h => (
                  <th key={h} style={{ padding: '4px 8px', textAlign: 'left', border: `1px solid ${COLOR.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
            {result.individual_results.map((r, index) => (
              <tr key={`${r.source_id ?? 'review'}-${index}`}>
                  <td style={{ padding: '4px 8px', border: `1px solid ${COLOR.border}`, maxWidth: 300, lineHeight: 1.4 }}>{r.text}</td>
                  <td style={{ padding: '4px 8px', border: `1px solid ${COLOR.border}` }}>
                    <SentimentBadge value={r.sentiment} />
                  </td>
                  <td style={{ padding: '4px 8px', border: `1px solid ${COLOR.border}`, textAlign: 'center' }}>
                    <span style={{ color: (r.review_score ?? r.sentiment_score) >= 4 ? COLOR.ok : (r.review_score ?? r.sentiment_score) <= 2 ? COLOR.danger : COLOR.warn }}>
                      {r.review_score ?? r.sentiment_score.toFixed(2)}
                    </span>
                  </td>
                  <td style={{ padding: '4px 8px', border: `1px solid ${COLOR.border}`, color: COLOR.muted, fontSize: '0.76rem' }}>
                    {r.topics.join(', ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function CompareResultPanel({ result }: { result: CompareResult }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(result.products.length, 1)}, 1fr)`, gap: '0.8rem', marginBottom: '1.2rem' }}>
        {result.products.map(product => {
          const total = product.sentiment_summary.positive + product.sentiment_summary.negative + product.sentiment_summary.neutral || 1
          return (
            <div key={product.product_name} style={{ border: `1px solid ${COLOR.border}`, borderRadius: 8, padding: '1rem' }}>
              <div style={{ fontWeight: 'bold', color: COLOR.text, marginBottom: 8 }}>{product.product_name}</div>
              <div style={{ fontSize: '0.82rem', color: COLOR.muted, marginBottom: 8 }}>
                対象: {product.total_reviews}件 / 平均感情スコア:{' '}
                <strong style={{ color: COLOR.primary }}>{product.sentiment_summary.average_score.toFixed(2)}</strong>{' '}
                / ポジティブ率:{' '}
                <strong style={{ color: COLOR.ok }}>{((product.sentiment_summary.positive / total) * 100).toFixed(0)}%</strong>
              </div>
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: '0.8rem', color: COLOR.ok, fontWeight: 'bold', marginBottom: 3 }}>強み</div>
                {product.strengths.length > 0 ? product.strengths.map((value, index) => (
                  <div key={index} style={{ fontSize: '0.82rem' }}>・{value}</div>
                )) : <div style={{ fontSize: '0.82rem', color: COLOR.muted }}>該当なし</div>}
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: COLOR.danger, fontWeight: 'bold', marginBottom: 3 }}>弱み</div>
                {product.weaknesses.length > 0 ? product.weaknesses.map((value, index) => (
                  <div key={index} style={{ fontSize: '0.82rem' }}>・{value}</div>
                )) : <div style={{ fontSize: '0.82rem', color: COLOR.muted }}>該当なし</div>}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginBottom: '1.2rem' }}>
        <span style={lbl()}>商品の差</span>
        {result.diff_points.length > 0 ? result.diff_points.map((point, index) => (
          <div key={index} style={{ padding: '0.6rem 0', borderBottom: `1px solid ${COLOR.border}`, fontSize: '0.85rem' }}>
            <strong>{point.topic}</strong>: {point.summary}
            {point.better_product && <span style={{ marginLeft: 8, color: COLOR.ok }}>優位: {point.better_product}</span>}
          </div>
        )) : <div style={{ color: COLOR.muted, fontSize: '0.85rem' }}>大きな差は検出されませんでした。</div>}
      </div>

      {result.recommendations.length > 0 && (
        <div>
          <span style={lbl()}>改善提案</span>
          {result.recommendations.map((item, index) => (
            <div key={index} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '0.6rem 0', borderBottom: `1px solid ${COLOR.border}` }}>
              <PriorityBadge value={item.priority} />
              <div>
                <strong style={{ fontSize: '0.85rem' }}>{item.issue}</strong>
                <div style={{ color: COLOR.muted, fontSize: '0.82rem', marginTop: 2 }}>{item.suggestion}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// メインコンポーネント
// ============================================================
export default function System04Page() {
  const [screen, setScreen] = useState<Screen>('単一分析画面')

  // ---- 単一分析画面（基本設計書 14.1） ----
  const [productName, setProductName] = useState(SAMPLE_PRODUCT_NAME)
  const [reviewsJson, setReviewsJson] = useState(SAMPLE_REVIEWS_JSON)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  // ---- ファイル分析画面（基本設計書 14.2） ----
  const [reviewFile, setReviewFile] = useState<File | null>(null)
  const [fileProductName, setFileProductName] = useState('')
  const [fileAnalyzing, setFileAnalyzing] = useState(false)
  const [fileResult, setFileResult] = useState<AnalysisResult | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ---- 比較分析画面（基本設計書 14.3） ----
  const [productsJson, setProductsJson] = useState(SAMPLE_COMPARE_JSON)
  const [comparing, setComparing] = useState(false)
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null)
  const [compareJsonError, setCompareJsonError] = useState<string | null>(null)
  const [compareError, setCompareError] = useState<string | null>(null)

  // ---- 分析履歴画面（基本設計書 14.4） ----
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [productFilter, setProductFilter] = useState('')
  const [analysisList, setAnalysisList] = useState<AnalysisSummary[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState<number | null>(null)
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisDetail | null>(null)

  // ---- 単一分析実行 ----
  async function handleAnalyze() {
    if (!productName.trim()) return
    setJsonError(null)
    setAnalysisError(null)
    let reviews
    try { reviews = JSON.parse(reviewsJson) } catch {
      setJsonError('JSON フォーマットが不正です')
      return
    }
    setAnalyzing(true)
    setAnalysisResult(null)
    try {
      const res = await client.post<AnalysisResult>('/analyze', { product_name: productName, reviews })
      setAnalysisResult(res.data)
    } catch (error) {
      setAnalysisError(getErrorMessage(error, 'レビューを分析できませんでした。'))
    } finally {
      setAnalyzing(false)
    }
  }

  function prepareSampleFile() {
    const file = new File([SAMPLE_FILE_JSON], 'system04-sample-reviews.json', { type: 'application/json' })
    setReviewFile(file)
    setFileProductName('モバイルバッテリー Sample')
    setFileResult(null)
    setFileError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  // ---- ファイル分析実行 ----
  async function handleFileAnalyze() {
    if (!reviewFile) return
    setFileAnalyzing(true)
    setFileResult(null)
    setFileError(null)
    try {
      const formData = new FormData()
      formData.append('file', reviewFile)
      if (fileProductName.trim()) formData.append('product_name', fileProductName.trim())
      const res = await client.post<AnalysisResult>(
        '/analyze/file',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      )
      setFileResult(res.data)
    } catch (error) {
      setFileError(getErrorMessage(error, 'レビューファイルを分析できませんでした。'))
    } finally {
      setFileAnalyzing(false)
    }
  }

  // ---- 比較分析実行 ----
  async function handleCompare() {
    setCompareJsonError(null)
    setCompareError(null)
    let products
    try { products = JSON.parse(productsJson) } catch {
      setCompareJsonError('JSON フォーマットが不正です')
      return
    }
    setComparing(true)
    setCompareResult(null)
    try {
      const res = await client.post<CompareResult>('/compare', { products })
      setCompareResult(res.data)
    } catch (error) {
      setCompareError(getErrorMessage(error, '商品を比較できませんでした。'))
    } finally {
      setComparing(false)
    }
  }

  // ---- 分析履歴取得 ----
  async function handleLoadHistory() {
    setListLoading(true)
    setHistoryError(null)
    setSelectedAnalysis(null)
    try {
      const params: Record<string, string> = {}
      if (fromDate) params.from_date = fromDate
      if (toDate) params.to_date = toDate
      if (productFilter.trim()) params.product_name = productFilter.trim()
      const res = await client.get<{ items: AnalysisSummary[] }>('/analyses', { params })
      setAnalysisList(res.data.items ?? [])
    } catch (error) {
      setHistoryError(getErrorMessage(error, '分析履歴を取得できませんでした。'))
    } finally {
      setListLoading(false)
    }
  }

  async function handleLoadDetail(analysisId: number) {
    setDetailLoading(analysisId)
    setHistoryError(null)
    try {
      const res = await client.get<AnalysisDetail>(`/analyses/${analysisId}`)
      setSelectedAnalysis(res.data)
    } catch (error) {
      setHistoryError(getErrorMessage(error, '分析結果の詳細を取得できませんでした。'))
    } finally {
      setDetailLoading(null)
    }
  }

  // ============================================================
  // 画面レンダリング
  // ============================================================
  return (
    <div style={{ maxWidth: 1040 }}>
      <h2 style={{ color: COLOR.text, marginBottom: 4 }}>System04</h2>
      <p style={{ color: COLOR.muted, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        商品・サービス レビュー分析＆インサイト抽出システム
      </p>

      {/* 画面タブナビゲーション（基本設計書 セクション10） */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', borderBottom: `2px solid ${COLOR.border}`, paddingBottom: 8 }}>
        {(['単一分析画面', 'ファイル分析画面', '比較分析画面', '分析履歴画面'] as Screen[]).map(s => (
          <button
            key={s}
            onClick={() => {
              setScreen(s)
              if (s === '分析履歴画面') handleLoadHistory()
            }}
            style={{ ...btn(screen === s ? COLOR.primary : '#ccc'), fontSize: '0.82rem' }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ========== 単一分析画面 ========== */}
      {screen === '単一分析画面' && (
        <div>
          <div style={card()}>
            <h3 style={{ margin: '0 0 1rem', color: COLOR.text }}>単一分析画面</h3>

            {/* 基本設計書 14.1 入力項目 */}
            <div style={{ marginBottom: '1rem' }}>
              <span style={lbl()}>商品名 ＊</span>
              <input
                type="text"
                style={{ ...field(), maxWidth: 360 }}
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder="例：ワイヤレスイヤホン Pro X"
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <span style={lbl()}>レビュー入力（JSON配列）</span>
              <textarea
                style={{ ...field(), minHeight: 140, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.83rem' }}
                value={reviewsJson}
                onChange={e => setReviewsJson(e.target.value)}
              />
              {jsonError && <div style={{ color: COLOR.danger, fontSize: '0.82rem', marginTop: 4 }}>⚠ {jsonError}</div>}
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!productName.trim() || !reviewsJson.trim() || analyzing}
              style={btn(COLOR.primary, !productName.trim() || !reviewsJson.trim() || analyzing)}
            >
              {analyzing ? '分析実行中...' : '分析開始'}
            </button>
            <button
              onClick={() => {
                setProductName(SAMPLE_PRODUCT_NAME)
                setReviewsJson(SAMPLE_REVIEWS_JSON)
                setAnalysisError(null)
                setJsonError(null)
              }}
              disabled={analyzing}
              style={{ ...btn('#6c6f85', analyzing), marginLeft: 8 }}
            >
              サンプルを入力
            </button>
            {analysisError && <div style={{ color: COLOR.danger, fontSize: '0.82rem', marginTop: 8 }}>{analysisError}</div>}
          </div>

          {/* 単一分析結果 */}
          {analysisResult && (
            <div style={card()}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
                <h4 style={{ margin: 0, color: COLOR.text }}>{analysisResult.product_name}</h4>
                <span style={{ fontSize: '0.82rem', color: COLOR.muted }}>
                  総レビュー数: {analysisResult.total_reviews}件
                </span>
              </div>
              <AnalysisResultPanel result={analysisResult} />
            </div>
          )}
        </div>
      )}

      {/* ========== ファイル分析画面 ========== */}
      {screen === 'ファイル分析画面' && (
        <div>
          <div style={card()}>
            <h3 style={{ margin: '0 0 1rem', color: COLOR.text }}>ファイル分析画面</h3>

            {/* 基本設計書 14.2 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <span style={lbl()}>レビューファイル（CSV・JSON・TXT）＊</span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.json,.txt"
                  onChange={e => {
                    setReviewFile(e.target.files?.[0] ?? null)
                    setFileError(null)
                  }}
                  style={field()}
                />
              </div>
              <div>
                <span style={lbl()}>商品名（任意。ファイルに含まれる場合は省略可）</span>
                <input
                  type="text"
                  style={field()}
                  value={fileProductName}
                  onChange={e => setFileProductName(e.target.value)}
                  placeholder="例：商品A"
                />
              </div>
            </div>

            <button
              onClick={handleFileAnalyze}
              disabled={!reviewFile || fileAnalyzing}
              style={btn(COLOR.primary, !reviewFile || fileAnalyzing)}
            >
              {fileAnalyzing ? 'ファイル分析中...' : 'ファイル分析開始'}
            </button>
            <button
              onClick={prepareSampleFile}
              disabled={fileAnalyzing}
              style={{ ...btn('#6c6f85', fileAnalyzing), marginLeft: 8 }}
            >
              教材用サンプルファイルを用意
            </button>
            {reviewFile && (
              <div style={{ marginTop: '0.8rem', fontSize: '0.85rem', color: COLOR.muted }}>
                選択中: {reviewFile.name}
              </div>
            )}
            {fileError && <div style={{ color: COLOR.danger, fontSize: '0.82rem', marginTop: 8 }}>{fileError}</div>}
          </div>

          {/* ファイル分析結果 */}
          {fileResult && (
            <div style={card()}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: '1.2rem' }}>
                <h4 style={{ margin: 0, color: COLOR.text }}>{fileResult.product_name}</h4>
                <span style={{ fontSize: '0.82rem', color: COLOR.muted }}>
                  総レビュー数: {fileResult.total_reviews}件
                </span>
              </div>
              <AnalysisResultPanel result={fileResult} />
            </div>
          )}
        </div>
      )}

      {/* ========== 比較分析画面 ========== */}
      {screen === '比較分析画面' && (
        <div>
          <div style={card()}>
            <h3 style={{ margin: '0 0 1rem', color: COLOR.text }}>比較分析画面</h3>

            {/* 基本設計書 14.3 products_json */}
            <div style={{ marginBottom: '1rem' }}>
              <span style={lbl()}>比較対象入力（JSON配列 — 各要素に product_name と reviews）</span>
              <textarea
                style={{ ...field(), minHeight: 160, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.83rem' }}
                value={productsJson}
                onChange={e => setProductsJson(e.target.value)}
              />
              {compareJsonError && <div style={{ color: COLOR.danger, fontSize: '0.82rem', marginTop: 4 }}>⚠ {compareJsonError}</div>}
            </div>

            <button
              onClick={handleCompare}
              disabled={!productsJson.trim() || comparing}
              style={btn(COLOR.primary, !productsJson.trim() || comparing)}
            >
              {comparing ? '比較分析実行中...' : '比較開始'}
            </button>
            {compareError && <div style={{ color: COLOR.danger, fontSize: '0.82rem', marginTop: 8 }}>{compareError}</div>}
          </div>

          {/* 比較結果 */}
          {compareResult && (
            <div style={card()}>
              <h4 style={{ margin: '0 0 1rem', color: COLOR.text }}>比較分析結果</h4>
              <CompareResultPanel result={compareResult} />
            </div>
          )}
        </div>
      )}

      {/* ========== 分析履歴画面 ========== */}
      {screen === '分析履歴画面' && (
        <div>
          {/* 検索条件（基本設計書 14.4） */}
          <div style={card()}>
            <h3 style={{ margin: '0 0 1rem', color: COLOR.text }}>分析履歴画面</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '0.8rem', marginBottom: '1rem' }}>
              <div>
                <span style={lbl()}>開始日</span>
                <input type="date" style={field()} value={fromDate} onChange={e => setFromDate(e.target.value)} />
              </div>
              <div>
                <span style={lbl()}>終了日</span>
                <input type="date" style={field()} value={toDate} onChange={e => setToDate(e.target.value)} />
              </div>
              <div>
                <span style={lbl()}>商品名（部分一致）</span>
                <input
                  type="text"
                  style={field()}
                  value={productFilter}
                  onChange={e => setProductFilter(e.target.value)}
                  placeholder="商品名を入力"
                />
              </div>
            </div>
            <button onClick={handleLoadHistory} disabled={listLoading} style={btn(COLOR.primary, listLoading)}>
              {listLoading ? '読込中...' : '検索'}
            </button>
            {historyError && <div style={{ color: COLOR.danger, fontSize: '0.82rem', marginTop: 8 }}>{historyError}</div>}
          </div>

          {/* 分析一覧（基本設計書 14.4 analysis_grid） */}
          <div style={card()}>
            {analysisList.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    {['ID', '商品名', '総レビュー数', '種別', '実行日', '操作'].map(h => (
                      <th key={h} style={{ padding: '5px 8px', textAlign: 'left', border: `1px solid ${COLOR.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysisList.map(a => (
                    <tr key={a.analysis_id}>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{a.analysis_id}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, fontWeight: 'bold' }}>{a.product_name}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, textAlign: 'center' }}>{a.total_reviews}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                        <span style={{
                          background: a.compare_flag ? COLOR.primary : COLOR.muted,
                          color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '0.75rem',
                        }}>
                          {a.compare_flag ? '比較' : '単一'}
                        </span>
                      </td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{a.created_at?.slice(0, 10) ?? '—'}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                        <button
                          onClick={() => handleLoadDetail(a.analysis_id)}
                          disabled={detailLoading !== null}
                          style={{ ...btn(COLOR.primary, detailLoading !== null), padding: '4px 10px', fontSize: '0.78rem' }}
                        >
                          {detailLoading === a.analysis_id ? '読込中...' : '結果を表示'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              !listLoading && (
                <div style={{ color: COLOR.muted, fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem' }}>
                  該当する分析履歴がありません
                </div>
              )
            )}
          </div>

          {selectedAnalysis && (
            <div style={card()}>
              <h4 style={{ margin: '0 0 1rem', color: COLOR.text }}>
                履歴の分析結果: {selectedAnalysis.product_name}
              </h4>
              {selectedAnalysis.compare_flag ? (
                <CompareResultPanel result={{
                  comparison_id: selectedAnalysis.analysis_id,
                  products: selectedAnalysis.comparison_payload.products ?? [],
                  diff_points: selectedAnalysis.comparison_payload.diff_points ?? [],
                  recommendations: selectedAnalysis.comparison_payload.recommendations ?? [],
                  created_at: selectedAnalysis.created_at,
                }} />
              ) : (
                <AnalysisResultPanel result={selectedAnalysis} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
