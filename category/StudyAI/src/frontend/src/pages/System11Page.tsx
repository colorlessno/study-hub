import { useState } from 'react'
import { isAxiosError } from 'axios'
import { createSystemClient } from '../api/client'

const client = createSystemClient('system11')

type Screen = 'prepare' | 'plan' | 'history'
type ActionType = 'move' | 'rename' | 'archive' | 'keep'

interface SampleWorkspace {
  watch_folder: string
  output_folder: string
  files: string[]
}

interface PlanAction {
  action_id: string
  action_type: ActionType
  source_path: string
  dest_path: string | null
  new_name: string | null
  reason: string
  confidence: number
}

interface ScanSummary {
  total_actions: number
  moves: number
  renames: number
  archives: number
  skips: number
}

interface ScanResult {
  plan_id: string
  scanned_files: number
  actions: PlanAction[]
  summary: ScanSummary
  planning_method: 'llm' | 'local_rules'
}

interface ExecutionItemResult {
  action_id: string
  status: string
  error_code: string | null
}

interface ExecuteResult {
  execution_id: string
  result: string
  success_count: number
  failed_count: number
  item_results: ExecutionItemResult[]
  rollback_available: boolean
}

interface ExecutionSummary {
  execution_id: string
  plan_id: string
  result: string
  success_count: number
  failed_count: number
  executed_at: string
  rollback_available: boolean
  rolled_back: boolean
}

interface ExecutionReportItem {
  action_type: string
  source_path: string
  target_path: string | null
  status: string
  error_code: string | null
  rollbackable: boolean
}

interface ExecutionReport {
  execution_id: string
  result: string
  success_count: number
  failed_count: number
  executed_at: string
  items: ExecutionReportItem[]
}

const colors = {
  border: '#c9ced6',
  primary: '#315f8c',
  danger: '#a33a3a',
  ok: '#267447',
  muted: '#5f6873',
  pale: '#f5f7f9',
}

const panel: React.CSSProperties = {
  border: `1px solid ${colors.border}`,
  background: '#fff',
  padding: '1.2rem',
  marginBottom: '1rem',
}

const input: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: `1px solid ${colors.border}`,
  padding: '0.55rem 0.65rem',
  font: 'inherit',
}

function button(primary = false, disabled = false): React.CSSProperties {
  return {
    minWidth: 132,
    minHeight: 40,
    border: `1px solid ${disabled ? '#c8c8c8' : primary ? colors.primary : '#7c858f'}`,
    borderRadius: 7,
    background: disabled ? '#eee' : primary ? colors.primary : '#fff',
    color: disabled ? '#888' : primary ? '#fff' : '#1f2933',
    padding: '0.45rem 0.9rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    font: 'inherit',
  }
}

function formatError(error: unknown): string {
  if (isAxiosError(error)) {
    return error.response?.data?.error?.message
      ?? error.response?.data?.message
      ?? error.message
  }
  return error instanceof Error ? error.message : '処理に失敗しました。'
}

function actionLabel(value: string): string {
  return ({ move: '移動', rename: '名前変更', archive: '保管', keep: '操作しない' } as Record<string, string>)[value] ?? value
}

function statusLabel(value: string): string {
  return ({
    success: '成功', partial: '一部失敗', failed: '失敗', rolled_back: '元に戻した',
    conflict: '同名ファイルあり', locked: '使用中', skipped_by_policy: '安全規則により対象外',
  } as Record<string, string>)[value] ?? value
}

function shortPath(value: string | null): string {
  if (!value) return '—'
  return value.replace('/mnt/organize/work/', '')
}

