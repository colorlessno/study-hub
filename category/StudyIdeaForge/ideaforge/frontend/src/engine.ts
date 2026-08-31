import * as api from './api';
import { useStore } from './store';
import { PRESETS } from './presets';

export const SYSTEM_PROMPT = `あなたは「IdeaForge」というアイディア創出ワークフローアプリの実行エンジンである。
- 出力はすべて日本語。読みやすいMarkdown(見出し・表・箇条書き)で書く。JSONやコードブロックは出力しない。
- 指示されたステップの成果物だけを出力する。前置き・後書きの雑談はしない。
- 平凡な案で満足せず、意外性と実現可能性を両立した案を狙うこと。`;

const up = (id: string, edges: any[]) =>
  edges.filter(e => e.target === id).map(e => e.source);

function chosenText(runs: any, id: string) {
  const r = runs[id];
  if (!r || r.chosen < 0 || !r.variants[r.chosen]) return '';
  return r.variants[r.chosen].text;
}

export function upstreamText(nodeId: string) {
  const s = useStore.getState();
  return up(nodeId, s.edges)
    .map(uid => {
      const n = s.nodes.find((nn: any) => nn.id === uid);
      return `### 【${n?.data?.label || uid}】\n${chosenText(s.runs, uid)}`;
    })
    .join('\n\n');
}

export function fillVars(t: string) {
  const s = useStore.getState();
  return (t || '').replace(/\{\{(\w+)\}\}/g, (_m, k) => {
    if (k === 'inputs') return s.inputsText;
    return s.inputs[k] ?? '';
  });
}

function buildUserMessage(node: any, opts: { results?: string; extra?: string } = {}) {
  const s = useStore.getState();
  let task = (node.data.template || '').split('{{results}}').join(opts.results ?? '');
  task = fillVars(task);
  let msg = '';
  if (s.inputsText) msg += `# プロジェクト入力\n${s.inputsText}\n\n`;
  const ut = upstreamText(node.id);
  if (ut.trim()) msg += `# 直前の成果物\n${ut}\n\n`;
  msg += `# 今回のタスク\n${task}`;
  if (opts.extra)
    msg += `\n\n# 追加指示(最優先で反映)\n${opts.extra}\n(上記を反映して全体を作り直すこと)`;
  return msg;
}

async function streamNode(node: any, opts: { results?: string; extra?: string } = {}) {
  const st = useStore.getState();
  st.setRun(node.id, { status: 'running', error: null });
  useStore.setState({ activeNode: node.id });
  const idx = (useStore.getState().runs[node.id]?.variants || []).length;
  st.pushVariant(node.id, {
    text: '',
    note: opts.extra ? `修正: ${opts.extra.slice(0, 24)}` : idx > 0 ? '再生成' : undefined,
    at: Date.now(),
  });
  useStore.getState().setRun(node.id, { status: 'running' });
  const ctrl = new AbortController();
  useStore.setState({ abort: ctrl });
  try {
    await api.streamLLM(
      {
        provider_id: node.data.providerId || null,
        temperature: node.data.temperature ?? 0.9,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserMessage(node, opts) },
        ],
      },
      chunk => useStore.getState().appendVariant(node.id, idx, chunk),
      ctrl.signal
    );
    const text = useStore.getState().runs[node.id].variants[idx]?.text || '';
    if (!text.trim()) throw new Error('LLMから応答がありません(プロバイダ設定を確認)');
    useStore.getState().setRun(node.id, { status: 'done' });
    maybeCelebrate(node, text);
    return true;
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      useStore.getState().setRun(node.id, { status: 'idle' });
      return false;
    }
    useStore.getState().setRun(node.id, { status: 'error', error: String(e?.message || e) });
    return false;
  }
}

