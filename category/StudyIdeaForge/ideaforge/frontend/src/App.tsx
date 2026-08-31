import { useEffect, useState } from 'react';
import { useStore } from './store';
import * as engine from './engine';
import { toggleTheme } from './sound';
import GraphEditor from './components/GraphEditor';
import Palette from './components/Palette';
import Inspector from './components/Inspector';
import RunPanel from './components/RunPanel';
import Modals from './components/Modals';
import Celebration from './components/Celebration';

function Header() {
  const mode = useStore((s: any) => s.mode);
  const running = useStore((s: any) => s.running);
  const workflows = useStore((s: any) => s.workflows);
  const workflowId = useStore((s: any) => s.workflowId);
  const workflowName = useStore((s: any) => s.workflowName);
  const sessionName = useStore((s: any) => s.sessionName);
  const [menu, setMenu] = useState(false);

  return (
    <header className="header">
      <div className="logo">
        <span className="logo-bolt">⚡</span> Idea<span className="logo-grad">Forge</span>
      </div>

      {mode === 'edit' ? (
        <>
          <select
            className="wf-select"
            value={workflowId || ''}
            onChange={e => e.target.value && engine.loadWorkflow(+e.target.value)}
          >
            <option value="">— ワークフロー選択 —</option>
            {workflows.map((w: any) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <input
            className="wf-name"
            value={workflowName}
            onChange={e => useStore.setState({ workflowName: e.target.value })}
          />
          <button className="btn" onClick={() => engine.saveWorkflow()}>💾 保存</button>
          <div className="menu-wrap">
            <button className="btn icon" title="その他の操作" onClick={() => setMenu(!menu)}>⋯</button>
            {menu && (
              <div className="menu" onMouseLeave={() => setMenu(false)}>
                <button onClick={() => { engine.newWorkflow(); setMenu(false); }}>＋ 新規ワークフロー</button>
                <button onClick={() => { engine.saveWorkflow(true); setMenu(false); }}>⎘ 複製して保存</button>
                <button
                  className="danger"
                  onClick={() => {
                    if (confirm('このワークフローを削除しますか?')) engine.deleteWorkflow();
                    setMenu(false);
                  }}
                >
                  🗑 このワークフローを削除
                </button>
              </div>
            )}
          </div>
          <div className="flex1" />
          <button className="btn go big" onClick={() => engine.startRun()}>▶ 実行</button>
        </>
      ) : (
        <>
          <span className="sess-label" title={sessionName}>🎬 {sessionName}</span>
          <div className="flex1" />
          {running ? (
            <button className="btn" onClick={() => engine.stopRun()}>⏸ 中断</button>
          ) : (
            <button className="btn go" onClick={() => engine.resumeRun()}>▶ 再開</button>
          )}
          <button className="btn" onClick={() => engine.backToEdit()}>◀ 編集に戻る</button>
        </>
      )}

      <span className="hdr-sep" />
      <button className="btn icon" title="使い方" onClick={() => useStore.setState({ modal: 'help' })}>❓</button>
      <ThemeButton />
      <button className="btn icon" title="セッション履歴" onClick={() => useStore.setState({ modal: 'sessions' })}>🕘</button>
      <button className="btn icon" title="設定" onClick={() => useStore.setState({ modal: 'settings' })}>⚙</button>
    </header>
  );
}

function ThemeButton() {
  const [playing, setPlaying] = useState(false);
  return (
    <button
      className="btn icon"
      title={playing ? 'テーマ曲を停止' : 'テーマ曲をループ再生(⚙設定でファイルを選択)'}
      onClick={() => setPlaying(toggleTheme())}
    >
      {playing ? '🔇' : '🎵'}
    </button>
  );
}

function Toast() {
  const toast = useStore((s: any) => s.toast);
  if (!toast) return null;
  return <div className="toast">{toast}</div>;
}

export default function App() {
  const mode = useStore((s: any) => s.mode);
  const selected = useStore((s: any) => s.selected);
  useEffect(() => {
    engine.initApp();
    if (!localStorage.getItem('if_help_seen')) {
      useStore.setState({ modal: 'help' });
      localStorage.setItem('if_help_seen', '1');
    }
  }, []);
  return (
    <div className="app">
      <Header />
      <div className="main">
        {mode === 'edit' && <Palette />}
        <div className="canvas-wrap">
          <GraphEditor />
          {mode === 'edit' && !selected && (
            <div className="canvas-tip">ノードをクリックすると右に編集パネルが開きます</div>
          )}
        </div>
        {mode === 'edit' ? (selected ? <Inspector /> : null) : <RunPanel />}
      </div>
      <Modals />
      <Celebration />
      <Toast />
    </div>
  );
}