export default function System11Page() {
  const [screen, setScreen] = useState<Screen>('prepare')
  const [watchFolder, setWatchFolder] = useState('/mnt/organize/work/inbox')
  const [outputFolder, setOutputFolder] = useState('/mnt/organize/work/organized')
  const [excludePatterns, setExcludePatterns] = useState('*.log')
  const [sampleFiles, setSampleFiles] = useState<string[]>([])
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmed, setConfirmed] = useState(false)
  const [executeResult, setExecuteResult] = useState<ExecuteResult | null>(null)
  const [executions, setExecutions] = useState<ExecutionSummary[]>([])
  const [report, setReport] = useState<ExecutionReport | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  const executableActions = scanResult?.actions.filter(action => action.action_type !== 'keep') ?? []

  function clearNotice() {
    setMessage('')
    setError('')
  }

  async function resetSample() {
    clearNotice()
    setBusy('reset')
    try {
      const response = await client.post<SampleWorkspace>('/sample/reset')
      setWatchFolder(response.data.watch_folder)
      setOutputFolder(response.data.output_folder)
      setSampleFiles(response.data.files)
      setScanResult(null)
      setSelectedIds(new Set())
      setExecuteResult(null)
      setConfirmed(false)
      setMessage('教材用ファイルを初期状態へ戻しました。')
    } catch (caught) {
      setError(formatError(caught))
    } finally {
      setBusy('')
    }
  }

  async function createPlan() {
    clearNotice()
    setBusy('scan')
    setExecuteResult(null)
    try {
      const response = await client.post<ScanResult>('/scan', {
        watch_folders: [watchFolder],
        output_folder: outputFolder,
        exclude_patterns: excludePatterns.split('\n').map(value => value.trim()).filter(Boolean),
        mode: 'preview',
      })
      setScanResult(response.data)
      setSelectedIds(new Set(response.data.actions
        .filter(action => action.action_type !== 'keep')
        .map(action => action.action_id)))
      setConfirmed(false)
      setScreen('plan')
      setMessage('整理案を生成しました。内容を確認して実行対象を選んでください。')
    } catch (caught) {
      setError(formatError(caught))
    } finally {
      setBusy('')
    }
  }

  async function executePlan() {
    if (!scanResult || selectedIds.size === 0 || !confirmed) return
    clearNotice()
    setBusy('execute')
    try {
      const response = await client.post<ExecuteResult>('/execute', {
        plan_id: scanResult.plan_id,
        approved_action_ids: Array.from(selectedIds),
        approval_mode: 'selective',
      })
      setExecuteResult(response.data)
      setMessage('選択した操作を実行しました。結果を確認してください。')
    } catch (caught) {
      setError(formatError(caught))
    } finally {
      setBusy('')
    }
  }

  async function loadExecutions() {
    clearNotice()
    setBusy('history')
    try {
      const response = await client.get<{ items: ExecutionSummary[] }>('/executions')
      setExecutions(response.data.items)
    } catch (caught) {
      setError(formatError(caught))
    } finally {
      setBusy('')
    }
  }

  async function showHistory() {
    setScreen('history')
    await loadExecutions()
  }

  async function loadReport(executionId: string) {
    clearNotice()
    setBusy(`report:${executionId}`)
    try {
      const response = await client.get<ExecutionReport>(`/executions/${executionId}/report`)
      setReport(response.data)
    } catch (caught) {
      setError(formatError(caught))
    } finally {
      setBusy('')
    }
  }

  async function rollback(executionId: string) {
    clearNotice()
    setBusy(`rollback:${executionId}`)
    try {
      await client.post(`/rollback/${executionId}`)
      setReport(null)
      await loadExecutions()
      setMessage('ファイルを実行前の場所へ戻しました。')
    } catch (caught) {
      setError(formatError(caught))
      setBusy('')
    }
  }

  async function saveSettings() {
    clearNotice()
    setBusy('settings')
    try {
      await client.post('/settings', {
        watch_folders: [watchFolder],
        output_folder: outputFolder,
        exclude_patterns: excludePatterns.split('\n').map(value => value.trim()).filter(Boolean),
        mode: 'preview',
        schedule: 'manual',
      })
      setMessage('手動実行で使用する既定値を保存しました。')
    } catch (caught) {
      setError(formatError(caught))
    } finally {
      setBusy('')
    }
  }

  return (
    <div style={{ maxWidth: 1120 }}>
      <h2 style={{ marginBottom: 4 }}>System11</h2>
      <p style={{ color: colors.muted, marginTop: 0 }}>教材用ファイルの整理案を確認し、選択した操作だけを実行します。</p>

      <div style={{ ...panel, background: '#fff8e7', borderColor: '#d6a14a' }}>
        操作対象はコンテナ内の専用教材フォルダだけです。PC上の任意のフォルダは操作しません。
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
        {([
          ['prepare', '1. 教材を準備'],
          ['plan', '2. 整理案を確認・実行'],
          ['history', '3. 履歴・元に戻す'],
        ] as [Screen, string][]).map(([value, label]) => (
          <button
            key={value}
            type="button"
            style={button(screen === value)}
            onClick={() => value === 'history' ? void showHistory() : setScreen(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {message && <div role="status" style={{ ...panel, color: colors.ok, borderColor: colors.ok }}>{message}</div>}
      {error && <div role="alert" style={{ ...panel, color: colors.danger, borderColor: colors.danger }}>{error}</div>}

      {screen === 'prepare' && (
        <>
          <section style={panel}>
            <h3 style={{ marginTop: 0 }}>教材用ファイルを準備する</h3>
            <p>ボタンを押すと、何度でも同じ初期状態から試せます。</p>
            <button type="button" style={button(true, busy !== '')} disabled={busy !== ''} onClick={() => void resetSample()}>
              {busy === 'reset' ? '準備中…' : '教材用ファイルを初期状態へ戻す'}
            </button>
            {sampleFiles.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <strong>準備したファイル</strong>
                <ul>{sampleFiles.map(file => <li key={file}>{file}</li>)}</ul>
              </div>
            )}
          </section>

          <section style={panel}>
            <h3 style={{ marginTop: 0 }}>整理案を作る条件</h3>
            <label>確認するフォルダ<input style={input} readOnly value={watchFolder} /></label>
            <label style={{ display: 'block', marginTop: 12 }}>整理先フォルダ<input style={input} readOnly value={outputFolder} /></label>
            <label style={{ display: 'block', marginTop: 12 }}>
              対象外にする名前（1行に1件）
              <textarea style={{ ...input, minHeight: 72 }} value={excludePatterns} onChange={event => setExcludePatterns(event.target.value)} />
            </label>
            <p style={{ color: colors.muted }}>この段階ではファイルを変更せず、整理案だけを作ります。</p>
            <button type="button" style={button(true, busy !== '')} disabled={busy !== ''} onClick={() => void createPlan()}>
              {busy === 'scan' ? '整理案を作成中…' : '整理案を作る'}
            </button>
          </section>
        </>
      )}

      {screen === 'plan' && (
        <>
          {!scanResult ? (
            <section style={panel}>先に「教材を準備」で整理案を作ってください。</section>
          ) : (
            <>
              <section style={panel}>
                <h3 style={{ marginTop: 0 }}>整理案</h3>
                <p>
                  読み取ったファイル: {scanResult.scanned_files}件 ／
                  生成方法: {scanResult.planning_method === 'llm' ? 'AI' : '教材用の規則'}
                </p>
                <p>
                  移動 {scanResult.summary.moves}件、名前変更 {scanResult.summary.renames}件、
                  保管 {scanResult.summary.archives}件、操作しない {scanResult.summary.skips}件
                </p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <button type="button" style={button()} onClick={() => setSelectedIds(new Set(executableActions.map(action => action.action_id)))}>すべて選択</button>
                  <button type="button" style={button()} onClick={() => setSelectedIds(new Set())}>すべて解除</button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead><tr>{['選択', '操作', '元のファイル', '操作後', '理由', '確信度'].map(value => <th key={value} style={{ border: `1px solid ${colors.border}`, padding: 8, textAlign: 'left', background: colors.pale }}>{value}</th>)}</tr></thead>
                    <tbody>{scanResult.actions.map(action => {
                      const executable = action.action_type !== 'keep'
                      const destination = action.action_type === 'rename' ? action.new_name : action.dest_path
                      return (
                        <tr key={action.action_id} style={{ color: executable ? 'inherit' : colors.muted }}>
                          <td style={{ border: `1px solid ${colors.border}`, padding: 8, textAlign: 'center' }}>
                            <input
                              aria-label={`${shortPath(action.source_path)}を実行対象にする`}
                              type="checkbox"
                              disabled={!executable}
                              checked={selectedIds.has(action.action_id)}
                              onChange={event => {
                                const next = new Set(selectedIds)
                                event.target.checked ? next.add(action.action_id) : next.delete(action.action_id)
                                setSelectedIds(next)
                              }}
                            />
                          </td>
                          <td style={{ border: `1px solid ${colors.border}`, padding: 8 }}>{actionLabel(action.action_type)}</td>
                          <td style={{ border: `1px solid ${colors.border}`, padding: 8 }}>{shortPath(action.source_path)}</td>
                          <td style={{ border: `1px solid ${colors.border}`, padding: 8 }}>{shortPath(destination)}</td>
                          <td style={{ border: `1px solid ${colors.border}`, padding: 8 }}>{action.reason}</td>
                          <td style={{ border: `1px solid ${colors.border}`, padding: 8 }}>{Math.round(action.confidence * 100)}%</td>
                        </tr>
                      )
                    })}</tbody>
                  </table>
                </div>
              </section>

              <section style={panel}>
                <label style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                  <input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
                  専用の教材用ファイルだけを操作することを確認した
                </label>
                <button
                  type="button"
                  style={{ ...button(true, busy !== '' || !confirmed || selectedIds.size === 0), marginTop: 12 }}
                  disabled={busy !== '' || !confirmed || selectedIds.size === 0}
                  onClick={() => void executePlan()}
                >
                  {busy === 'execute' ? '実行中…' : `選択した${selectedIds.size}件を実行する`}
                </button>
              </section>

              {executeResult && (
                <section style={panel}>
                  <h3 style={{ marginTop: 0 }}>実行結果</h3>
                  <p>結果: {statusLabel(executeResult.result)} ／ 成功 {executeResult.success_count}件 ／ 失敗 {executeResult.failed_count}件</p>
                  <ul>{executeResult.item_results.map(item => <li key={item.action_id}>{item.action_id}: {statusLabel(item.status)}{item.error_code ? `（${item.error_code}）` : ''}</li>)}</ul>
                  <button type="button" style={button()} onClick={() => void showHistory()}>履歴と元に戻す操作を確認する</button>
                </section>
              )}
            </>
          )}
        </>
      )}

      {screen === 'history' && (
        <>
          <section style={panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>実行履歴</h3>
              <button type="button" style={button()} onClick={() => void loadExecutions()}>履歴を更新</button>
            </div>
            {executions.length === 0 ? <p>実行履歴はありません。</p> : (
              <div style={{ overflowX: 'auto', marginTop: 12 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead><tr>{['実行日時', '結果', '成功', '失敗', '詳細', '元に戻す'].map(value => <th key={value} style={{ border: `1px solid ${colors.border}`, padding: 8, textAlign: 'left', background: colors.pale }}>{value}</th>)}</tr></thead>
                  <tbody>{executions.map(execution => (
                    <tr key={execution.execution_id}>
                      <td style={{ border: `1px solid ${colors.border}`, padding: 8 }}>{new Date(execution.executed_at).toLocaleString('ja-JP')}</td>
                      <td style={{ border: `1px solid ${colors.border}`, padding: 8 }}>{statusLabel(execution.result)}</td>
                      <td style={{ border: `1px solid ${colors.border}`, padding: 8 }}>{execution.success_count}</td>
                      <td style={{ border: `1px solid ${colors.border}`, padding: 8 }}>{execution.failed_count}</td>
                      <td style={{ border: `1px solid ${colors.border}`, padding: 8 }}><button type="button" style={button()} onClick={() => void loadReport(execution.execution_id)}>結果を見る</button></td>
                      <td style={{ border: `1px solid ${colors.border}`, padding: 8 }}>
                        <button
                          type="button"
                          style={button(false, !execution.rollback_available || busy !== '')}
                          disabled={!execution.rollback_available || busy !== ''}
                          onClick={() => void rollback(execution.execution_id)}
                        >
                          {execution.rolled_back ? '元に戻し済み' : '元に戻す'}
                        </button>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>

          {report && (
            <section style={panel}>
              <h3 style={{ marginTop: 0 }}>実行内容</h3>
              <p>実行ID: {report.execution_id} ／ 結果: {statusLabel(report.result)}</p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead><tr>{['操作', '元のファイル', '操作後', '結果', '元に戻せるか', 'エラー'].map(value => <th key={value} style={{ border: `1px solid ${colors.border}`, padding: 8, textAlign: 'left', background: colors.pale }}>{value}</th>)}</tr></thead>
                  <tbody>{report.items.map((item, index) => (
                    <tr key={`${item.source_path}-${index}`}>
                      <td style={{ border: `1px solid ${colors.border}`, padding: 8 }}>{actionLabel(item.action_type)}</td>
                      <td style={{ border: `1px solid ${colors.border}`, padding: 8 }}>{shortPath(item.source_path)}</td>
                      <td style={{ border: `1px solid ${colors.border}`, padding: 8 }}>{shortPath(item.target_path)}</td>
                      <td style={{ border: `1px solid ${colors.border}`, padding: 8 }}>{statusLabel(item.status)}</td>
                      <td style={{ border: `1px solid ${colors.border}`, padding: 8 }}>{item.rollbackable ? 'はい' : 'いいえ'}</td>
                      <td style={{ border: `1px solid ${colors.border}`, padding: 8 }}>{item.error_code ?? '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </section>
          )}

          <section style={panel}>
            <h3 style={{ marginTop: 0 }}>手動実行の既定値</h3>
            <p>自動実行は行いません。ここで保存した値は、手動で整理案を作るときの設定です。</p>
            <label>確認するフォルダ<input style={input} readOnly value={watchFolder} /></label>
            <label style={{ display: 'block', marginTop: 12 }}>整理先フォルダ<input style={input} readOnly value={outputFolder} /></label>
            <label style={{ display: 'block', marginTop: 12 }}>対象外にする名前<textarea style={{ ...input, minHeight: 72 }} value={excludePatterns} onChange={event => setExcludePatterns(event.target.value)} /></label>
            <button type="button" style={{ ...button(true, busy !== ''), marginTop: 12 }} disabled={busy !== ''} onClick={() => void saveSettings()}>既定値を保存する</button>
          </section>
        </>
      )}
    </div>
  )
}
