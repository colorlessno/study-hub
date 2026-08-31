import { useState, useRef } from 'react'
import { createSystemClient } from '../api/client'

const client = createSystemClient('system16')

// ---- 型定義（基本設計書 IF仕様より） ----

type MatchLevel = 'S' | 'A' | 'B' | 'C'

interface ScoreBreakdown {
  technical_skills: number
  process_experience: number
  domain_experience: number
  role_experience: number
}

interface SimilarCase {
  summary: string
  similarity_score: number
  result: string | null
  notes: string | null
}

interface MatchReport {
  match_reasons: string
  strengths: string[]
  concerns: string[]
  check_points: string[]
  overall_comment: string
}

interface MatchResult {
  match_id: number
  score: number
  level: MatchLevel
  parse_confidence: number
  review_required: boolean
  review_reasons: string[]
  score_breakdown: ScoreBreakdown
  report: MatchReport
  similar_cases: SimilarCase[]
  bulk_id: number | null
  candidate_id: string | null
  created_at: string
}

interface ParsedSkillsheet {
  total_projects: number
  total_experience_years: number
  skills: {
    languages: string[]
    databases: string[]
    os: string[]
    tools: string[]
  }
  processes: string[]
  roles: string[]
  domains: string[]
}

interface ParseResult {
  layout_type: string
  parse_confidence: number
  review_required: boolean
  review_reasons: string[]
  unresolved_skills: string[]
  parsed_result: ParsedSkillsheet
}

interface MatchSummary {
  match_id: number
  score: number
  level: MatchLevel
  review_required: boolean
  bulk_id: number | null
  candidate_id: string | null
  created_at: string
}

type MatchDetail = MatchResult

interface BulkMatchResponse {
  bulk_id: number
  total_candidates: number
  results: MatchResult[]
}

// ---- 画面種別（基本設計書 セクション10） ----
type Screen = '単一マッチング画面' | 'ファイル・一括評価画面' | '過去事例・履歴画面'

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

// ---- 適合レベルバッジ ----
function LevelBadge({ value }: { value: MatchLevel }) {
  const colorMap: Record<MatchLevel, string> = {
    S: COLOR.ok,
    A: COLOR.primary,
    B: COLOR.warn,
    C: COLOR.danger,
  }
  return (
    <span style={{
      background: colorMap[value] ?? '#aaa',
      color: '#fff',
      borderRadius: 4,
      padding: '3px 10px',
      fontSize: '0.88rem',
      fontWeight: 'bold',
    }}>
      {value}
    </span>
  )
}

// ---- スコアバー ----
function ScoreBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100)
  const color = pct >= 80 ? COLOR.ok : pct >= 60 ? COLOR.primary : pct >= 40 ? COLOR.warn : COLOR.danger
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 3 }}>
        <span style={{ color: COLOR.text }}>{label}</span>
        <span style={{ color, fontWeight: 'bold' }}>{value.toFixed(0)}</span>
      </div>
      <div style={{ background: '#f0f0f0', borderRadius: 4, height: 8 }}>
        <div style={{ width: `${pct}%`, background: color, borderRadius: 4, height: 8, transition: 'width 0.4s' }} />
      </div>
    </div>
  )
}

// ---- 要レビューバッジ ----
function ReviewBadge({ required, reasons }: { required: boolean; reasons: string[] }) {
  if (!required) return null
  return (
    <div style={{ background: '#fff8e1', border: `1px solid ${COLOR.warn}`, borderRadius: 6, padding: '0.6rem 0.8rem', marginBottom: '1rem' }}>
      <div style={{ fontWeight: 'bold', color: '#7a5c00', fontSize: '0.88rem', marginBottom: 4 }}>
        ⚠ 要人確認レビュー
      </div>
      {reasons.map((r, i) => (
        <div key={i} style={{ fontSize: '0.82rem', color: '#7a5c00' }}>• {r}</div>
      ))}
    </div>
  )
}

