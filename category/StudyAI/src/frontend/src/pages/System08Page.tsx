import { useState } from 'react'
import { createSystemClient } from '../api/client'

const client = createSystemClient('system08')

// ---- 型定義（基本設計書 IF仕様より） ----

type Priority = 'high' | 'medium' | 'low'
type Quadrant = '第1象限' | '第2象限' | '第3象限' | '第4象限'
type TaskStatus = 'todo' | 'doing' | 'done'

interface TaskReference {
  title: string
  url: string
}

interface TaskRecord {
  task_id: number
  task_no: number
  name: string
  description: string
  category: string | null
  priority: Priority
  quadrant: Quadrant
  urgency: Priority | null
  importance: Priority | null
  dependencies: number[]
  estimated_hours: number | null
  assignee_skill: string | null
  cautions: string | null
  references: TaskReference[]
  confidence: Priority | null
  status: TaskStatus
  note: string | null
}

interface PrioritySummary {
  quadrant_1: number[]
  quadrant_2: number[]
  quadrant_3: number[]
  quadrant_4: number[]
  recommended_order: number[]
  first_week_tasks: number[]
}

interface AnalysisResult {
  analysis_id: number
  theme: string
  status: string
  search_count: number
  search_queries: string[]
  tasks: TaskRecord[]
  priority_summary: PrioritySummary
  markdown: string
  total_tasks: number
  total_estimated_hours: number
  created_at: string
}

interface AnalysisSummary {
  analysis_id: number
  theme: string
  status: string
  search_count: number
  total_tasks: number
  created_at: string
}

// ---- 画面種別（基本設計書 セクション10） ----
type Screen = '分析実行画面' | 'タスク結果画面' | '分析履歴画面'

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
    high: [COLOR.danger, '高'],
    medium: [COLOR.warn, '中'],
    low: [COLOR.ok, '低'],
  }
  const [color, label] = map[value] ?? ['#aaa', value]
  return (
    <span style={{ background: color, color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: '0.75rem' }}>
      {label}
    </span>
  )
}

// ---- 象限バッジ ----
function QuadrantBadge({ value }: { value: Quadrant }) {
  const map: Record<Quadrant, [string, string]> = {
    第1象限: [COLOR.danger,  '第1象限'],
    第2象限: [COLOR.primary, '第2象限'],
    第3象限: [COLOR.warn,    '第3象限'],
    第4象限: [COLOR.muted,   '第4象限'],
  }
  const [color, label] = map[value] ?? ['#aaa', value]
  return (
    <span style={{ background: color, color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: '0.75rem' }}>
      {label}
    </span>
  )
}

// ---- ステータスバッジ ----
function StatusBadge({ value }: { value: TaskStatus }) {
  const map: Record<TaskStatus, [string, string]> = {
    todo:  [COLOR.muted,   '未着手'],
    doing: [COLOR.primary, '進行中'],
    done:  [COLOR.ok,      '完了'],
  }
  const [color, label] = map[value] ?? ['#aaa', value]
  return (
    <span style={{ background: color, color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: '0.75rem' }}>
      {label}
    </span>
  )
}

