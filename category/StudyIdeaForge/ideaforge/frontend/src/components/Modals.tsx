import { useEffect, useState } from 'react';
import { useStore } from '../store';
import * as api from '../api';
import * as engine from '../engine';

function Modal({ title, children, onClose, wide }: any) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${wide ? 'wide' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span>{title}</span>
          <button className="btn tiny" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// ---------------- 設定 ----------------
function SettingsModal({ onClose }: any) {
  const providers = useStore((s: any) => s.providers);
  const settings = useStore((s: any) => s.settings);
  const setToast = useStore((s: any) => s.setToast);
  const [local, setLocal] = useState<any[]>(() => JSON.parse(JSON.stringify(providers)));
  const [eng, setEng] = useState(settings.search_engine || 'ddg');
  const [tavily, setTavily] = useState(settings.tavily_api_key || '');
  const [brave, setBrave] = useState(settings.brave_api_key || '');
  const [sounds, setSounds] = useState<string[]>([]);
  const [snd, setSnd] = useState<any>({
    sound_enabled: settings.sound_enabled ?? '1',
    sound_volume: settings.sound_volume ?? '0.7',
    sound_tier1: settings.sound_tier1 || '',
    sound_tier2: settings.sound_tier2 || '',
    sound_tier3: settings.sound_tier3 || '',
    sound_theme: settings.sound_theme || '',
  });
  const loadSounds = async () => setSounds(await api.j('GET', '/api/sounds'));
  useEffect(() => { loadSounds(); }, []);

  const uploadSound = async (file: File) => {
    await fetch(`/api/sounds/${encodeURIComponent(file.name)}`, { method: 'PUT', body: file });
    await loadSounds();
    setToast(`🔊 ${file.name} を追加しました`);
  };

  const saveAll = async () => {
    for (const p of local)
      await api.j('PUT', `/api/providers/${p.id}`, p);
    await api.j('PUT', '/api/settings', {
      search_engine: eng,
      tavily_api_key: tavily,
      brave_api_key: brave,
      ...snd,
    });
    useStore.setState({
      providers: await api.j('GET', '/api/providers'),
      settings: await api.j('GET', '/api/settings'),
    });
    setToast('💾 設定を保存しました');
    onClose();
  };

  const addProvider = async () => {
    await api.j('POST', '/api/providers', {
      name: '新規プロバイダ',
      base_url: 'http://localhost:1234/v1',
      api_key: '',
      model: '',
    });
    const provs = await api.j('GET', '/api/providers');
    useStore.setState({ providers: provs });
    setLocal(JSON.parse(JSON.stringify(provs)));
  };

  const delProvider = async (id: number) => {
    await api.j('DELETE', `/api/providers/${id}`);
    const provs = await api.j('GET', '/api/providers');
    useStore.setState({ providers: provs });
    setLocal(JSON.parse(JSON.stringify(provs)));
  };

  const test = async (id: number) => {
    setToast('接続テスト中…');
    const r = await api.j('POST', '/api/llm/test', { provider_id: id });
    setToast(r.ok ? `✅ 接続OK: ${r.reply}` : `❌ 失敗: ${r.error}`);
  };

  const upd = (i: number, k: string, v: any) => {
    const l = local.slice();
    l[i] = { ...l[i], [k]: v };
    setLocal(l);
  };

  return (
    <Modal title="⚙ 設定" onClose={onClose} wide>
      <h3>LLMプロバイダ (OpenAI互換API)</h3>
      <p className="hint">
        LM Studio は「ローカルサーバー」を起動して http://localhost:1234/v1 を指定。
        商用APIは base URL と APIキーを設定。ノードごとに使い分けできます。
      </p>
      {local.map((p, i) => (
        <div key={p.id} className="prov-row">
          <input
            className="pr-name" placeholder="表示名"
            value={p.name} onChange={e => upd(i, 'name', e.target.value)}
          />
          <input
            className="pr-url" placeholder="base URL (…/v1)"
            value={p.base_url} onChange={e => upd(i, 'base_url', e.target.value)}
          />
          <input
            className="pr-key" placeholder="APIキー" type="password"
            value={p.api_key} onChange={e => upd(i, 'api_key', e.target.value)}
          />
          <input
            className="pr-model" placeholder="モデル名"
            value={p.model} onChange={e => upd(i, 'model', e.target.value)}
          />
          <label className="pr-def" title="既定にする">
            <input
              type="radio" name="defprov" checked={!!p.is_default}
              onChange={() => setLocal(local.map((x, j) => ({ ...x, is_default: j === i ? 1 : 0 })))}
            />
            既定
          </label>
          <button className="btn tiny" onClick={() => test(p.id)}>test</button>
          <button className="btn tiny danger" onClick={() => delProvider(p.id)}>✕</button>
        </div>
      ))}
      <button className="btn small" onClick={addProvider}>＋ プロバイダ追加</button>

      <h3>Web検索エンジン</h3>
      <div className="search-set">
        <select value={eng} onChange={e => setEng(e.target.value)}>
          <option value="ddg">DuckDuckGo (キー不要)</option>
          <option value="tavily">Tavily (無料枠あり・要キー)</option>
          <option value="brave">Brave Search (無料枠あり・要キー)</option>
        </select>
        <input placeholder="Tavily APIキー" type="password" value={tavily} onChange={e => setTavily(e.target.value)} />
        <input placeholder="Brave APIキー" type="password" value={brave} onChange={e => setBrave(e.target.value)} />
      </div>

      <h3>サウンド(激アツ演出・テーマ曲)</h3>
      <p className="hint">
        音声ファイル(.mp3 / .wav / .ogg)を backend/sounds/ フォルダに置くか、下のボタンで追加。
        未設定のレベルは内蔵ファンファーレが鳴ります。テーマ曲はヘッダーの 🎵 でループ再生。
      </p>
      <div className="snd-grid">
        <label className="pr-def">
          <input
            type="checkbox"
            checked={snd.sound_enabled !== '0'}
            onChange={e => setSnd({ ...snd, sound_enabled: e.target.checked ? '1' : '0' })}
          />
          効果音を鳴らす
        </label>
        <label className="fl">音量: {snd.sound_volume}</label>
        <input
          type="range" min={0} max={1} step={0.05}
          value={snd.sound_volume}
          onChange={e => setSnd({ ...snd, sound_volume: e.target.value })}
        />
        {[
          ['sound_tier1', '🔔 アツい…!(レベル1)'],
          ['sound_tier2', '🎺 激アツ!!(レベル2)'],
          ['sound_tier3', '🎆 超・激・アツ!!!(レベル3)'],
          ['sound_theme', '🎵 テーマ曲(ループ再生)'],
        ].map(([key, label]) => (
          <div key={key}>
            <label className="fl">{label}</label>
            <select value={snd[key]} onChange={e => setSnd({ ...snd, [key]: e.target.value })}>
              <option value="">{key === 'sound_theme' ? '— 未設定 —' : '内蔵ファンファーレ'}</option>
              {sounds.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        ))}
        <label className="btn small" style={{ display: 'inline-block', width: 'fit-content' }}>
          ＋ 音声ファイルを追加
          <input
            type="file" accept="audio/*" style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && uploadSound(e.target.files[0])}
          />
        </label>
      </div>

      <div className="modal-actions">
        <button className="btn primary" onClick={saveAll}>💾 保存</button>
      </div>
    </Modal>
  );
}


// ---------------- 使い方 ----------------
function HelpModal({ onClose }: any) {
  return (
    <Modal title="❓ 使い方(3分クイックスタート)" onClose={onClose} wide>
      <div className="help-body">
        <h3>① LLMをつなぐ(最初の1回だけ)</h3>
        <p>ヘッダーの <b>⚙ 設定</b> を開き、LM Studio(アプリ側でローカルサーバーを起動して http://localhost:1234/v1)か、商用API(base URLとAPIキー)を登録。<b>test</b> ボタンで「✅接続OK」が出ればOK。よく使う方に「既定」を付けて保存。</p>
        <h3>② ワークフローを選ぶ</h3>
        <p>ヘッダー左のプルダウンからプリセットを選択。迷ったらまず <b>🏛 王道・8ステップ完全版</b>。</p>
        <h3>③ ▶ 実行</h3>
        <p>テーマや制約を聞かれるので入力(空欄=指定なし)。あとはAIがグラフの上から順に自動で生成していく。</p>
        <h3>④ ✋ ゲートで人間の出番</h3>
        <p>ノードがオレンジに点滅したら右パネルで成果物を確認し、<b>✅採用</b> / <b>🎲再生成</b> / <b>✏修正</b> を選ぶ。再生成した案は「案1 / 案2 …」タブに全部残るので、見比べて一番良い版を選んでから採用。直感がきたら <b>🎰これだ!!</b> を叩く。</p>
        <h3>⑤ 📄 レポート</h3>
        <p>最後まで進むと最終レポートをMarkdownでダウンロードできる。途中経過は自動保存されるので、🕘履歴からいつでも再開・見返しができる。</p>
        <h3>🧩 自分のワークフローを組む</h3>
        <p>左の <b>🧰 発想ブロック</b> をキャンバスへドラッグ(またはダブルクリック)し、ノードの<b>下端 ⇢ 次ノードの上端</b>をドラッグして一列に接続。ノードをクリックすると右のインスペクタでプロンプト・LLM・temperatureを編集できる。組んだら💾保存。</p>
        <h3>🎰 激アツ演出</h3>
        <p>評価ノードのスコアを自動検知: 7点台=アツい / 8点台=激アツ / <b>9点以上=無音のタメ → 超・激・アツ!!!</b>。⚙設定の「サウンド」で好きな音声ファイルをレベル別に割当できる。</p>
      </div>
    </Modal>
  );
}

// ---------------- セッション履歴 ----------------
function SessionsModal({ onClose }: any) {
  const [sessions, setSessions] = useState<any[]>([]);
  const load = async () => setSessions(await api.j('GET', '/api/sessions'));
  useEffect(() => { load(); }, []);
  const STATUS: Record<string, string> = { running: '進行中', done: '完了', error: 'エラー' };
  return (
    <Modal title="🕘 セッション履歴" onClose={onClose} wide>
      {!sessions.length && <div className="empty">まだセッションがありません。「▶ 実行」で始めましょう。</div>}
      {sessions.map(s => (
        <div key={s.id} className="sess-row">
          <span className={`sess-status ss-${s.status}`}>{STATUS[s.status] || s.status}</span>
          <span className="sess-name">{s.name}</span>
          <span className="sess-date">{new Date(s.updated_at * 1000).toLocaleString('ja-JP')}</span>
          <button className="btn small primary" onClick={async () => { await engine.loadSession(s.id); }}>
            開く
          </button>
          <button
            className="btn tiny danger"
            onClick={async () => { await api.j('DELETE', `/api/sessions/${s.id}`); load(); }}
          >
            ✕
          </button>
        </div>
      ))}
    </Modal>
  );
}

// ---------------- 入力フォーム ----------------
function InputModal() {
  const pendingInputs = useStore((s: any) => s.pendingInputs);
  const nodes = useStore((s: any) => s.nodes);
  const nodeId = pendingInputs[0];
  const node = nodes.find((n: any) => n.id === nodeId);
  const [values, setValues] = useState<Record<string, string>>({});
  useEffect(() => setValues({}), [nodeId]);
  if (!node) return null;
  const fields = node.data.fields || [];
  return (
    <div className="modal-overlay">
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span>{node.data.icon} {node.data.label}</span>
        </div>
        <div className="modal-body">
          <p className="hint">空欄は「指定なし」として扱われます。</p>
          {fields.map((f: any) => (
            <div key={f.key}>
              <label className="fl">{f.label}</label>
              {f.multiline ? (
                <textarea
                  rows={3}
                  placeholder={f.placeholder || ''}
                  value={values[f.key] || ''}
                  onChange={e => setValues({ ...values, [f.key]: e.target.value })}
                />
              ) : (
                <input
                  placeholder={f.placeholder || ''}
                  value={values[f.key] || ''}
                  onChange={e => setValues({ ...values, [f.key]: e.target.value })}
                />
              )}
            </div>
          ))}
          <div className="modal-actions">
            <button className="btn primary" onClick={() => engine.submitInput(nodeId, values)}>
              ✅ 決定して続行
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Modals() {
  const modal = useStore((s: any) => s.modal);
  const pendingInputs = useStore((s: any) => s.pendingInputs);
  const mode = useStore((s: any) => s.mode);
  const close = () => useStore.setState({ modal: null });
  return (
    <>
      {modal === 'settings' && <SettingsModal onClose={close} />}
      {modal === 'help' && <HelpModal onClose={close} />}
      {modal === 'sessions' && <SessionsModal onClose={close} />}
      {mode === 'run' && pendingInputs.length > 0 && <InputModal />}
    </>
  );
}