async function execSearch(node: any, extra?: string) {
  const st = useStore.getState();
  st.setRun(node.id, { status: 'running', error: null });
  useStore.setState({ activeNode: node.id });
  const q = fillVars(node.data.queryTemplate || '').trim() || fillVars('{{theme}}');
  let res: any = { ok: false, results: [], error: '' };
  try {
    res = await api.j('POST', '/api/search', {
      query: q,
      max_results: node.data.maxResults || 8,
    });
  } catch (e: any) {
    res = { ok: false, results: [], error: String(e?.message || e) };
  }
  let resultsText: string;
  if (res.ok && res.results.length) {
    resultsText = res.results
      .map((r: any, i: number) => `${i + 1}. **${r.title}**\n   ${r.snippet}\n   出典: ${r.url}`)
      .join('\n');
  } else {
    resultsText = `(Web検索は失敗またはヒットなし: ${res.error || 'no results'} — 検索結果なしで、あなたの知識から推論して実行すること)`;
  }
  useStore.setState({
    searchLog: { ...useStore.getState().searchLog, [node.id]: { query: q, results: res.results } },
  });
  if (node.data.template) return await streamNode(node, { results: resultsText, extra });
  st.pushVariant(node.id, { text: `## 検索クエリ\n${q}\n\n## 結果\n${resultsText}`, at: Date.now() });
  useStore.getState().setRun(node.id, { status: 'done' });
  return true;
}

async function execNode(node: any): Promise<'cont' | 'stop'> {
  const t = node.data.ntype;
  if (t === 'input') {
    useStore.getState().setRun(node.id, { status: 'waiting' });
    useStore.setState((s: any) => ({ pendingInputs: [...s.pendingInputs, node.id] }));
    return 'cont';
  }
  if (t === 'gate') {
    useStore.getState().setRun(node.id, { status: 'waiting' });
    useStore.setState({ activeNode: node.id });
    return 'cont';
  }
  if (t === 'merge') {
    useStore.getState().pushVariant(node.id, { text: upstreamText(node.id), at: Date.now() });
    useStore.getState().setRun(node.id, { status: 'done' });
    return 'cont';
  }
  if (t === 'search') return (await execSearch(node)) ? 'cont' : 'stop';
  return (await streamNode(node)) ? 'cont' : 'stop'; // llm / report
}

let ticking = false;
export async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    while (true) {
      const s = useStore.getState();
      if (!s.running || s.mode !== 'run') break;
      const ready = s.nodes.filter((n: any) => {
        const r = s.runs[n.id];
        if (!r || r.status !== 'idle') return false;
        return up(n.id, s.edges).every(u => s.runs[u]?.status === 'done');
      });
      if (!ready.length) {
        const vals: any[] = Object.values(s.runs);
        const busy = vals.some(r => r.status === 'running' || r.status === 'waiting');
        if (!busy) {
          const anyErr = vals.some(r => r.status === 'error');
          useStore.setState({ running: false });
          if (anyErr) {
            s.setToast('⚠ エラーで停止しました。ノードを選んで再試行できます');
            await saveSession('error');
          } else {
            s.setToast('🏁 ワークフロー完了!');
            await saveSession('done');
          }
        }
        break;
      }
      ready.sort((a: any, b: any) => a.position.y - b.position.y || a.position.x - b.position.x);
      const res = await execNode(ready[0]);
      await saveSession();
      if (res === 'stop') break;
    }
  } finally {
    ticking = false;
  }
}

const cleanNode = (n: any) => ({ id: n.id, type: n.type, position: n.position, data: n.data });
const cleanEdge = (e: any) => ({ id: e.id, source: e.source, target: e.target, animated: true });

export async function startRun() {
  const s = useStore.getState();
  if (!s.nodes.length) {
    s.setToast('ノードがありません。左のパレットからブロックを置いてください');
    return;
  }
  const runs: any = {};
  s.nodes.forEach((n: any) => (runs[n.id] = { status: 'idle', variants: [], chosen: -1 }));
  const name = `${s.workflowName} — ${new Date().toLocaleString('ja-JP')}`;
  let sid: number | null = null;
  try {
    const r = await api.j('POST', '/api/sessions', {
      workflow_id: s.workflowId,
      name,
      graph: { nodes: s.nodes.map(cleanNode), edges: s.edges.map(cleanEdge) },
      state: {},
    });
    sid = r.id;
  } catch {}
  useStore.setState({
    mode: 'run',
    running: true,
    runs,
    inputs: {},
    inputsText: '',
    pendingInputs: [],
    sessionId: sid,
    sessionName: name,
    activeNode: null,
    celebration: null,
    searchLog: {},
  });
  tick();
}