// ============================================================
// メインコンポーネント
// ============================================================
export default function System08Page() {
  const [screen, setScreen] = useState<Screen>('分析実行画面')

  // ---- 分析実行画面（基本設計書 14.1） ----
  const [theme, setTheme] = useState('')
  const [background, setBackground] = useState('')
  const [currentStatus, setCurrentStatus] = useState('')
  const [constraints, setConstraints] = useState('')
  const [role, setRole] = useState('')
  const [depth, setDepth] = useState('詳細レベル')
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // ---- タスク結果画面（基本設計書 14.2） ----
  const [viewingResult, setViewingResult] = useState<AnalysisResult | null>(null)
  const [updatingTaskId, setUpdatingTaskId] = useState<number | null>(null)
  const [taskStatusOverride, setTaskStatusOverride] = useState<Record<number, TaskStatus>>({})
  const [exporting, setExporting] = useState(false)

  // ---- 分析履歴画面（基本設計書 14.3） ----
  const [analysisList, setAnalysisList] = useState<AnalysisSummary[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  function prepareSample() {
    setTheme('Dockerを初めて本番運用するときに必要な作業')
    setBackground('社内初のコンテナ化プロジェクトで、インフラ担当は1名です。')
    setCurrentStatus('開発環境では動作確認済みですが、本番運用の準備は未着手です。')
    setConstraints('追加予算なし。1週間以内に本番リリースする必要があります。')
    setRole('プロジェクトリーダー')
    setDepth('概要レベル')
    setError('')
    setNotice('教材用の入力例を設定しました。')
  }

  // ---- 分析実行 ----
  async function handleAnalyze() {
    if (!theme.trim()) return
    setAnalyzing(true)
    setError('')
    setNotice('')
    try {
      const body: Record<string, unknown> = { theme: theme.trim(), depth, output_format: 'json' }
      if (background.trim()) body.background = background.trim()
      if (currentStatus.trim()) body.current_status = currentStatus.trim()
      if (constraints.trim()) body.constraints = constraints.trim()
      if (role.trim()) body.role = role.trim()
      const res = await client.post<AnalysisResult>('/analyze', body)
      setTaskStatusOverride({})
      setViewingResult(res.data)
      setScreen('タスク結果画面')
      setNotice(`分析ID ${res.data.analysis_id} を保存しました。`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '分析を実行できませんでした。')
    } finally {
      setAnalyzing(false)
    }
  }

  // ---- タスク状態更新 ----
  async function handleUpdateTaskStatus(analysisId: number, taskId: number, taskNo: number, status: TaskStatus) {
    setUpdatingTaskId(taskId)
    setError('')
    setNotice('')
    try {
      await client.patch(`/analyses/${analysisId}/tasks/${taskId}`, { status })
      setTaskStatusOverride(prev => ({ ...prev, [taskId]: status }))
      setNotice(`タスク #${taskNo} の状態を更新しました。`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'タスクの状態を更新できませんでした。')
    } finally {
      setUpdatingTaskId(null)
    }
  }

  // ---- エクスポート ----
  async function handleExport(analysisId: number, format: 'markdown' | 'csv') {
    setExporting(true)
    setError('')
    setNotice('')
    try {
      const res = await client.get<{ analysis_id: number; format: string; content: string }>(`/analyses/${analysisId}/export`, {
        params: { format },
      })
      const ext = format === 'markdown' ? 'md' : 'csv'
      const mime = format === 'markdown' ? 'text/markdown;charset=utf-8' : 'text/csv;charset=utf-8'
      const url = URL.createObjectURL(new Blob([res.data.content], { type: mime }))
      const a = document.createElement('a')
      a.href = url
      a.download = `analysis_${analysisId}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
      setNotice(`${format === 'markdown' ? 'Markdown' : 'CSV'}ファイルを出力しました。`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '分析結果を出力できませんでした。')
    } finally {
      setExporting(false)
    }
  }

  // ---- 分析履歴取得 ----
  async function handleLoadHistory() {
    setListLoading(true)
    setError('')
    try {
      const res = await client.get<{ items: AnalysisSummary[] }>('/analyses')
      setAnalysisList(res.data.items ?? [])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '分析履歴を読み込めませんでした。')
    } finally {
      setListLoading(false)
    }
  }

  // ---- 履歴から詳細取得 ----
  async function handleOpenAnalysis(analysisId: number) {
    setDetailLoading(true)
    setError('')
    setNotice('')
    try {
      const res = await client.get<AnalysisResult>(`/analyses/${analysisId}`)
      setViewingResult(res.data)
      setTaskStatusOverride({})
      setScreen('タスク結果画面')
      setNotice(`分析ID ${analysisId} を履歴から開きました。`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '分析結果を読み込めませんでした。')
    } finally {
      setDetailLoading(false)
    }
  }

  // ---- タスク結果パネル共通レンダリング ----
  function renderTaskResult(result: AnalysisResult) {
    const quadrantOrder: Quadrant[] = ['第1象限', '第2象限', '第3象限', '第4象限']
    const byQuadrant = quadrantOrder.map(q => ({
      q,
      tasks: result.tasks.filter(t => t.quadrant === q).sort((left, right) => left.task_no - right.task_no),
    })).filter(g => g.tasks.length > 0)

    const quadrantLabel: Record<Quadrant, string> = {
      第1象限: '今すぐ取り組む（緊急・重要）',
      第2象限: '計画して取り組む（重要）',
      第3象限: '委任を検討する（緊急）',
      第4象限: '後回し・対象外を検討する',
    }

    return (
      <div>
        {/* 分析要約 */}
        <div style={{ background: '#f0f4ff', borderRadius: 8, padding: '1rem', marginBottom: '1rem', fontSize: '0.9rem', lineHeight: 1.7 }}>
          <div style={{ fontWeight: 'bold', color: COLOR.primary, marginBottom: 6 }}>分析結果の概要</div>
          <div>タスク数: {result.total_tasks}件／見積時間: {result.total_estimated_hours}時間／検索回数: {result.search_count}回</div>
          <div>推奨順: {result.priority_summary.recommended_order.map(id => `#${id}`).join(' → ') || 'なし'}</div>
          <div>最初の1週間: {result.priority_summary.first_week_tasks.map(id => `#${id}`).join(', ') || 'なし'}</div>
          {result.search_queries.length > 0 && (
            <div style={{ marginTop: 6, color: COLOR.muted }}>検索語: {result.search_queries.join(' / ')}</div>
          )}
        </div>

        {/* エクスポートボタン（export_markdown / export_csv） */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', justifyContent: 'flex-end' }}>
          <button
            onClick={() => handleExport(result.analysis_id, 'markdown')}
            disabled={exporting}
            style={{ ...btn('#6c6f85', exporting), fontSize: '0.82rem', padding: '4px 12px' }}
          >
            Markdown出力
          </button>
          <button
            onClick={() => handleExport(result.analysis_id, 'csv')}
            disabled={exporting}
            style={{ ...btn('#6c6f85', exporting), fontSize: '0.82rem', padding: '4px 12px' }}
          >
            CSV出力
          </button>
        </div>

        {/* タスク一覧（tasks_grid）— 象限ごとにグループ化 */}
        {byQuadrant.map(({ q, tasks }) => (
          <div key={q} style={{ marginBottom: '1.2rem' }}>
            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: COLOR.text, marginBottom: 8 }}>
              <QuadrantBadge value={q} /> <span style={{ marginLeft: 6 }}>{quadrantLabel[q]}</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  {['タスク', '分類・担当', '優先度', '見積', '依存', '根拠・注意点', '状態', '保存'].map(h => (
                    <th key={h} style={{ padding: '4px 8px', textAlign: 'left', border: `1px solid ${COLOR.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.map(task => {
                  const currentStatus = taskStatusOverride[task.task_id] ?? task.status
                  return (
                    <tr key={task.task_id} style={{ opacity: currentStatus === 'done' ? 0.65 : 1 }}>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, fontWeight: 'bold', maxWidth: 200 }}>
                        <div>#{task.task_no} {task.name}</div>
                        <div style={{ marginTop: 4, fontWeight: 'normal', color: COLOR.muted }}>{task.description}</div>
                        {task.confidence === 'low' && (
                          <span style={{ marginLeft: 4, fontSize: '0.72rem', color: COLOR.warn }}>（推測）</span>
                        )}
                      </td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                        <div>{task.category ?? '未分類'}</div>
                        <div style={{ color: COLOR.muted }}>{task.assignee_skill ?? '担当未定'}</div>
                      </td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                        <PriorityBadge value={task.priority} />
                        <div style={{ color: COLOR.muted, marginTop: 4 }}>緊急度 {task.urgency ?? '—'}／重要度 {task.importance ?? '—'}</div>
                      </td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{task.estimated_hours == null ? '—' : `${task.estimated_hours}時間`}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, color: COLOR.muted, fontSize: '0.78rem' }}>
                        {task.dependencies.length > 0
                          ? task.dependencies.map(d => `#${d}`).join(', ')
                          : '—'}
                      </td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, color: COLOR.muted, fontSize: '0.78rem', maxWidth: 200 }}>
                        {task.references.length > 0 ? task.references.map(reference => (
                          <div key={`${reference.title}-${reference.url}`}>
                            {reference.url.startsWith('https://local/')
                              ? <span>{reference.title}</span>
                              : <a href={reference.url} target="_blank" rel="noreferrer">{reference.title}</a>}
                          </div>
                        )) : '—'}
                        {task.cautions && <div style={{ marginTop: 4, color: COLOR.danger }}>注意: {task.cautions}</div>}
                      </td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                        <StatusBadge value={currentStatus} />
                        <select
                          style={{ ...field(), width: 90, fontSize: '0.78rem', padding: '2px 4px' }}
                          value={currentStatus}
                          onChange={e => setTaskStatusOverride(prev => ({ ...prev, [task.task_id]: e.target.value as TaskStatus }))}
                        >
                          <option value="todo">未着手</option>
                          <option value="doing">進行中</option>
                          <option value="done">完了</option>
                        </select>
                      </td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                        <button
                          onClick={() => handleUpdateTaskStatus(result.analysis_id, task.task_id, task.task_no, taskStatusOverride[task.task_id] ?? task.status)}
                          disabled={updatingTaskId === task.task_id}
                          style={{ ...btn(COLOR.primary, updatingTaskId === task.task_id), fontSize: '0.75rem', padding: '2px 8px' }}
                        >
                          更新
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    )
  }

  // ============================================================
  // 画面レンダリング
  // ============================================================
  return (
    <div style={{ maxWidth: 1040 }}>
      <h2 style={{ color: COLOR.text, marginBottom: 4 }}>System08</h2>
      <p style={{ color: COLOR.muted, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        未経験の作業から、必要なタスクと取り組む順番を整理します。
      </p>

      {error && (
        <div role="alert" style={{ ...card(), borderColor: COLOR.danger, color: COLOR.danger, padding: '0.8rem 1rem' }}>{error}</div>
      )}
      {notice && (
        <div role="status" style={{ ...card(), borderColor: COLOR.ok, color: '#355f28', padding: '0.8rem 1rem' }}>{notice}</div>
      )}

      {/* 画面タブナビゲーション（基本設計書 セクション10） */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', borderBottom: `2px solid ${COLOR.border}`, paddingBottom: 8 }}>
        {(['分析実行画面', 'タスク結果画面', '分析履歴画面'] as Screen[]).map(s => (
          <button
            key={s}
            onClick={() => {
              setScreen(s)
              if (s === '分析履歴画面') handleLoadHistory()
            }}
            style={{ ...btn(screen === s ? COLOR.primary : '#ccc'), fontSize: '0.85rem' }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ========== 分析実行画面 ========== */}
      {screen === '分析実行画面' && (
        <div>
          <div style={card()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: COLOR.text }}>分析実行画面</h3>
              <button type="button" onClick={prepareSample} style={btn('#6c6f85')}>教材用の入力例を使う</button>
            </div>

            {/* 基本設計書 14.1 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={lbl()}>テーマ ＊</span>
                <input
                  type="text"
                  style={field()}
                  value={theme}
                  onChange={e => setTheme(e.target.value)}
                  placeholder="例：Dockerを初めて運用するときに必要な作業"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={lbl()}>現在の状況（任意）</span>
                <textarea
                  style={{ ...field(), minHeight: 70, resize: 'vertical' }}
                  value={currentStatus}
                  onChange={e => setCurrentStatus(e.target.value)}
                  placeholder="例：開発環境では動作確認済みだが、本番運用の準備は未着手"
                />
              </div>
              <div>
                <span style={lbl()}>背景（任意）</span>
                <textarea
                  style={{ ...field(), minHeight: 60, resize: 'vertical' }}
                  value={background}
                  onChange={e => setBackground(e.target.value)}
                  placeholder="例：社内初のコンテナ化プロジェクト、インフラ担当が1名"
                />
              </div>
              <div>
                <span style={lbl()}>制約条件（任意）</span>
                <textarea
                  style={{ ...field(), minHeight: 60, resize: 'vertical' }}
                  value={constraints}
                  onChange={e => setConstraints(e.target.value)}
                  placeholder="例：予算なし、1週間以内に完了必要"
                />
              </div>
              <div>
                <span style={lbl()}>担当する役割（任意）</span>
                <input
                  type="text"
                  style={field()}
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder="例：プロジェクトリーダー"
                />
              </div>
              <div>
                <span style={lbl()}>分析の詳しさ</span>
                <select style={field()} value={depth} onChange={e => setDepth(e.target.value)}>
                  <option value="概要レベル">概要レベル</option>
                  <option value="標準レベル">標準レベル</option>
                  <option value="詳細レベル">詳細レベル</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!theme.trim() || analyzing}
              style={btn(COLOR.primary, !theme.trim() || analyzing)}
            >
              {analyzing ? 'タスクを整理しています...' : '分析開始'}
            </button>
          </div>
        </div>
      )}

      {/* ========== タスク結果画面 ========== */}
      {screen === 'タスク結果画面' && (
        <div>
          {viewingResult ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
                <h3 style={{ margin: 0, color: COLOR.text }}>タスク結果画面</h3>
                <span style={{ fontSize: '0.85rem', color: COLOR.muted }}>— {viewingResult.theme}</span>
              </div>
              {renderTaskResult(viewingResult)}
            </div>
          ) : (
            <div style={{ ...card(), textAlign: 'center', color: COLOR.muted, padding: '3rem' }}>
              <div style={{ fontSize: '1.1rem', marginBottom: 8 }}>分析結果がありません</div>
              <div style={{ fontSize: '0.9rem' }}>「分析実行画面」から分析を開始するか、「分析履歴画面」から過去の分析を選択してください</div>
            </div>
          )}
        </div>
      )}

      {/* ========== 分析履歴画面 ========== */}
      {screen === '分析履歴画面' && (
        <div>
          <div style={card()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: COLOR.text }}>分析履歴画面</h3>
              <button onClick={handleLoadHistory} disabled={listLoading} style={{ ...btn('#6c6f85', listLoading), fontSize: '0.85rem' }}>
                {listLoading ? '読込中...' : '更新'}
              </button>
            </div>

            {/* 分析履歴（基本設計書 14.3 analysis_grid / open_analysis） */}
            {analysisList.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    {['ID', 'テーマ', '状態', '検索回数', 'タスク数', '実行日', ''].map(h => (
                      <th key={h} style={{ padding: '5px 8px', textAlign: 'left', border: `1px solid ${COLOR.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysisList.map(a => (
                    <tr key={a.analysis_id}>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{a.analysis_id}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, maxWidth: 280 }}>{a.theme}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                        <span style={{
                          background: a.status === 'completed' ? COLOR.ok : a.status === 'failed' ? COLOR.danger : COLOR.warn,
                          color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '0.78rem',
                        }}>
                          {a.status === 'completed' ? '完了' : a.status === 'failed' ? '失敗' : '処理中'}
                        </span>
                      </td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{a.search_count}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{a.total_tasks}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{a.created_at?.slice(0, 10) ?? '—'}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                        <button
                          onClick={() => handleOpenAnalysis(a.analysis_id)}
                          disabled={detailLoading}
                          style={{ ...btn(COLOR.primary, detailLoading), fontSize: '0.78rem', padding: '2px 10px' }}
                        >
                          詳細表示
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              !listLoading && (
                <div style={{ color: COLOR.muted, fontSize: '0.9rem', textAlign: 'center', padding: '1.5rem' }}>
                  分析履歴がありません
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}
