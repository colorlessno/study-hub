import { useState, useRef, useEffect } from 'react'
import { isAxiosError } from 'axios'
import { createSystemClient } from '../api/client'

const client = createSystemClient('system12')

// ---- 型定義（基本設計書 IF仕様より） ----

type ResponseType = 'question' | 'recommendation'

interface Recommendation {
  product_id: number
  product_name: string
  price: number
  category: string
  reason: string
  suitable_for: string
  cautions: string | null
  wrapping: string | null
  score: number
}

interface ChatResponse {
  session_id: string
  response_type: ResponseType
  message: string
  collected_conditions: Record<string, string>
  missing_conditions: string[]
  recommendations: Recommendation[]
}

interface ProductRecord {
  product_id: number
  name: string
  price: number
  category: string | null
  tags: string[]
  is_active: boolean
}

interface SceneRecord {
  scene_id: number
  name: string
}

interface NgRuleRecord {
  rule_id: number
  scene_name: string | null
  recipient_name: string | null
  ng_attribute: string
  reason: string | null
  severity: 'warn' | 'block'
}

interface RecommendationAnalytics {
  total_sessions: number
  total_recommendations: number
  items: {
    product_id: number
    product_name: string
    recommendation_count: number
    positive_feedback_count: number
    negative_feedback_count: number
  }[]
  generated_at: string
}

// ---- 画面種別（基本設計書 セクション10） ----
type Screen = '会話推薦画面' | '商品管理画面' | 'オントロジー・分析画面'

// ---- 商品カテゴリ ----
const PRODUCT_CATEGORIES = ['スイーツ・菓子', '食品・グルメ', '飲料・酒', '花・植物', '雑貨・インテリア', 'ファッション', '体験・チケット', 'その他']

// ---- セッションID生成 ----
function newSessionId() {
  return 'sess_' + Math.random().toString(36).slice(2, 10)
}

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
  userBubble: '#dbeafe',
  aiBubble: '#f1f5f9',
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

function formatError(error: unknown): string {
  if (isAxiosError(error)) {
    return error.response?.data?.error?.message
      ?? error.response?.data?.message
      ?? error.message
  }
  return error instanceof Error ? error.message : '処理に失敗しました。'
}

