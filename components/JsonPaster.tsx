'use client';

import { useState } from 'react';
import { parsePetJson } from '@/lib/pet/parse';
import type { Pet } from '@/lib/pet/schema';

interface Props {
  onParsed: (pet: Pet | null) => void;
  /**
   * 可选回调：parse 成功后触发，外层据此决定要不要 upload 到公共池
   * 不影响 onParsed（local preview 不被 upload 流程阻塞）
   */
  onUploadable?: (pet: Pet) => void;
}

type Phase = 'empty' | 'ok' | 'error';

export function JsonPaster({ onParsed, onUploadable }: Props) {
  const [phase, setPhase] = useState<Phase>('empty');
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const r = parsePetJson(e.target.value);
    if (r.ok) {
      setPhase('ok');
      setError(null);
      onParsed(r.pet);
      onUploadable?.(r.pet);
      return;
    }
    if (r.kind === 'empty') {
      setPhase('empty');
      setError(null);
      onParsed(null);
      return;
    }
    setPhase('error');
    const prefix = r.kind === 'json_error' ? '⚠ JSON' : '⚠ 字段校验';
    setError(`${prefix}: ${r.message}`);
  };

  const phaseColor =
    phase === 'ok'
      ? 'var(--c-text-bright)'
      : phase === 'error'
        ? 'var(--c-red)'
        : 'var(--c-text-dim)';

  const phaseLabel = phase === 'ok' ? 'parsed' : phase === 'error' ? 'reject' : 'idle';

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <label
          htmlFor="paste-pet-json-input"
          className="text-[10px] tracking-[0.3em] text-[var(--c-text-dim)] uppercase"
        >
          // paste pet json here
        </label>
        <span
          className="text-[10px] tracking-[0.3em] uppercase tabular-nums"
          style={{ color: phaseColor }}
        >
          [{phaseLabel}]
        </span>
      </div>

      <div
        className="relative border bg-black/60 transition-colors"
        style={{
          borderColor:
            phase === 'error'
              ? 'var(--c-red)'
              : phase === 'ok'
                ? 'var(--c-line-hot)'
                : 'var(--c-line-dim)',
          boxShadow:
            phase === 'ok'
              ? '0 0 12px rgba(51, 255, 102, 0.18) inset, 0 0 12px rgba(51, 255, 102, 0.15)'
              : phase === 'error'
                ? '0 0 12px rgba(255, 51, 85, 0.12) inset'
                : 'none',
        }}
      >
        {/* hex address gutter */}
        <div
          aria-hidden
          className="hidden sm:flex flex-col absolute left-0 top-0 bottom-0 w-10 border-r border-[var(--c-line-dim)] bg-black/50 py-3 text-[9px] leading-relaxed text-[var(--c-line-dim)] text-right pr-2 tabular-nums select-none font-mono"
        >
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i}>{`0x${(i * 16).toString(16).padStart(3, '0').toUpperCase()}`}</span>
          ))}
        </div>

        <textarea
          id="paste-pet-json-input"
          onChange={handleChange}
          rows={16}
          spellCheck={false}
          aria-label="paste pet json"
          className="w-full bg-transparent py-3 pl-3 sm:pl-12 pr-3 text-[var(--c-text)] font-mono text-[12px] leading-relaxed focus:outline-none resize-y placeholder:text-[var(--c-line-dim)]"
          placeholder={'paste claude output here...\n\n```json\n{ "pet_id": "...", ... }\n```\n\n— fences are tolerated, surrounding prose too'}
        />
      </div>

      {error && (
        <pre
          role="alert"
          className="mt-2 text-[11px] text-[var(--c-red)] whitespace-pre-wrap tracking-wide"
        >
          {error}
        </pre>
      )}

      {phase === 'ok' && !error && (
        <p className="mt-2 text-[10px] tracking-[0.3em] text-[var(--c-text-bright)] uppercase">
          ✓ rendered to the right →
        </p>
      )}
    </div>
  );
}
