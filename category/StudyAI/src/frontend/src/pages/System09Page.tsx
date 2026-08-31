import { useState } from 'react'
import { createSystemClient } from '../api/client'

const client = createSystemClient('system09')

// ---- 型定義（基本設計書 IF仕様より） ----

// 要件定義書 調査タイプより
type ResearchType = '競合調査' | '市場調査' | '業界調査' | '企業調査'

interface CompanyInfo {
  name: string
  overview: string | null
  products: string[]
  strengths: string[]
  weaknesses: string[]
  recent_news: string[]
  sources: string[]
}

interface SwotData {
  strengths: string[]
  weaknesses: string[]
  opportunities: string[]
  threats: string[]
}

interface ComparisonTable {
  headers: string[]
  rows: string[][]
}

interface ReportDetail {
  report_id: number
  research_type: ResearchType
  targets: string[]
  executed_at: string
  search_count: number
  executive_summary: string
  key_findings: string[]
  companies: CompanyInfo[]
  comparison_table: ComparisonTable | null
  swot: SwotData | null
  trends: string | null
  limitations: string | null
  markdown: string | null
  purpose?: string | null
  own_company?: { name: string; strengths?: string | null } | null
  depth?: string
  focus_areas?: string[]
}

interface ReportSummary {
  report_id: number
  research_type: ResearchType
  theme: string
  targets: string[]
  created_at: string
}

// ---- 画面種別（基本設計書 セクション10） ----
type Screen = '調査実行画面' | 'レポート閲覧画面'

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

