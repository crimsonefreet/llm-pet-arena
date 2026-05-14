'use client';

import { useState, type RefObject } from 'react';
import { exportElementAsPng } from '@/lib/export/png';

interface Props {
  targetRef: RefObject<HTMLElement | null>;
  filename?: string;
}

export function ExportButton({ targetRef, filename }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleClick = async () => {
    if (!targetRef.current) return;
    setBusy(true);
    setErr(null);
    try {
      await exportElementAsPng(targetRef.current, { filename });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4">
      <button
        onClick={handleClick}
        disabled={busy}
        className="border border-green-900 hover:border-green-500 px-6 py-2 text-xs uppercase tracking-widest text-green-400 disabled:opacity-40 transition-colors"
      >
        {busy ? 'exporting...' : '↓ export png'}
      </button>
      {err && <p className="text-xs text-red-500 mt-2">⚠ {err}</p>}
    </div>
  );
}
