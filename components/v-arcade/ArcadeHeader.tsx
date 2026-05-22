'use client';

import { useEffect, useState } from 'react';

interface Props {
  status: string;
}

// Arcade 配色的顶部 thin strip：左侧品牌 + 右侧 status + 实时时钟
// 形态复用 SystemHeader 但配色 amber-on-velvet
export function ArcadeHeader({ status }: Props) {
  // 用 '--:--:--' 初值避免 SSR/CSR hydration mismatch
  const [now, setNow] = useState<string>('--:--:--');

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      setNow(`${hh}:${mm}:${ss}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header
      style={{
        position: 'relative',
        zIndex: 10,
        padding: '10px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(212,175,55,0.18)',
        fontSize: '10px',
        letterSpacing: '0.4em',
        textTransform: 'uppercase',
        color: 'rgba(212,175,55,0.55)',
        fontWeight: 700,
        background: 'rgba(8, 4, 14, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
    >
      <span>
        <span style={{ color: '#ffd700' }}>✦</span>
        <span style={{ marginLeft: 10, color: '#ffe082', letterSpacing: '0.35em' }}>
          LLMPETARENA
        </span>
        <span style={{ margin: '0 12px', color: 'rgba(212,175,55,0.3)' }}>·</span>
        <span>arcade edition</span>
      </span>
      <span style={{ color: 'rgba(245,233,200,0.45)' }}>
        <span style={{ color: '#ffd700' }}>▸</span>
        <span style={{ marginLeft: 8 }}>{status}</span>
        <span style={{ margin: '0 12px', color: 'rgba(212,175,55,0.3)' }}>·</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{now}</span>
      </span>
    </header>
  );
}
