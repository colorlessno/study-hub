import { useEffect, useMemo, useState } from 'react'
import { createSystemClient } from '../api/client'

type Metadata = {
  system_id: string
  title: string
  category: string
  default_input: Record<string, unknown>
  observation_hint: string
  samples: { id: string; label: string; input: Record<string, unknown> }[]
}

type RunResult = {
  run_id: string
  system_id: string
  title: string
  category: string
  input: Record<string, unknown>
  result: Record<string, unknown>
  observation: string
  created_at: string
}

type Props = {
  systemId: string
}

type ScreenCopy = {
  title: string
  description: string
  inputHelp: string
  resultHelp: string
}

const screenCopies: Record<string, ScreenCopy> = {
  system17: {
    title: 'トークン分割の観察',
    description: '文章を簡易的に分割し、文字数と推定トークン数、入力上限の関係を確認します。',
    inputHelp: 'textに比較する文章、context_limitに推定トークン数の上限を指定します。',
    resultHelp: '文字数、推定トークン数、分割結果、上限超過の有無を比較します。',
  },
  system18: {
    title: '文章の類似検索',
    description: '検索文と候補文書をEmbeddingモデルでベクトル化し、意味の近さを検索順位として確認します。',
    inputHelp: 'queryに検索文、documentsに候補文書、top_kに取得件数を指定します。',
    resultHelp: '使用モデル、ベクトル次元、保存件数、cosine類似度、根拠文を確認します。',
  },
  system19: {
    title: 'Attentionの関係表示',
    description: '文章を分割し、単語同士の関係を正方行列として表示する仕組みを確認します。',
    inputHelp: 'sentenceに文章、focus_token_indexに注目する単語の位置を指定します。',
    resultHelp: '分割した単語、関係行列、注目した単語から各単語への値を確認します。',
  },
  system20: {
    title: 'コンテキスト上限の実験',
    description: '重要情報を先頭・中央・末尾へ置き、入力上限を超えたときの回答可否を比較します。',
    inputHelp: '入力例を選ぶか、textに長い文章、context_limitに上限、important_markerに確認対象の語句を指定します。',
    resultHelp: '上限内と上限外の文章、重要情報の位置、回答可否、長文を扱うための対策を確認します。',
  },
  system21: {
    title: 'Temperatureの比較',
    description: '同じ指示をLM Studioへ一件ずつ順番に送り、Temperatureごとの回答差と再現性を比較します。',
    inputHelp: 'prompt、temperatures、trial_countに加え、実モデルを使うmodelまたは明示的なmockと、業務種別を指定します。',
    resultHelp: '実際の回答、モデル名、Temperature別の回答差、推奨設定、保存状態、学習メモを確認します。',
  },
  system22: {
    title: 'RAGの文書分割比較',
    description: '同じ文書と固定質問を複数の分割条件へ一件ずつ順番に適用し、根拠の分断、検索順位、回答範囲を比較します。',
    inputHelp: 'document、question_set、比較する2件以上のchunk_configs、学習メモを指定します。入力例から分割サイズ比較または重複幅比較を選べます。',
    resultHelp: '条件ごとの文書断片、質問別の検索上位、抽出回答、期待語句の保持率、根拠の分断、保存状態を比較します。',
  },
  system23: {
    title: '検索結果の並べ替え比較',
    description: '検索文と候補文書をLM Studioへ一件ずつ順番に送り、Embedding検索順位と、初期候補をローカル特徴Rerankerで再評価した順位を比較します。',
    inputHelp: 'query、idとtextを持つdocuments、initial_top_k、rerank_top_k、correct_document_id、modelまたは明示的なmock、学習メモを指定します。',
    resultHelp: '初期順位と再順位、正解文書の順位改善、EmbeddingとRerankerの遅延、処理件数、保存状態を確認します。',
  },
  system24: {
    title: '複数モデルの比較',
    description: '同じ指示と評価基準で複数モデルへ入力順に一件ずつ実通信し、回答品質、応答時間、推定費用、運用条件を比較します。',
    inputHelp: 'prompt、2～5件のモデル設定、固定するevaluation_rubric、priority、temperature、modelまたは明示的なmock、学習メモを指定します。',
    resultHelp: '実際の回答、必須語句の網羅率、回答長、実測時間、トークン数、推定費用、採用・不採用理由、保存状態を確認します。',
  },
  system25: {
    title: '出力上限とTemperatureの比較',
    description: '同じ指示を指定モデルへ条件順・試行順に一件ずつ送り、出力上限による途中切れとTemperatureによる回答差を比較します。',
    inputHelp: 'prompt、model、max_tokens_values、temperatures、trial_count、modelまたは明示的なmock、学習メモを指定します。',
    resultHelp: '試行ごとの回答、終了理由、トークン数、応答時間と条件別集計を比べ、実務で使う候補設定を確認します。',
  },
  system26: {
    title: '量子化方式の比較',
    description: '同じ指示と評価条件で量子化モデルを入力順に一件ずつ実行し、回答、応答時間、メモリ使用量、品質点を比較します。',
    inputHelp: 'prompt、quantization_profiles、runtime_metrics、evaluation_rubric、selection_priority、modelまたは明示的なmock、学習メモを指定します。実モデルではLM Studio上のモデル名と実測メモリ使用量へ書き換えます。',
    resultHelp: '実際の回答、応答モデル、入力したメモリ使用量、実測応答時間、固定基準の品質点、用途別の最良候補、保存状態を確認します。',
  },
  system27: {
    title: '画像サイズとVLM評価の比較',
    description: '同じ画像をサイズ・JPEG品質別に変換し、入力順に一件ずつVLMへ送り、回答、読み取れた要点、読み落としを比較します。',
    inputHelp: 'mode、model、task_prompt、sample_image、2～6件のimage_variants、expected_points、明示的なmock_responses、学習メモを指定します。modelはLM StudioのVLMへ各画像を送信します。',
    resultHelp: '実際に生成した画像、データ量、VLM回答、要点網羅率、読み落とし、応答時間、推奨サイズ、保存状態を確認します。',
  },
  system28: {
    title: 'OCR文字列の正規化',
    description: 'OCRで読み取った文字列をバックエンドへ送り、正規化規則と誤認識辞書を順番に適用して結果を保存します。',
    inputHelp: 'ocr_textにOCR文字列、rulesにspace・zenkaku・dictionary・ocr_o_zero、correction_dictionaryに明示的な誤認識の置換を指定します。',
    resultHelp: '変更前後、規則別の差分、補正の信頼度、人手確認が必要な箇所、JSON保存状態を確認します。',
  },
  system29: {
    title: '文書断片のメタデータ設計',
    description: '文書断片へ追跡用metadataを付け、バックエンドの検索前フィルタ、根拠表示、保存履歴を確認します。',
    inputHelp: 'document、query、metadataのsource・page・section・permission・updated_at、metadata_filter、学習メモを指定します。',
    resultHelp: 'metadata JSON、フィルタ判定、検索結果、引用表示、追跡項目、JSON保存状態を確認します。',
  },
  system30: {
    title: '重複文書の検出',
    description: '文書集合をバックエンドへ送り、完全一致・版違い・類似候補を検出して優先・除外判断と結果を保存します。',
    inputHelp: 'documentsに文書番号・題名・版・本文、query、similarity_threshold、resolution、学習メモを指定します。',
    resultHelp: '全組合せ、重複グループ、版違い、採用・除外判断、検索偏り、JSON保存状態を確認します。',
  },
  system31: {
    title: '評価用正解データの作成',
    description: '質問、期待する回答、根拠文書、評価観点、レビューを一つの正解データとして固定し、評価前に再利用できる状態で保存します。',
    inputHelp: 'dataset_name、source_document、question、expected_answer、evidence、evaluation_viewpoints、review、学習メモを指定します。',
    resultHelp: '正解データ、根拠の追跡、評価観点の重み、レビュー履歴、不足項目、JSON保存状態を確認します。',
  },
  system32: {
    title: 'RAG評価セットの実行',
    description: '固定した正解データとRAG設定に対する検索結果・回答結果を保存し、検索失敗と生成失敗、前回実行との差を分けて確認します。',
    inputHelp: 'dataset_name、run_label、rag_config、ground_truth_cases、学習メモを指定します。各ケースには正解文書、検索結果、生成回答を含めます。',
    resultHelp: 'ケース別の検索・生成結果、失敗箇所、全体指標、前回実行との差、JSON保存状態を確認します。',
  },
  system33: {
    title: '検索評価の実行',
    description: '複数の質問について順位付き検索結果を正解文書と照合し、検索指標、失敗ケース、chunk設定変更による差を保存して確認します。',
    inputHelp: 'evaluation_name、chunk_setting、top_k、query_casesを指定します。各ケースには質問、正解文書、順位付き検索結果を含めます。',
    resultHelp: 'ケース別のHit・Recall・Precision・逆順位、失敗分類、全体指標、前回実行との差、JSON保存状態を確認します。',
  },
  system34: {
    title: '回答内容の評価',
    description: '質問、必要な回答要素、根拠、回答内の主張を対応付け、正確性、根拠性、網羅性、簡潔性を同じ条件で評価して保存します。',
    inputHelp: 'evaluation_name、question、expected_answer、expected_points、evidence、generated_answer、answer_claims、学習メモを指定します。回答内の主張には対応する根拠と回答要素を設定します。',
    resultHelp: '4観点の点数、回答要素と主張の判定、回答不足・根拠のない主張・不要情報の分類、改善内容、JSON保存状態を確認します。',
  },
  system35: {
    title: 'Prompt A/B比較',
    description: '同じ実行条件と評価ケースで記録したA/B回答を採点し、改善・悪化ケースとPromptの採用理由を保存します。',
    inputHelp: 'experiment_name、prompt_a、prompt_b、fixed_conditions、scoring_weights、evaluation_cases、adoption_recordを指定します。各ケースにはA/Bの記録済み回答と判定語句を含めます。',
    resultHelp: 'A/Bの平均点、観点別の点数、ケース別の差、改善・悪化、採用判断、JSON保存状態を確認します。',
  },
  system36: {
    title: '実行Traceの作成',
    description: '入力、検索根拠、モデル設定、Prompt、出力、評価を一つのTraceとして保存し、再現性・監査性と機密値の扱いを確認します。',
    inputHelp: 'Trace名、入力、検索根拠、モデル設定、Prompt本文・版、出力、評価、マスク対象を指定します。',
    resultHelp: '保存したTraceの内容、評価との対応、不足項目、マスク結果、再実行条件、JSON保存状態を確認します。',
  },
}

