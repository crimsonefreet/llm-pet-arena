'use client';

import { useEffect, useState } from 'react';
import { TerminalCard } from '@/components/cards/TerminalCard';
import tessera from '@/fixtures/tessera.json';
import aether from '@/fixtures/aether.json';
import vesper from '@/fixtures/vesper.json';
import type { Pet } from '@/lib/pet/schema';

const EXAMPLES: Pet[] = [tessera as Pet, aether as Pet, vesper as Pet];
const INTERVAL_MS = 8000;

export function ExamplesCarousel() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const tick = () => setIdx((i) => (i + 1) % EXAMPLES.length);
    const start = () => {
      if (timer === null) timer = setInterval(tick, INTERVAL_MS);
    };
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVis = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      <TerminalCard pet={EXAMPLES[idx]} />
      <div className="flex gap-2 mt-4" role="tablist" aria-label="Example pets">
        {EXAMPLES.map((p, i) => (
          <button
            key={p.pet_id}
            onClick={() => setIdx(i)}
            aria-label={`Show example ${i + 1}: ${p.name}`}
            aria-selected={i === idx}
            role="tab"
            className={`w-2 h-2 rounded-full transition-colors ${
              i === idx ? 'bg-amber-500' : 'bg-green-900'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