// ============================================================
// メインコンポーネント
// ============================================================
export default function System12Page() {
  const [screen, setScreen] = useState<Screen>('会話推薦画面')

  // ---- 会話推薦画面（基本設計書 14.1） ----
  const [sessionId] = useState(newSessionId)
  const [message, setMessage] = useState('母の誕生日に花のギフトを5000円くらいで贈りたい')
  const [sending, setSending] = useState(false)
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string; recommendations?: Recommendation[] }[]>([])
  const [collectedConditions, setCollectedConditions] = useState<Record<string, string>>({})
  const [lastRecommendations, setLastRecommendations] = useState<Recommendation[]>([])
  const [feedbackTargetId, setFeedbackTargetId] = useState<number | null>(null)
  const [feedbackLike, setFeedbackLike] = useState<boolean | null>(null)
  const [feedbackReason, setFeedbackReason] = useState('')
  const [feedbackSent, setFeedbackSent] = useState<Set<number>>(new Set())
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // ---- 商品管理画面（基本設計書 14.2） ----
  const [productName, setProductName] = useState('母への花ギフト')
  const [price, setPrice] = useState('4500')
  const [category, setCategory] = useState('花・植物')
  const [tags, setTags] = useState('花, 誕生日, 母')
  const [productScenes, setProductScenes] = useState('誕生日')
  const [productRecipients, setProductRecipients] = useState('母')
  const [productSubmitting, setProductSubmitting] = useState(false)
  const [productList, setProductList] = useState<ProductRecord[]>([])
  const [productListLoading, setProductListLoading] = useState(false)
  const [updatingProductId, setUpdatingProductId] = useState<number | null>(null)

  // ---- オントロジー・分析画面（基本設計書 14.3） ----
  const [sceneName, setSceneName] = useState('誕生日')
  const [sceneSubmitting, setSceneSubmitting] = useState(false)
  const [ngCondition, setNgCondition] = useState('酒')
  const [ngSceneName, setNgSceneName] = useState('誕生日')
  const [ngRecipientName, setNgRecipientName] = useState('母')
  const [ngReason, setNgReason] = useState('酒類を候補から外す')
  const [ngSeverity, setNgSeverity] = useState<'warn' | 'block'>('block')
  const [ngSubmitting, setNgSubmitting] = useState(false)
  const [lastScene, setLastScene] = useState<SceneRecord | null>(null)
  const [lastNgRule, setLastNgRule] = useState<NgRuleRecord | null>(null)
  const [analytics, setAnalytics] = useState<RecommendationAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // チャット末尾に自動スクロール
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  // ---- チャット送信 ----
  async function handleChat() {
    if (!message.trim()) return
    const userMsg = message.trim()
    setErrorMessage('')
    setNotice('')
    setSending(true)
    setChatHistory(h => [...h, { role: 'user', text: userMsg }])
    try {
      const res = await client.post<ChatResponse>('/chat', {
        session_id: sessionId,
        message: userMsg,
      })
      const data = res.data
      setMessage('')
      setCollectedConditions(data.collected_conditions ?? {})
      if (data.response_type === 'recommendation') {
        setLastRecommendations(data.recommendations ?? [])
        setChatHistory(h => [...h, { role: 'ai', text: data.message, recommendations: data.recommendations }])
      } else {
        setChatHistory(h => [...h, { role: 'ai', text: data.message }])
      }
    } catch (error) {
      setErrorMessage(`会話の送信に失敗しました: ${formatError(error)}`)
    } finally {
      setSending(false)
    }
  }

  // ---- フィードバック送信 ----
  async function handleFeedback(productId: number) {
    if (feedbackLike === null) return
    setErrorMessage('')
    setNotice('')
    try {
      await client.post('/chat/feedback', {
        session_id: sessionId,
        liked: feedbackLike,
        disliked_reasons: feedbackReason.trim() ? [feedbackReason.trim()] : [],
        selected_product_id: productId,
      })
      setFeedbackSent(s => new Set(s).add(productId))
      setFeedbackLike(null)
      setFeedbackReason('')
      setFeedbackTargetId(null)
      setNotice('推薦結果への評価を保存しました。')
    } catch (error) {
      setErrorMessage(`評価の保存に失敗しました: ${formatError(error)}`)
    }
  }

  // ---- 商品登録 ----
  async function handleAddProduct() {
    if (!productName.trim() || !price || !category) return
    setErrorMessage('')
    setNotice('')
    setProductSubmitting(true)
    try {
      const response = await client.post<ProductRecord>('/products', {
        name: productName.trim(),
        price: Number(price),
        category,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        suitable_scenes: productScenes.split(',').map(value => value.trim()).filter(Boolean),
        suitable_recipients: productRecipients.split(',').map(value => value.trim()).filter(Boolean),
        description: `${productName.trim()}の教材用商品`,
        is_active: true,
      })
      await handleLoadProducts()
      setNotice(`商品「${response.data.name}」を登録しました。`)
    } catch (error) {
      setErrorMessage(`商品の登録に失敗しました: ${formatError(error)}`)
    } finally {
      setProductSubmitting(false)
    }
  }

  // ---- 商品一覧取得 ----
  async function handleLoadProducts() {
    setErrorMessage('')
    setProductListLoading(true)
    try {
      const res = await client.get<{ items: ProductRecord[] }>('/products')
      setProductList(res.data.items ?? [])
    } catch (error) {
      setErrorMessage(`商品一覧の取得に失敗しました: ${formatError(error)}`)
    } finally {
      setProductListLoading(false)
    }
  }

  // ---- 有効フラグ切替 ----
  async function handleToggleActive(productId: number, currentFlag: boolean) {
    setErrorMessage('')
    setNotice('')
    setUpdatingProductId(productId)
    try {
      const response = await client.put<ProductRecord>(`/products/${productId}`, { is_active: !currentFlag })
      setProductList(prev => prev.map(p => p.product_id === productId ? response.data : p))
      setNotice(`商品「${response.data.name}」を${response.data.is_active ? '有効' : '無効'}にしました。`)
    } catch (error) {
      setErrorMessage(`商品の状態変更に失敗しました: ${formatError(error)}`)
    } finally {
      setUpdatingProductId(null)
    }
  }

  // ---- シーン登録 ----
  async function handleAddScene() {
    if (!sceneName.trim()) return
    setErrorMessage('')
    setNotice('')
    setSceneSubmitting(true)
    try {
      const response = await client.post<SceneRecord>('/ontology/scenes', { name: sceneName.trim() })
      setLastScene(response.data)
      setNotice(`シーン「${response.data.name}」を登録しました。`)
    } catch (error) {
      setErrorMessage(`シーンの登録に失敗しました: ${formatError(error)}`)
    } finally {
      setSceneSubmitting(false)
    }
  }

  // ---- NGルール登録 ----
  async function handleAddNgRule() {
    if (!ngCondition.trim()) return
    setErrorMessage('')
    setNotice('')
    setNgSubmitting(true)
    try {
      const response = await client.post<NgRuleRecord>('/ontology/ng-rules', {
        scene_name: ngSceneName.trim() || null,
        recipient_name: ngRecipientName.trim() || null,
        ng_attribute: ngCondition.trim(),
        reason: ngReason.trim() || null,
        severity: ngSeverity,
      })
      setLastNgRule(response.data)
      setNotice(`除外規則「${response.data.ng_attribute}」を登録しました。`)
    } catch (error) {
      setErrorMessage(`除外規則の登録に失敗しました: ${formatError(error)}`)
    } finally {
      setNgSubmitting(false)
    }
  }

  // ---- 推薦統計取得 ----
  async function handleLoadAnalytics() {
    setErrorMessage('')
    setAnalyticsLoading(true)
    try {
      const res = await client.get<RecommendationAnalytics>('/analytics/recommendations')
      setAnalytics(res.data)
    } catch (error) {
      setErrorMessage(`推薦統計の取得に失敗しました: ${formatError(error)}`)
    } finally {
      setAnalyticsLoading(false)
    }
  }

  // ============================================================
  // 画面レンダリング
  // ============================================================
  return (
    <div style={{ maxWidth: 1000 }}>
      <h2 style={{ color: COLOR.text, marginBottom: 4 }}>System12</h2>
      <p style={{ color: COLOR.muted, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        ギフトEC コンシェルジュ＆推薦システム
      </p>

      {/* 画面タブナビゲーション（基本設計書 セクション10） */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', borderBottom: `2px solid ${COLOR.border}`, paddingBottom: 8 }}>
        {(['会話推薦画面', '商品管理画面', 'オントロジー・分析画面'] as Screen[]).map(s => (
          <button
            key={s}
            onClick={() => {
              setScreen(s)
              if (s === '商品管理画面') handleLoadProducts()
              if (s === 'オントロジー・分析画面') handleLoadAnalytics()
            }}
            style={{ ...btn(screen === s ? COLOR.primary : '#ccc'), fontSize: '0.85rem' }}
          >
            {s}
          </button>
        ))}
      </div>

      {notice && (
        <div role="status" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', border: `1px solid ${COLOR.ok}`, background: '#f4faef', borderRadius: 6 }}>
          {notice}
        </div>
      )}
      {errorMessage && (
        <div role="alert" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', border: `1px solid ${COLOR.danger}`, background: '#fff4f4', borderRadius: 6, color: '#9f2f36' }}>
          {errorMessage}
        </div>
      )}

      {/* ========== 会話推薦画面 ========== */}
      {screen === '会話推薦画面' && (
        <div>
          {/* 収集済み条件バッジ（基本設計書 14.1 collected_conditions） */}
          {Object.keys(collectedConditions).length > 0 && (
            <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(collectedConditions).map(([key, val]) => (
                <span key={key} style={{ background: '#e8f0fe', color: COLOR.primary, borderRadius: 4, padding: '3px 8px', fontSize: '0.82rem' }}>
                  {key}: {val}
                </span>
              ))}
            </div>
          )}

          {/* チャット履歴（基本設計書 14.1 chat_history / recommendations） */}
          <div style={{ ...card(), minHeight: 240, maxHeight: 520, overflowY: 'auto' }}>
            {chatHistory.length === 0 && (
              <div style={{ color: COLOR.muted, textAlign: 'center', padding: '2rem', fontSize: '0.9rem' }}>
                「誰へのギフトをお探しですか？」のように話しかけてみてください
              </div>
            )}
            {chatHistory.map((entry, i) => (
              <div key={i} style={{ marginBottom: '1.2rem' }}>
                {/* ユーザー発言 */}
                {entry.role === 'user' && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{
                      background: COLOR.userBubble,
                      borderRadius: '8px 8px 0 8px',
                      padding: '0.6rem 1rem',
                      maxWidth: '70%',
                      fontSize: '0.9rem',
                    }}>
                      {entry.text}
                    </div>
                  </div>
                )}

                {/* AI発言 */}
                {entry.role === 'ai' && (
                  <div>
                    <div style={{
                      background: COLOR.aiBubble,
                      borderRadius: '8px 8px 8px 0',
                      padding: '0.8rem 1rem',
                      display: 'inline-block',
                      maxWidth: '80%',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                      marginBottom: entry.recommendations && entry.recommendations.length > 0 ? '0.8rem' : 0,
                    }}>
                      {entry.text}
                    </div>

                    {/* 推薦カード一覧（基本設計書 14.1 recommendations） */}
                    {entry.recommendations && entry.recommendations.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.8rem' }}>
                        {entry.recommendations.map(rec => (
                          <div key={rec.product_id} style={{
                            border: `1px solid ${COLOR.border}`,
                            borderRadius: 8,
                            padding: '1rem',
                            background: '#fafcff',
                          }}>
                            <div style={{ fontWeight: 'bold', color: COLOR.text, marginBottom: 4 }}>
                              {rec.product_name}
                            </div>
                            <div style={{ fontSize: '0.88rem', color: COLOR.primary, marginBottom: 6 }}>
                              ¥{rec.price.toLocaleString()}
                              <span style={{ marginLeft: 8, background: '#e8f0fe', borderRadius: 4, padding: '1px 6px', fontSize: '0.78rem' }}>
                                {rec.category}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: COLOR.text, marginBottom: 4, lineHeight: 1.5 }}>
                              {rec.reason}
                            </div>
                            {rec.suitable_for && (
                              <div style={{ fontSize: '0.8rem', color: COLOR.ok }}>✓ {rec.suitable_for}</div>
                            )}
                            {rec.cautions && (
                              <div style={{ fontSize: '0.8rem', color: COLOR.warn }}>⚠ {rec.cautions}</div>
                            )}
                            {rec.wrapping && (
                              <div style={{ fontSize: '0.8rem', color: COLOR.muted }}>🎁 {rec.wrapping}</div>
                            )}
                            <div style={{ fontSize: '0.78rem', color: COLOR.muted, marginTop: 4 }}>
                              スコア: {rec.score.toFixed(2)}
                            </div>

                            {/* フィードバック（feedback_like / feedback_reason） */}
                            {!feedbackSent.has(rec.product_id) ? (
                              <div style={{ borderTop: `1px solid ${COLOR.border}`, paddingTop: 8, marginTop: 8 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: feedbackTargetId === rec.product_id ? 6 : 0 }}>
                                  <button
                                    onClick={() => { setFeedbackTargetId(rec.product_id); setFeedbackLike(true) }}
                                    style={{ ...btn(feedbackLike === true && feedbackTargetId === rec.product_id ? COLOR.ok : '#ccc'), fontSize: '0.78rem', padding: '2px 10px' }}
                                  >
                                    👍 良い
                                  </button>
                                  <button
                                    onClick={() => { setFeedbackTargetId(rec.product_id); setFeedbackLike(false) }}
                                    style={{ ...btn(feedbackLike === false && feedbackTargetId === rec.product_id ? COLOR.danger : '#ccc'), fontSize: '0.78rem', padding: '2px 10px' }}
                                  >
                                    👎 合わない
                                  </button>
                                  {feedbackTargetId === rec.product_id && feedbackLike !== null && (
                                    <button
                                      onClick={() => handleFeedback(rec.product_id)}
                                      style={{ ...btn(COLOR.primary), fontSize: '0.78rem', padding: '2px 10px' }}
                                    >
                                      評価を送信
                                    </button>
                                  )}
                                </div>
                                {feedbackTargetId === rec.product_id && feedbackLike === false && (
                                  <input
                                    type="text"
                                    style={{ ...field(), fontSize: '0.8rem', marginTop: 4 }}
                                    value={feedbackReason}
                                    onChange={e => setFeedbackReason(e.target.value)}
                                    placeholder="合わない理由（任意）"
                                  />
                                )}
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.78rem', color: COLOR.ok, marginTop: 8 }}>✓ フィードバック送信済み</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {lastRecommendations.length > 0 && (
            <div style={{ marginBottom: '0.6rem', fontSize: '0.82rem', color: COLOR.muted }}>
              直近の推薦: {lastRecommendations.length}件
            </div>
          )}

          {/* 会話入力（基本設計書 14.1 message / submit via Enter） */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <span style={lbl()}>メッセージ</span>
              <textarea
                style={{ ...field(), resize: 'vertical', minHeight: 60 }}
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChat() } }}
                placeholder="ギフトの相手・シーン・予算などを自由に入力してください（Enterで送信）"
              />
            </div>
            <button
              onClick={handleChat}
              disabled={!message.trim() || sending}
              style={{ ...btn(COLOR.primary, !message.trim() || sending), whiteSpace: 'nowrap' }}
            >
              {sending ? '生成中...' : '送信'}
            </button>
          </div>
        </div>
      )}

      {/* ========== 商品管理画面 ========== */}
      {screen === '商品管理画面' && (
        <div>
          {/* 商品登録フォーム（基本設計書 14.2） */}
          <div style={card()}>
            <h3 style={{ margin: '0 0 1rem', color: COLOR.text }}>商品管理画面</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <span style={lbl()}>商品名</span>
                <input type="text" style={field()} value={productName} onChange={e => setProductName(e.target.value)} placeholder="例：〇〇ブランド チョコレート詰め合わせ" />
              </div>
              <div>
                <span style={lbl()}>価格（円）</span>
                <input type="number" style={field()} value={price} onChange={e => setPrice(e.target.value)} min={1} placeholder="3000" />
              </div>
              <div>
                <span style={lbl()}>カテゴリ</span>
                <select style={field()} value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="">（選択）</option>
                  {PRODUCT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <span style={lbl()}>商品タグ（カンマ区切り）</span>
                <input type="text" style={field()} value={tags} onChange={e => setTags(e.target.value)} placeholder="高級,贈答用,アレルギー対応" />
              </div>
              <div>
                <span style={lbl()}>適したシーン（カンマ区切り）</span>
                <input type="text" style={field()} value={productScenes} onChange={e => setProductScenes(e.target.value)} placeholder="誕生日, 母の日" />
              </div>
              <div>
                <span style={lbl()}>適した相手（カンマ区切り）</span>
                <input type="text" style={field()} value={productRecipients} onChange={e => setProductRecipients(e.target.value)} placeholder="母, 友人" />
              </div>
            </div>
            <button
              onClick={handleAddProduct}
              disabled={!productName.trim() || !price || !category || productSubmitting}
              style={btn(COLOR.primary, !productName.trim() || !price || !category || productSubmitting)}
            >
              {productSubmitting ? '登録中...' : '商品登録'}
            </button>
          </div>

          {/* 商品一覧（基本設計書 14.2 products_grid / is_active） */}
          <div style={card()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, color: COLOR.text }}>商品一覧</h4>
              <button onClick={handleLoadProducts} disabled={productListLoading} style={{ ...btn('#6c6f85', productListLoading), fontSize: '0.85rem' }}>
                {productListLoading ? '読込中...' : '更新'}
              </button>
            </div>
            {productList.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    {['ID', '商品名', '価格', 'カテゴリ', 'タグ', '有効', ''].map(h => (
                      <th key={h} style={{ padding: '5px 8px', textAlign: 'left', border: `1px solid ${COLOR.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {productList.map(p => (
                    <tr key={p.product_id} style={{ opacity: p.is_active ? 1 : 0.5 }}>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{p.product_id}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, fontWeight: 'bold' }}>{p.name}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>¥{p.price.toLocaleString()}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{p.category}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, color: COLOR.muted, fontSize: '0.78rem' }}>
                        {p.tags?.join(', ') || '—'}
                      </td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, textAlign: 'center' }}>
                        <span style={{ background: p.is_active ? COLOR.ok : '#aaa', color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '0.75rem' }}>
                          {p.is_active ? '有効' : '無効'}
                        </span>
                      </td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                        <button
                          onClick={() => handleToggleActive(p.product_id, p.is_active)}
                          disabled={updatingProductId === p.product_id}
                          style={{ ...btn(p.is_active ? COLOR.warn : COLOR.ok, updatingProductId === p.product_id), fontSize: '0.75rem', padding: '2px 10px' }}
                        >
                          {p.is_active ? '無効化' : '有効化'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              !productListLoading && (
                <div style={{ color: COLOR.muted, fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>
                  登録済み商品がありません
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* ========== オントロジー・分析画面 ========== */}
      {screen === 'オントロジー・分析画面' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* シーン登録（基本設計書 14.3 scene_name） */}
            <div style={card()}>
              <h4 style={{ margin: '0 0 1rem', color: COLOR.text }}>シーン登録</h4>
              <div style={{ marginBottom: '0.8rem' }}>
                <span style={lbl()}>シーン名</span>
                <input
                  type="text"
                  style={field()}
                  value={sceneName}
                  onChange={e => setSceneName(e.target.value)}
                  placeholder="例：母の日、誕生日、結婚祝い"
                />
              </div>
              <button
                onClick={handleAddScene}
                disabled={!sceneName.trim() || sceneSubmitting}
                style={btn(COLOR.primary, !sceneName.trim() || sceneSubmitting)}
              >
                {sceneSubmitting ? '登録中...' : 'シーン登録'}
              </button>
              {lastScene && (
                <div style={{ marginTop: '0.8rem', fontSize: '0.82rem', color: COLOR.muted }}>
                  登録済み: ID {lastScene.scene_id} / {lastScene.name}
                </div>
              )}
            </div>

            {/* NGルール登録（基本設計書 14.3 ng_rule_editor） */}
            <div style={card()}>
              <h4 style={{ margin: '0 0 1rem', color: COLOR.text }}>NGルール登録</h4>
              <div style={{ marginBottom: '0.8rem' }}>
                <span style={lbl()}>候補から外す語句</span>
                <input
                  type="text"
                  style={field()}
                  value={ngCondition}
                  onChange={e => setNgCondition(e.target.value)}
                  placeholder="例：酒、ナッツ"
                />
              </div>
              <div style={{ marginBottom: '0.8rem' }}>
                <span style={lbl()}>適用するシーン（任意）</span>
                <input
                  type="text"
                  style={field()}
                  value={ngSceneName}
                  onChange={e => setNgSceneName(e.target.value)}
                  placeholder="例：誕生日"
                />
              </div>
              <div style={{ marginBottom: '0.8rem' }}>
                <span style={lbl()}>適用する相手（任意）</span>
                <input
                  type="text"
                  style={field()}
                  value={ngRecipientName}
                  onChange={e => setNgRecipientName(e.target.value)}
                  placeholder="例：母"
                />
              </div>
              <div style={{ marginBottom: '0.8rem' }}>
                <span style={lbl()}>理由</span>
                <input
                  type="text"
                  style={field()}
                  value={ngReason}
                  onChange={e => setNgReason(e.target.value)}
                  placeholder="例：健康上の理由で除外"
                />
              </div>
              <div style={{ marginBottom: '0.8rem' }}>
                <span style={lbl()}>判定</span>
                <select style={field()} value={ngSeverity} onChange={e => setNgSeverity(e.target.value as 'warn' | 'block')}>
                  <option value="block">候補から外す</option>
                  <option value="warn">注意として残す</option>
                </select>
              </div>
              <button
                onClick={handleAddNgRule}
                disabled={!ngCondition.trim() || ngSubmitting}
                style={btn(COLOR.danger, !ngCondition.trim() || ngSubmitting)}
              >
                {ngSubmitting ? '登録中...' : 'NGルール登録'}
              </button>
              {lastNgRule && (
                <div style={{ marginTop: '0.8rem', fontSize: '0.82rem', color: COLOR.muted, lineHeight: 1.5 }}>
                  登録済み: ID {lastNgRule.rule_id} / {lastNgRule.ng_attribute} / {lastNgRule.severity === 'block' ? '候補から外す' : '注意'}
                  <br />対象: {lastNgRule.scene_name || '全シーン'} / {lastNgRule.recipient_name || '全対象者'}
                </div>
              )}
            </div>
          </div>

          {/* 推薦統計（基本設計書 14.3 recommendation_analytics） */}
          <div style={card()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, color: COLOR.text }}>推薦統計</h4>
              <button onClick={handleLoadAnalytics} disabled={analyticsLoading} style={{ ...btn('#6c6f85', analyticsLoading), fontSize: '0.85rem' }}>
                {analyticsLoading ? '読込中...' : '更新'}
              </button>
            </div>

            {analytics && (
              <div>
                {/* 集計カード */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.8rem', marginBottom: '1.5rem' }}>
                  {[
                    ['総セッション数', analytics.total_sessions, COLOR.text],
                    ['総推薦件数', analytics.total_recommendations, COLOR.primary],
                    ['集計対象商品', analytics.items.length, COLOR.ok],
                  ].map(([label, value, color]) => (
                    <div key={label as string} style={{ textAlign: 'center', padding: '0.8rem', background: '#f8f8f2', borderRadius: 6 }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: color as string }}>{value as string | number}</div>
                      <div style={{ fontSize: '0.82rem', color: COLOR.muted, marginTop: 4 }}>{label as string}</div>
                    </div>
                  ))}
                </div>

                <div style={lbl()}>商品別の推薦・評価件数</div>
                {analytics.items.map(item => (
                  <div key={item.product_id} style={{ padding: '6px 0', borderBottom: `1px solid ${COLOR.border}`, fontSize: '0.85rem' }}>
                    <div style={{ fontWeight: 'bold', color: COLOR.text }}>{item.product_name}</div>
                    <div style={{ display: 'flex', gap: '1rem', color: COLOR.muted, marginTop: 3 }}>
                      <span>推薦 {item.recommendation_count}件</span>
                      <span style={{ color: COLOR.ok }}>好評価 {item.positive_feedback_count}件</span>
                      <span style={{ color: COLOR.danger }}>低評価 {item.negative_feedback_count}件</span>
                    </div>
                  </div>
                ))}
                {analytics.items.length === 0 && <div style={{ color: COLOR.muted, fontSize: '0.85rem' }}>集計対象の推薦履歴はありません。</div>}
                <div style={{ color: COLOR.muted, fontSize: '0.78rem', marginTop: '0.8rem' }}>
                  集計日時: {new Date(analytics.generated_at).toLocaleString('ja-JP')}
                </div>
              </div>
            )}

            {!analytics && !analyticsLoading && (
              <div style={{ color: COLOR.muted, fontSize: '0.9rem' }}>「更新」ボタンで統計を取得します</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
