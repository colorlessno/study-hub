import { useStore } from '../store';

export default function Inspector() {
  const selected = useStore((s: any) => s.selected);
  const nodes = useStore((s: any) => s.nodes);
  const providers = useStore((s: any) => s.providers);
  const setNodeData = useStore((s: any) => s.setNodeData);
  const removeNode = useStore((s: any) => s.removeNode);
  const node = nodes.find((n: any) => n.id === selected);

  if (!node)
    return (
      <div className="panel inspector">
        <div className="panel-title">🔧 インスペクタ</div>
        <div className="empty">
          ノードをクリックすると、プロンプトやLLMプロバイダをここで編集できます。
          <br />
          <br />
          Delete キーでノード/エッジを削除。ノードの下端⇢次ノードの上端をドラッグして接続します。
        </div>
      </div>
    );

  const d = node.data;
  const isLLM = d.ntype === 'llm' || d.ntype === 'report' || d.ntype === 'search';

  return (
    <div className="panel inspector">
      <div className="panel-title">
        {d.icon} {d.label}
      </div>
      <label className="fl">表示名</label>
      <input value={d.label} onChange={e => setNodeData(node.id, { label: e.target.value })} />

      {d.ntype === 'search' && (
        <>
          <label className="fl">検索クエリテンプレート({'{{theme}}'} 等が使えます)</label>
          <input
            value={d.queryTemplate || ''}
            onChange={e => setNodeData(node.id, { queryTemplate: e.target.value })}
          />
          <label className="fl">取得件数</label>
          <input
            type="number"
            min={1}
            max={20}
            value={d.maxResults || 8}
            onChange={e => setNodeData(node.id, { maxResults: +e.target.value })}
          />
        </>
      )}

      {isLLM && (
        <>
          <label className="fl">
            プロンプト(タスク指示)
            {d.ntype === 'search' && ' — {{results}} に検索結果が入ります'}
          </label>
          <textarea
            rows={14}
            value={d.template || ''}
            onChange={e => setNodeData(node.id, { template: e.target.value })}
          />
          <label className="fl">LLMプロバイダ</label>
          <select
            value={d.providerId || ''}
            onChange={e =>
              setNodeData(node.id, { providerId: e.target.value ? +e.target.value : null })
            }
          >
            <option value="">既定 (設定のデフォルト)</option>
            {providers.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.model ? `(${p.model})` : ''}
              </option>
            ))}
          </select>
          <label className="fl">temperature: {d.temperature ?? 0.9}</label>
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.05}
            value={d.temperature ?? 0.9}
            onChange={e => setNodeData(node.id, { temperature: +e.target.value })}
          />
        </>
      )}

      {d.ntype === 'input' && (
        <>
          <label className="fl">質問フィールド</label>
          {(d.fields || []).map((f: any, i: number) => (
            <div key={i} className="field-row">
              <input
                className="fr-key"
                value={f.key}
                title="変数名(プロンプトで {{key}} 参照)"
                onChange={e => {
                  const fields = d.fields.slice();
                  fields[i] = { ...f, key: e.target.value };
                  setNodeData(node.id, { fields });
                }}
              />
              <input
                className="fr-label"
                value={f.label}
                onChange={e => {
                  const fields = d.fields.slice();
                  fields[i] = { ...f, label: e.target.value };
                  setNodeData(node.id, { fields });
                }}
              />
              <button
                className="btn tiny"
                onClick={() => {
                  const fields = d.fields.filter((_: any, j: number) => j !== i);
                  setNodeData(node.id, { fields });
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="btn small"
            onClick={() =>
              setNodeData(node.id, {
                fields: [...(d.fields || []), { key: `f${(d.fields || []).length + 1}`, label: '新項目' }],
              })
            }
          >
            ＋ フィールド追加
          </button>
        </>
      )}

      {d.ntype === 'gate' && (
        <div className="hint-box">
          実行時、ここで一時停止します。直前の成果物を確認して
          <b> 採用 / 再生成 / 修正 </b>
          を選択。再生成した案はすべて分岐保持され、タブで見比べて好きな版を採用できます。
        </div>
      )}
      {d.ntype === 'merge' && (
        <div className="hint-box">複数の上流ブランチの成果物をひとつに束ねて下流へ渡します。</div>
      )}

      <div className="spacer" />
      <button className="btn danger" onClick={() => removeNode(node.id)}>
        🗑 このノードを削除
      </button>
    </div>
  );
}
