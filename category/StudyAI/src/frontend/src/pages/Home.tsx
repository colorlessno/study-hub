import { Link } from 'react-router-dom'

const SYSTEMS = [
  { path: 'system01', label: 'System01', desc: '請求書・領収書 データ抽出システム', port: 8000 },
  { path: 'system02', label: 'System02', desc: '契約書・文書 リスク審査システム', port: 8002 },
  { path: 'system03', label: 'System03', desc: 'プロジェクト文書 自然言語Q&Aシステム', port: 8003 },
  { path: 'system04', label: 'System04', desc: '商品・サービス レビュー分析＆インサイト抽出システム', port: 8004 },
  { path: 'system05', label: 'System05', desc: '個人経営整体院向け 院内電子カルテシステム', port: 8005 },
  { path: 'system06', label: 'System06', desc: 'カスタマーサポート 自動応答＆エスカレーションシステム', port: 8006 },
  { path: 'system07', label: 'System07', desc: 'プロジェクト内ドキュメント 自動タグ付け＆類似ドキュメント推薦システム', port: 8007 },
  { path: 'system08', label: 'System08', desc: '未体験作業 タスク洗い出し＆優先順位付けエージェント', port: 8008 },
  { path: 'system09', label: 'System09', desc: '市場競合調査 エージェント', port: 8009 },
  { path: 'system10', label: 'System10', desc: '構成管理補助・ドキュメント所在検索システム', port: 8010 },
  { path: 'system11', label: 'System11', desc: 'ローカルPCファイル自動整理エージェント', port: 8011 },
  { path: 'system12', label: 'System12', desc: 'ギフトEC コンシェルジュ＆推薦システム', port: 8012 },
  { path: 'system13', label: 'System13', desc: 'プロジェクト参画者向け 初期教育エージェント', port: 8013 },
  { path: 'system14', label: 'System14', desc: '顧客接点データ 全量分析＆インサイト配信エージェント', port: 8014 },
  { path: 'system16', label: 'System16', desc: '案件マッチングシステム（プロジェクト・スキルシート）', port: 8016 },
  { path: 'system17', label: 'System17', desc: 'トークン分割の観察', port: 8000 },
  { path: 'system18', label: 'System18', desc: '文章の類似検索', port: 8000 },
  { path: 'system19', label: 'System19', desc: 'Attentionの関係表示', port: 8000 },
  { path: 'system20', label: 'System20', desc: 'コンテキスト上限の実験', port: 8000 },
  { path: 'system21', label: 'System21', desc: '生成のばらつき設定（Temperature）の比較', port: 8000 },
  { path: 'system22', label: 'System22', desc: 'RAGの文書分割比較', port: 8000 },
  { path: 'system23', label: 'System23', desc: '検索結果の並べ替え比較', port: 8000 },
  { path: 'system24', label: 'System24', desc: '複数モデルの比較', port: 8000 },
  { path: 'system25', label: 'System25', desc: 'max_tokens / temperature比較', port: 8000 },
  { path: 'system26', label: 'System26', desc: 'quantization比較', port: 8000 },
  { path: 'system27', label: 'System27', desc: '画像サイズとVLM精度比較', port: 8000 },
  { path: 'system28', label: 'System28', desc: 'OCR結果の正規化', port: 8000 },
  { path: 'system29', label: 'System29', desc: 'chunk metadata設計', port: 8000 },
  { path: 'system30', label: 'System30', desc: '重複文書の検出', port: 8000 },
  { path: 'system31', label: 'System31', desc: '評価用ground truth作成', port: 8000 },
  { path: 'system32', label: 'System32', desc: 'RAG評価セット', port: 8000 },
  { path: 'system33', label: 'System33', desc: '検索評価', port: 8000 },
  { path: 'system34', label: 'System34', desc: '回答評価', port: 8000 },
  { path: 'system35', label: 'System35', desc: 'Prompt A/B比較', port: 8000 },
  { path: 'system36', label: 'System36', desc: 'Trace保存', port: 8000 },
  { path: 'system37', label: 'System37', desc: '取引実行型AIコンシェルジュ', port: 8000 },
  { path: 'system38', label: 'System38', desc: 'リアルタイム推薦・パーソナライズ', port: 8000 },
  { path: 'system39', label: 'System39', desc: '業務実行型カスタマーサポートAI', port: 8000 },
  { path: 'system40', label: 'System40', desc: '需要予測・在庫最適化AI', port: 8000 },
  { path: 'system41', label: 'System41', desc: 'コンピュータビジョン / マルチモーダルAI', port: 8000 },
  { path: 'system42', label: 'System42', desc: '不正検知・異常検知AI', port: 8000 },
  { path: 'system43', label: 'System43', desc: '制約最適化AI', port: 8000 },
  { path: 'system44', label: 'System44', desc: 'AI KPI / 実験評価ダッシュボード', port: 8000 },
]

export default function Home() {
  return (
    <div>
      <h1 style={{ color: '#1e1e2e', marginBottom: '0.5rem' }}>StudyAI ポータル</h1>
      <p style={{ color: '#6c6f85', marginBottom: '2rem' }}>System 一覧 — 各 System の画面を開く</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        {SYSTEMS.map(({ path, label, desc, port }) => (
          <Link
            key={path}
            to={path}
            style={{ textDecoration: 'none' }}
          >
            <div style={{
              background: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              padding: '1rem',
              transition: 'box-shadow 0.2s',
            }}>
              <div style={{ fontWeight: 'bold', color: '#1e1e2e' }}>{label}</div>
              <div style={{ fontSize: '0.82rem', color: '#6c6f85', marginTop: 4 }}>{desc}</div>
              <div style={{ fontSize: '0.75rem', color: '#b0b0b0', marginTop: 8 }}>port {port}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
