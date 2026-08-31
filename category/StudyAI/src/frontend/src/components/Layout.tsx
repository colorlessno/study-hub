import { Link, Outlet } from 'react-router-dom'

const SYSTEMS = [
  { path: 'system01', label: 'System01 請求書・領収書 データ抽出システム' },
  { path: 'system02', label: 'System02 契約書・文書 リスク審査システム' },
  { path: 'system03', label: 'System03 プロジェクト文書 自然言語Q&Aシステム' },
  { path: 'system04', label: 'System04 商品・サービス レビュー分析＆インサイト抽出システム' },
  { path: 'system05', label: 'System05 個人経営整体院向け 院内電子カルテシステム' },
  { path: 'system06', label: 'System06 カスタマーサポート 自動応答＆エスカレーションシステム' },
  { path: 'system07', label: 'System07 プロジェクト内ドキュメント 自動タグ付け＆類似ドキュメント推薦システム' },
  { path: 'system08', label: 'System08 未体験作業 タスク洗い出し＆優先順位付けエージェント' },
  { path: 'system09', label: 'System09 市場競合調査 エージェント' },
  { path: 'system10', label: 'System10 構成管理補助・ドキュメント所在検索システム' },
  { path: 'system11', label: 'System11 ローカルPCファイル自動整理エージェント' },
  { path: 'system12', label: 'System12 ギフトEC コンシェルジュ＆推薦システム' },
  { path: 'system13', label: 'System13 プロジェクト参画者向け 初期教育エージェント' },
  { path: 'system14', label: 'System14 顧客接点データ 全量分析＆インサイト配信エージェント' },
  { path: 'system16', label: 'System16 案件マッチングシステム（プロジェクト・スキルシート）' },
  { path: 'system17', label: 'System17 トークン分割の観察' },
  { path: 'system18', label: 'System18 文章の類似検索' },
  { path: 'system19', label: 'System19 Attentionの関係表示' },
  { path: 'system20', label: 'System20 コンテキスト上限の実験' },
  { path: 'system21', label: 'System21 生成のばらつき設定（Temperature）の比較' },
  { path: 'system22', label: 'System22 RAGの文書分割比較' },
  { path: 'system23', label: 'System23 検索結果の並べ替え比較' },
  { path: 'system24', label: 'System24 複数モデルの比較' },
  { path: 'system25', label: 'System25 max_tokens / temperature比較' },
  { path: 'system26', label: 'System26 quantization比較' },
  { path: 'system27', label: 'System27 画像サイズとVLM精度比較' },
  { path: 'system28', label: 'System28 OCR結果の正規化' },
  { path: 'system29', label: 'System29 chunk metadata設計' },
  { path: 'system30', label: 'System30 重複文書の検出' },
  { path: 'system31', label: 'System31 評価用ground truth作成' },
  { path: 'system32', label: 'System32 RAG評価セット' },
  { path: 'system33', label: 'System33 検索評価' },
  { path: 'system34', label: 'System34 回答評価' },
  { path: 'system35', label: 'System35 Prompt A/B比較' },
  { path: 'system36', label: 'System36 Trace保存' },
  { path: 'system37', label: 'System37 取引実行型AIコンシェルジュ' },
  { path: 'system38', label: 'System38 リアルタイム推薦・パーソナライズ' },
  { path: 'system39', label: 'System39 業務実行型カスタマーサポートAI' },
  { path: 'system40', label: 'System40 需要予測・在庫最適化AI' },
  { path: 'system41', label: 'System41 コンピュータビジョン / マルチモーダルAI' },
  { path: 'system42', label: 'System42 不正検知・異常検知AI' },
  { path: 'system43', label: 'System43 制約最適化AI' },
  { path: 'system44', label: 'System44 AI KPI / 実験評価ダッシュボード' },
]

export default function Layout() {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <nav style={{ width: 320, background: '#1e1e2e', color: '#cdd6f4', padding: '1rem', flexShrink: 0 }}>
        <Link to="/" style={{ color: '#cba6f7', textDecoration: 'none', fontWeight: 'bold', fontSize: '1.1rem' }}>
          🎓 StudyAI
        </Link>
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '1.5rem' }}>
          {SYSTEMS.map(({ path, label }) => (
            <li key={path} style={{ marginBottom: '0.5rem' }}>
              <Link
                to={path}
                style={{ color: '#a6e3a1', textDecoration: 'none', fontSize: '0.85rem' }}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main style={{ flex: 1, padding: '2rem', background: '#f8f8f2' }}>
        <Outlet />
      </main>
    </div>
  )
}
