'use client';

import { useEffect, useState } from 'react';

interface Props {
  status?: string;
}

// SSR/CSR 同步：服务端渲染 --:--:-- 占位避免 hydration mismatch
function formatTime(d: Date): string {
  return d.toISOString().slice(11, 19);
}

export function SystemHeader({ status }: Props) {
  const [now, setNow] = useState<string>('--:--:--');

  useEffect(() => {
    const tick = () => setNow(formatTime(new Date()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="relative z-10 border-b border-[var(--c-line-dim)] bg-black/40">
      <div className="max-w-6xl mx-auto px-6 lg:px-12 py-2 flex items-center justify-between gap-4 text-[10px] tracking-[0.25em] text-[var(--c-text-dim)] uppercase">
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-[var(--c-amber)] whitespace-nowrap">PET-ARENA::SYS_v0.1.0</span>
          <span className="hidden sm:inline">[OK] FONTS</span>
          <span className="hidden md:inline">[OK] WORKER</span>
          <span className="hidden lg:inline">[OK] PRIVACY_GUARD</span>
        </div>
        <div className="flex items-center gap-4 whitespace-nowrap">
          <span className="hidden sm:inline text-[var(--c-text)]">{status ?? 'AWAITING_INPUT'}</span>
          <span className="text-[var(--c-text-bright)] tabular-nums">
            {now}
            <span className="blink-cursor" />
          </span>
        </div>
      </div>
    </header>
  );
}
