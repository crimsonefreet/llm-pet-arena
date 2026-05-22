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
    <div className="relative border border-[var(--c-line-dim)] bg-[var(--c-bg-surface)]">
      {/* corner brackets (decorative) */}
      <span aria-hidden className="absolute -left-px -top-px h-2 w-2 border-t border-l border-[var(--c-amber)]" />
      <span aria-hidden className="absolute -right-px -top-px h-2 w-2 border-t border-r border-[var(--c-amber)]" />
      <span aria-hidden className="absolute -left-px -bottom-px h-2 w-2 border-b border-l border-[var(--c-amber)]" />
      <span aria-hidden className="absolute -right-px -bottom-px h-2 w-2 border-b border-r border-[var(--c-amber)]" />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <button
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            className="text-[10px] tracking-[0.3em] uppercase text-[var(--c-amber)] glow-hover"
          >
            {expanded ? '▾' : '▸'} STEP 1 · copy this prompt to claude
          </button>

          <div className="flex items-center gap-3">
            {toast === 'ok' && (
              <span role="status" className="text-[10px] tracking-[0.2em] uppercase text-[var(--c-text-bright)]">
                ✓ Copied
              </span>
            )}
            {toast === 'fail' && (
              <span role="status" className="text-[10px] tracking-[0.2em] uppercase text-[var(--c-red)]">
                Failed — select manually
              </span>
            )}
            <button
              onClick={handleCopy}
              className="border border-[var(--c-line)] bg-black/40 px-4 py-2 text-[11px] tracking-[0.25em] uppercase text-[var(--c-text-bright)] glow-hover hover:bg-[rgba(51,255,102,0.06)] hover:border-[var(--c-line-hot)] focus-visible:outline-none focus-visible:border-[var(--c-amber)] focus-visible:text-[var(--c-amber)]"
            >
              ↳ copy prompt
            </button>
          </div>
        </div>

        <p className="text-[10px] tracking-[0.2em] text-[var(--c-text-dim)]">
          // 1. Copy → 2. Paste in Claude → 3. Bring JSON back
        </p>

        {expanded && (
          <pre className="mt-4 text-[11px] leading-relaxed text-[var(--c-text)] bg-black/60 border border-[var(--c-line-dim)] p-3 max-h-80 overflow-auto whitespace-pre-wrap font-mono">
            {CLAUDE_PROMPT}
          </pre>
        )}
      </div>
    </div>
  );
}
