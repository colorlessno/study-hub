import { useStore } from './store';

let themeAudio: HTMLAudioElement | null = null;
let ctx: AudioContext | null = null;
const AC = () =>
  (ctx ||= new (window.AudioContext || (window as any).webkitAudioContext)());

export function vol() {
  const v = parseFloat(useStore.getState().settings.sound_volume ?? '0.7');
  return isNaN(v) ? 0.7 : v;
}
export function enabled() {
  return useStore.getState().settings.sound_enabled !== '0';
}

/** レベル別サウンド: 設定ファイルがあればそれを、なければ内蔵ファンファーレを合成 */
export function playTier(tier: number) {
  if (!enabled()) return;
  const file = useStore.getState().settings[`sound_tier${tier}`];
  if (file) {
    const a = new Audio(`/sounds/${encodeURIComponent(file)}`);
    a.volume = Math.min(1, vol());
    a.play().catch(() => {});
  } else {
    fanfare(tier);
  }
}

function beep(t0: number, freq: number, dur: number, type: OscillatorType = 'square', gain = 0.18) {
  const c = AC();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain * vol(), t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function fanfare(tier: number) {
  try {
    const c = AC();
    const t = c.currentTime + 0.02;
    if (tier === 1) {
      beep(t, 660, 0.15);
      beep(t + 0.16, 880, 0.32);
    } else if (tier === 2) {
      [523, 659, 784, 1046].forEach((f, i) => beep(t + i * 0.13, f, 0.18));
      beep(t + 0.55, 1046, 0.55, 'sawtooth', 0.15);
      beep(t + 0.55, 784, 0.55, 'square', 0.1);
    } else {
      [523, 659, 784].forEach((f, i) => beep(t + i * 0.09, f, 0.12));
      [1046, 1318, 1568].forEach((f, i) => beep(t + 0.3 + i * 0.09, f, 0.14, 'sawtooth', 0.14));
      beep(t + 0.62, 2093, 0.9, 'sawtooth', 0.12);
      beep(t + 0.62, 1568, 0.9, 'square', 0.1);
      beep(t + 0.62, 1046, 0.9, 'triangle', 0.12);
    }
  } catch {}
}

/** テーマ曲(ループ)。ファイルは backend/sounds/ に置き、設定で選択 */
export function toggleTheme(): boolean {
  const file = useStore.getState().settings.sound_theme;
  if (themeAudio && !themeAudio.paused) {
    themeAudio.pause();
    return false;
  }
  if (!file) {
    useStore.getState().setToast('⚙ 設定の「サウンド」でテーマ曲を選んでください(soundsフォルダにファイルを配置)');
    return false;
  }
  if (!themeAudio || !themeAudio.src.includes(encodeURIComponent(file))) {
    themeAudio = new Audio(`/sounds/${encodeURIComponent(file)}`);
    themeAudio.loop = true;
  }
  themeAudio.volume = Math.min(1, vol() * 0.6);
  themeAudio.play().catch(() => useStore.getState().setToast('再生できませんでした(ファイル形式を確認)'));
  return true;
}

/** 演出中はテーマ曲をダッキング */
export function duckTheme(on: boolean) {
  if (themeAudio && !themeAudio.paused)
    themeAudio.volume = Math.min(1, (on ? 0.06 : 0.6) * vol());
}
