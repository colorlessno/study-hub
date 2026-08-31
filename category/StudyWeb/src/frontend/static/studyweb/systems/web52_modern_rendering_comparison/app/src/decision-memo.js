export const DISPLAY_METHODS = [
  { id: 'mpa', label: 'MPA', description: '画面遷移ごとにページ全体を取得する' },
  { id: 'spa', label: 'SPA', description: 'ブラウザ側で画面と状態を切り替える' },
  { id: 'ssr', label: 'SSR', description: '要求時にサーバーでHTMLを作る' },
  { id: 'ssg', label: 'SSG', description: '配信前にHTMLを作る' }
];

export const STRATEGIES = [
  { id: 'server-components', label: 'Server Components', description: '一部の部品をサーバー側で処理する' },
  { id: 'islands', label: 'Islands', description: '必要な部分だけをブラウザで動かす' },
  { id: 'pwa', label: 'PWA', description: 'オフラインやインストール等を加える' }
];

export const SCENARIOS = [
  {
    id: 'public-docs',
    title: '公開ドキュメント',
    conditions: { 認証: '不要', 更新頻度: '低い', '検索結果・共有': '重要', 画面操作: '検索と小さな操作' },
    hint: 'SSGを基本にし、更新頻度に応じてSSRや再生成も比較します。'
  },
  {
    id: 'private-dashboard',
    title: '認証済みダッシュボード',
    conditions: { 認証: '必須', 更新頻度: '高い', '検索結果・共有': '不要', 画面操作: '絞り込み・更新・リアルタイム表示' },
    hint: '非公開データの取得場所とキャッシュ範囲を先に決めます。'
  },
  {
    id: 'offline-tool',
    title: 'オフライン対応の現場用ツール',
    conditions: { 認証: '必要', 通信: '不安定', データ更新: '後から同期', 端末: 'インストールできると便利' },
    hint: '基本となる表示方式にPWAを組み合わせ、再送と競合も考えます。'
  },
  {
    id: 'internal-crud',
    title: '社内向けの単純な登録・一覧画面',
    conditions: { 認証: '社内利用', 更新頻度: '中程度', '検索結果・共有': '不要', 画面操作: '登録と一覧表示' },
    hint: '複雑なブラウザ側状態が必要かを確認し、MPA・SSR・SPAを比較します。'
  }
];

export function emptyMemo(scenarioId) {
  return {
    scenarioId,
    method: '',
    strategies: [],
    reason: '',
    responsibilities: '',
    cacheBoundary: '',
    rejected: '',
    risk: ''
  };
}

export function validateMemo(memo) {
  const errors = [];
  if (!DISPLAY_METHODS.some((method) => method.id === memo.method)) {
    errors.push('基本となる表示方式を選んでください。');
  }
  if (!memo.reason.trim()) {
    errors.push('選定理由を入力してください。');
  }
  return errors;
}

export function formatMemo(memo) {
  const scenario = SCENARIOS.find((item) => item.id === memo.scenarioId);
  const method = DISPLAY_METHODS.find((item) => item.id === memo.method);
  const strategyLabels = memo.strategies
    .map((id) => STRATEGIES.find((item) => item.id === id)?.label)
    .filter(Boolean);

  return [
    `利用場面: ${scenario?.title ?? memo.scenarioId}`,
    `基本となる方式: ${method?.label ?? '未選択'}`,
    `組み合わせる仕組み: ${strategyLabels.length ? strategyLabels.join('、') : 'なし'}`,
    `選定理由: ${memo.reason || '未入力'}`,
    `役割分担: ${memo.responsibilities || '未入力'}`,
    `キャッシュ範囲: ${memo.cacheBoundary || '未入力'}`,
    `採用しなかった案: ${memo.rejected || '未入力'}`,
    `運用上の注意点: ${memo.risk || '未入力'}`
  ].join('\n');
}