const asRecord = (value: unknown): Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
)

const asArray = (value: unknown): unknown[] => Array.isArray(value) ? value : []

const displayValue = (value: unknown): string => {
  if (value === true) return 'はい'
  if (value === false) return 'いいえ'
  if (value === null || value === undefined || value === '') return '－'
  return String(value)
}

const styles = {
  card: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '1rem',
  },
  label: {
    display: 'block',
    fontWeight: 700,
    marginBottom: 6,
    color: '#1f2937',
  },
  textarea: {
    width: '100%',
    minHeight: 180,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    fontSize: '0.88rem',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    padding: '0.75rem',
  },
  button: {
    background: '#2563eb',
    color: '#fff',
    border: 0,
    borderRadius: 6,
    padding: '0.65rem 1rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  pre: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    fontSize: '0.82rem',
  },
  output: {
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    border: '1px solid #dbe3ec',
    borderRadius: 6,
    background: '#f8fafc',
    padding: '0.7rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.88rem',
  },
  cell: {
    border: '1px solid #dbe3ec',
    padding: '0.55rem',
    textAlign: 'left',
    verticalAlign: 'top',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
  },
} as const

function Metric({ label, value }: { label: string; value: unknown }) {
  return (
    <div style={{ border: '1px solid #dbe3ec', borderRadius: 6, padding: '0.7rem' }}>
      <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{label}</div>
      <div style={{ fontWeight: 700, marginTop: 4 }}>{displayValue(value)}</div>
    </div>
  )
}