// ---- マッチ結果パネル ----
function MatchResultPanel({ result }: { result: MatchResult }) {
  return (
    <div>
      <ReviewBadge required={result.review_required} reasons={result.review_reasons} />

      {/* スコア・レベル・信頼度（基本設計書 14.1 match_score / match_level / parse_confidence / review_required） */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: COLOR.primary }}>{result.score.toFixed(0)}</div>
          <div style={{ fontSize: '0.8rem', color: COLOR.muted }}>総合スコア</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <LevelBadge value={result.level} />
          <div style={{ fontSize: '0.8rem', color: COLOR.muted, marginTop: 4 }}>適合レベル</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: result.parse_confidence < 0.75 ? COLOR.warn : COLOR.ok }}>
            {(result.parse_confidence * 100).toFixed(0)}%
          </div>
          <div style={{ fontSize: '0.8rem', color: COLOR.muted }}>解析信頼度</div>
        </div>
      </div>

      {/* スコア内訳（基本設計書 14.1 score_breakdown） */}
      <div style={{ marginBottom: '1.2rem' }}>
        <span style={lbl()}>スコア内訳（4軸）</span>
        <ScoreBar label="技術スキル" value={result.score_breakdown.technical_skills} />
        <ScoreBar label="工程経験" value={result.score_breakdown.process_experience} />
        <ScoreBar label="ドメイン経験" value={result.score_breakdown.domain_experience} />
        <ScoreBar label="役割経験" value={result.score_breakdown.role_experience} />
      </div>

      {/* レポート（基本設計書 14.1 report） */}
      <div style={{ marginBottom: '1.2rem' }}>
        <span style={lbl()}>レポート</span>
        <div style={{ background: '#f8f8f2', borderRadius: 6, padding: '0.8rem' }}>
          <div style={{ marginBottom: '0.6rem' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: COLOR.ok, marginBottom: 2 }}>合致理由</div>
            <div style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>{result.report.match_reasons}</div>
            {result.report.strengths.map((strength, index) => (
              <div key={index} style={{ fontSize: '0.83rem', color: COLOR.text, padding: '1px 0' }}>• {strength}</div>
            ))}
          </div>
          {result.report.concerns.length > 0 && (
            <div style={{ marginBottom: '0.6rem' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: COLOR.warn, marginBottom: 2 }}>懸念点</div>
              {result.report.concerns.map((concern, index) => (
                <div key={index} style={{ fontSize: '0.83rem', color: COLOR.text, padding: '1px 0' }}>• {concern}</div>
              ))}
            </div>
          )}
          {result.report.check_points.length > 0 && (
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: COLOR.primary, marginBottom: 2 }}>確認ポイント</div>
              {result.report.check_points.map((p, i) => (
                <div key={i} style={{ fontSize: '0.83rem', color: COLOR.text, padding: '1px 0' }}>• {p}</div>
              ))}
            </div>
          )}
          <div style={{ marginTop: '0.6rem', fontSize: '0.85rem', lineHeight: 1.6 }}>
            <strong>総評:</strong> {result.report.overall_comment}
          </div>
        </div>
      </div>

      {/* 類似事例（基本設計書 14.1 similar_cases） */}
      {result.similar_cases.length > 0 && (
        <div>
          <span style={lbl()}>類似事例</span>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                {['要件概要', '類似度', '結果', '備考'].map(h => (
                  <th key={h} style={{ padding: '4px 8px', textAlign: 'left', border: `1px solid ${COLOR.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.similar_cases.map((sc, index) => (
                <tr key={`${sc.summary}-${index}`}>
                  <td style={{ padding: '4px 8px', border: `1px solid ${COLOR.border}` }}>{sc.summary}</td>
                  <td style={{ padding: '4px 8px', border: `1px solid ${COLOR.border}` }}>{(sc.similarity_score * 100).toFixed(1)}%</td>
                  <td style={{ padding: '4px 8px', border: `1px solid ${COLOR.border}` }}>{sc.result ?? '—'}</td>
                  <td style={{ padding: '4px 8px', border: `1px solid ${COLOR.border}`, color: COLOR.muted }}>{sc.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ============================================================
// メインコンポーネント
// ============================================================
export default function System16Page() {
  const [screen, setScreen] = useState<Screen>('単一マッチング画面')

  // ---- 単一マッチング画面（基本設計書 14.1） ----
  const [requirementText, setRequirementText] = useState('')
  const [candidateData, setCandidateData] = useState('')
  const [matching, setMatching] = useState(false)
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null)

  // ---- ファイル・一括評価画面（基本設計書 14.2） ----
  const [requirementFile, setRequirementFile] = useState<File | null>(null)
  const [skillsheetFile, setSkillsheetFile] = useState<File | null>(null)
  const [bulkCandidateFiles, setBulkCandidateFiles] = useState<File[]>([])
  const [fileMatching, setFileMatching] = useState(false)
  const [fileMatchResult, setFileMatchResult] = useState<MatchResult | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [parsing, setParsing] = useState(false)
  const [bulkResults, setBulkResults] = useState<MatchResult[]>([])
  const [bulkRunning, setBulkRunning] = useState(false)
  const reqFileRef = useRef<HTMLInputElement>(null)
  const ssFileRef = useRef<HTMLInputElement>(null)
  const bulkFileRef = useRef<HTMLInputElement>(null)

  // ---- 過去事例・履歴画面（基本設計書 14.3） ----
  const [pastCaseRequirement, setPastCaseRequirement] = useState('')
  const [pastCaseProfile, setPastCaseProfile] = useState('')
  const [pastCaseResult, setPastCaseResult] = useState('')
  const [pastCaseNotes, setPastCaseNotes] = useState('')
  const [pastCaseSubmitting, setPastCaseSubmitting] = useState(false)
  const [matchList, setMatchList] = useState<MatchSummary[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [matchDetail, setMatchDetail] = useState<MatchDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  // ---- 単一マッチング実行 ----
  async function handleMatch() {
    if (!requirementText.trim() || !candidateData.trim()) return
    setMatching(true)
    setMatchResult(null)
    setActionError('')
    try {
      const res = await client.post<MatchResult>('/match', {
        requirement_text: requirementText,
        candidate_text: candidateData,
      })
      setMatchResult(res.data)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'マッチングに失敗しました。')
    } finally {
      setMatching(false)
    }
  }

  // ---- ファイルマッチング ----
  async function handleFileMatch() {
    if (!requirementFile || !skillsheetFile) return
    setFileMatching(true)
    setFileMatchResult(null)
    setActionError('')
    try {
      const formData = new FormData()
      formData.append('requirement_file', requirementFile)
      formData.append('candidate_file', skillsheetFile)
      const res = await client.post<MatchResult>('/match/file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setFileMatchResult(res.data)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'ファイルマッチングに失敗しました。')
    } finally {
      setFileMatching(false)
    }
  }

  // ---- スキルシートパース ----
  async function handleParseSkillsheet() {
    if (!skillsheetFile) return
    setParsing(true)
    setParseResult(null)
    setActionError('')
    try {
      const formData = new FormData()
      formData.append('file', skillsheetFile)
      const res = await client.post<ParseResult>('/skillsheet/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setParseResult(res.data)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'スキルシート解析に失敗しました。')
    } finally {
      setParsing(false)
    }
  }

  // ---- 一括評価 ----
  async function handleBulkMatch() {
    if (!requirementText.trim() || bulkCandidateFiles.length === 0) return
    setBulkRunning(true)
    setBulkResults([])
    setActionError('')
    try {
      const formData = new FormData()
      formData.append('requirement_text', requirementText)
      bulkCandidateFiles.forEach(file => formData.append('candidate_files', file))
      const res = await client.post<BulkMatchResponse>('/match/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setBulkResults(res.data.results ?? [])
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '一括評価に失敗しました。')
    } finally {
      setBulkRunning(false)
    }
  }

  // ---- 過去事例登録 ----
  async function handleAddPastCase() {
    if (!pastCaseRequirement.trim() || !pastCaseProfile.trim() || !pastCaseResult.trim()) return
    setPastCaseSubmitting(true)
    setActionError('')
    try {
      await client.post('/knowledge/past-case', {
        requirement_summary: pastCaseRequirement,
        candidate_profile: pastCaseProfile,
        result: pastCaseResult,
        notes: pastCaseNotes,
      })
      setPastCaseRequirement('')
      setPastCaseProfile('')
      setPastCaseResult('')
      setPastCaseNotes('')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '過去事例の登録に失敗しました。')
    } finally {
      setPastCaseSubmitting(false)
    }
  }

  // ---- マッチング履歴取得 ----
  async function handleLoadMatches() {
    setListLoading(true)
    setMatchDetail(null)
    setActionError('')
    try {
      const res = await client.get<{ items: MatchSummary[] }>('/matches')
      setMatchList(res.data.items ?? [])
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'マッチング履歴の取得に失敗しました。')
    } finally {
      setListLoading(false)
    }
  }

  async function handleExportMatches() {
    setActionError('')
    try {
      const response = await client.get<Blob>('/matches/export', { responseType: 'blob' })
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = 'system16_matches.csv'
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'マッチング履歴のCSV出力に失敗しました。')
    }
  }

  // ---- マッチ詳細取得 ----
  async function handleLoadDetail(matchId: number) {
    setDetailLoading(true)
    setMatchDetail(null)
    setActionError('')
    try {
      const res = await client.get<MatchDetail>(`/matches/${matchId}`)
      setMatchDetail(res.data)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'マッチ詳細の取得に失敗しました。')
    } finally {
      setDetailLoading(false)
    }
  }

  // ============================================================
  // 画面レンダリング
  // ============================================================
  return (
    <div style={{ maxWidth: 1040 }}>
      <h2 style={{ color: COLOR.text, marginBottom: 4 }}>System16</h2>
      <p style={{ color: COLOR.muted, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        案件マッチングシステム（プロジェクト・スキルシート）
      </p>

      {actionError && (
        <div style={{ background: '#fff0f0', border: `1px solid ${COLOR.danger}`, borderRadius: 6, padding: '0.7rem 0.9rem', marginBottom: '1rem', color: '#8b1e2d' }}>
          {actionError}
        </div>
      )}

      {/* 画面タブナビゲーション（基本設計書 セクション10） */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', borderBottom: `2px solid ${COLOR.border}`, paddingBottom: 8 }}>
        {(['単一マッチング画面', 'ファイル・一括評価画面', '過去事例・履歴画面'] as Screen[]).map(s => (
          <button
            key={s}
            onClick={() => {
              setScreen(s)
              if (s === '過去事例・履歴画面') handleLoadMatches()
            }}
            style={{ ...btn(screen === s ? COLOR.primary : '#ccc'), fontSize: '0.85rem' }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ========== 単一マッチング画面 ========== */}
      {screen === '単一マッチング画面' && (
        <div>
          <div style={card()}>
            <h3 style={{ margin: '0 0 1rem', color: COLOR.text }}>単一マッチング画面</h3>

            {/* 基本設計書 14.1 入力項目 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <span style={lbl()}>案件要件 ＊</span>
                <textarea
                  style={{ ...field(), minHeight: 160, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.83rem' }}
                  value={requirementText}
                  onChange={e => setRequirementText(e.target.value)}
                  placeholder={'例：\n【必須】Java 5年以上、Spring Boot\n【歓迎】AWS、マイクロサービス設計経験\n【工程】設計〜結合テスト\n【役割】バックエンドエンジニア'}
                />
              </div>
              <div>
                <span style={lbl()}>候補者情報（マスク済み想定）＊</span>
                <textarea
                  style={{ ...field(), minHeight: 160, resize: 'vertical', fontFamily: 'monospace', fontSize: '0.83rem' }}
                  value={candidateData}
                  onChange={e => setCandidateData(e.target.value)}
                  placeholder={'例：\n経験年数：8年\n主要スキル：Java, Spring Boot, AWS\n工程：要件定義〜結合テスト\n役割：バックエンドエンジニア、チームリーダー'}
                />
              </div>
            </div>

            <button
              onClick={handleMatch}
              disabled={!requirementText.trim() || !candidateData.trim() || matching}
              style={btn(COLOR.primary, !requirementText.trim() || !candidateData.trim() || matching)}
            >
              {matching ? 'マッチング評価中...' : 'マッチング実行'}
            </button>
          </div>

          {/* マッチング結果（基本設計書 14.1 出力項目） */}
          {matchResult && (
            <div style={card()}>
              <h4 style={{ margin: '0 0 1rem', color: COLOR.ok }}>✓ 評価完了</h4>
              <MatchResultPanel result={matchResult} />
            </div>
          )}
        </div>
      )}

      {/* ========== ファイル・一括評価画面 ========== */}
      {screen === 'ファイル・一括評価画面' && (
        <div>
          <div style={card()}>
            <h3 style={{ margin: '0 0 1rem', color: COLOR.text }}>ファイル・一括評価画面</h3>

            {/* スキルシート単独パース（基本設計書 14.2 skillsheet_file） */}
            <div style={{ borderBottom: `1px solid ${COLOR.border}`, paddingBottom: '1.2rem', marginBottom: '1.2rem' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: COLOR.text, marginBottom: '0.8rem' }}>
                スキルシート解析（POST /skillsheet/parse）
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <span style={lbl()}>スキルシートファイル（xlsx）</span>
                  <input
                    ref={ssFileRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={e => setSkillsheetFile(e.target.files?.[0] ?? null)}
                    style={field()}
                  />
                </div>
                <button
                  onClick={handleParseSkillsheet}
                  disabled={!skillsheetFile || parsing}
                  style={{ ...btn(COLOR.primary, !skillsheetFile || parsing), marginTop: 20, whiteSpace: 'nowrap' }}
                >
                  {parsing ? '解析中...' : 'スキルシート解析'}
                </button>
              </div>

              {/* 解析結果（基本設計書 14.2 layout_type） */}
              {parseResult && (
                <div style={{ marginTop: '1rem', background: '#f8f8f2', borderRadius: 6, padding: '0.8rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span>レイアウト:
                      <span style={{
                        marginLeft: 4,
                        background: parseResult.review_required ? COLOR.warn : COLOR.ok,
                        color: '#fff', borderRadius: 4, padding: '1px 8px', fontSize: '0.78rem',
                      }}>
                        {parseResult.layout_type}
                      </span>
                    </span>
                    <span>信頼度: <strong>{(parseResult.parse_confidence * 100).toFixed(0)}%</strong></span>
                    <span>案件数: <strong>{parseResult.parsed_result.total_projects}</strong></span>
                    <span>経験年数: <strong>{parseResult.parsed_result.total_experience_years.toFixed(1)}年</strong></span>
                  </div>
                  <div style={{ color: COLOR.muted }}>
                    技術: {[
                      ...parseResult.parsed_result.skills.languages,
                      ...parseResult.parsed_result.skills.databases,
                      ...parseResult.parsed_result.skills.os,
                      ...parseResult.parsed_result.skills.tools,
                    ].join(', ') || '未検出'}
                  </div>
                  {parseResult.review_required && (
                    <div style={{ color: '#7a5c00', marginTop: 4, fontSize: '0.8rem' }}>
                      ⚠ 人確認を推奨: {[...parseResult.review_reasons, ...parseResult.unresolved_skills].join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ファイルマッチング（基本設計書 14.2 requirement_file / skillsheet_file） */}
            <div style={{ borderBottom: `1px solid ${COLOR.border}`, paddingBottom: '1.2rem', marginBottom: '1.2rem' }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: COLOR.text, marginBottom: '0.8rem' }}>
                ファイル入力マッチング（POST /match/file）
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.8rem' }}>
                <div>
                  <span style={lbl()}>要件ファイル（txt/pdf/docx）</span>
                  <input
                    ref={reqFileRef}
                    type="file"
                    accept=".txt,.pdf,.docx"
                    onChange={e => setRequirementFile(e.target.files?.[0] ?? null)}
                    style={field()}
                  />
                </div>
                <div>
                  <span style={lbl()}>スキルシートファイル（xlsx）</span>
                  <span style={{ fontSize: '0.8rem', color: COLOR.muted }}>（上記解析済みのファイルをそのまま使用）</span>
                </div>
              </div>
              <button
                onClick={handleFileMatch}
                disabled={!requirementFile || !skillsheetFile || fileMatching}
                style={btn(COLOR.primary, !requirementFile || !skillsheetFile || fileMatching)}
              >
                {fileMatching ? '評価中...' : 'ファイルマッチング実行'}
              </button>
            </div>

            {/* 一括評価（基本設計書 14.2 bulk_candidates） */}
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: COLOR.text, marginBottom: '0.8rem' }}>
                一括候補評価（POST /match/bulk）
              </div>
              <div style={{ marginBottom: '0.8rem' }}>
                <span style={lbl()}>案件要件テキスト（「単一マッチング画面」の入力欄と共有）</span>
                <textarea
                  style={{ ...field(), minHeight: 80, resize: 'vertical', fontSize: '0.83rem' }}
                  value={requirementText}
                  onChange={e => setRequirementText(e.target.value)}
                  placeholder="案件要件を入力してください"
                />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <span style={lbl()}>候補スキルシート（xlsx、選択順に一件ずつ評価）</span>
                  <input
                    ref={bulkFileRef}
                    type="file"
                    accept=".xlsx"
                    multiple
                    onChange={e => setBulkCandidateFiles(Array.from(e.target.files ?? []))}
                    style={field()}
                  />
                  <div style={{ marginTop: 4, fontSize: '0.78rem', color: COLOR.muted }}>{bulkCandidateFiles.length}件選択</div>
                </div>
                <button
                  onClick={handleBulkMatch}
                  disabled={!requirementText.trim() || bulkCandidateFiles.length === 0 || bulkRunning}
                  style={{ ...btn(COLOR.primary, !requirementText.trim() || bulkCandidateFiles.length === 0 || bulkRunning), marginTop: 20, whiteSpace: 'nowrap' }}
                >
                  {bulkRunning ? '順次評価中...' : '一括評価実行'}
                </button>
              </div>
            </div>
          </div>

          {/* ファイルマッチング結果 */}
          {fileMatchResult && (
            <div style={card()}>
              <h4 style={{ margin: '0 0 1rem', color: COLOR.ok }}>✓ ファイルマッチング完了</h4>
              <MatchResultPanel result={fileMatchResult} />
            </div>
          )}

          {/* 一括評価結果（基本設計書 14.2 bulk_results_grid） */}
          {bulkResults.length > 0 && (
            <div style={card()}>
              <h4 style={{ margin: '0 0 1rem', color: COLOR.text }}>一括評価結果</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    {['#', '候補', 'スコア', '適合レベル', '要レビュー', '主な理由'].map(h => (
                      <th key={h} style={{ padding: '5px 8px', textAlign: 'left', border: `1px solid ${COLOR.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bulkResults
                    .slice()
                    .sort((a, b) => b.score - a.score)
                    .map((r, index) => (
                      <tr key={r.match_id} style={{ background: r.review_required ? '#fff8e1' : undefined }}>
                        <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{index + 1}</td>
                        <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{r.candidate_id ?? `候補者${index + 1}`}</td>
                        <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, fontWeight: 'bold', color: COLOR.primary }}>{r.score.toFixed(0)}</td>
                        <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                          <LevelBadge value={r.level} />
                        </td>
                        <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, textAlign: 'center' }}>
                          {r.review_required ? <span style={{ color: COLOR.warn }}>⚠</span> : '—'}
                        </td>
                        <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, color: COLOR.muted }}>{r.report.match_reasons}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========== 過去事例・履歴画面 ========== */}
      {screen === '過去事例・履歴画面' && (
        <div>
          {/* 過去事例登録（基本設計書 14.3 past_case_editor） */}
          <div style={card()}>
            <h3 style={{ margin: '0 0 1rem', color: COLOR.text }}>過去事例・履歴画面</h3>
            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: COLOR.text, marginBottom: '0.8rem' }}>過去事例登録</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.8rem' }}>
              <div>
                <span style={lbl()}>要件概要 ＊</span>
                <textarea
                  style={{ ...field(), minHeight: 80, resize: 'vertical' }}
                  value={pastCaseRequirement}
                  onChange={e => setPastCaseRequirement(e.target.value)}
                  placeholder="案件の要件概要"
                />
              </div>
              <div>
                <span style={lbl()}>候補者プロフィール ＊</span>
                <textarea
                  style={{ ...field(), minHeight: 80, resize: 'vertical' }}
                  value={pastCaseProfile}
                  onChange={e => setPastCaseProfile(e.target.value)}
                  placeholder="候補者のスキル・経験概要"
                />
              </div>
              <div>
                <span style={lbl()}>結果 ＊</span>
                <input type="text" style={field()} value={pastCaseResult} onChange={e => setPastCaseResult(e.target.value)} placeholder="アサイン成功 / 不採用 / 辞退 など" />
              </div>
              <div>
                <span style={lbl()}>備考</span>
                <input type="text" style={field()} value={pastCaseNotes} onChange={e => setPastCaseNotes(e.target.value)} placeholder="特記事項があれば" />
              </div>
            </div>
            <button
              onClick={handleAddPastCase}
              disabled={!pastCaseRequirement.trim() || !pastCaseProfile.trim() || !pastCaseResult.trim() || pastCaseSubmitting}
              style={btn(COLOR.primary, !pastCaseRequirement.trim() || !pastCaseProfile.trim() || !pastCaseResult.trim() || pastCaseSubmitting)}
            >
              {pastCaseSubmitting ? '登録中...' : '過去事例登録'}
            </button>
          </div>

          {/* マッチング履歴（基本設計書 14.3 matches_grid） */}
          <div style={card()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ margin: 0, color: COLOR.text }}>マッチング履歴</h4>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleExportMatches} style={{ ...btn(COLOR.primary), fontSize: '0.85rem' }}>
                  CSV出力
                </button>
                <button onClick={handleLoadMatches} disabled={listLoading} style={{ ...btn('#6c6f85', listLoading), fontSize: '0.85rem' }}>
                  {listLoading ? '読込中...' : '更新'}
                </button>
              </div>
            </div>
            {matchList.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    {['ID', '候補', '一括ID', 'スコア', 'レベル', '要レビュー', '実行日', ''].map(h => (
                      <th key={h} style={{ padding: '5px 8px', textAlign: 'left', border: `1px solid ${COLOR.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matchList.map(m => (
                    <tr key={m.match_id} style={{ background: matchDetail?.match_id === m.match_id ? '#f0f4ff' : m.review_required ? '#fff8e1' : undefined }}>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{m.match_id}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{m.candidate_id ?? 'テキスト入力'}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{m.bulk_id ?? '—'}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, fontWeight: 'bold', color: COLOR.primary }}>{m.score.toFixed(0)}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}><LevelBadge value={m.level} /></td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}`, textAlign: 'center' }}>
                        {m.review_required ? <span style={{ color: COLOR.warn }}>⚠</span> : '—'}
                      </td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>{m.created_at?.slice(0, 10) ?? '—'}</td>
                      <td style={{ padding: '5px 8px', border: `1px solid ${COLOR.border}` }}>
                        <button
                          onClick={() => handleLoadDetail(m.match_id)}
                          disabled={detailLoading}
                          style={{ ...btn(COLOR.primary, detailLoading), fontSize: '0.78rem', padding: '2px 10px' }}
                        >
                          詳細
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              !listLoading && (
                <div style={{ color: COLOR.muted, fontSize: '0.9rem', textAlign: 'center', padding: '1rem' }}>
                  履歴がありません
                </div>
              )
            )}
          </div>

          {/* マッチ詳細（基本設計書 14.3 match_detail） */}
          {matchDetail && (
            <div style={card()}>
              <h4 style={{ margin: '0 0 1rem', color: COLOR.text }}>
                マッチ詳細 — ID: {matchDetail.match_id}（{matchDetail.created_at?.slice(0, 10)}）
              </h4>
              <MatchResultPanel result={matchDetail} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