export function stopRun() {
  const s = useStore.getState();
  s.abort?.abort();
  useStore.setState({ running: false });
  s.setToast('⏸ 中断しました(▶で再開)');
}

export function resumeRun() {
  useStore.setState({ running: true });
  tick();
}

export function backToEdit() {
  useStore.setState({
    mode: 'edit', running: false, runs: {}, sessionId: null,
    pendingInputs: [], activeNode: null, celebration: null,
  });
}

export async function saveSession(status?: string) {
  const s = useStore.getState();
  if (!s.sessionId) return;
  const body: any = { state: { runs: s.runs, inputs: s.inputs, inputsText: s.inputsText } };
  if (status) body.status = status;
  try {
    await api.j('PATCH', `/api/sessions/${s.sessionId}`, body);
  } catch {}
}

export async function submitInput(nodeId: string, values: Record<string, string>) {
  const s = useStore.getState();
  const node = s.nodes.find((n: any) => n.id === nodeId);
  const fields = node?.data?.fields || [];
  const lines = fields.map(
    (f: any) => `- **${f.label}**: ${(values[f.key] || '').trim() || '指定なし'}`
  );
  const inputs = { ...s.inputs };
  fields.forEach((f: any) => (inputs[f.key] = (values[f.key] || '').trim() || '指定なし'));
  useStore.setState({
    inputs,
    inputsText:
      (s.inputsText ? s.inputsText + '\n\n' : '') +
      `【${node?.data?.label}】\n` + lines.join('\n'),
    pendingInputs: s.pendingInputs.filter((id: string) => id !== nodeId),
  });
  s.pushVariant(nodeId, { text: lines.join('\n'), at: Date.now() });
  s.setRun(nodeId, { status: 'done' });
  await saveSession();
  tick();
}

export async function gateAdopt(gateId: string) {
  const s = useStore.getState();
  const upId = up(gateId, s.edges)[0];
  s.pushVariant(gateId, { text: chosenText(s.runs, upId), at: Date.now() });
  s.setRun(gateId, { status: 'done' });
  await saveSession();
  tick();
}

export async function gateRegen(gateId: string, instruction?: string) {
  const s = useStore.getState();
  const upId = up(gateId, s.edges)[0];
  const node = s.nodes.find((n: any) => n.id === upId);
  if (!node) return;
  if (node.data.ntype === 'search') await execSearch(node, instruction);
  else await streamNode(node, { extra: instruction });
  useStore.setState({ activeNode: gateId });
  await saveSession();
}

export async function retryNode(nodeId: string) {
  const s = useStore.getState();
  const node = s.nodes.find((n: any) => n.id === nodeId);
  if (!node) return;
  s.setRun(nodeId, { status: 'idle', error: null });
  useStore.setState({ running: true });
  tick();
}

// ---------- 激アツ検出 ----------
export function extractTopScore(text: string): number | null {
  const scores: number[] = [];
  const re = /(\d+(?:\.\d+)?)\s*(?:\/\s*10|点)/g;
  let m;
  while ((m = re.exec(text))) {
    const v = parseFloat(m[1]);
    if (v > 0 && v <= 10) scores.push(v);
  }
  return scores.length ? Math.max(...scores) : null;
}

function maybeCelebrate(node: any, text: string) {
  const evalBlocks = ['persona', 'sixhats', 'filter_top'];
  if (!evalBlocks.includes(node.data.blockId) && !/評価|採点/.test(node.data.label || ''))
    return;
  const top = extractTopScore(text);
  if (top == null) return;
  let tier = 0;
  if (top >= 9) tier = 3;
  else if (top >= 8) tier = 2;
  else if (top >= 7) tier = 1;
  if (tier)
    useStore.getState().fireCelebration({ tier, title: node.data.label, score: top });
}