function DataTable({ rows, columns }: {
  rows: Record<string, unknown>[]
  columns: { key: string; label: string }[]
}) {
  if (rows.length === 0) return <p style={{ color: '#64748b' }}>表示する結果はありません。</p>
  return (
    <div style={{ overflowX: 'auto', minWidth: 0, maxWidth: '100%' }}>
      <table style={{ ...styles.table, minWidth: columns.length >= 7 ? 960 : undefined }}>
        <thead>
          <tr>{columns.map((column) => <th key={column.key} style={styles.cell}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => <td key={column.key} style={styles.cell}>{displayValue(row[column.key])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ResultView({ systemId, result }: {
  systemId: string
  result: Record<string, unknown>
}) {
  if (Object.keys(result).length === 0) {
    return <p style={{ color: '#64748b' }}>入力を確認して「実行」を押すと、ここに結果が表示されます。</p>
  }

  if (systemId === 'system17') {
    return <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(120px, 1fr))', gap: '0.6rem' }}>
        <Metric label="文字数" value={result.char_count} />
        <Metric label="推定トークン数" value={result.estimated_tokens} />
        <Metric label="上限を超えたか" value={result.over_limit} />
      </div>
      <p><strong>保存結果:</strong> {displayValue(result.storage_status)}</p>
      <h3>分割結果</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
        {asArray(result.token_segments).map((token, index) => (
          <code key={index} style={{ background: '#eef2f7', padding: '0.25rem 0.4rem', borderRadius: 4 }}>{displayValue(token)}</code>
        ))}
      </div>
      <h3>注意点メモ</h3>
      <ul>
        {asArray(result.notes).map((note, index) => <li key={index}>{displayValue(note)}</li>)}
      </ul>
    </>
  }

  if (systemId === 'system18') {
    return <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(120px, 1fr))', gap: '0.6rem' }}>
        <Metric label="Embeddingモデル" value={result.embedding_model} />
        <Metric label="ベクトル次元" value={result.embedding_dimension} />
        <Metric label="保存した文書数" value={result.stored_document_count} />
      </div>
      <p><strong>保存結果:</strong> {displayValue(result.storage_status)}</p>
      <h3>類似検索結果</h3>
      <DataTable
        rows={asArray(result.results).map(asRecord)}
        columns={[
          { key: 'rank', label: '順位' },
          { key: 'document_id', label: '文書番号' },
          { key: 'evidence_text', label: '根拠文' },
          { key: 'score', label: 'cosine類似度' },
        ]}
      />
    </>
  }

  if (systemId === 'system19') {
    const tokens = asArray(result.tokens)
    const matrix = asArray(result.attention_matrix).map(asArray)
    return <>
      <h3>分割した単語</h3>
      <p>{tokens.map(displayValue).join(' / ') || '－'}</p>
      <p><strong>注目する単語の位置:</strong> {displayValue(result.focus_token_index)}</p>
      <p><strong>保存結果:</strong> {displayValue(result.storage_status)}</p>
      <h3>関係行列</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead><tr><th style={styles.cell}>単語</th>{tokens.map((token, index) => <th key={index} style={styles.cell}>{displayValue(token)}</th>)}</tr></thead>
          <tbody>{matrix.map((row, rowIndex) => <tr key={rowIndex}><th style={styles.cell}>{displayValue(tokens[rowIndex])}</th>{row.map((value, columnIndex) => <td key={columnIndex} style={styles.cell}>{displayValue(value)}</td>)}</tr>)}</tbody>
        </table>
      </div>
    </>
  }

  if (systemId === 'system20') {
    return <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))', gap: '0.6rem' }}>
        <Metric label="推定トークン数" value={result.estimated_tokens} />
        <Metric label="入力上限" value={result.context_limit} />
        <Metric label="上限外の推定トークン数" value={result.over_limit_token_count} />
        <Metric label="重要情報の位置" value={result.important_position} />
      </div>
      <p><strong>回答可否:</strong> {result.answerable ? '回答できる' : '回答できない'}</p>
      <p><strong>判定結果:</strong> {displayValue(result.answer_result)}</p>
      <p><strong>失われた重要語句:</strong> {asArray(result.missing_markers).join('、') || 'なし'}</p>
      <p><strong>保存状態:</strong> {displayValue(result.storage_status)}</p>
      <h3>上限内に残った文章</h3>
      <div style={styles.output}>{displayValue(result.retained_text)}</div>
      <h3>上限外になった文章</h3>
      <div style={styles.output}>{displayValue(result.discarded_text) || 'なし'}</div>
      {asArray(result.mitigation_options).length > 0 && <>
        <h3>長い文章を扱う方法</h3>
        <ul>{asArray(result.mitigation_options).map((item, index) => <li key={index}>{displayValue(item)}</li>)}</ul>
      </>}
      <h3>確認上の注意</h3>
      <ul>{asArray(result.notes).map((note, index) => <li key={index}>{displayValue(note)}</li>)}</ul>
    </>
  }

  if (systemId === 'system21') {
    const summary = asRecord(result.diff_summary)
    const learningNote = asRecord(result.learning_note)
    return <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))', gap: '0.6rem' }}>
        <Metric label="生成方法" value={result.generation_mode === 'model' ? '実モデル' : '明示的なモック'} />
        <Metric label="回答件数" value={summary.count} />
        <Metric label="異なる回答数" value={summary.unique_response_count} />
        <Metric label="保存状態" value={result.storage_status} />
      </div>
      <h3>生成結果</h3>
      <DataTable rows={asArray(result.runs).map(asRecord)} columns={[{ key: 'temperature', label: 'Temperature' }, { key: 'trial', label: '試行' }, { key: 'model', label: 'モデル' }, { key: 'text', label: '回答' }, { key: 'input_tokens', label: '入力トークン' }, { key: 'output_tokens', label: '出力トークン' }]} />
      <h3>Temperature別の比較</h3>
      <DataTable rows={asArray(summary.per_temperature).map(asRecord)} columns={[{ key: 'temperature', label: 'Temperature' }, { key: 'trial_count', label: '試行回数' }, { key: 'unique_response_count', label: '異なる回答数' }, { key: 'average_length', label: '平均文字数' }, { key: 'reproducibility_ratio', label: '再現性の簡易比率' }]} />
      <p><strong>比較した業務:</strong> {result.task_type === 'fixed' ? '定型業務' : '発想業務'}</p>
      <p><strong>設定判断:</strong> {displayValue(result.recommendation)}</p>
      <h3>学習メモ</h3>
      <DataTable rows={[learningNote]} columns={[{ key: 'observation', label: '観察結果' }, { key: 'decision', label: '判断理由' }, { key: 'risk_note', label: '注意点' }]} />
      <h3>確認上の注意</h3>
      <ul>{asArray(result.notes).map((note, index) => <li key={index}>{displayValue(note)}</li>)}</ul>
    </>
  }

  if (systemId === 'system22') {
    const comparisons = asArray(result.comparisons).map(asRecord)
    const recommendation = asRecord(result.recommendation)
    const learningNote = asRecord(result.learning_note)
    return <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))', gap: '0.6rem' }}>
        <Metric label="文書文字数" value={result.document_length} />
        <Metric label="固定質問数" value={result.question_count} />
        <Metric label="比較条件数" value={result.comparison_count} />
        <Metric label="保存状態" value={result.storage_status} />
      </div>
      <h3>条件別の比較</h3>
      <DataTable
        rows={comparisons.map((comparison) => {
          const summary = asRecord(comparison.summary)
          return { ...comparison, ...summary }
        })}
        columns={[
          { key: 'label', label: '条件' },
          { key: 'chunk_size', label: '分割サイズ' },
          { key: 'overlap', label: '重複幅' },
          { key: 'chunk_count', label: '分割数' },
          { key: 'average_top_score', label: '検索1位の平均点' },
          { key: 'average_expected_term_coverage', label: '期待語句の平均保持率' },
          { key: 'evidence_split_count', label: '根拠分断数' },
        ]}
      />
      <p><strong>比較上の推奨条件:</strong> {displayValue(recommendation.label)}（{displayValue(recommendation.config_id)}）</p>
      <p><strong>推奨理由:</strong> {displayValue(recommendation.reason)}</p>
      {comparisons.map((comparison) => <section key={String(comparison.config_id)} style={{ marginTop: '1rem' }}>
        <h3>{displayValue(comparison.label)}</h3>
        <h4>分割した文書</h4>
        <DataTable rows={asArray(comparison.chunks).map(asRecord)} columns={[{ key: 'index', label: '番号' }, { key: 'start', label: '開始位置' }, { key: 'end', label: '終了位置' }, { key: 'text', label: '文書断片' }]} />
        <h4>固定質問の検索・回答結果</h4>
        <DataTable
          rows={asArray(comparison.question_results).map((value) => {
            const question = asRecord(value)
            const top = asRecord(asArray(question.retrieval_results)[0])
            return { ...question, top_chunk: top.chunk_index, top_score: top.score }
          })}
          columns={[
            { key: 'question', label: '質問' },
            { key: 'top_chunk', label: '検索1位' },
            { key: 'top_score', label: '検索点' },
            { key: 'answer', label: '抽出回答' },
            { key: 'matched_expected_terms', label: '保持した期待語句' },
            { key: 'expected_term_coverage', label: '期待語句の保持率' },
            { key: 'evidence_split', label: '根拠が分断' },
          ]}
        />
      </section>)}
      <h3>学習メモ</h3>
      <DataTable rows={[learningNote]} columns={[{ key: 'observation', label: '観察結果' }, { key: 'decision', label: '判断理由' }, { key: 'risk_note', label: '注意点' }]} />
      <h3>確認上の注意</h3>
      <ul>{asArray(result.evaluation_notes).map((note, index) => <li key={index}>{displayValue(note)}</li>)}</ul>
    </>
  }

  if (systemId === 'system23') {
    const correct = asRecord(result.correct_document)
    const latency = asRecord(result.latency_summary)
    const processing = asRecord(result.processing_summary)
    const learningNote = asRecord(result.learning_note)
    return <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))', gap: '0.6rem' }}>
        <Metric label="初期検索" value={result.search_mode_label} />
        <Metric label="正解の初期順位" value={correct.initial_rank} />
        <Metric label="正解の再順位" value={correct.rerank_rank} />
        <Metric label="保存状態" value={result.storage_status} />
      </div>
      <p><strong>Reranker:</strong> {displayValue(result.reranker_method)}</p>
      <p><strong>比較結果:</strong> {displayValue(result.judgement)}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(260px, 1fr))', gap: '0.8rem' }}>
        <div><h3>Embedding検索の初期順位</h3><DataTable rows={asArray(result.initial_ranking).map(asRecord)} columns={[{ key: 'initial_rank', label: '順位' }, { key: 'document_id', label: '文書ID' }, { key: 'text', label: '候補文書' }, { key: 'semantic_score', label: '意味類似度' }]} /></div>
        <div><h3>Reranker適用後</h3><DataTable rows={asArray(result.reranked_ranking).map(asRecord)} columns={[{ key: 'rerank_rank', label: '順位' }, { key: 'document_id', label: '文書ID' }, { key: 'text', label: '候補文書' }, { key: 'semantic_score', label: '意味類似度' }, { key: 'lexical_score', label: '文字の重なり' }, { key: 'phrase_bonus', label: '完全一致加点' }, { key: 'rerank_score', label: '再評価点' }]} /></div>
      </div>
      <h3>遅延と処理件数</h3>
      <DataTable rows={[{ ...latency, ...processing }]} columns={[{ key: 'initial_search_ms', label: '初期検索（ミリ秒）' }, { key: 'rerank_ms', label: '再順位付け（ミリ秒）' }, { key: 'total_ms', label: '合計（ミリ秒）' }, { key: 'embedding_input_count', label: 'Embedding入力件数' }, { key: 'reranked_candidate_count', label: '再評価候補数' }]} />
      <h3>学習メモ</h3>
      <DataTable rows={[learningNote]} columns={[{ key: 'observation', label: '観察結果' }, { key: 'decision', label: '判断理由' }, { key: 'risk_note', label: '注意点' }]} />
      <h3>確認上の注意</h3>
      <ul>{asArray(result.notes).map((note, index) => <li key={index}>{displayValue(note)}</li>)}</ul>
    </>
  }

  if (systemId === 'system24') {
    const conditions = asRecord(result.fixed_conditions)
    const rubric = asRecord(conditions.evaluation_rubric)
    return <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(150px, 1fr))', gap: '0.6rem' }}>
        <Metric label="比較方法" value={result.comparison_mode_label} />
        <Metric label="優先条件" value={result.priority} />
        <Metric label="採用候補" value={result.selected_model} />
        <Metric label="保存状態" value={result.storage_status} />
      </div>
      <p><strong>固定した指示:</strong> {displayValue(conditions.prompt)}</p>
      <p><strong>固定した評価:</strong> 必須語句 {asArray(rubric.required_terms).map(displayValue).join('、')} ／ 回答長 {displayValue(rubric.max_length)}文字以内 ／ Temperature {displayValue(conditions.temperature)}</p>
      <p><strong>採用理由:</strong> {displayValue(result.selection_reason)}</p>
      <h3>モデル別の実測結果</h3>
      <DataTable rows={asArray(result.model_results).map(asRecord)} columns={[{ key: 'label', label: '比較名' }, { key: 'requested_model', label: '指定モデル' }, { key: 'response_model', label: '応答モデル' }, { key: 'quality_score', label: '品質点' }, { key: 'coverage_ratio', label: '必須語句の網羅率' }, { key: 'elapsed_ms', label: '応答時間（ミリ秒）' }, { key: 'input_tokens', label: '入力トークン' }, { key: 'output_tokens', label: '出力トークン' }, { key: 'estimated_cost', label: '推定費用' }, { key: 'balanced_score', label: '総合点' }, { key: 'operational_note', label: '運用条件' }, { key: 'answer', label: '回答' }]} />
      <h3>不採用理由</h3>
      <DataTable rows={asArray(result.rejected_models).map(asRecord)} columns={[{ key: 'model_id', label: '比較ID' }, { key: 'reason', label: '理由' }]} />
      <h3>学習メモ</h3>
      <DataTable rows={[asRecord(result.learning_note)]} columns={[{ key: 'observation', label: '観察結果' }, { key: 'decision', label: '採用判断' }, { key: 'risk_note', label: '残る注意点' }]} />
      <h3>確認上の注意</h3>
      <ul>{asArray(result.notes).map((note, index) => <li key={index}>{displayValue(note)}</li>)}</ul>
    </>
  }

  if (systemId === 'system25') {
    const conditions = asRecord(result.fixed_conditions)
    const recommendation = asRecord(result.recommendation)
    return <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(150px, 1fr))', gap: '0.6rem' }}>
        <Metric label="比較方法" value={result.generation_mode_label} />
        <Metric label="指定モデル" value={conditions.model} />
        <Metric label="各条件の試行回数" value={conditions.trial_count} />
        <Metric label="保存状態" value={result.storage_status} />
      </div>
      <p><strong>固定した指示:</strong> {displayValue(conditions.prompt)}</p>
      <h3>試行ごとの実測結果</h3>
      <DataTable rows={asArray(result.matrix_results).map(asRecord)} columns={[{ key: 'max_tokens', label: '出力上限' }, { key: 'temperature', label: 'Temperature' }, { key: 'trial', label: '試行' }, { key: 'finish_reason', label: '終了理由' }, { key: 'cutoff', label: '途中切れ' }, { key: 'output_tokens', label: '出力トークン' }, { key: 'output_length', label: '出力文字数' }, { key: 'elapsed_ms', label: '応答時間（ミリ秒）' }, { key: 'response_model', label: '応答モデル' }, { key: 'output', label: '回答' }]} />
      <h3>条件別の集計</h3>
      <DataTable rows={asArray(result.setting_summaries).map(asRecord)} columns={[{ key: 'max_tokens', label: '出力上限' }, { key: 'temperature', label: 'Temperature' }, { key: 'trial_count', label: '試行数' }, { key: 'cutoff_count', label: '途中切れ回数' }, { key: 'cutoff_rate', label: '途中切れ率' }, { key: 'unique_output_count', label: '異なる回答数' }, { key: 'average_output_tokens', label: '平均出力トークン' }, { key: 'average_elapsed_ms', label: '平均応答時間' }]} />
      <p><strong>候補設定:</strong> 出力上限 {displayValue(recommendation.max_tokens)} ／ Temperature {displayValue(recommendation.temperature)}</p>
      <p><strong>選定理由:</strong> {displayValue(recommendation.reason)}</p>
      <h3>学習メモ</h3>
      <DataTable rows={[asRecord(result.learning_note)]} columns={[{ key: 'observation', label: '観察結果' }, { key: 'decision', label: '採用判断' }, { key: 'risk_note', label: '残る注意点' }]} />
      <h3>確認上の注意</h3>
      <ul>{asArray(result.notes).map((note, index) => <li key={index}>{displayValue(note)}</li>)}</ul>
    </>
  }

  if (systemId === 'system26') {
    const conditions = asRecord(result.fixed_conditions)
    const rubric = asRecord(conditions.evaluation_rubric)
    const summary = asRecord(result.runtime_summary)
    return <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '0.6rem' }}>
        <Metric label="比較方法" value={result.comparison_mode_label} />
        <Metric label="優先条件" value={result.selection_priority} />
        <Metric label="採用候補" value={result.selected_profile} />
        <Metric label="保存状態" value={result.storage_status} />
      </div>
      <p><strong>固定した指示:</strong> {displayValue(conditions.prompt)}</p>
      <p><strong>固定した評価:</strong> 必須語句 {asArray(rubric.required_terms).map(displayValue).join('、')} ／ 回答長 {displayValue(rubric.max_length)}文字以内 ／ Temperature {displayValue(conditions.temperature)}</p>
      <p><strong>選択理由:</strong> {displayValue(result.selection_reason)}</p>
      <h3>量子化プロファイル別の比較</h3>
      <DataTable rows={asArray(result.profile_results).map(asRecord)} columns={[{ key: 'label', label: '比較名' }, { key: 'quantization', label: '量子化方式' }, { key: 'requested_model', label: '指定モデル' }, { key: 'response_model', label: '応答モデル' }, { key: 'memory_mb', label: 'メモリ使用量（MB）' }, { key: 'elapsed_ms', label: '応答時間（ミリ秒）' }, { key: 'quality_score', label: '品質点' }, { key: 'coverage_ratio', label: '必須語句の網羅率' }, { key: 'balanced_score', label: '総合点' }, { key: 'environment_note', label: '実行環境メモ' }, { key: 'answer', label: '回答' }]} />
      <h3>用途別の比較結果</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '0.6rem' }}>
        <Metric label="メモリ使用量が最小" value={summary.lowest_memory_profile} />
        <Metric label="応答時間が最短" value={summary.fastest_profile} />
        <Metric label="品質点が最高" value={summary.highest_quality_profile} />
      </div>
      <p><strong>トレードオフ:</strong> {displayValue(result.tradeoff_note)}</p>
      <h3>学習メモ</h3>
      <DataTable rows={[asRecord(result.learning_note)]} columns={[{ key: 'observation', label: '観察結果' }, { key: 'decision', label: '採用判断' }, { key: 'risk_note', label: '残る注意点' }]} />
      <h3>確認上の注意</h3>
      <ul>{asArray(result.notes).map((note, index) => <li key={index}>{displayValue(note)}</li>)}</ul>
    </>
  }

  if (systemId === 'system27') {
    const conditions = asRecord(result.fixed_conditions)
    const variants = asArray(result.variant_results).map(asRecord)
    return <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '0.6rem' }}>
        <Metric label="比較方法" value={result.comparison_mode_label} />
        <Metric label="指定モデル" value={conditions.model} />
        <Metric label="推奨サイズ" value={result.recommended_variant} />
        <Metric label="保存状態" value={result.storage_status} />
      </div>
      <p><strong>固定した指示:</strong> {displayValue(conditions.task_prompt)}</p>
      <p><strong>確認する要点:</strong> {asArray(conditions.expected_points).map(displayValue).join('、')}</p>
      <h3>同一画像の変換結果と回答</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.8rem' }}>
        {variants.map((variant) => <section key={String(variant.id)} style={{ border: '1px solid #dbe3ec', borderRadius: 8, padding: '0.75rem', minWidth: 0 }}>
          <h4 style={{ marginTop: 0 }}>{displayValue(variant.label)}</h4>
          <img
            src={String(variant.image_data_url)}
            alt={`${displayValue(variant.label)}の比較画像`}
            style={{ display: 'block', width: '100%', height: 150, objectFit: 'contain', background: '#f8fafc', border: '1px solid #e2e8f0' }}
          />
          <p>{displayValue(variant.width)} × {displayValue(variant.height)} px ／ JPEG品質 {displayValue(variant.jpeg_quality)} ／ {displayValue(variant.byte_size)} bytes</p>
          <p><strong>要点網羅率:</strong> {displayValue(variant.accuracy)} ／ <strong>読み落とし:</strong> {asArray(variant.missed_points).map(displayValue).join('、') || 'なし'}</p>
          <p><strong>回答:</strong> {displayValue(variant.answer)}</p>
        </section>)}
      </div>
      <h3>画像別の比較表</h3>
      <DataTable rows={variants} columns={[{ key: 'label', label: '画像' }, { key: 'width', label: '横幅' }, { key: 'height', label: '高さ' }, { key: 'jpeg_quality', label: 'JPEG品質' }, { key: 'byte_size', label: 'データ量' }, { key: 'response_model', label: '応答モデル' }, { key: 'accuracy', label: '要点網羅率' }, { key: 'omission_count', label: '読み落とし数' }, { key: 'elapsed_ms', label: '応答時間（ミリ秒）' }, { key: 'answer', label: '回答' }]} />
      <p><strong>推奨理由:</strong> {displayValue(result.recommendation_note)}</p>
      <h3>学習メモ</h3>
      <DataTable rows={[asRecord(result.learning_note)]} columns={[{ key: 'observation', label: '観察結果' }, { key: 'decision', label: '採用判断' }, { key: 'risk_note', label: '残る注意点' }]} />
      <h3>確認上の注意</h3>
      <ul>{asArray(result.notes).map((note, index) => <li key={index}>{displayValue(note)}</li>)}</ul>
    </>
  }

  if (systemId === 'system28') {
    return <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
        <Metric label="変更前" value={result.original_text} />
        <Metric label="正規化後" value={result.normalized_text} />
        <Metric label="確認状態" value={result.review_status} />
        <Metric label="保存" value={result.saved ? 'JSONへ保存済み' : '実行中だけ保持'} />
      </div>
      <p><strong>適用した規則:</strong> {asArray(result.applied_rules).map(displayValue).join('、') || 'なし'}</p>
      <h3>規則別の修正差分</h3>
      <DataTable rows={asArray(result.diffs).map(asRecord)} columns={[{ key: 'rule', label: '規則' }, { key: 'before', label: '変更前' }, { key: 'after', label: '変更後' }, { key: 'change_count', label: '変更箇所数' }, { key: 'confidence', label: '信頼度' }, { key: 'review_required', label: '人手確認' }, { key: 'review_note', label: '扱い方' }]} />
      <h3>信頼度の扱い</h3>
      <DataTable rows={asArray(result.confidence_notes).map(asRecord)} columns={[{ key: 'confidence', label: '信頼度' }, { key: 'target', label: '対象' }, { key: 'handling', label: '確認方法' }]} />
      <p><strong>人手で確認する箇所:</strong> {asArray(result.review_flags).map(displayValue).join('、') || 'なし'}</p>
      <p><strong>保存状態:</strong> {displayValue(result.storage_status)}</p>
    </>
  }

  if (systemId === 'system29') {
    const rows = asArray(result.chunks).map((value) => {
      const chunk = asRecord(value)
      const metadata = asRecord(chunk.metadata)
      return {
        ...chunk,
        source: metadata.source,
        page: metadata.page,
        section: metadata.section,
        permission: metadata.permission,
        updated_at: metadata.updated_at,
      }
    })
    const filterResult = asRecord(result.filter_result)
    return <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
        <Metric label="フィルタ判定" value={filterResult.matched ? '検索対象' : '検索対象外'} />
        <Metric label="検索結果" value={`${asArray(result.search_results).length}件`} />
        <Metric label="保存" value={result.saved ? 'JSONへ保存済み' : '実行中だけ保持'} />
      </div>
      <h3>文書断片とmetadata</h3>
      <DataTable rows={rows} columns={[{ key: 'chunk_id', label: '文書断片番号' }, { key: 'text', label: '文書' }, { key: 'source', label: '出典' }, { key: 'page', label: 'ページ' }, { key: 'section', label: '章見出し' }, { key: 'permission', label: '公開範囲' }, { key: 'updated_at', label: '更新日時' }]} />
      <h3>metadataフィルタ</h3>
      <pre style={{ ...styles.output, margin: 0 }}>{JSON.stringify(result.metadata_filter ?? {}, null, 2)}</pre>
      <p><strong>対象外の理由:</strong> {asArray(filterResult.rejected_reasons).map(displayValue).join('、') || 'なし'}</p>
      <h3>検索結果と根拠</h3>
      <DataTable rows={asArray(result.search_results).map(asRecord)} columns={[{ key: 'chunk_id', label: '文書断片番号' }, { key: 'text', label: '該当文書' }, { key: 'score', label: '一致度' }, { key: 'citation', label: '根拠表示' }, { key: 'permission', label: '公開範囲' }, { key: 'updated_at', label: '更新日時' }]} />
      <p><strong>引用表示:</strong> {asArray(result.citation_preview).map(displayValue).join('、') || '－'}</p>
      <p><strong>追跡に使う項目:</strong> {asArray(result.traceability_fields).map(displayValue).join('、') || '－'}</p>
      <h3>学習メモ</h3>
      <DataTable rows={[asRecord(result.learning_note)]} columns={[{ key: 'observation', label: '観察結果' }, { key: 'decision', label: '設計判断' }, { key: 'risk_note', label: '残る注意点' }]} />
      <p><strong>保存状態:</strong> {displayValue(result.storage_status)}</p>
    </>
  }

  if (systemId === 'system30') {
    const candidatePairs = asArray(result.candidate_pairs).map(asRecord)
    const duplicateGroups = asArray(result.duplicate_groups).map(asRecord)
    return <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
        <Metric label="比較した組合せ" value={`${candidatePairs.length}件`} />
        <Metric label="重複候補" value={`${displayValue(result.candidate_count)}件`} />
        <Metric label="完全一致" value={`${displayValue(result.exact_match_count)}件`} />
        <Metric label="類似文書" value={`${displayValue(result.similar_match_count)}件`} />
        <Metric label="しきい値" value={result.similarity_threshold} />
        <Metric label="保存" value={result.saved ? 'JSONへ保存済み' : '実行中だけ保持'} />
      </div>
      <h3>文書の全組合せ</h3>
      <DataTable rows={candidatePairs} columns={[{ key: 'left_title', label: '文書1' }, { key: 'left_version', label: '版1' }, { key: 'right_title', label: '文書2' }, { key: 'right_version', label: '版2' }, { key: 'score', label: '類似度' }, { key: 'match_type', label: '判定' }, { key: 'duplicate_candidate', label: '重複候補' }]} />
      <h3>重複グループ</h3>
      <DataTable rows={duplicateGroups} columns={[{ key: 'group_id', label: 'グループ' }, { key: 'document_ids', label: '文書番号' }, { key: 'titles', label: '題名' }, { key: 'versions', label: '版' }, { key: 'review_status', label: '確認状態' }]} />
      <h3>採用・除外判断</h3>
      <DataTable rows={asArray(result.decision_records).map(asRecord)} columns={[{ key: 'document_id', label: '文書番号' }, { key: 'title', label: '題名' }, { key: 'version', label: '版' }, { key: 'decision', label: '判断' }]} />
      <p><strong>判断方法:</strong> {displayValue(asRecord(result.resolution).action)}</p>
      <p><strong>判断メモ:</strong> {displayValue(asRecord(result.resolution).decision_note)}</p>
      <h3>検索偏りの確認</h3>
      <DataTable rows={asArray(result.search_bias_preview).map(asRecord)} columns={[{ key: 'document_id', label: '文書番号' }, { key: 'title', label: '題名' }, { key: 'score', label: '検索語との類似度' }, { key: 'duplicate_group', label: '重複グループ' }]} />
      <p>{displayValue(result.bias_warning)}</p>
      <h3>学習メモ</h3>
      <DataTable rows={[asRecord(result.learning_note)]} columns={[{ key: 'observation', label: '観察結果' }, { key: 'decision', label: '設計判断' }, { key: 'risk_note', label: '残る注意点' }]} />
      <p><strong>保存状態:</strong> {displayValue(result.storage_status)}</p>
    </>
  }

  if (systemId === 'system31') {
    const evaluationCase = asRecord(result.ground_truth_case)
    return <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
        <Metric label="データセット" value={result.dataset_name} />
        <Metric label="評価ケース番号" value={result.case_id} />
        <Metric label="確認状態" value={result.review_status_label} />
        <Metric label="評価へ利用可能" value={result.ready_for_evaluation} />
        <Metric label="評価観点の重み合計" value={result.rubric_weight_total} />
        <Metric label="保存" value={result.saved ? 'JSONへ保存済み' : '実行中だけ保持'} />
      </div>
      <h3>評価用正解データ</h3>
      <DataTable rows={[evaluationCase]} columns={[{ key: 'case_id', label: 'ケース番号' }, { key: 'question', label: '質問' }, { key: 'expected_answer', label: '期待する回答' }, { key: 'source_document_id', label: '根拠文書' }, { key: 'tags', label: 'タグ' }]} />
      <h3>根拠文書</h3>
      <DataTable rows={[asRecord(result.source_document)]} columns={[{ key: 'document_id', label: '文書番号' }, { key: 'title', label: '題名' }, { key: 'version', label: '版' }, { key: 'text', label: '本文' }]} />
      <h3>根拠の追跡結果</h3>
      <DataTable rows={asArray(evaluationCase.evidence).map(asRecord)} columns={[{ key: 'evidence_id', label: '根拠番号' }, { key: 'document_id', label: '文書番号' }, { key: 'quote', label: '引用文' }, { key: 'source_exists', label: '文書あり' }, { key: 'quote_found', label: '引用一致' }]} />
      <h3>固定した評価観点</h3>
      <DataTable rows={asArray(result.evaluation_viewpoints).map(asRecord)} columns={[{ key: 'viewpoint_id', label: '観点番号' }, { key: 'label', label: '観点' }, { key: 'description', label: '確認内容' }, { key: 'weight', label: '重み' }]} />
      <h3>品質確認</h3>
      <DataTable rows={asArray(result.quality_checks).map(asRecord)} columns={[{ key: 'check', label: '確認項目' }, { key: 'passed', label: '結果' }, { key: 'detail', label: '内容' }]} />
      <h3>レビュー履歴</h3>
      <DataTable rows={asArray(result.review_history).map(asRecord)} columns={[{ key: 'status_label', label: '状態' }, { key: 'reviewer', label: '確認者' }, { key: 'comment', label: '確認記録' }]} />
      <p><strong>不足項目:</strong> {asArray(result.validation_issues).map(displayValue).join('、') || 'なし'}</p>
      <h3>学習メモ</h3>
      <DataTable rows={[asRecord(result.learning_note)]} columns={[{ key: 'observation', label: '観察結果' }, { key: 'decision', label: '設計判断' }, { key: 'risk_note', label: '残る注意点' }]} />
      <p><strong>保存状態:</strong> {displayValue(result.storage_status)}</p>
    </>
  }

  if (systemId === 'system32') {
    const metrics = asRecord(result.metrics)
    const regression = asRecord(result.regression_diff)
    const deltas = asRecord(regression.metric_deltas)
    const deltaRows = [
      { metric: '検索成功率', delta: deltas.retrieval_success_rate },
      { metric: '生成成功率', delta: deltas.generation_success_rate },
      { metric: '回答評価の平均', delta: deltas.average_answer_score },
    ]
    return <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
        <Metric label="評価セット" value={result.dataset_name} />
        <Metric label="実行名" value={result.run_label} />
        <Metric label="評価件数" value={metrics.case_count} />
        <Metric label="検索成功率" value={metrics.retrieval_success_rate} />
        <Metric label="生成成功率" value={metrics.generation_success_rate} />
        <Metric label="検索失敗" value={metrics.retrieval_failure_count} />
        <Metric label="生成失敗" value={metrics.generation_failure_count} />
        <Metric label="保存" value={result.saved ? 'JSONへ保存済み' : '実行中だけ保持'} />
      </div>
      <h3>固定したRAG設定</h3>
      <DataTable rows={[asRecord(result.rag_config)]} columns={[{ key: 'retriever_version', label: '検索処理' }, { key: 'generator_version', label: '回答生成' }, { key: 'prompt_version', label: 'Prompt' }, { key: 'top_k', label: '確認する検索件数' }]} />
      <h3>ケース別の評価結果</h3>
      <DataTable rows={asArray(result.case_results).map(asRecord)} columns={[{ key: 'case_id', label: 'ケース番号' }, { key: 'question', label: '質問' }, { key: 'expected_evidence_ids', label: '正解文書' }, { key: 'top_k_results', label: '検索結果' }, { key: 'generated_answer', label: '生成回答' }, { key: 'failure_label', label: '判定' }, { key: 'answer_score', label: '回答評価' }]} />
      <h3>前回実行との差</h3>
      {regression.has_previous_run
        ? <>
          <p><strong>比較対象:</strong> {displayValue(regression.previous_run_label)}（{displayValue(regression.previous_run_id)}）</p>
          <DataTable rows={deltaRows} columns={[{ key: 'metric', label: '指標' }, { key: 'delta', label: '前回との差' }]} />
          <p><strong>悪化した指標:</strong> {asArray(regression.regressed_metrics).map(displayValue).join('、') || 'なし'}</p>
        </>
        : <p>同じ評価セットの前回実行はありません。次の実行から差を表示します。</p>}
      <h3>学習メモ</h3>
      <DataTable rows={[asRecord(result.learning_note)]} columns={[{ key: 'observation', label: '観察結果' }, { key: 'decision', label: '設計判断' }, { key: 'risk_note', label: '残る注意点' }]} />
      <p><strong>保存状態:</strong> {displayValue(result.storage_status)}</p>
    </>
  }

  if (systemId === 'system33') {
    const metrics = asRecord(result.metrics)
    const cases = asArray(result.case_results).map(asRecord)
    const failures = asArray(result.failure_cases).map(asRecord)
    const comparison = asRecord(result.chunk_comparison)
    const metricDeltas = asRecord(comparison.metric_deltas)
    const deltaRows = Object.entries(metricDeltas).map(([metric, delta]) => ({ metric, delta }))
    const learningNote = asRecord(result.learning_note)
    return <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(110px, 1fr))', gap: '0.6rem' }}>
        <Metric label="評価ケース数" value={metrics.case_count} />
        <Metric label={`Hit Rate@${displayValue(result.top_k)}`} value={metrics.hit_rate} />
        <Metric label={`平均Recall@${displayValue(result.top_k)}`} value={metrics.average_recall_at_k} />
        <Metric label={`平均Precision@${displayValue(result.top_k)}`} value={metrics.average_precision_at_k} />
        <Metric label="平均逆順位" value={metrics.mean_reciprocal_rank} />
      </div>
      <p><strong>評価名:</strong> {displayValue(result.evaluation_name)} ／ <strong>chunk設定:</strong> {displayValue(result.chunk_setting)}</p>
      <h3>質問別の検索評価</h3>
      <DataTable rows={cases} columns={[{ key: 'case_id', label: 'ケース番号' }, { key: 'question', label: '質問' }, { key: 'hit_at_k', label: 'Hit' }, { key: 'recall_at_k', label: 'Recall' }, { key: 'precision_at_k', label: 'Precision' }, { key: 'reciprocal_rank', label: '逆順位' }, { key: 'matched_evidence', label: '見つかった正解文書' }, { key: 'missing_evidence', label: '見つからなかった正解文書' }, { key: 'failure_label', label: '判定' }]} />
      <h3>失敗ケース</h3>
      {failures.length
        ? <DataTable rows={failures} columns={[{ key: 'case_id', label: 'ケース番号' }, { key: 'question', label: '質問' }, { key: 'failure_label', label: '失敗内容' }, { key: 'missing_evidence', label: '見つからなかった正解文書' }]} />
        : <p>失敗ケースはありません。</p>}
      <h3>chunk設定の比較</h3>
      {comparison.has_previous_run
        ? <>
          <p><strong>前回:</strong> {displayValue(comparison.previous_chunk_setting)} ／ <strong>今回:</strong> {displayValue(comparison.current_chunk_setting)}</p>
          <DataTable rows={deltaRows} columns={[{ key: 'metric', label: '指標' }, { key: 'delta', label: '前回との差' }]} />
        </>
        : <p>同じ評価名の前回実行はありません。次の実行から差を表示します。</p>}
      <h3>先頭ケースの検索順位</h3>
      <DataTable rows={asArray(cases[0]?.ranked_results).map(asRecord)} columns={[{ key: 'rank', label: '順位' }, { key: 'document_id', label: '文書番号' }, { key: 'expected_evidence', label: '正解文書' }, { key: 'within_top_k', label: '評価範囲内' }]} />
      <h3>学習メモ</h3>
      <DataTable rows={[learningNote]} columns={[{ key: 'observation', label: '観察結果' }, { key: 'decision', label: '設計判断' }, { key: 'risk_note', label: '残る注意点' }]} />
      <p><strong>保存状態:</strong> {displayValue(result.storage_status)}</p>
    </>
  }

  if (systemId === 'system34') {
    const scoreBreakdown = asRecord(result.score_breakdown)
    const learningNote = asRecord(result.learning_note)
    return <>
      <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
        <Metric label="総合点" value={result.overall_score} />
        <Metric label="正確性" value={scoreBreakdown.correctness} />
        <Metric label="根拠性" value={scoreBreakdown.groundedness} />
        <Metric label="網羅性" value={scoreBreakdown.completeness} />
        <Metric label="簡潔性" value={scoreBreakdown.conciseness} />
      </div>
      <h3>評価対象</h3>
      <p><strong>質問:</strong> {displayValue(result.question)}</p>
      <p><strong>期待する回答:</strong> {displayValue(result.expected_answer)}</p>
      <p><strong>評価する回答:</strong> {displayValue(result.generated_answer)}</p>
      <h3>回答の分類</h3>
      <DataTable rows={asArray(result.classifications).map(asRecord)} columns={[{ key: 'label', label: '分類' }, { key: 'reason', label: '判定理由' }]} />
      <h3>観点別の評価</h3>
      <DataTable rows={asArray(result.evaluation_items).map(asRecord)} columns={[{ key: 'viewpoint', label: '評価観点' }, { key: 'score', label: '点数' }, { key: 'reason', label: '採点理由' }]} />
      <h3>必要な回答要素</h3>
      <DataTable rows={asArray(result.point_results).map(asRecord)} columns={[{ key: 'label', label: '回答要素' }, { key: 'required_terms', label: '必要語句' }, { key: 'covered', label: '回答に含む' }, { key: 'contradicted', label: '矛盾あり' }, { key: 'matched_contradiction_terms', label: '該当した矛盾語' }]} />
      <h3>回答内の主張と根拠</h3>
      <DataTable rows={asArray(result.claim_results).map(asRecord)} columns={[{ key: 'text', label: '主張' }, { key: 'evidence_ids', label: '参照した根拠' }, { key: 'expected_point_ids', label: '対応する回答要素' }, { key: 'supported', label: '根拠で確認可能' }, { key: 'relevant', label: '質問に必要' }, { key: 'assessment', label: '判定' }]} />
      <h3>使用した根拠</h3>
      <DataTable rows={asArray(result.supporting_evidence).map(asRecord)} columns={[{ key: 'evidence_id', label: '根拠番号' }, { key: 'text', label: '根拠文' }]} />
      <h3>改善内容</h3>
      <ul>{asArray(result.improvement_notes).map((note, index) => <li key={index}>{displayValue(note)}</li>)}</ul>
      <h3>学習メモ</h3>
      <DataTable rows={[learningNote]} columns={[{ key: 'observation', label: '観察結果' }, { key: 'decision', label: '設計判断' }, { key: 'risk_note', label: '残る注意点' }]} />
      <p><strong>評価方法:</strong> {displayValue(result.evaluation_note)}</p>
      <p><strong>保存状態:</strong> {displayValue(result.storage_status)}</p>
    </>
  }

  if (systemId === 'system35') {
    const averageScores = asRecord(result.average_scores)
    const adoption = asRecord(result.adoption_record)
    const cases = asArray(result.case_results).map(asRecord)
    const fixedConditions = Object.entries(asRecord(result.fixed_conditions)).map(([condition, value]) => ({ condition, value }))
    const scoreWeights = Object.entries(asRecord(result.scoring_weights)).map(([viewpoint, weight]) => ({ viewpoint, weight }))
    const detailRows = cases.flatMap((row) => {
      const details = asRecord(row.variant_details)
      return ['A', 'B'].map((variant) => {
        const detail = asRecord(details[variant])
        const scores = asRecord(detail.score_breakdown)
        return {
          case_id: row.case_id,
          variant,
          answer: detail.answer,
          correctness: scores.correctness,
          groundedness: scores.groundedness,
          completeness: scores.completeness,
          conciseness: scores.conciseness,
          total_score: detail.total_score,
          missing_required_terms: detail.missing_required_terms,
          missing_evidence_terms: detail.missing_evidence_terms,
          matched_forbidden_terms: detail.matched_forbidden_terms,
        }
      })
    })
    return <>
      <div style={{ display: 'grid', gap: '0.6rem', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
        <Metric label="評価上の勝者" value={result.winner} />
        <Metric label="評価ケース数" value={result.case_count} />
        <Metric label="Prompt A平均点" value={averageScores.A} />
        <Metric label="Prompt B平均点" value={averageScores.B} />
        <Metric label="B－A" value={result.score_difference_b_minus_a} />
        <Metric label="改善ケース" value={asArray(result.improved_cases).length} />
        <Metric label="悪化ケース" value={asArray(result.regressed_cases).length} />
      </div>
      <p><strong>実験名:</strong> {displayValue(result.experiment_name)}</p>
      <h3>Promptごとの集計</h3>
      <DataTable rows={asArray(result.variant_results).map(asRecord)} columns={[{ key: 'variant', label: 'Prompt' }, { key: 'prompt', label: '指示内容' }, { key: 'correctness', label: '正確性' }, { key: 'groundedness', label: '根拠性' }, { key: 'completeness', label: '網羅性' }, { key: 'conciseness', label: '簡潔性' }, { key: 'average_score', label: '平均点' }]} />
      <h3>ケース別の比較</h3>
      <DataTable rows={cases} columns={[{ key: 'case_id', label: 'ケース番号' }, { key: 'question', label: '質問' }, { key: 'prompt_a_score', label: 'Aの点数' }, { key: 'prompt_b_score', label: 'Bの点数' }, { key: 'score_delta_b_minus_a', label: 'B－A' }, { key: 'comparison_label', label: '判定' }]} />
      <h3>ケース別の採点根拠</h3>
      <DataTable rows={detailRows} columns={[{ key: 'case_id', label: 'ケース番号' }, { key: 'variant', label: 'Prompt' }, { key: 'answer', label: '記録した回答' }, { key: 'correctness', label: '正確性' }, { key: 'groundedness', label: '根拠性' }, { key: 'completeness', label: '網羅性' }, { key: 'conciseness', label: '簡潔性' }, { key: 'total_score', label: '合計' }, { key: 'missing_required_terms', label: '不足した必要語' }, { key: 'missing_evidence_terms', label: '不足した根拠語' }, { key: 'matched_forbidden_terms', label: '検出した禁止語' }]} />
      <h3>採用判断</h3>
      <DataTable rows={[adoption]} columns={[{ key: 'selected_variant', label: '記録した判断' }, { key: 'recommended_variant', label: '点数上の推奨' }, { key: 'matches_recommendation', label: '判断と推奨が一致' }, { key: 'reason', label: '判断理由' }, { key: 'risk_note', label: '残る注意点' }]} />
      <h3>固定した実行条件</h3>
      <DataTable rows={fixedConditions} columns={[{ key: 'condition', label: '条件' }, { key: 'value', label: '設定値' }]} />
      <h3>採点の重み</h3>
      <DataTable rows={scoreWeights} columns={[{ key: 'viewpoint', label: '評価観点' }, { key: 'weight', label: '重み' }]} />
      <p><strong>評価方法:</strong> {displayValue(result.evaluation_note)}</p>
      <p><strong>保存状態:</strong> {displayValue(result.storage_status)}</p>
    </>
  }

  if (systemId === 'system36') {
    const trace = asRecord(result.trace_record)
    const masking = asRecord(result.masking)
    const evaluation = asRecord(result.evaluation_link)
    const fieldLabels: Record<string, string> = {
      trace_name: 'Trace名',
      user_input: '利用者入力',
      retrieved_context: '検索根拠',
      model_config: 'モデル設定',
      prompt: 'Prompt本文',
      prompt_version: 'Prompt版',
      output: 'モデル出力',
      evaluation: '評価結果',
      recorded_at: '記録日時',
    }
    const rows = Object.entries(trace).map(([field, value]) => ({
      field: fieldLabels[field] ?? field,
      value: Array.isArray(value) ? value.join('、') : typeof value === 'object' && value !== null ? JSON.stringify(value) : value,
    }))
    return <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.6rem' }}>
        <Metric label="Trace番号" value={result.trace_id} />
        <Metric label="再実行情報" value={result.replay_ready ? '不足なし' : '不足あり'} />
        <Metric label="マスク件数" value={masking.masked_value_count} />
        <Metric label="保存状態" value={result.storage_status} />
      </div>
      <h3>Traceに含まれる情報</h3>
      <DataTable rows={rows} columns={[{ key: 'field', label: '項目' }, { key: 'value', label: '記録内容' }]} />
      <h3>評価との対応</h3>
      <DataTable rows={[evaluation]} columns={[{ key: 'evaluation_id', label: '評価番号' }, { key: 'status', label: '評価状態' }, { key: 'score', label: '評価点' }]} />
      <p><strong>不足項目:</strong> {asArray(result.missing_field_labels).map(displayValue).join('、') || 'なし'}</p>
      <p><strong>マスクした項目:</strong> {asArray(masking.protected_fields).map((field) => fieldLabels[String(field)] ?? displayValue(field)).join('、') || 'なし'}</p>
      <p><strong>マスク対象語を保存したか:</strong> {displayValue(masking.masking_terms_persisted)}</p>
      <p><strong>再実行の条件:</strong> {displayValue(result.replay_note)}</p>
      <p><strong>保存方針:</strong> {displayValue(result.retention_note)}</p>
      <p><strong>改変確認用ハッシュ:</strong> {displayValue(result.integrity_hash)}</p>
    </>
  }

  return <pre style={styles.pre}>{JSON.stringify(result, null, 2)}</pre>
}

export default function SystemLearningPage({ systemId }: Props) {
  const client = useMemo(() => createSystemClient(systemId), [systemId])
  const [metadata, setMetadata] = useState<Metadata | null>(null)
  const [inputText, setInputText] = useState('{}')
  const [result, setResult] = useState<RunResult | null>(null)
  const [runs, setRuns] = useState<RunResult[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const copy = screenCopies[systemId]

  useEffect(() => {
    let active = true
    setError('')
    setResult(null)
    client.get<Metadata>('/metadata')
      .then((res) => {
        if (!active) return
        setMetadata(res.data)
        setInputText(JSON.stringify(res.data.default_input, null, 2))
      })
      .catch(() => {
        if (active) setError('metadata の取得に失敗しました。')
      })
    client.get<{ runs: RunResult[] }>('/runs')
      .then((res) => {
        if (active) setRuns(res.data.runs)
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [client])

  async function execute() {
    setLoading(true)
    setError('')
    try {
      const parsed = JSON.parse(inputText)
      const res = await client.post<RunResult>('/execute', { input: parsed })
      setResult(res.data)
      const history = await client.get<{ runs: RunResult[] }>('/runs')
      setRuns(history.data.runs)
    } catch (err) {
      setError(err instanceof SyntaxError ? 'JSON の形式を確認してください。' : '実行に失敗しました。')
    } finally {
      setLoading(false)
    }
  }

  function resetInput() {
    if (!metadata) return
    setInputText(JSON.stringify(metadata.default_input, null, 2))
    setResult(null)
    setError('')
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <header>
        <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{systemId}</div>
        <h1 style={{ margin: '0.2rem 0', color: '#111827' }}>{copy?.title ?? metadata?.title ?? 'AI実験'}</h1>
        <p style={{ margin: 0, color: '#475569' }}>{copy?.description ?? metadata?.observation_hint}</p>
      </header>

      {error && (
        <div style={{ ...styles.card, borderColor: '#fca5a5', color: '#991b1b', background: '#fef2f2' }}>
          {error}
        </div>
      )}

      <section style={{ display: 'grid', gridTemplateColumns: ['system28', 'system29', 'system30', 'system31', 'system32'].includes(systemId) ? 'minmax(0, 1fr)' : 'minmax(280px, 420px) minmax(0, 1fr)', gap: '1rem', alignItems: 'start' }}>
        <div style={{ ...styles.card, minWidth: 0 }}>
          <label style={styles.label}>実験条件（JSON）</label>
          <p style={{ marginTop: 0, color: '#64748b', fontSize: '0.88rem' }}>{copy?.inputHelp ?? '値を変更して実行結果を比較します。'}</p>
          {metadata?.samples.length ? (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ color: '#475569', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                {systemId === 'system17' ? 'サンプル文を選ぶ' : '入力例を選ぶ'}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {metadata.samples.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => {
                      setInputText(JSON.stringify({ ...metadata.default_input, ...sample.input }, null, 2))
                      setResult(null)
                      setError('')
                    }}
                    disabled={loading}
                    style={{ ...styles.button, background: '#fff', color: '#1f2937', border: '1px solid #94a3b8' }}
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <textarea value={inputText} onChange={(event) => setInputText(event.target.value)} style={styles.textarea} />
          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem' }}>
            <button onClick={execute} disabled={loading} style={{ ...styles.button, opacity: loading ? 0.7 : 1 }}>
              {loading ? '実行中...' : '実行'}
            </button>
            <button onClick={resetInput} disabled={!metadata || loading} style={{ ...styles.button, background: '#fff', color: '#1f2937', border: '1px solid #94a3b8' }}>
              既定値へ戻す
            </button>
          </div>
        </div>

        <div style={{ ...styles.card, minWidth: 0 }}>
          <label style={styles.label}>実行結果</label>
          <p style={{ marginTop: 0, color: '#64748b', fontSize: '0.88rem' }}>{copy?.resultHelp ?? '実行結果を確認します。'}</p>
          <ResultView systemId={systemId} result={result?.result ?? {}} />
        </div>
      </section>

      <section style={styles.card}>
        <label style={styles.label}>実行履歴</label>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {runs.length === 0 && <div style={{ color: '#64748b' }}>実行履歴はまだありません。</div>}
          {runs.map((run, index) => (
            <div key={`${run.run_id}-${run.created_at}-${index}`} style={{ borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', gap: '0.8rem', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{run.run_id}</div>
                <div style={{ color: '#64748b', fontSize: '0.82rem' }}>{new Date(run.created_at).toLocaleString('ja-JP')}</div>
              </div>
              <button type="button" onClick={() => { setResult(run); setInputText(JSON.stringify(run.input, null, 2)) }} style={{ ...styles.button, background: '#fff', color: '#1f2937', border: '1px solid #94a3b8' }}>
                結果を表示
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
