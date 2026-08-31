import { BLOCKS, makeNode } from './blocks';

function nd(blockId: string, x: number, y: number, patch: any = {}) {
  const b = BLOCKS.find(bb => bb.id === blockId)!;
  const n = makeNode(b, { x, y });
  n.data = { ...n.data, ...patch };
  return n;
}

const eg = (a: any, b: any) => ({
  id: `e-${a.id}-${b.id}`,
  source: a.id,
  target: b.id,
  animated: true,
});

function chain(nodes: any[]) {
  const edges: any[] = [];
  for (let i = 0; i < nodes.length - 1; i++) edges.push(eg(nodes[i], nodes[i + 1]));
  return edges;
}

export const PRESETS = (() => {
  const out: any[] = [];

  // 1. 王道・8ステップ完全版(原典)
  {
    const t = nd('theme_input', 260, 0);
    const c = nd('constraint_input', 260, 115);
    const mm = nd('mindmap', 260, 230);
    const g1 = nd('gate', 260, 345, { label: '判断: 材料出し' });
    const sc = nd('scamper', 260, 460);
    const g2 = nd('gate', 260, 575, { label: '判断: 21案' });
    const pe = nd('persona', 260, 690);
    const g3 = nd('gate', 260, 805, { label: '判断: 顧客評価' });
    const sh = nd('sixhats', 260, 920);
    const g4 = nd('gate', 260, 1035, { label: '判断: 多角評価' });
    const bc = nd('backcast', 260, 1150);
    const g5 = nd('gate', 260, 1265, { label: '判断: 実行計画' });
    const rp = nd('report', 260, 1380);
    const ns = [t, c, mm, g1, sc, g2, pe, g3, sh, g4, bc, g5, rp];
    out.push({
      name: '🏛 王道・8ステップ完全版',
      description: '原典ワークフロー: 材料出し→SCAMPER→ペルソナ→シックスハット→逆算計画。全工程に人間判断ゲート付き。',
      graph: { nodes: ns, edges: chain(ns) },
    });
  }

  // 2. 異分野移植スプリント
  {
    const t = nd('theme_input', 260, 0);
    const st = nd('freeprompt', 260, 115, {
      label: '構造抽出',
      template:
        'テーマを「構造」に分解せよ: 誰の / どんな課題(ジョブ)を / 何の仕組み・価値交換で解くのか。本質構造を5行でまとめ、さらにこの構造を一般化した抽象パターンを3つ提示する。',
    });
    const cd = nd('cross_domain', 260, 230);
    const g1 = nd('gate', 260, 345, { label: '判断: 移植案' });
    const sh = nd('sixhats', 260, 460);
    const g2 = nd('gate', 260, 575, { label: '判断: 評価' });
    const rp = nd('report', 260, 690);
    const ns = [t, st, cd, g1, sh, g2, rp];
    out.push({
      name: '🚀 異分野移植スプリント',
      description: 'テーマの構造を抽出し、Web検索で見つけた他分野の成功構造を移植して斬新な案を作る。',
      graph: { nodes: ns, edges: chain(ns) },
    });
  }

  // 3. 段階発想フュージョン
  {
    const t = nd('theme_input', 300, 0);
    const sc = nd('scamper', 300, 115);
    const rs = nd('random_stimulus', 300, 230);
    const ct = nd('contrarian', 300, 345);
    const mg = nd('merge', 300, 460);
    const ft = nd('filter_top', 300, 575);
    const g1 = nd('gate', 300, 690, { label: '判断: 上位案' });
    const pe = nd('persona', 300, 805);
    const g2 = nd('gate', 300, 920, { label: '判断: 顧客評価' });
    const rp = nd('report', 300, 1035);
    const nodes = [t, sc, rs, ct, mg, ft, g1, pe, g2, rp];
    out.push({
      name: '⚡ 段階発想フュージョン',
      description: 'SCAMPER・ランダム刺激・逆張りを順番に実行し、成果を統合してから絞り込みと顧客評価へ進む。',
      graph: { nodes, edges: chain(nodes) },
    });
  }

  // 4. 天邪鬼・前提破壊
  {
    const t = nd('theme_input', 260, 0);
    const ct = nd('contrarian', 260, 115);
    const g1 = nd('gate', 260, 230, { label: '判断: 逆張り案' });
    const wr = nd('worst_reverse', 260, 345);
    const g2 = nd('gate', 260, 460, { label: '判断: 反転案' });
    const pm = nd('premortem', 260, 575);
    const g3 = nd('gate', 260, 690, { label: '判断: リスク' });
    const rp = nd('report', 260, 805);
    const ns = [t, ct, g1, wr, g2, pm, g3, rp];
    out.push({
      name: '😈 天邪鬼・前提破壊',
      description: '業界の常識を列挙して破壊し、最悪アイディアの反転とプレモータムで鍛える逆張り特化フロー。',
      graph: { nodes: ns, edges: chain(ns) },
    });
  }

  return out;
})();
