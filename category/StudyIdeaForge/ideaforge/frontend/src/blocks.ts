import { newNodeId } from './store';

export interface BlockDef {
  id: string;
  type: 'input' | 'llm' | 'search' | 'gate' | 'merge' | 'report';
  label: string;
  icon: string;
  color: string;
  cat: string;
  description: string;
  defaults?: any;
}

const C = {
  input: '#34d399',
  idea: '#8b7cff',
  search: '#22d3ee',
  eval: '#fbbf24',
  gate: '#f97316',
  merge: '#94a3b8',
  report: '#f472b6',
};

export const BLOCKS: BlockDef[] = [
  // ============ 入力 ============
  {
    id: 'theme_input', type: 'input', label: 'テーマ入力', icon: '📝', color: C.input, cat: '入力',
    description: 'テーマ・背景・目的・欲しいアイディアの種類を入力する',
    defaults: {
      fields: [
        { key: 'theme', label: 'テーマ', placeholder: '例: 社内の学習文化を変える新サービス' },
        { key: 'background', label: '背景', multiline: true },
        { key: 'purpose', label: '目的' },
        { key: 'idea_type', label: '欲しいアイディアの種類', placeholder: '例: 新規事業 / 機能改善 / 企画' },
      ],
    },
  },
  {
    id: 'constraint_input', type: 'input', label: '制約入力', icon: '🧱', color: C.input, cat: '入力',
    description: '予算・期間・人数などの制約条件を入力する(空欄は「指定なし」)',
    defaults: {
      fields: [
        { key: 'budget', label: '予算' },
        { key: 'period', label: '期間' },
        { key: 'people', label: '人数' },
        { key: 'target', label: '対象ユーザー' },
        { key: 'avoid', label: '避けたいこと', multiline: true },
        { key: 'tech', label: '使える技術' },
        { key: 'monetize', label: '収益化したいか' },
      ],
    },
  },

  // ============ 発想 ============
  {
    id: 'mindmap', type: 'llm', label: 'マインドマップ材料出し', icon: '🧠', color: C.idea, cat: '発想',
    description: 'テーマを5観点×10項目に分解し、意外な掛け合わせを10個作る',
    defaults: {
      temperature: 0.9,
      template: 'テーマを次の5観点で各10項目に分解せよ: ①関連性(連想されるもの) ②性質(特徴・属性) ③構成(要素分解) ④抽象化(上位概念・本質) ⑤時間軸(過去・現在・未来の変化)。観点ごとに表にまとめる。\n最後に、項目同士を掛け合わせた「面白そうな組み合わせ」を10個作る(No. / 掛け合わせ / 何が生まれそうか)。意外性の高い掛け合わせを優先すること。',
    },
  },
  {
    id: 'scamper', type: 'llm', label: 'SCAMPER 21案', icon: '🔀', color: C.idea, cat: '発想',
    description: '7操作×3案=21案を生成し、実現しやすい順ベスト10を選ぶ',
    defaults: {
      temperature: 0.9,
      template: '直前の材料とテーマをもとに、SCAMPERの7操作(S代替 / C結合 / A応用 / M修正 / P転用 / E除去 / R逆転)で各3案、計21案を生成せよ。表形式(id / 操作 / 案名 / 概要 / 想定ユーザー)。idはS1、C2のように操作記号+連番。\n最後に、制約のもとで実現しやすい順にベスト10案のidと選定理由(各1行)を提示する。',
    },
  },
  {
    id: 'osborn', type: 'llm', label: 'オズボーンのチェックリスト', icon: '✅', color: C.idea, cat: '発想',
    description: '9項目×2案=18案を生成する古典の王道',
    defaults: {
      temperature: 0.9,
      template: 'オズボーンのチェックリスト9項目(転用 / 応用 / 変更 / 拡大 / 縮小 / 代用 / 再配置 / 逆転 / 結合)をテーマに適用し、各2案・計18案を表形式(id / 項目 / 案名 / 概要)で生成せよ。最後にベスト5を選び、理由を添える。',
    },
  },
  {
    id: 'triz', type: 'llm', label: 'TRIZ 発明原理', icon: '⚙️', color: C.idea, cat: '発想',
    description: 'TRIZ 40の発明原理から効く10原理を選んで適用',
    defaults: {
      temperature: 0.9,
      template: 'TRIZの40の発明原理から、このテーマに効きそうな原理を10個選び、各原理を適用したアイディアを1案ずつ生成せよ(原理番号・原理名 / 適用の発想 / 案名 / 概要)。技術向けの原理も、比喩・構造として非技術分野に翻訳して適用してよい。最後にベスト3を選ぶ。',
    },
  },
  {
    id: 'random_stimulus', type: 'llm', label: 'ランダム刺激', icon: '🎲', color: C.idea, cat: '発想',
    description: '無関係な名詞を強制接続して飛距離の大きい案を作る',
    defaults: {
      temperature: 1.1,
      template: '①テーマと全く無関係なランダムな名詞を8個生成する(意図的に遠い分野から選ぶ)。②各名詞の本質的特徴を3つ挙げる。③その特徴をテーマに強制接続したアイディアを各1案・計8案作る(名詞 / 特徴 / 案名 / 概要)。突飛さを恐れず、飛距離を最優先すること。',
    },
  },
  {
    id: 'morphological', type: 'llm', label: '形態分析法', icon: '🧩', color: C.idea, cat: '発想',
    description: 'パラメータ×選択肢のマトリクスから「あり得ない組み合わせ」を拾う',
    defaults: {
      temperature: 0.9,
      template: '形態分析法を実行せよ: テーマを構成する主要パラメータ(軸)を4〜6個抽出し、各軸に選択肢を5個列挙して形態マトリクス表を作る。次に「通常あり得ない組み合わせ」を中心に7通り選び、各組み合わせから1案ずつ生成する(組み合わせ / 案名 / 概要)。',
    },
  },
  {
    id: 'brainwriting', type: 'llm', label: 'AIブレインライティング', icon: '✍️', color: C.idea, cat: '発想',
    description: '6人の仮想参加者による6-3-5式リレー発想',
    defaults: {
      temperature: 1.0,
      template: 'AI版ブレインライティング(6-3-5)を一人で演じよ: 思考の癖が異なる6人の参加者(名前・職業・発想の癖)を設定する → R1: 各自3案 → R2: 隣の人の案に便乗して発展 → R3: さらに発展。ラウンドごとに表で示し、最終18案から「化けた」案トップ5を選出して進化の経緯を各1行で述べる。',
    },
  },
  {
    id: 'dialectic', type: 'llm', label: '弁証法(正・反・合)', icon: '☯️', color: C.idea, cat: '発想',
    description: 'テーゼ→アンチテーゼ→ジンテーゼの飛躍で統合案を作る',
    defaults: {
      temperature: 0.9,
      template: '弁証法を実行せよ: これまでの内容から有望な論点を3つ選び、各論点について テーゼ(主流のアプローチ)→ アンチテーゼ(それを真っ向から否定する対立案)→ ジンテーゼ(両者の矛盾を一段高い視点で解決する統合案)を作る。ジンテーゼが最も斬新な提案になるよう飛躍させること。',
    },
  },
  {
    id: 'contrarian', type: 'llm', label: '逆張り・前提破壊', icon: '😈', color: C.idea, cat: '発想',
    description: '業界の常識10個を列挙して意図的に破壊する',
    defaults: {
      temperature: 1.0,
      template: 'テーマ領域の「業界の常識・暗黙の前提」を10個列挙せよ。次に、各前提を意図的に逆転・破壊した場合に成立しうるアイディアを各1案作る(前提 / 逆転 / 案名 / 概要 / 成立条件)。最後に、逆張りとして筋が良い順にトップ5を選ぶ。',
    },
  },
  {
    id: 'worst_reverse', type: 'llm', label: 'ワーストアイディア反転', icon: '🙃', color: C.idea, cat: '発想',
    description: 'わざと最悪の案を出し、その本質を180度反転させる',
    defaults: {
      temperature: 1.1,
      template: '①わざと最悪のアイディア(誰も使わない・炎上する・破滅的)を10個出す。②各案について「なぜ最悪なのか」の本質を特定する。③その本質を180度反転させ、優れたアイディアに転換する(最悪案 / 最悪の理由 / 反転案 / 概要)。最悪であるほど反転後は鋭くなることを意識せよ。',
    },
  },
  {
    id: 'freeprompt', type: 'llm', label: '自由プロンプト', icon: '💬', color: C.idea, cat: '発想',
    description: '任意の指示を書ける汎用LLMステップ',
    defaults: {
      temperature: 0.9,
      template: '(ここに自由な指示を書いてください。プロジェクト入力と直前の成果物は自動で文脈に含まれます)',
    },
  },

  // ============ 探索 ============
  {
    id: 'websearch', type: 'search', label: 'Web探索', icon: '🌐', color: C.search, cat: '探索',
    description: 'Web検索して外部の知見・事例・兆しを材料化する',
    defaults: {
      queryTemplate: '{{theme}} 最新動向 事例',
      maxResults: 8,
      temperature: 0.7,
      template: '以下のWeb検索結果を材料として、テーマに使える外部の知見を整理せよ: ①注目トレンド5つ ②意外な事例5つ ③そこから得られるアイディアの種5つ。可能な項目には出典URLを添える。\n\n# 検索結果\n{{results}}',
    },
  },
  {
    id: 'cross_domain', type: 'search', label: '異分野移植', icon: '🚀', color: C.search, cat: '探索',
    description: '他分野の成功構造を検索し、テーマに移植した奇抜な案を作る',
    defaults: {
      queryTemplate: '異業種 成功事例 ビジネスモデル 仕組み 意外',
      maxResults: 8,
      temperature: 1.0,
      template: 'あなたは異分野移植の専門家である。①直前の成果物から、アイディアの「構造」(誰の・どんな課題を・どんな仕組みで解くか)を抽出せよ。②Web検索結果に含まれる他分野の事例の構造と掛け合わせ、「◯◯業界の△△方式をこのテーマに移植したら」という移植アイディアを7案生成せよ(移植元 / 移植する構造 / 案名 / 概要 / なぜ成立するか)。遠い分野からの移植ほど高く評価すること。\n\n# 検索結果\n{{results}}',
    },
  },

  // ============ 評価 ============
  {
    id: 'persona', type: 'llm', label: 'ペルソナ評価', icon: '👥', color: C.eval, cat: '評価',
    description: '異なる3体のペルソナが各案を0〜10点で評価、上位6案に絞る',
    defaults: {
      temperature: 0.7,
      template: '互いに大きく異なる3体のペルソナ(名前・属性・ニーズ・ペイン)を生成し、直前の有望案それぞれを3体全員で評価せよ(刺さる点 / 不安・違和感 / 改善案 / 利用可能性0〜10点)。最後に案ごとの平均点の表(小数1桁)を示し、「上位6案に絞り込みます」と宣言して上位6案を挙げる。',
    },
  },
  {
    id: 'sixhats', type: 'llm', label: 'シックス・ハット+紫', icon: '🎩', color: C.eval, cat: '評価',
    description: '6色+紫(皮肉屋)の7視点レビューと5軸採点、上位3案に絞る',
    defaults: {
      temperature: 0.7,
      template: '上位案を1案ずつ、7つの帽子で多角レビューせよ: 白(事実)・赤(感情)・黒(リスク)・黄(利点)・緑(代替案)・青(まとめ)+紫(皮肉屋: 前提そのものへのツッコミ)。各案に5軸(実現性・市場ニーズ・独自性・収益性・リスク安全度 ※高いほど安全)を10点満点で採点する。最後に総合スコア(5軸の単純平均・小数1桁)の一覧表を示し、「上位3案に絞り込みます」と宣言して上位3案を挙げる。',
    },
  },
  {
    id: 'premortem', type: 'llm', label: 'プレモータム', icon: '⚰️', color: C.eval, cat: '評価',
    description: '「1年後に大失敗した」と仮定して死因を先に洗い出す',
    defaults: {
      temperature: 0.8,
      template: 'プレモータムを実行せよ: 対象案が「1年後に大失敗した」と仮定し、死因トップ7を具体的なストーリーとして書く。各死因の早期警戒シグナルと予防策を表にまとめる。最後に、それでも残る本質的リスクと、そのリスクを逆手に取る一手を提案せよ。',
    },
  },
  {
    id: 'filter_top', type: 'llm', label: '絞り込み Top8', icon: '🔍', color: C.eval, cat: '評価',
    description: '全案を3軸採点して上位8案に絞り込む',
    defaults: {
      temperature: 0.6,
      template: 'これまでの全アイディアを俯瞰し、独自性・実現性・インパクトの3軸(各10点)で採点した表を作れ。重複・類似案は統合してよい。合計点で上位8案を選出し、それぞれ選出理由を2行で述べよ。',
    },
  },
  {
    id: 'backcast', type: 'llm', label: '逆算実行計画', icon: '🎯', color: C.eval, cat: '評価',
    description: '最終目標から逆算して初日にやることまで落とす',
    defaults: {
      temperature: 0.7,
      template: '上位案それぞれについて、逆算法で実行計画を作れ: 最終目標 / 中間段階 / 初日にやること / 1週間以内にやること / 必要なもの / 最初に検証する仮説 / 失敗しそうなポイント / 代替案。',
    },
  },

  // ============ 制御 ============
  {
    id: 'gate', type: 'gate', label: '人間判断ゲート', icon: '✋', color: C.gate, cat: '制御',
    description: 'ここで人間が 採用 / 再生成 / 修正 を判断する。再生成した案は分岐保持され比較できる',
    defaults: {},
  },
  {
    id: 'merge', type: 'merge', label: '統合', icon: '🔗', color: C.merge, cat: '制御',
    description: 'それまでに順番に作成した成果物をひとつに束ねる',
    defaults: {},
  },
  {
    id: 'report', type: 'report', label: '最終レポート', icon: '📄', color: C.report, cat: '制御',
    description: '全工程を最終レポートMarkdownに編纂。ダウンロード可能',
    defaults: {
      temperature: 0.6,
      template: 'これまでの全工程を踏まえ、最終レポートをMarkdownで出力せよ。構成:\n# タイトル(ベスト案の名を冠する)\n1. プロジェクト概要(テーマ・制約)\n2. ベストアイディア詳細(各案: 概要 / ターゲット / スコア表 / 実行計画)\n3. 検討の経緯(材料出し→変形→評価の各ステップ要約)\n4. 次の一歩(明日から始める3アクション)',
    },
  },
];

export const CATS = ['入力', '発想', '探索', '評価', '制御'];

export const TYPE_LABEL: Record<string, string> = {
  input: '入力',
  llm: 'LLM生成',
  search: 'Web探索',
  gate: '人間判断',
  merge: '統合',
  report: 'レポート',
};

export function makeNode(b: BlockDef, pos: { x: number; y: number }) {
  return {
    id: newNodeId(),
    type: 'step',
    position: pos,
    data: {
      blockId: b.id,
      ntype: b.type,
      icon: b.icon,
      color: b.color,
      label: b.label,
      description: b.description,
      providerId: null,
      ...(JSON.parse(JSON.stringify(b.defaults || {}))),
    },
  };
}
