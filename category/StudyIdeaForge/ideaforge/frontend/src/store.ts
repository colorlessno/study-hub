import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';

let toastTimer: any = null;
let nid = 1;
export const newNodeId = () => `x${Date.now().toString(36)}_${nid++}`;

export const useStore = create((set: any, get: any) => ({
  // --- graph edit ---
  nodes: [] as any[],
  edges: [] as any[],
  workflowId: null as number | null,
  workflowName: '無題のワークフロー',
  workflowDesc: '',
  workflows: [] as any[],
  providers: [] as any[],
  settings: {} as Record<string, string>,
  selected: null as string | null,
  mode: 'edit' as 'edit' | 'run',
  modal: null as string | null,

  // --- run ---
  sessionId: null as number | null,
  sessionName: '',
  runs: {} as Record<string, any>,
  inputs: {} as Record<string, string>,
  inputsText: '',
  pendingInputs: [] as string[],
  running: false,
  activeNode: null as string | null,
  celebration: null as any,
  toast: null as string | null,
  abort: null as AbortController | null,
  searchLog: {} as Record<string, any>,

  onNodesChange: (ch: any) => set({ nodes: applyNodeChanges(ch, get().nodes) }),
  onEdgesChange: (ch: any) => set({ edges: applyEdgeChanges(ch, get().edges) }),
  onConnect: (c: any) => set({ edges: addEdge({ ...c, animated: true }, get().edges) }),
  setNodeData: (id: string, patch: any) =>
    set({
      nodes: get().nodes.map((n: any) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n
      ),
    }),
  removeNode: (id: string) =>
    set({
      nodes: get().nodes.filter((n: any) => n.id !== id),
      edges: get().edges.filter((e: any) => e.source !== id && e.target !== id),
      selected: null,
    }),

  setRun: (id: string, patch: any) =>
    set({
      runs: {
        ...get().runs,
        [id]: {
          ...(get().runs[id] || { status: 'idle', variants: [], chosen: -1 }),
          ...patch,
        },
      },
    }),
  pushVariant: (id: string, v: any) => {
    const r = get().runs[id] || { status: 'idle', variants: [], chosen: -1 };
    const variants = [...r.variants, v];
    set({ runs: { ...get().runs, [id]: { ...r, variants, chosen: variants.length - 1 } } });
  },
  appendVariant: (id: string, idx: number, chunk: string) => {
    const r = get().runs[id];
    if (!r || !r.variants[idx]) return;
    const variants = r.variants.slice();
    variants[idx] = { ...variants[idx], text: variants[idx].text + chunk };
    set({ runs: { ...get().runs, [id]: { ...r, variants } } });
  },
  chooseVariant: (id: string, idx: number) => {
    const r = get().runs[id];
    if (!r) return;
    set({ runs: { ...get().runs, [id]: { ...r, chosen: idx } } });
  },

  setToast: (msg: string) => {
    clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = setTimeout(() => set({ toast: null }), 3200);
  },
  fireCelebration: (c: any) => set({ celebration: { ...c, key: Date.now() } }),
})) as any;
