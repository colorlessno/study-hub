import { useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useStore } from '../store';
import { BLOCKS, TYPE_LABEL, makeNode } from '../blocks';

const STATUS_LABEL: Record<string, string> = {
  idle: '待機',
  running: '生成中…',
  waiting: 'あなたの番',
  done: '完了',
  error: 'エラー',
};

function StepNode({ id, data, selected }: any) {
  const run = useStore((s: any) => s.runs[id]);
  const mode = useStore((s: any) => s.mode);
  const status = run?.status || 'idle';
  return (
    <div
      className={`step-node s-${mode === 'run' ? status : 'edit'} ${selected ? 'sel' : ''}`}
      style={{ ['--c' as any]: data.color || '#8b7cff' }}
      title={data.description || ''}
    >
      <Handle type="target" position={Position.Top} />
      <div className="sn-head">
        <span className="sn-icon">{data.icon || '⬡'}</span>
        <span className="sn-label">{data.label}</span>
      </div>
      <div className="sn-foot">
        <span className="sn-type">{TYPE_LABEL[data.ntype] || data.ntype}</span>
        {mode === 'run' && (
          <span className={`sn-status st-${status}`}>
            {STATUS_LABEL[status]}
            {run?.variants?.length > 1 && <b className="sn-var">×{run.variants.length}</b>}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { step: StepNode };

function Canvas() {
  const nodes = useStore((s: any) => s.nodes);
  const edges = useStore((s: any) => s.edges);
  const mode = useStore((s: any) => s.mode);
  const onNodesChange = useStore((s: any) => s.onNodesChange);
  const onEdgesChange = useStore((s: any) => s.onEdgesChange);
  const onConnect = useStore((s: any) => s.onConnect);
  const rf = useReactFlow();

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (useStore.getState().mode !== 'edit') return;
      const blockId = e.dataTransfer.getData('application/ideaforge');
      const b = BLOCKS.find(x => x.id === blockId);
      if (!b) return;
      const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      useStore.setState((s: any) => ({
        nodes: [...s.nodes, makeNode(b, { x: pos.x - 105, y: pos.y - 30 })],
      }));
    },
    [rf]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={mode === 'edit' ? onEdgesChange : undefined}
      onConnect={mode === 'edit' ? onConnect : undefined}
      onDrop={onDrop}
      onDragOver={e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onNodeClick={(_e, n) => {
        if (useStore.getState().mode === 'edit') useStore.setState({ selected: n.id });
        else useStore.setState({ activeNode: n.id });
      }}
      onPaneClick={() => useStore.setState({ selected: null })}
      nodesConnectable={mode === 'edit'}
      deleteKeyCode={mode === 'edit' ? ['Backspace', 'Delete'] : null}
      fitView
      minZoom={0.15}
      defaultEdgeOptions={{
        animated: true,
        style: { stroke: '#4b5b7e', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#4b5b7e' },
      }}
    >
      <Background variant={BackgroundVariant.Dots} gap={22} size={1.5} color="#233052" />
      <Controls />
      <MiniMap
        nodeColor={(n: any) => n.data?.color || '#8b7cff'}
        maskColor="rgba(8,12,26,0.75)"
        pannable
        zoomable
      />
    </ReactFlow>
  );
}

export default function GraphEditor() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  );
}
