import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { playTier, duckTheme } from '../sound';

/**
 * パチンコ風リーチ演出:
 *  tier1: 小フラッシュ「アツい…!」
 *  tier2: 短い暗転タメ → 「激アツ!!」金粒子
 *  tier3: 完全暗転・無音停止(タメ) → 白フラッシュ → 「超・激・アツ!!!」虹粒子+虹枠+シェイク
 */
export default function Celebration() {
  const c = useStore((s: any) => s.celebration);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'freeze' | 'burst'>('burst');

  useEffect(() => {
    if (!c) return;
    const timers: any[] = [];
    let stopParticles: (() => void) | null = null;
    const freezeMs = c.tier >= 3 ? 1800 : c.tier === 2 ? 900 : 0;

    duckTheme(true); // タメ中はテーマ曲も沈黙させる
    if (freezeMs > 0) {
      setPhase('freeze');
      timers.push(
        setTimeout(() => {
          setPhase('burst');
          playTier(c.tier);
          document.body.classList.add('shake');
          timers.push(setTimeout(() => document.body.classList.remove('shake'), 900));
          if (canvasRef.current) stopParticles = runParticles(canvasRef.current, c.tier);
        }, freezeMs)
      );
    } else {
      setPhase('burst');
      playTier(c.tier);
      document.body.classList.add('shake-small');
      timers.push(setTimeout(() => document.body.classList.remove('shake-small'), 500));
      timers.push(
        setTimeout(() => {
          if (canvasRef.current) stopParticles = runParticles(canvasRef.current, c.tier);
        }, 30)
      );
    }
    const total = freezeMs + (c.tier >= 3 ? 6000 : c.tier === 2 ? 4500 : 2800);
    timers.push(setTimeout(() => useStore.setState({ celebration: null }), total));
    return () => {
      timers.forEach(clearTimeout);
      stopParticles?.();
      duckTheme(false);
      document.body.classList.remove('shake');
      document.body.classList.remove('shake-small');
    };
  }, [c?.key]);

  if (!c) return null;
  const msg = c.tier >= 3 ? '超・激・アツ!!!' : c.tier === 2 ? '激アツ!!' : 'アツい…!';
  const sub = c.manual
    ? `🏆 殿堂入り — ${c.title}`
    : `最高スコア ${c.score}/10 — ${c.title}`;

  return (
    <div
      className={`celebration tier${c.tier} phase-${phase}`}
      onClick={() => useStore.setState({ celebration: null })}
    >
      {phase === 'freeze' ? (
        <div className="freeze-screen">
          <div className="freeze-dots">・・・</div>
        </div>
      ) : (
        <>
          <div className="flash" />
          <div className="rays" />
          <canvas ref={canvasRef} />
          <div className="cutin">
            <div className="cutin-main">{msg}</div>
            <div className="cutin-sub">{sub}</div>
          </div>
          {c.tier >= 3 && <div className="rainbow-frame" />}
        </>
      )}
    </div>
  );
}

function runParticles(cv: HTMLCanvasElement, tier: number) {
  cv.width = window.innerWidth;
  cv.height = window.innerHeight;
  const ctx = cv.getContext('2d')!;
  let ps: any[] = [];
  let frame = 0;
  let raf = 0;
  let alive = true;

  const burst = (x: number, y: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 4 + Math.random() * 15;
      ps.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 5,
        life: 60 + Math.random() * 60,
        hue: tier >= 3 ? Math.random() * 360 : 38 + Math.random() * 22,
        r: 2 + Math.random() * 4.5,
        shape: Math.random() < 0.35 ? 1 : 0,
        rot: Math.random() * 6,
      });
    }
  };

  const loop = () => {
    if (!alive) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (frame === 0) burst(cv.width / 2, cv.height * 0.45, tier * 90 + 130);
    if (tier >= 2 && frame === 22) {
      burst(cv.width * 0.2, cv.height * 0.3, 100);
      burst(cv.width * 0.8, cv.height * 0.3, 100);
    }
    if (tier >= 3 && frame % 38 === 19 && frame < 210)
      burst(Math.random() * cv.width, cv.height * (0.25 + Math.random() * 0.3), 80);
    for (const p of ps) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25;
      p.vx *= 0.99;
      p.life--;
      p.rot += 0.12;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 40));
      ctx.fillStyle = `hsl(${p.hue} 100% ${55 + Math.random() * 15}%)`;
      if (p.shape) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 7);
        ctx.fill();
      }
    }
    ps = ps.filter(p => p.life > 0 && p.y < cv.height + 60);
    frame++;
    if (ps.length || frame < 230) raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => {
    alive = false;
    cancelAnimationFrame(raf);
  };
}
