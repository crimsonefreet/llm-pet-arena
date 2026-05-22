'use client';

import { useState, type RefObject } from 'react';
import { exportPetCardAsPng } from '@/lib/export/canvas-renderer';
import type { Pet } from '@/lib/pet/schema';

interface Props {
  /** ArcadeCard 容器 ref（cardRef），用来定位内部 PetCreature SVG */
  targetRef: RefObject<HTMLElement | null>;
  /** 当前 pet 对象，导出渲染时所需的所有 stat / skill / faction 数据 */
  pet: Pet;
  filename?: string;
}

export function ExportButton({ targetRef, pet, filename }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleClick = async () => {
    if (!targetRef.current) return;
    setBusy(true);
    setErr(null);
    try {
      // PetCreature SVG 唯一签名：viewBox="0 0 400 340"
      const svg = targetRef.current.querySelector(
        'svg[viewBox="0 0 400 340"]',
      ) as SVGElement | null;
      const finalName = filename ?? `${pet.pet_id}.png`;
      await exportPetCardAsPng(pet, finalName, { petCreatureSvg: svg });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={handleClick}
        disabled={busy}
        className="relative group border border-[var(--c-line)] bg-black/60 px-8 py-3 text-xs uppercase tracking-[0.3em] text-[var(--c-text-bright)] disabled:opacity-40 transition-all hover:border-[var(--c-amber)] hover:text-[var(--c-amber)] hover:bg-[rgba(255,176,0,0.04)] focus-visible:outline-none focus-visible:border-[var(--c-amber)]"
        style={{ textShadow: '0 0 6px currentColor' }}
      >
        <span
          aria-hidden
          className="absolute -left-px -top-px h-2 w-2 border-t border-l border-current opacity-60 group-hover:opacity-100"
        />
        <span
          aria-hidden
          className="absolute -right-px -top-px h-2 w-2 border-t border-r border-current opacity-60 group-hover:opacity-100"
        />
        <span
          aria-hidden
          className="absolute -left-px -bottom-px h-2 w-2 border-b border-l border-current opacity-60 group-hover:opacity-100"
        />
        <span
          aria-hidden
          className="absolute -right-px -bottom-px h-2 w-2 border-b border-r border-current opacity-60 group-hover:opacity-100"
        />
        {busy ? 'exporting · · ·' : '↓ export png'}
      </button>
      {err && (
        <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--c-red)] mt-2">⚠ {err}</p>
      )}
    </div>
  );
}
