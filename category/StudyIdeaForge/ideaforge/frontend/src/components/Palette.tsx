import { useState } from 'react';
import { BLOCKS, CATS, makeNode } from '../blocks';
import { useStore } from '../store';

export default function Palette() {
  const [open, setOpen] = useState<string>('発想');
  const [width, setWidth] = useState<number>(() => {
    const w = parseInt(localStorage.getItem('if_pal_w') || '300', 10);
    return isNaN(w) ? 300 : Math.min(560, Math.max(200, w));
  });
  const [dragging, setDragging] = useState(false);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    const startX = e.clientX;
    const startW = width;
    const move = (ev: MouseEvent) => {
      const w = Math.min(560, Math.max(200, startW + ev.clientX - startX));
      setWidth(w);
      localStorage.setItem('if_pal_w', String(w));
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  // 幅300pxを基準(1倍)に、広げるほど文字が大きくなる(0.9〜1.7倍)
  const scale = Math.max(0.9, Math.min(1.7, width / 300));

  return (
    <div className="panel palette" style={{ width, fontSize: `${(14.5 * scale).toFixed(1)}px` }}>
      <div className="panel-title">🧰 発想ブロック</div>
      <div className="palette-hint">カテゴリをクリックで開閉 / ブロックはドラッグかダブルクリックで追加</div>
      {CATS.map(cat => {
        const items = BLOCKS.filter(b => b.cat === cat);
        const isOpen = open === cat;
        return (
          <div key={cat}>
            <button
              className={`pal-cat-head ${isOpen ? 'open' : ''}`}
              onClick={() => setOpen(isOpen ? '' : cat)}
            >
              <span>{isOpen ? '▾' : '▸'} {cat}</span>
              <span className="pal-count">{items.length}</span>
            </button>
            {isOpen &&
              items.map(b => (
                <div
                  key={b.id}
                  className="pal-item"
                  style={{ ['--c' as any]: b.color }}
                  draggable
                  onDragStart={e => e.dataTransfer.setData('application/ideaforge', b.id)}
                  onDoubleClick={() => {
                    const s = useStore.getState();
                    if (s.mode !== 'edit') return;
                    const y = s.nodes.length
                      ? Math.max(...s.nodes.map((n: any) => n.position.y)) + 120
                      : 60;
                    useStore.setState((st: any) => ({
                      nodes: [...st.nodes, makeNode(b, { x: 260, y })],
                    }));
                  }}
                  title={b.description}
                >
                  <span className="pal-icon">{b.icon}</span>
                  <span className="pal-label">{b.label}</span>
                </div>
              ))}
          </div>
        );
      })}
      <div
        className={`pal-resizer ${dragging ? 'active' : ''}`}
        onMouseDown={startDrag}
        title="ドラッグで幅を調整(広げると文字も大きくなります)"
      />
    </div>
  );
}