export function manualCelebrate(title: string) {
  useStore.getState().fireCelebration({ tier: 3, title, manual: true });
}

// ---------- init / workflow CRUD ----------
export async function initApp() {
  try {
    const provs = await api.j('GET', '/api/providers');
    const settings = await api.j('GET', '/api/settings');
    const wfs = await api.j('GET', '/api/workflows');
    let workflows = wfs;
    if (!workflows.length) {
      for (const p of PRESETS)
        await api.j('POST', '/api/workflows', {
          name: p.name,
          description: p.description,
          graph: p.graph,
          is_preset: 1,
        });
      workflows = await api.j('GET', '/api/workflows');
    } else {
      const legacyFusion = workflows.find(
        (workflow: any) => workflow.is_preset === 1 && workflow.name === '⚡ 並列発想フュージョン'
      );
      const sequentialFusion = PRESETS.find(preset => preset.name === '⚡ 段階発想フュージョン');
      if (legacyFusion && sequentialFusion) {
        await api.j('PUT', `/api/workflows/${legacyFusion.id}`, {
          name: sequentialFusion.name,
          description: sequentialFusion.description,
          graph: sequentialFusion.graph,
        });
        workflows = await api.j('GET', '/api/workflows');
      }
    }
    useStore.setState({ providers: provs, settings, workflows });
    if (workflows.length) await loadWorkflow(workflows[0].id);
  } catch (e: any) {
    useStore.getState().setToast('初期化エラー: ' + (e?.message || e));
  }
}

export async function loadWorkflow(id: number) {
  const w = await api.j('GET', `/api/workflows/${id}`);
  useStore.setState({
    workflowId: w.id,
    workflowName: w.name,
    workflowDesc: w.description,
    nodes: w.graph.nodes || [],
    edges: w.graph.edges || [],
    selected: null,
    mode: 'edit',
    runs: {},
    sessionId: null,
  });
}

export async function saveWorkflow(asNew = false) {
  const s = useStore.getState();
  const graph = { nodes: s.nodes.map(cleanNode), edges: s.edges.map(cleanEdge) };
  if (s.workflowId && !asNew) {
    await api.j('PUT', `/api/workflows/${s.workflowId}`, {
      name: s.workflowName,
      description: s.workflowDesc,
      graph,
    });
  } else {
    const savedName = asNew ? s.workflowName + ' (コピー)' : s.workflowName;
    const r = await api.j('POST', '/api/workflows', {
      name: savedName,
      description: s.workflowDesc,
      graph,
    });
    useStore.setState({ workflowId: r.id, workflowName: savedName });
  }
  useStore.setState({ workflows: await api.j('GET', '/api/workflows') });
  s.setToast('💾 保存しました');
}

export function newWorkflow() {
  useStore.setState({
    workflowId: null,
    workflowName: '無題のワークフロー',
    workflowDesc: '',
    nodes: [],
    edges: [],
    selected: null,
    mode: 'edit',
    runs: {},
  });
}

export async function deleteWorkflow() {
  const s = useStore.getState();
  if (!s.workflowId) return;
  await api.j('DELETE', `/api/workflows/${s.workflowId}`);
  const workflows = await api.j('GET', '/api/workflows');
  useStore.setState({ workflows });
  if (workflows.length) await loadWorkflow(workflows[0].id);
  else newWorkflow();
}

export async function loadSession(sid: number) {
  const d = await api.j('GET', `/api/sessions/${sid}`);
  const runs = d.state.runs || {};
  Object.keys(runs).forEach(k => {
    if (runs[k].status === 'running') runs[k].status = 'idle';
  });
  useStore.setState({
    nodes: d.graph.nodes || [],
    edges: d.graph.edges || [],
    runs,
    inputs: d.state.inputs || {},
    inputsText: d.state.inputsText || '',
    mode: 'run',
    running: false,
    sessionId: d.id,
    sessionName: d.name,
    activeNode: null,
    pendingInputs: [],
    modal: null,
  });
}
