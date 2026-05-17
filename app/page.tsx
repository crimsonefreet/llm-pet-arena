'use client';

import { useRef, useState } from 'react';
import { JsonPaster } from '@/components/JsonPaster';
import { TerminalCard } from '@/components/cards/TerminalCard';
import { ExamplesCarousel } from '@/components/ExamplesCarousel';
import { PromptBlock } from '@/components/PromptBlock';
import { ExportButton } from '@/components/ExportButton';
import { SystemHeader } from '@/components/SystemHeader';
import type { Pet } from '@/lib/pet/schema';

export default function Home() {
  const [pet, setPet] = useState<Pet | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <SystemHeader
        status={pet ? `PROFILE_LOADED · ${pet.name.toUpperCase()}` : 'AWAITING_INPUT_'}
      />

      <main className="relative z-10 max-w-6xl mx-auto px-6 lg:px-12 pt-10 pb-20">
        {/* ───────── HERO ───────── */}
        <section className="boot-stagger grid grid-cols-12 gap-y-1 mb-12 lg:mb-16">
          <p className="col-span-12 text-[10px] tracking-[0.4em] text-[var(--c-text-dim)] uppercase">
            // 0x0001 · Terminal Edition · Sprint 1
          </p>
          <h1
            className="col-span-12 lg:col-span-9 font-vt text-[var(--c-text-bright)] leading-[0.85] mt-2 text-[clamp(64px,12vw,156px)]"
            style={{ textShadow: 'var(--c-glow-hot)' }}
          >
            LLM PET
            <br />
            ARENA<span className="text-[var(--c-amber)]">.</span>
          </h1>
          <div className="col-span-12 lg:col-span-3 lg:text-right flex flex-col gap-2 justify-end pb-2 mt-4 lg:mt-0">
            <span className="text-[10px] tracking-[0.3em] text-[var(--c-text-dim)] uppercase">
              // status
            </span>
            <span
              className="text-xs tracking-[0.2em] uppercase"
              style={{ color: pet ? 'var(--c-text-bright)' : 'var(--c-amber)' }}
            >
              {pet ? '▸ profile active' : '▸ awaiting json'}
            </span>
          </div>
          <div className="col-span-12 border-t border-dashed border-[var(--c-line-dim)] mt-6 pt-3 flex flex-wrap justify-between gap-3 text-xs tracking-wider">
            <span className="text-[var(--c-text)]">Your AI knows you. Now meet your pet.</span>
            <span className="text-[var(--c-text-dim)]">
              // 让你常用的 LLM 给你一只独属的对战宠物
            </span>
          </div>
        </section>

        {/* ───────── BODY: 2-col on lg ───────── */}
        <section className="boot-stagger grid grid-cols-12 gap-x-8 gap-y-12">
          {/* LEFT · controls (永远挂载，pet 切换不影响 paster 实例) */}
          <div className="col-span-12 lg:col-span-5 flex flex-col gap-10">
            <Chapter num="01" word="acquire" title="copy prompt to claude">
              <PromptBlock />
            </Chapter>

            <Chapter num="02" word="render" title="paste llm output">
              <JsonPaster onParsed={setPet} />
            </Chapter>
          </div>

          {/* RIGHT · card slot (carousel or user pet) */}
          <div className="col-span-12 lg:col-span-7">
            <div className="flex items-baseline justify-between border-b border-dashed border-[var(--c-line-dim)] pb-2 mb-6">
              <span className="text-[10px] tracking-[0.3em] text-[var(--c-text-dim)] uppercase">
                {pet ? '// your specimen' : '// gallery · 3 specimens · auto_rotate'}
              </span>
              <span className="text-[10px] tracking-[0.3em] text-[var(--c-text-dim)] uppercase tabular-nums">
                {pet ? `id::${pet.pet_id}` : 'ref::n/a'}
              </span>
            </div>

            {pet ? (
              <div className="flex flex-col items-center">
                <div ref={cardRef}>
                  <TerminalCard pet={pet} />
                </div>
                <div className="mt-6 flex flex-col items-center gap-2">
                  <ExportButton targetRef={cardRef} filename={`${pet.pet_id}.png`} />
                  <span className="text-[10px] tracking-[0.3em] text-[var(--c-text-dim)] uppercase">
                    out · 1080 × 1350 · png · 2× scale
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <ExamplesCarousel />
                <p className="mt-6 text-[10px] tracking-[0.3em] text-[var(--c-text-dim)] uppercase text-center max-w-md">
                  paste pet json on the left to replace this gallery with your own specimen
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ───────── FOOTER ───────── */}
      <footer className="relative z-10 border-t border-[var(--c-line-dim)] mt-10">
        <div className="max-w-6xl mx-auto px-6 lg:px-12 py-6 flex flex-wrap justify-between gap-3 text-[10px] tracking-[0.3em] text-[var(--c-text-dim)] uppercase">
          <span>
            <span className="text-[var(--c-amber)]">petarena.xyz</span>
            <span className="mx-3">·</span>
            local_first
            <span className="mx-3">·</span>
            zero_backend
            <span className="mx-3">·</span>
            evidence_quarantined
          </span>
          <span>est. 2026 · terminal edn.</span>
        </div>
      </footer>
    </>
  );
}

function Chapter({
  num,
  word,
  title,
  children,
}: {
  num: string;
  word: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative pl-6">
      <div
        aria-hidden
        className="absolute left-0 top-1 bottom-0 w-px bg-gradient-to-b from-[var(--c-line)] via-[var(--c-line-dim)] to-transparent"
      />
      <div className="flex items-baseline gap-3 mb-2">
        <span
          className="font-vt text-[var(--c-amber)] leading-none text-[64px]"
          style={{ textShadow: '0 0 12px currentColor' }}
        >
          {num}
        </span>
        <span className="text-[10px] tracking-[0.35em] text-[var(--c-text-dim)] uppercase">
          // {word}
        </span>
      </div>
      <h2 className="text-sm tracking-[0.2em] text-[var(--c-text)] uppercase mb-4">{title}</h2>
      {children}
    </div>
  );
}
