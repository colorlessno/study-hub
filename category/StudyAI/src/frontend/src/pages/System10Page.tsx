import { useState } from 'react'
import { isAxiosError } from 'axios'
import { createSystemClient } from '../api/client'

const client = createSystemClient('system10')

// ---- 型定義（基本設計書 IF仕様より） ----

type ScanMode = 'full' | 'incremental'
type SearchMode = 'keyword' | 'vector' | 'hybrid'

interface ScanResult {
  scan_id: number
  status: string
  total_files: number
  new_files: number
  updated_files: number
  deleted_files: number
  duplicates_found: number
  scan_duration_seconds: number
  processing_notes: string[]
}

interface SearchResultItem {
  file_id: number
  file_name: string
  full_path: string
  summary: string | null
  doc_type: string | null
  relevance_score: number
  updated_at: string | null
  file_size_kb: number | null
  is_latest: boolean | null
  duplicates: Array<{
    file_name: string
    full_path: string
    similarity: number
  }>
}

interface SearchResult {
  query: string
  total_hits: number
  results: SearchResultItem[]
  processing_notes: string[]
}

interface FolderNode {
  path: string
  description: string | null
  file_count: number
  size_mb: number | null
  children?: FolderNode[]
}

interface MapResult {
  folder_tree: FolderNode
  issues: string[]
}

interface DuplicateGroup {
  file_ids: number[]
  files: Array<{
    file_id: number
    file_name: string
    full_path: string
    is_latest: boolean
  }>
  similarity_type: string
  similarity_score: number
  latest_file_id: number | null
}

interface ReportResult {
  generated_at: string
  overview: string
  document_map: Record<string, Array<{ file_name: string; path: string }>>
  recent_updates: Array<{ file_name: string; updated_at: string; path: string }>
  issues: string[]
}

interface ScanLog {
  scan_id: number
  scan_targets: string[]
  scan_mode: string
  total_files: number
  new_files: number
  updated_files: number
  deleted_files: number
  duplicates_found: number
  duration_seconds: number | null
  status: string
  executed_at: string
}

// ---- 画面種別（基本設計書 セクション10） ----
type Screen = 'スキャン実行画面' | '検索・構成確認画面' | 'レポート・履歴画面'

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
  if (isAxiosError(error)) {
    const responseMessage = error.response?.data?.error?.message ?? error.response?.data?.message
    if (typeof responseMessage === 'string' && responseMessage.trim()) return responseMessage
  }
  return error instanceof Error && error.message ? error.message : fallback
}

function formatUtcDateTime(value: string) {
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ja-JP')
}

// ---- 最新版バッジ ----
function LatestBadge({ value }: { value: boolean }) {
  if (!value) return null
  return (
    <span style={{ background: COLOR.ok, color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '0.78rem' }}>
      最新版
    </span>
  )
}