// ============================================================
// メインコンポーネント
// ============================================================
export default function System09Page() {
  const [screen, setScreen] = useState<Screen>('調査実行画面')

  // ---- 調査実行画面（基本設計書 14.1） ----
  const [researchType, setResearchType] = useState<ResearchType>('競合調査')
  const [theme, setTheme] = useState('')
  const [targetCompanies, setTargetCompanies] = useState('')
  const [focusPoints, setFocusPoints] = useState('')
  const [ownCompanyName, setOwnCompanyName] = useState('')
  const [ownCompanyStrengths, setOwnCompanyStrengths] = useState('')
  const [depth, setDepth] = useState('標準')
  const [researching, setResearching] = useState(false)
  const [latestResult, setLatestResult] = useState<ReportDetail | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // ---- レポート閲覧画面（基本設計書 14.2） ----
  const [reportList, setReportList] = useState<ReportSummary[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [filterType, setFilterType] = useState('')
  const [filterTarget, setFilterTarget] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  function prepareSample() {
    setResearchType('競合調査')
    setTheme('AI開発支援サービスの導入候補を比較する')
    setTargetCompanies('OpenAI\nAnthropic')
    setFocusPoints('主な開発支援機能\n企業向けの安全機能\n料金と利用条件')
    setOwnCompanyName('自社開発部門')
    setOwnCompanyStrengths('既存システムの知識と内製開発体制')
    setDepth('概要')
    setError('')
    setNotice('教材用の入力例を設定しました。')
  }

  // ---- 調査実行 ----
  async function handleResearch() {
    const companies = targetCompanies.split('\n').map(c => c.trim()).filter(Boolean)
    if (!theme.trim() || companies.length === 0) return
    setResearching(true)
    setLatestResult(null)
    setError('')
    setNotice('')
    try {
      const body: Record<string, unknown> = {
        research_type: researchType,
        targets: companies,
        purpose: theme,
        depth,
      }
      if (focusPoints.trim()) body.focus_areas = focusPoints.split('\n').map(f => f.trim()).filter(Boolean)
      if (ownCompanyName.trim()) {
        body.own_company = {
          name: ownCompanyName.trim(),
          strengths: ownCompanyStrengths.trim() || undefined,
        }
      }
      const res = await client.post<ReportDetail>('/research', body)
      setLatestResult(res.data)
      setNotice(`レポートID ${res.data.report_id} を保存しました。`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '調査を実行できませんでした。')
    } finally {
      setResearching(false)
    }
  }

  // ---- レポート一覧取得 ----
  async function handleLoadReports() {
    setListLoading(true)
    setSelectedReport(null)
    setError('')
    try {
      const params: Record<string, string> = {}
      if (filterType) params.research_type = filterType
      if (filterTarget.trim()) params.target = filterTarget.trim()
      if (filterFrom) params.from_date = filterFrom
      if (filterTo) params.to_date = filterTo
      const res = await client.get<{ items: ReportSummary[] }>('/reports', { params })
      setReportList(res.data.items ?? [])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'レポート一覧を読み込めませんでした。')
    } finally {
      setListLoading(false)
    }
  }

  async function handleClearFilters() {
    setFilterType('')
    setFilterTarget('')
    setFilterFrom('')
    setFilterTo('')
    setListLoading(true)
    setSelectedReport(null)
    setError('')
    try {
      const res = await client.get<{ items: ReportSummary[] }>('/reports')
      setReportList(res.data.items ?? [])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'レポート一覧を読み込めませんでした。')
    } finally {
      setListLoading(false)
    }
  }

  // ---- レポート詳細取得 ----
  async function handleSelectReport(reportId: number) {
    setDetailLoading(true)
    setSelectedReport(null)
    setError('')
    setNotice('')
    try {
      const res = await client.get<ReportDetail>(`/reports/${reportId}`)
      setSelectedReport(res.data)
      setNotice(`レポートID ${reportId} を開きました。`)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'レポート詳細を読み込めませんでした。')
    } finally {
      setDetailLoading(false)
    }
  }

  // ---- Markdown エクスポート ----
  async function handleExport(reportId: number) {
    setExporting(true)
    setError('')
    setNotice('')
    try {
      const res = await client.get<{ report_id: number; format: string; content: string }>(`/reports/${reportId}/export`, {
        params: { format: 'markdown' },
      })
      const url = URL.createObjectURL(new Blob([res.data.content], { type: 'text/markdown;charset=utf-8' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `report_${reportId}.md`
      a.click()
      URL.revokeObjectURL(url)
      setNotice('Markdownファイルを出力しました。')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Markdownファイルを出力できませんでした。')
    } finally {
      setExporting(false)
    }
  }

  // ---- レポートパネル共通レンダリング ----
  function renderReportDetail(report: ReportDetail) {
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: '1rem' }}>
          {[
            ['調査種別', report.research_type],
            ['対象', report.targets.join('、')],
            ['調査目的', report.purpose || '—'],
            ['自社情報', report.own_company ? `${report.own_company.name}${report.own_company.strengths ? `（${report.own_company.strengths}）` : ''}` : '—'],
            ['調査の詳しさ', report.depth || '—'],
            ['重点項目', report.focus_areas?.join('、') || '—'],
            ['実行日時', report.executed_at ? new Date(report.executed_at).toLocaleString('ja-JP') : '—'],
            ['検索回数', `${report.search_count}回`],
          ].map(([label, value]) => (
            <div key={label} style={{ border: `1px solid ${COLOR.border}`, borderRadius: 6, padding: '0.6rem' }}>
              <div style={lbl()}>{label}</div>
              <div style={{ fontSize: '0.86rem', color: COLOR.text }}>{value}</div>
            </div>
          ))}
        </div>

        {/* エグゼクティブサマリー */}
        <div style={{ background: '#f0f4ff', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 'bold', color: COLOR.primary, marginBottom: 6, fontSize: '0.9rem' }}>エグゼクティブサマリー</div>
          <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.7 }}>{report.executive_summary}</p>
        </div>

        {/* 主要発見（基本設計書 14.2 key_findings） */}
        {report.key_findings.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={lbl()}>主要発見</div>
            {report.key_findings.map((f, i) => (
              <div key={i} style={{ fontSize: '0.88rem', padding: '3px 0', display: 'flex', gap: 8 }}>
                <span style={{ color: COLOR.primary, fontWeight: 'bold', minWidth: 20 }}>{i + 1}.</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        )}

        {report.companies.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={lbl()}>企業別の調査結果</div>
            <div style={{ display: 'grid', gap: '0.8rem' }}>
              {report.companies.map(company => (
                <div key={company.name} style={{ border: `1px solid ${COLOR.border}`, borderRadius: 6, padding: '0.8rem' }}>
                  <div style={{ fontWeight: 'bold', color: COLOR.text, marginBottom: 6 }}>{company.name}</div>
                  {company.overview && <p style={{ margin: '0 0 0.6rem', fontSize: '0.86rem', lineHeight: 1.6 }}>{company.overview}</p>}
                  {[
                    ['製品・サービス', company.products],
                    ['強み', company.strengths],
                    ['弱み・注意点', company.weaknesses],
                    ['最近の動向', company.recent_news],
                  ].filter(([, items]) => (items as string[]).length > 0).map(([label, items]) => (
                    <div key={label as string} style={{ marginTop: 6 }}>
                      <strong style={{ fontSize: '0.82rem' }}>{label as string}</strong>
                      <ul style={{ margin: '3px 0 0', paddingLeft: '1.2rem', fontSize: '0.84rem', lineHeight: 1.55 }}>
                        {(items as string[]).map((item, index) => <li key={index}>{item}</li>)}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 比較表（基本設計書 14.2 comparison_table） */}
        {report.comparison_table && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={lbl()}>比較表</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    {report.comparison_table.headers.map(h => (
                      <th key={h} style={{ padding: '5px 10px', textAlign: 'left', border: `1px solid ${COLOR.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.comparison_table.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} style={{ padding: '5px 10px', border: `1px solid ${COLOR.border}`, fontWeight: j === 0 ? 'bold' : 'normal', color: j === 0 ? COLOR.text : COLOR.muted }}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SWOT（基本設計書 14.2 swot_panel） */}
        {report.swot && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={lbl()}>SWOT分析</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              {[
                ['強み（Strengths）', report.swot.strengths, COLOR.ok],
                ['弱み（Weaknesses）', report.swot.weaknesses, COLOR.danger],
                ['機会（Opportunities）', report.swot.opportunities, COLOR.primary],
                ['脅威（Threats）', report.swot.threats, COLOR.warn],
              ].map(([label, items, color]) => (
                <div key={label as string} style={{ border: `1px solid ${color as string}`, borderRadius: 6, padding: '0.6rem' }}>
                  <div style={{ fontWeight: 'bold', color: color as string, fontSize: '0.82rem', marginBottom: 4 }}>{label as string}</div>
                  {(items as string[]).map((item, i) => (
                    <div key={i} style={{ fontSize: '0.82rem', color: COLOR.text, padding: '1px 0' }}>• {item}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* トレンド */}
        {report.trends && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={lbl()}>トレンド・動向</div>
            <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.7, color: COLOR.text }}>{report.trends}</p>
          </div>
        )}

        {/* 出典一覧（基本設計書 14.2 sources_grid） */}
        {report.companies.some(c => c.sources.length > 0) && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={lbl()}>出典一覧</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  {['企業', 'URL'].map(h => (
                    <th key={h} style={{ padding: '4px 8px', textAlign: 'left', border: `1px solid ${COLOR.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.companies.flatMap(c =>
                  c.sources.map((url, i) => (
                    <tr key={`${c.name}-${i}`}>
                      <td style={{ padding: '4px 8px', border: `1px solid ${COLOR.border}`, whiteSpace: 'nowrap' }}>{c.name}</td>
                      <td style={{ padding: '4px 8px', border: `1px solid ${COLOR.border}` }}>
                        {/^https?:\/\//i.test(url) ? (
                          <a href={url} target="_blank" rel="noreferrer" style={{ color: COLOR.primary, fontSize: '0.78rem', wordBreak: 'break-all' }}>{url}</a>
                        ) : (
                          <span style={{ fontSize: '0.78rem', wordBreak: 'break-all' }}>{url}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 調査の限界 */}
        {report.limitations && (
          <div style={{ fontSize: '0.83rem', color: COLOR.muted, padding: '0.8rem', background: '#f8f8f2', borderRadius: 6 }}>
            <strong>調査の限界：</strong>{report.limitations}
          </div>
        )}
      </div>
    )
  }

  // ============================================================
  // 画面レンダリング
  // ============================================================
  return (
    <div style={{ maxWidth: 1000 }}>
      <h2 style={{ color: COLOR.text, marginBottom: 4 }}>System09</h2>
      <p style={{ color: COLOR.muted, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        公開情報から調査対象を比較し、根拠付きレポートとして保存します。
      </p>

      {error && <div role="alert" style={{ ...card(), padding: '0.8rem', borderColor: COLOR.danger, color: '#9b1c1c' }}>{error}</div>}
      {notice && <div role="status" style={{ ...card(), padding: '0.8rem', borderColor: COLOR.ok, color: '#386641' }}>{notice}</div>}

      {/* 画面タブナビゲーション（基本設計書 セクション10） */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', borderBottom: `2px solid ${COLOR.border}`, paddingBottom: 8 }}>
        {(['調査実行画面', 'レポート閲覧画面'] as Screen[]).map(s => (
          <button
            key={s}
            onClick={() => {
              setScreen(s)
              if (s === 'レポート閲覧画面') handleLoadReports()
            }}
            style={{ ...btn(screen === s ? COLOR.primary : '#ccc'), fontSize: '0.85rem' }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ========== 調査実行画面 ========== */}
      {screen === '調査実行画面' && (
        <div>
          <div style={card()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: COLOR.text }}>調査条件</h3>
              <button type="button" onClick={prepareSample} style={{ ...btn('#6c6f85'), whiteSpace: 'nowrap' }}>教材用の入力例を使う</button>
            </div>

            {/* 基本設計書 14.1 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <span style={lbl()}>調査種別</span>
                <select
                  style={field()}
                  value={researchType}
                  onChange={e => setResearchType(e.target.value as ResearchType)}
                >
                  {(['競合調査', '市場調査', '業界調査', '企業調査'] as ResearchType[]).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <span style={lbl()}>調査テーマ</span>
                <input
                  type="text"
                  style={field()}
                  value={theme}
                  onChange={e => setTheme(e.target.value)}
                  placeholder="例：新規営業提案前の競合把握"
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={lbl()}>調査対象（1行1件、最大5件）</span>
                <textarea
                  style={{ ...field(), minHeight: 80, resize: 'vertical', fontFamily: 'monospace' }}
                  value={targetCompanies}
                  onChange={e => setTargetCompanies(e.target.value)}
                  placeholder={'企業A\n企業B\n企業C'}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={lbl()}>重点的に確認する項目（1行1件、任意）</span>
                <textarea
                  style={{ ...field(), minHeight: 60, resize: 'vertical' }}
                  value={focusPoints}
                  onChange={e => setFocusPoints(e.target.value)}
                  placeholder={'価格帯\n主要顧客\n最新動向'}
                />
              </div>
              <div>
                <span style={lbl()}>自社名（任意）</span>
                <input type="text" style={field()} value={ownCompanyName} onChange={e => setOwnCompanyName(e.target.value)} placeholder="例：自社開発部門" />
              </div>
              <div>
                <span style={lbl()}>自社の強み（任意）</span>
                <input type="text" style={field()} value={ownCompanyStrengths} onChange={e => setOwnCompanyStrengths(e.target.value)} placeholder="例：既存システムの知識" />
              </div>
              <div>
                <span style={lbl()}>調査の詳しさ</span>
                <select style={field()} value={depth} onChange={e => setDepth(e.target.value)}>
                  {['概要', '標準', '詳細'].map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
            </div>

            <button
              onClick={handleResearch}
              disabled={!theme.trim() || !targetCompanies.trim() || researching}
              style={btn(COLOR.primary, !theme.trim() || !targetCompanies.trim() || researching)}
            >
              {researching ? '公開情報を調査しています...' : '調査開始'}
            </button>
          </div>

          {/* 調査結果（基本設計書 14.1 executive_summary 以降） */}
          {latestResult && (
            <div style={card()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, color: COLOR.ok }}>
                  ✓ 調査完了 — {latestResult.research_type}（{latestResult.targets.join('、')}）
                </h4>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: '0.82rem', color: COLOR.muted }}>検索回数: {latestResult.search_count}</span>
                  <button
                    onClick={() => handleExport(latestResult.report_id)}
                    disabled={exporting}
                    style={{ ...btn('#6c6f85', exporting), fontSize: '0.82rem', padding: '4px 12px' }}
                  >
                    Markdown出力
                  </button>
                </div>
              </div>
              {renderReportDetail(latestResult)}
            </div>
          )}
        </div>
      )}

      {/* ========== レポート閲覧画面 ========== */}
      {screen === 'レポート閲覧画面' && (
        <div>
          {/* レポート一覧（基本設計書 14.2 report_grid） */}
          <div style={card()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: COLOR.text }}>レポート閲覧画面</h3>
              <button onClick={handleLoadReports} disabled={listLoading} style={{ ...btn('#6c6f85', listLoading), fontSize: '0.85rem' }}>
                {listLoading ? '読込中...' : '更新'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8, marginBottom: '0.8rem' }}>
              <div>
                <span style={lbl()}>調査種別</span>
                <select style={field()} value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="">すべて</option>
                  {(['競合調査', '市場調査', '業界調査', '企業調査'] as ResearchType[]).map(value => <option key={value} value={value}>{value}</option>)}
                </select>
              </div>
              <div>
                <span style={lbl()}>調査対象</span>
                <input style={field()} value={filterTarget} onChange={e => setFilterTarget(e.target.value)} placeholder="名称の一部" />
              </div>
              <div>
                <span style={lbl()}>開始日</span>
                <input type="date" style={field()} value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
              </div>
              <div>
                <span style={lbl()}>終了日</span>
                <input type="date" style={field()} value={filterTo} onChange={e => setFilterTo(e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: '1rem' }}>
              <button onClick={handleLoadReports} disabled={listLoading} style={{ ...btn(COLOR.primary, listLoading), fontSize: '0.82rem' }}>絞り込む</button>
              <button onClick={handleClearFilters} disabled={listLoading} style={{ ...btn('#6c6f85', listLoading), fontSize: '0.82rem' }}>条件をクリア</button>
            </div>

            {reportList.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    {['ID', '調査種別', '調査テーマ', '対象', '実行日', '操作'].map((h, index) => (
                      <th key={`${h}-${index}`} style={{ padding: '5px 8px', textAlign: 'left', border: `1px solid ${COLOR.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportList.map(r => (
                    <tr key={r.report_id} style={{ background: selectedReport?.report_id === r.report_id ? '#f0f4ff' : undefined }}>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{r.report_id}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{r.research_type}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{r.theme}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{r.targets.join('、')}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{r.created_at?.slice(0, 10) ?? '—'}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => handleSelectReport(r.report_id)} style={{ ...btn(COLOR.primary), fontSize: '0.78rem', padding: '2px 10px' }}>詳細</button>
                          <button onClick={() => handleExport(r.report_id)} disabled={exporting} style={{ ...btn('#6c6f85', exporting), fontSize: '0.78rem', padding: '2px 10px' }}>Markdown出力</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              !listLoading && (
                <div style={{ color: COLOR.muted, fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>
                  条件に一致するレポートがありません
                </div>
              )
            )}
          </div>

          {/* レポート詳細（基本設計書 14.2 key_findings / comparison_table / swot_panel / sources_grid / export_markdown） */}
          {detailLoading && (
            <div style={{ color: COLOR.muted, textAlign: 'center', padding: '2rem', fontSize: '0.9rem' }}>
              読込中...
            </div>
          )}
          {selectedReport && !detailLoading && (
            <div style={card()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0, color: COLOR.text }}>
                  {selectedReport.research_type} — {selectedReport.targets.join('、')}
                </h4>
                <button
                  onClick={() => handleExport(selectedReport.report_id)}
                  disabled={exporting}
                  style={{ ...btn('#6c6f85', exporting), fontSize: '0.82rem' }}
                >
                  {exporting ? '出力中...' : 'Markdown出力'}
                </button>
              </div>
              {renderReportDetail(selectedReport)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
