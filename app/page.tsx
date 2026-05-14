'use client';

import { useRef, useState } from 'react';
import { JsonPaster } from '@/components/JsonPaster';
import { TerminalCard } from '@/components/cards/TerminalCard';
import { ExamplesCarousel } from '@/components/ExamplesCarousel';
import { PromptBlock } from '@/components/PromptBlock';
import { ExportButton } from '@/components/ExportButton';
import type { Pet } from '@/lib/pet/schema';

export default function Home() {
  const [pet, setPet] = useState<Pet | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <main className="min-h-screen bg-black text-green-400 p-6 lg:p-10">
      <header className="max-w-7xl mx-auto mb-6">
        <h1 className="text-3xl font-vt text-green-500 tracking-wider"
          style={{ textShadow: '0 0 4px currentColor, 0 0 8px currentColor' }}>
          PET ARENA
        </h1>
        <p className="text-xs text-green-900 mt-1 tracking-wider">
          // YOUR AI KNOWS YOU. NOW MEET YOUR PET.
        </p>
      </header>

      {!pet && (
        <section className="max-w-7xl mx-auto mb-10 flex justify-center">
          <ExamplesCarousel />
        </section>
      )}

      <section className="max-w-7xl mx-auto">
        <PromptBlock />
      </section>

      <div className="grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
        <section>
          <JsonPaster onParsed={setPet} />
        </section>
        <section className="flex flex-col items-center">
          {pet && (
            <>
              <div ref={cardRef}>
                <TerminalCard pet={pet} />
              </div>
              <ExportButton targetRef={cardRef} filename={`${pet.pet_id}.png`} />
            </>
          )}
          {!pet && (
            <div className="text-xs text-green-900 tracking-wider text-center mt-10">
              // PASTE JSON ON THE LEFT TO RENDER YOUR PET
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
