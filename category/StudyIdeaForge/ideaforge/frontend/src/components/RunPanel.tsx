import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStore } from '../store';
import * as engine from '../engine';
import { download } from '../api';

const Markdown = ({ text }: { text: string }) => (
  <div className="md-body">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
  </div>
);

export default function RunPanel() {
  const activeNode = useStore((s: any) => s.activeNode);
  const nodes = useStore((s: any) => s.nodes);
  const edges = useStore((s: any) => s.edges);
  const runs = useStore((s: any) => s.runs);
  const chooseVariant = useStore((s: any) => s.chooseVariant);
  const [fix, setFix] = useState('');
  const [showFix, setShowFix] = useState(false);

  const node = nodes.find((n: any) => n.id === activeNode);
  if (!node)
    return (
      <div className="panel run-panel">
        <div className="panel-title">▶ 実行モニタ</div>
        <div className="empty">実行が進むとここに成果物が流れます。ノードをクリックすると内容を確認できます。</div>
      </div>
    );

  const run = runs[node.id];
  const isGate = node.data.ntype === 'gate';
  const gateWaiting = isGate && run?.status === 'waiting';
  // ゲート待機中は上流ノードの成果物を表示・比較する
  const upId = isGate ? edges.find((e: any) => e.target === node.id)?.source : null;
  const showId = gateWaiting && upId ? upId : node.id;
  const showNode = nodes.find((n: any) => n.id === showId) || node;
  const showRun = runs[showId];
  const variants = showRun?.variants || [];
  const chosen = showRun?.chosen ?? -1;
  const text = variants[chosen]?.text || '';
  const streaming = showRun?.status === 'running';

  const doRegen = async (instruction?: string) => {
    setShowFix(false);
    setFix('');
    await engine.gateRegen(node.id, instruction);
  };

  return (
    <div className="panel run-panel">
      <div className="panel-title">
        {showNode.data.icon} {showNode.data.label}
        {gateWaiting && <span className="badge-wait">✋ 判断待ち</span>}
        {streaming && <span className="badge-run">生成中…</span>}
      </div>

      {variants.length > 1 && (
        <div className="var-tabs">
          {variants.map((v: any, i: number) => (
            <button
              key={i}
              className={`var-tab ${i === chosen ? 'on' : ''}`}
              onClick={() => chooseVariant(showId, i)}
              title={v.note || ''}
            >
              案{i + 1}
              {v.note ? ` · ${v.note}` : ''}
            </button>
          ))}
        </div>
      )}

      <div className="run-body">
        {showRun?.status === 'error' ? (
          <div className="error-box">
            ⚠ {showRun.error}
            <button className="btn small" onClick={() => engine.retryNode(showId)}>
              🔁 再試行
            </button>
          </div>
        ) : (
          <>
            <Markdown text={text} />
            {streaming && <span className="cursor">▊</span>}
          </>
        )}
      </div>

      {gateWaiting && !streaming && (
        <div className="gate-bar">
          <button className="btn primary" onClick={() => engine.gateAdopt(node.id)}>
            ✅ この案を採用して次へ
          </button>
          <button className="btn" onClick={() => doRegen()}>
            🎲 再生成(分岐保持)
          </button>
          <button className="btn" onClick={() => setShowFix(!showFix)}>
            ✏️ 修正…
          </button>
          <button
            className="btn jackpot"
            onClick={() => {
              engine.manualCelebrate(showNode.data.label);
            }}
            title="人間の直感で「これだ!」と思ったら叩け"
          >
            🎰 これだ!!
          </button>
          {showFix && (
            <div className="fix-row">
              <textarea
                rows={3}
                placeholder="修正指示(例: もっとBtoB向けに / 3案目を深掘り)"
                value={fix}
                onChange={e => setFix(e.target.value)}
              />
              <button className="btn primary" disabled={!fix.trim()} onClick={() => doRegen(fix.trim())}>
                修正して再生成
              </button>
            </div>
          )}
        </div>
      )}

      {node.data.ntype === 'report' && run?.status === 'done' && (
        <div className="gate-bar">
          <button
            className="btn primary"
            onClick={() =>
              download(
                `IdeaForge_report_${new Date().toISOString().slice(0, 10)}.md`,
                variants[chosen]?.text || ''
              )
            }
          >
            ⬇ レポートをダウンロード (.md)
          </button>
          <button className="btn jackpot" onClick={() => engine.manualCelebrate('最終レポート')}>
            🎰 これだ!!
          </button>
        </div>
      )}
    </div>
  );
}
