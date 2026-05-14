'use client';

import { useState } from 'react';
import { CLAUDE_PROMPT } from '@/lib/prompt/claude';
import { copyToClipboard } from '@/lib/clipboard';

type ToastState = 'idle' | 'ok' | 'fail';

export function PromptBlock() {
  const [expanded, setExpanded] = useState(false);
  const [toast, setToast] = useState<ToastState>('idle');

  const handleCopy = async () => {
    const ok = await copyToClipboard(CLAUDE_PROMPT);
    setToast(ok ? 'ok' : 'fail');
    setTimeout(() => setToast('idle'), 2000);
  };

  return (
    <section className="border border-green-900 bg-green-500/[0.02] p-5 mb-8">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs tracking-widest text-amber-500 hover:text-amber-400"
        >
          {expanded ? '▾' : '▸'} STEP 1 · COPY THIS PROMPT TO CLAUDE
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="border border-green-900 hover:border-green-500 px-4 py-1.5 text-xs uppercase tracking-widest text-green-400"
          >
            Copy Prompt
          </button>
          {toast === 'ok' && (
            <span role="status" className="text-xs text-green-400">
              ✓ Copied
            </span>
          )}
          {toast === 'fail' && (
            <span role="status" className="text-xs text-red-500">
              Failed — select manually
            </span>
          )}
        </div>
      </div>
      <p className="text-[11px] text-green-900 tracking-wider">
        // 1. Copy → 2. Paste in Claude → 3. Bring JSON back
      </p>
      {expanded && (
        <pre className="mt-4 text-[11px] text-green-400 bg-black/40 p-3 max-h-80 overflow-auto whitespace-pre-wrap font-mono">
          {CLAUDE_PROMPT}
        </pre>
      )}
    </section>
  );
}