// ---- フォルダツリー（再帰） ----
function FolderTree({ node, depth = 0 }: { node: FolderNode; depth?: number }) {
  const [open, setOpen] = useState(depth < 2)
  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ cursor: 'pointer', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}
      >
        <span>{open ? '📂' : '📁'}</span>
        <span style={{ color: COLOR.primary, fontWeight: 'bold' }}>{node.path.split('/').pop() || node.path}</span>
        <span style={{ color: COLOR.muted, fontSize: '0.78rem' }}>({node.file_count}件)</span>
      </div>
      {open && node.description && (
        <div style={{ paddingLeft: 22, fontSize: '0.8rem', color: COLOR.muted, marginBottom: 2 }}>
          {node.description}
        </div>
      )}
      {open && node.children?.map((child, i) => (
        <FolderTree key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

// ============================================================
// メインコンポーネント
// ============================================================
export default function System10Page() {
  const [screen, setScreen] = useState<Screen>('スキャン実行画面')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  // ---- スキャン実行画面（基本設計書 14.1） ----
  const [targetPaths, setTargetPaths] = useState('/mnt/scan/project')
  const [scanMode, setScanMode] = useState<ScanMode>('full')
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)

  // ---- 検索・構成確認画面（基本設計書 14.2） ----
  const [query, setQuery] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('hybrid')
  const [pathPrefix, setPathPrefix] = useState('')
  const [latestOnly, setLatestOnly] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([])
  const [searchNotes, setSearchNotes] = useState<string[]>([])
  const [mapData, setMapData] = useState<MapResult | null>(null)
  const [mapLoading, setMapLoading] = useState(false)
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([])
  const [dupLoading, setDupLoading] = useState(false)

  // ---- レポート・履歴画面（基本設計書 14.3） ----
  const [report, setReport] = useState<ReportResult | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)

  function clearMessages() {
    setNotice('')
    setError('')
  }

  function setSampleInput() {
    setTargetPaths('/mnt/scan/project')
    setScanMode('full')
    setQuery('基本設計')
    setSearchMode('hybrid')
    setPathPrefix('')
    setLatestOnly(false)
    setError('')
    setNotice('教材用の対象フォルダと検索語を設定しました。')
  }

  // ---- スキャン実行 ----
  async function handleScan() {
    const paths = targetPaths.split('\n').map(p => p.trim()).filter(Boolean)
    if (!paths.length) return
    clearMessages()
    setScanning(true)
    setScanResult(null)
    try {
      const res = await client.post<ScanResult>('/scan', {
        scan_targets: paths,
        scan_mode: scanMode,
        exclude_patterns: ['node_modules', '.git', '*.log', 'tmp'],
      })
      setScanResult(res.data)
      setNotice(`スキャンID ${res.data.scan_id} を保存しました。`)
    } catch (reason) {
      setError(getErrorMessage(reason, '対象フォルダをスキャンできませんでした。'))
    } finally {
      setScanning(false)
    }
  }

  // ---- 検索 ----
  async function handleSearch() {
    if (!query.trim()) return
    clearMessages()
    setSearchLoading(true)
    setSearchResults([])
    setSearchNotes([])
    try {
      const params: Record<string, string> = {
        q: query,
        search_mode: searchMode,
      }
      if (pathPrefix) params.folder = pathPrefix
      if (latestOnly) params.latest_only = 'true'
      const res = await client.get<SearchResult>('/search', { params })
      setSearchResults(res.data.results ?? [])
      setSearchNotes(res.data.processing_notes ?? [])
      setNotice(`「${res.data.query}」の検索結果は ${res.data.total_hits} 件です。`)
    } catch (reason) {
      setError(getErrorMessage(reason, '文書を検索できませんでした。'))
    } finally {
      setSearchLoading(false)
    }
  }

  // ---- 構成マップ取得 ----
  async function handleLoadMap() {
    clearMessages()
    setMapLoading(true)
    setMapData(null)
    try {
      const params: Record<string, string> = {}
      if (pathPrefix) params.folder = pathPrefix
      const res = await client.get<MapResult>('/map', { params })
      setMapData(res.data)
      setNotice(`構成マップを取得しました。対象ファイルは ${res.data.folder_tree.file_count} 件です。`)
    } catch (reason) {
      setError(getErrorMessage(reason, '構成マップを取得できませんでした。'))
    } finally {
      setMapLoading(false)
    }
  }

  // ---- 重複候補取得 ----
  async function handleLoadDuplicates() {
    clearMessages()
    setDupLoading(true)
    setDuplicates([])
    try {
      const res = await client.get<{ items: DuplicateGroup[] }>('/duplicates')
      setDuplicates(res.data.items ?? [])
      setNotice(`重複候補を ${res.data.items?.length ?? 0} グループ取得しました。`)
    } catch (reason) {
      setError(getErrorMessage(reason, '重複候補を取得できませんでした。'))
    } finally {
      setDupLoading(false)
    }
  }

  // ---- レポート取得 ----
  async function handleLoadReport() {
    clearMessages()
    setReportLoading(true)
    setReport(null)
    try {
      const res = await client.get<ReportResult>('/report')
      setReport(res.data)
      setNotice('構成管理レポートを生成しました。')
    } catch (reason) {
      setError(getErrorMessage(reason, '構成管理レポートを生成できませんでした。'))
    } finally {
      setReportLoading(false)
    }
  }

  // ---- スキャン履歴取得 ----
  async function handleLoadLogs() {
    clearMessages()
    setLogsLoading(true)
    setScanLogs([])
    try {
      const res = await client.get<{ items: ScanLog[] }>('/scans')
      setScanLogs(res.data.items ?? [])
      setNotice(`スキャン履歴を ${res.data.items?.length ?? 0} 件取得しました。`)
    } catch (reason) {
      setError(getErrorMessage(reason, 'スキャン履歴を取得できませんでした。'))
    } finally {
      setLogsLoading(false)
    }
  }

  // ============================================================
  // 画面レンダリング
  // ============================================================
  return (
    <div style={{ maxWidth: 1000 }}>
      <h2 style={{ color: COLOR.text, marginBottom: 4 }}>System10</h2>
      <p style={{ color: COLOR.muted, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        構成管理補助・ドキュメント所在検索システム
      </p>

      {/* 画面タブナビゲーション（基本設計書 セクション10） */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', borderBottom: `2px solid ${COLOR.border}`, paddingBottom: 8 }}>
        {(['スキャン実行画面', '検索・構成確認画面', 'レポート・履歴画面'] as Screen[]).map(s => (
          <button
            key={s}
            onClick={() => setScreen(s)}
            style={{ ...btn(screen === s ? COLOR.primary : '#ccc'), fontSize: '0.85rem' }}
          >
            {s}
          </button>
        ))}
      </div>

      {notice && (
        <div role="status" style={{ ...card(), padding: '0.8rem 1rem', color: '#2f6f44', background: '#f2fbf5' }}>
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" style={{ ...card(), padding: '0.8rem 1rem', color: '#9d2731', background: '#fff4f4' }}>
          {error}
        </div>
      )}

      {/* ========== スキャン実行画面 ========== */}
      {screen === 'スキャン実行画面' && (
        <div>
          <div style={card()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: COLOR.text }}>スキャン実行画面</h3>
              <button onClick={setSampleInput} style={{ ...btn('#6c6f85'), fontSize: '0.85rem' }}>
                教材用入力を設定
              </button>
            </div>

            {/* 基本設計書 14.1 */}
            <div style={{ marginBottom: '1rem' }}>
              <span style={lbl()}>対象フォルダ（複数指定は改行区切り）</span>
              <textarea
                style={{ ...field(), minHeight: 80, resize: 'vertical', fontFamily: 'monospace' }}
                value={targetPaths}
                onChange={e => setTargetPaths(e.target.value)}
                placeholder={'/mnt/scan/project\n/mnt/scan/project/design'}
              />
              <div style={{ marginTop: 5, color: COLOR.muted, fontSize: '0.8rem' }}>
                安全のため、教材用の <code>/mnt/scan/project</code> 配下だけを読み取れます。
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <span style={lbl()}>スキャン種別</span>
              <div style={{ display: 'flex', gap: 16 }}>
                {(['full', 'incremental'] as ScanMode[]).map(m => (
                  <label key={m} style={{ cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <input
                      type="radio"
                      name="scan_mode"
                      value={m}
                      checked={scanMode === m}
                      onChange={() => setScanMode(m)}
                    />
                    {m === 'full' ? '全件スキャン（full）' : '差分スキャン（incremental）'}
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleScan}
              disabled={!targetPaths.trim() || scanning}
              style={btn(COLOR.primary, !targetPaths.trim() || scanning)}
            >
              {scanning ? 'スキャン中（索引更新実行中）...' : 'スキャン開始'}
            </button>
          </div>

          {/* スキャン結果（基本設計書 14.1 scan_result） */}
          {scanResult && (
            <div style={card()}>
              <h4 style={{ margin: '0 0 1rem', color: COLOR.ok }}>✓ スキャン完了</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                {[
                  ['総ファイル数', scanResult.total_files, COLOR.text],
                  ['新規', scanResult.new_files, COLOR.ok],
                  ['更新', scanResult.updated_files, COLOR.primary],
                  ['重複検出', scanResult.duplicates_found, COLOR.warn],
                ].map(([label, value, color]) => (
                  <div key={label as string} style={{ textAlign: 'center', padding: '0.8rem', background: '#f8f8f2', borderRadius: 6 }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: color as string }}>{value as number}</div>
                    <div style={{ fontSize: '0.82rem', color: COLOR.muted }}>{label as string}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '0.8rem', fontSize: '0.85rem', color: COLOR.muted }}>
                スキャンID: {scanResult.scan_id} / 削除扱い: {scanResult.deleted_files}件 / 処理時間: {scanResult.scan_duration_seconds}秒 / ステータス: {scanResult.status}
              </div>
              {scanResult.processing_notes.map(note => (
                <div key={note} style={{ marginTop: 4, fontSize: '0.82rem', color: COLOR.muted }}>・{note}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========== 検索・構成確認画面 ========== */}
      {screen === '検索・構成確認画面' && (
        <div>
          {/* 検索条件（基本設計書 14.2） */}
          <div style={card()}>
            <h3 style={{ margin: '0 0 1rem', color: COLOR.text }}>検索・構成確認画面</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.8rem', marginBottom: '1rem' }}>
              <div>
                <span style={lbl()}>検索語（自然文・キーワード）</span>
                <input
                  type="text"
                  style={field()}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
                  placeholder="例：システム設計書はどこにある？"
                />
              </div>
              <div>
                <span style={lbl()}>フォルダ絞込</span>
                <input
                  type="text"
                  style={field()}
                  value={pathPrefix}
                  onChange={e => setPathPrefix(e.target.value)}
                  placeholder="/mnt/scan/project/design"
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <span style={lbl()}>検索モード</span>
                <div style={{ display: 'flex', gap: 12 }}>
                  {(['keyword', 'vector', 'hybrid'] as SearchMode[]).map(m => (
                    <label key={m} style={{ cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 3 }}>
                      <input type="radio" name="search_mode2" value={m} checked={searchMode === m} onChange={() => setSearchMode(m)} />
                      {m === 'keyword' ? 'キーワード' : m === 'vector' ? '意味検索' : '複合検索'}
                    </label>
                  ))}
                </div>
              </div>
              <label style={{ cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4, paddingTop: 20 }}>
                <input
                  type="checkbox"
                  checked={latestOnly}
                  onChange={e => setLatestOnly(e.target.checked)}
                />
                最新版のみ
              </label>
            </div>
            <button
              onClick={handleSearch}
              disabled={!query.trim() || searchLoading}
              style={btn(COLOR.primary, !query.trim() || searchLoading)}
            >
              {searchLoading ? '検索中...' : '検索'}
            </button>
          </div>

          {/* 検索結果（基本設計書 14.2 search_result_grid） */}
          {searchResults.length > 0 && (
            <div style={card()}>
              <h4 style={{ margin: '0 0 1rem', color: COLOR.text }}>検索結果（{searchResults.length}件）</h4>
              {searchNotes.map(note => (
                <div key={note} style={{ marginBottom: 8, fontSize: '0.82rem', color: COLOR.muted }}>・{note}</div>
              ))}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    {['文書と保存場所', '文書種類', '最新版', '関連度', '要約・重複候補'].map(h => (
                      <th key={h} style={{ padding: '5px 8px', textAlign: 'left', border: `1px solid ${COLOR.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map(r => (
                    <tr key={r.file_id}>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, maxWidth: 280, wordBreak: 'break-all' }}>
                        <div style={{ fontWeight: 'bold', color: COLOR.text, fontSize: '0.82rem' }}>{r.file_name}</div>
                        <div style={{ color: COLOR.muted, fontSize: '0.75rem' }}>{r.full_path}</div>
                      </td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{r.doc_type ?? '—'}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                        <LatestBadge value={Boolean(r.is_latest)} />
                      </td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                        <span style={{ color: r.relevance_score >= 0.8 ? COLOR.ok : COLOR.muted }}>
                          {r.relevance_score.toFixed(2)}
                        </span>
                      </td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, color: COLOR.muted, fontSize: '0.8rem' }}>
                        <div>{r.summary ?? '—'}</div>
                        {r.duplicates.map(duplicate => (
                          <div key={duplicate.full_path} style={{ marginTop: 5, color: COLOR.warn }}>
                            重複候補: {duplicate.file_name}（類似度 {duplicate.similarity.toFixed(2)}）
                          </div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 構成マップ（基本設計書 14.2 folder_map） */}
          <div style={card()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, color: COLOR.text }}>構成マップ</h4>
              <button onClick={handleLoadMap} disabled={mapLoading} style={{ ...btn('#6c6f85', mapLoading), fontSize: '0.85rem' }}>
                {mapLoading ? '読込中...' : '取得'}
              </button>
            </div>
            {mapData ? (
              <div>
                <FolderTree node={mapData.folder_tree} />
                {mapData.issues.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <span style={lbl()}>構成上の問題点</span>
                    {mapData.issues.map((issue, i) => (
                      <div key={i} style={{ fontSize: '0.85rem', color: COLOR.warn, padding: '3px 0' }}>⚠ {issue}</div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: COLOR.muted, fontSize: '0.9rem' }}>「取得」ボタンで構成マップを表示します</div>
            )}
          </div>

          {/* 重複候補（基本設計書 14.2 duplicates_grid） */}
          <div style={card()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, color: COLOR.text }}>重複候補</h4>
              <button onClick={handleLoadDuplicates} disabled={dupLoading} style={{ ...btn('#6c6f85', dupLoading), fontSize: '0.85rem' }}>
                {dupLoading ? '読込中...' : '取得'}
              </button>
            </div>
            {duplicates.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    {['文書と保存場所', '重複の種類', '類似度', '整理の基準'].map(h => (
                      <th key={h} style={{ padding: '5px 8px', textAlign: 'left', border: `1px solid ${COLOR.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {duplicates.map((d, i) => (
                    <tr key={i}>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, fontSize: '0.8rem' }}>
                        {d.files.map(file => (
                          <div key={file.file_id} style={{ marginBottom: 5 }}>
                            <div style={{ color: COLOR.text, fontWeight: 'bold' }}>{file.file_name}</div>
                            <div style={{ color: COLOR.muted, fontSize: '0.75rem', wordBreak: 'break-all' }}>{file.full_path}</div>
                          </div>
                        ))}
                      </td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{d.similarity_type === 'exact' ? '内容が同一' : 'ファイル名が類似'}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{d.similarity_score.toFixed(2)}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, color: COLOR.muted, fontSize: '0.8rem' }}>
                        {d.files.find(file => file.is_latest)?.file_name ?? '未判定'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ color: COLOR.muted, fontSize: '0.9rem' }}>「取得」ボタンで重複候補を表示します</div>
            )}
          </div>
        </div>
      )}

      {/* ========== レポート・履歴画面 ========== */}
      {screen === 'レポート・履歴画面' && (
        <div>
          {/* 構成管理レポート（基本設計書 14.3 report_panel） */}
          <div style={card()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: COLOR.text }}>レポート・履歴画面</h3>
              <button onClick={handleLoadReport} disabled={reportLoading} style={{ ...btn(COLOR.primary, reportLoading), fontSize: '0.85rem' }}>
                {reportLoading ? '生成中...' : '構成管理レポート取得'}
              </button>
            </div>
            {report != null ? (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ background: '#f8f8f2', borderRadius: 6, padding: '0.9rem 1rem' }}>
                  <div style={{ color: COLOR.text }}>{report.overview}</div>
                  <div style={{ marginTop: 5, color: COLOR.muted, fontSize: '0.78rem' }}>
                    生成日時: {formatUtcDateTime(report.generated_at)}
                  </div>
                </div>

                <div>
                  <span style={lbl()}>文書種類ごとの保存場所</span>
                  {Object.entries(report.document_map).map(([documentType, documents]) => (
                    <div key={documentType} style={{ marginTop: 8 }}>
                      <div style={{ color: COLOR.primary, fontWeight: 'bold', fontSize: '0.85rem' }}>
                        {documentType}（{documents.length}件）
                      </div>
                      {documents.map(document => (
                        <div key={document.path} style={{ padding: '3px 0 3px 14px', fontSize: '0.8rem' }}>
                          <span style={{ color: COLOR.text }}>{document.file_name}</span>
                          <span style={{ color: COLOR.muted }}> — {document.path}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                <div>
                  <span style={lbl()}>最近更新された文書</span>
                  {report.recent_updates.map(document => (
                    <div key={document.path} style={{ padding: '3px 0', fontSize: '0.8rem' }}>
                      <span style={{ color: COLOR.text }}>{document.file_name}</span>
                      <span style={{ color: COLOR.muted }}> — {document.path}</span>
                    </div>
                  ))}
                </div>

                {report.issues.length > 0 && (
                  <div>
                    <span style={lbl()}>確認が必要な点</span>
                    {report.issues.map(issue => (
                      <div key={issue} style={{ color: COLOR.warn, fontSize: '0.85rem' }}>⚠ {issue}</div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: COLOR.muted, fontSize: '0.9rem' }}>「構成管理レポート取得」ボタンでレポートを生成します</div>
            )}
          </div>

          {/* スキャン履歴（基本設計書 14.3 scan_logs_grid） */}
          <div style={card()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, color: COLOR.text }}>スキャン履歴</h4>
              <button onClick={handleLoadLogs} disabled={logsLoading} style={{ ...btn('#6c6f85', logsLoading), fontSize: '0.85rem' }}>
                {logsLoading ? '読込中...' : '更新'}
              </button>
            </div>
            {scanLogs.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    {['実行日時', '方式', '対象', '新規', '更新', '削除扱い', '重複', '処理時間', '状態'].map(h => (
                      <th key={h} style={{ padding: '5px 8px', textAlign: 'left', border: `1px solid ${COLOR.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scanLogs.map(log => (
                    <tr key={log.scan_id}>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{log.executed_at?.slice(0, 16).replace('T', ' ') ?? '—'}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{log.scan_mode === 'full' ? '全件' : '差分'}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{log.total_files}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, color: COLOR.ok }}>{log.new_files}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, color: COLOR.primary }}>{log.updated_files}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{log.deleted_files}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{log.duplicates_found}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{log.duration_seconds ?? 0}秒</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                        <span style={{
                          background: log.status === 'completed' ? COLOR.ok : COLOR.danger,
                          color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: '0.78rem',
                        }}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ color: COLOR.muted, fontSize: '0.9rem' }}>「更新」ボタンでスキャン履歴を表示します</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
