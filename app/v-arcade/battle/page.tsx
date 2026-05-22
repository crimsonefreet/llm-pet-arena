'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Pet } from '@/lib/pet/schema';
import { fetchPet, fetchRandomPet } from '@/lib/api/endpoints';
import {
  getMyPetId,
  getStreak,
  bumpStreak,
  resetStreak as resetStreakStore,
} from '@/lib/api/storage';
import { ArcadeBackground } from '@/components/v-arcade/ArcadeBackground';
import { ArcadeHeader } from '@/components/v-arcade/ArcadeHeader';
import { BattleScene } from '@/components/v-arcade/BattleScene';
import { StreakBadge } from '@/components/v-arcade/StreakBadge';
import { GameOverOverlay } from '@/components/v-arcade/GameOverOverlay';
import { InviteShareCard } from '@/components/social/InviteShareCard';

type LoadState =
  | { kind: 'init' }
  | { kind: 'no-pet' }
  | { kind: 'loading' }
  | { kind: 'pool-empty' }
  | { kind: 'error'; msg: string }
  | { kind: 'ready'; myPet: Pet; opponent: Pet };

export default function BattlePage() {
  return (
    <Suspense fallback={<BattleLoading />}>
      <BattlePageInner />
    </Suspense>
  );
}

function BattleLoading() {
  return (
    <div className="relative min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0510' }}>
      <p className="text-[11px] tracking-[0.4em] uppercase" style={{ color: 'rgba(212,175,55,0.5)' }}>
        // initializing arena...
      </p>
    </div>
  );
}

function BattlePageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const inviteOpId = params?.get('op') ?? null;

  const [state, setState] = useState<LoadState>({ kind: 'init' });
  const [streak, setStreak] = useState(0);
  const [battleKey, setBattleKey] = useState(0);
  const [outcome, setOutcome] = useState<'victory' | 'defeat' | 'draw' | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  // 加载初始 pet pair
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const myId = getMyPetId();
      if (!myId) {
        setState({ kind: 'no-pet' });
        return;
      }
      setState({ kind: 'loading' });
      setStreak(getStreak());

      try {
        const myPet = await fetchPet(myId);
        let opponent: Pet | null = null;

        if (inviteOpId) {
          // invite 模式：固定对手
          opponent = await fetchPet(inviteOpId);
        } else {
          // 随机模式
          try {
            opponent = await fetchRandomPet(myId);
          } catch (err) {
            if ((err as { status?: number }).status === 404) {
              if (cancelled) return;
              setState({ kind: 'pool-empty' });
              return;
            }
            throw err;
          }
        }

        if (cancelled) return;
        setState({ kind: 'ready', myPet, opponent: opponent! });
      } catch (e: any) {
        if (cancelled) return;
        setState({ kind: 'error', msg: e?.error ?? e?.message ?? 'unknown error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inviteOpId]);

  // 战斗结束处理
  const handleBattleEnd = useCallback(
    (winner: 'a' | 'b' | 'draw') => {
      if (winner === 'a') {
        const next = bumpStreak();
        setStreak(next);
        setOutcome('victory');
      } else if (winner === 'b') {
        setOutcome('defeat');
      } else {
        setOutcome('draw');
      }
    },
    []
  );

  // 下一场（仅 win 后）
  const handleNext = useCallback(async () => {
    if (state.kind !== 'ready') return;
    const myId = state.myPet.pet_id;
    setOutcome(null);
    try {
      const opponent = await fetchRandomPet(myId);
      setState({ kind: 'ready', myPet: state.myPet, opponent });
      setBattleKey((k) => k + 1);
    } catch (err) {
      if ((err as { status?: number }).status === 404) {
        setState({ kind: 'pool-empty' });
      } else {
        setState({ kind: 'error', msg: 'failed to fetch opponent' });
      }
    }
  }, [state]);

  // Restart streak（败后）
  const handleRestart = useCallback(async () => {
    resetStreakStore();
    setStreak(0);
    setOutcome(null);
    if (state.kind === 'ready') {
      try {
        const opponent = await fetchRandomPet(state.myPet.pet_id);
        setState({ kind: 'ready', myPet: state.myPet, opponent });
        setBattleKey((k) => k + 1);
      } catch (err) {
        if ((err as { status?: number }).status === 404) {
          setState({ kind: 'pool-empty' });
        } else {
          setState({ kind: 'error', msg: 'failed to fetch opponent' });
        }
      }
    }
  }, [state]);

  const headerStatus =
    state.kind === 'ready'
      ? `${state.myPet.name.toUpperCase()} vs ${state.opponent.name.toUpperCase()}`
      : state.kind === 'no-pet'
      ? 'no_pet · generate one first'
      : state.kind === 'pool-empty'
      ? 'pool_empty · invite a friend'
      : state.kind === 'loading'
      ? 'loading_opponent_'
      : state.kind === 'error'
      ? 'fault_state'
      : 'awaiting_input_';

  return (
    <div
      className="relative min-h-screen"
      style={{ backgroundColor: '#0a0510', color: '#f5e9c8' }}
    >
      <ArcadeBackground />
      <ArcadeHeader status={headerStatus} />

      <main className="relative z-10 max-w-6xl mx-auto px-6 lg:px-12 pt-10 pb-16">
        {/* HERO */}
        <section className="boot-stagger flex flex-wrap items-baseline justify-between gap-4 mb-8">
          <div>
            <p
              className="text-[10px] tracking-[0.4em] uppercase mb-1"
              style={{ color: 'rgba(212,175,55,0.5)' }}
            >
              // 0x0020 · battle arena
            </p>
            <h1
              style={{
                fontFamily: 'var(--font-cinzel), Cinzel, serif',
                fontWeight: 800,
                fontSize: 'clamp(40px, 6vw, 80px)',
                color: '#ffd700',
                textShadow: '0 0 18px rgba(255,215,0,0.4)',
                letterSpacing: '0.04em',
                lineHeight: 1,
              }}
            >
              THE ARENA<span style={{ color: '#ffe082' }}>.</span>
            </h1>
          </div>
          <StreakBadge streak={streak} />
        </section>

        {/* MAIN */}
        {state.kind === 'init' || state.kind === 'loading' ? (
          <div className="text-center py-32" style={{ color: 'rgba(212,175,55,0.6)' }}>
            <p className="text-[11px] tracking-[0.4em] uppercase">// loading combatants...</p>
          </div>
        ) : null}

        {state.kind === 'no-pet' && (
          <div className="text-center py-24">
            <p className="text-sm mb-6" style={{ color: '#f5e9c8' }}>
              Generate a pet on the home page first to enter the arena.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 text-[11px] tracking-[0.3em] uppercase"
              style={{
                color: '#0a0510',
                background: 'linear-gradient(135deg, #ffd700, #d4af37)',
                border: '1px solid #ffd700',
                fontWeight: 700,
                boxShadow: '0 0 18px rgba(212,175,55,0.4)',
              }}
            >
              ↳ Generate Your Pet
            </button>
          </div>
        )}

        {state.kind === 'pool-empty' && (
          <div className="text-center py-24">
            <p className="text-sm mb-4" style={{ color: '#f5e9c8' }}>
              The arena pool has no other pets yet. Invite a friend so they can join.
            </p>
            <button
              onClick={() => setShowInvite(true)}
              className="px-6 py-3 text-[11px] tracking-[0.3em] uppercase"
              style={{
                color: '#0a0510',
                background: 'linear-gradient(135deg, #ffd700, #d4af37)',
                border: '1px solid #ffd700',
                fontWeight: 700,
                boxShadow: '0 0 18px rgba(212,175,55,0.4)',
              }}
            >
              🔗 Invite a Friend
            </button>
          </div>
        )}

        {state.kind === 'error' && (
          <div className="text-center py-24">
            <p className="text-sm mb-2" style={{ color: '#e57373' }}>
              ⚠ {state.msg}
            </p>
            <p className="text-[11px] tracking-[0.3em] uppercase" style={{ color: 'rgba(212,175,55,0.5)' }}>
              try refresh / check connection
            </p>
          </div>
        )}

        {state.kind === 'ready' && (
          <BattleScene
            key={battleKey}
            petA={state.myPet}
            petB={state.opponent}
            onEnd={handleBattleEnd}
          />
        )}
      </main>

      {/* GameOver overlay */}
      {state.kind === 'ready' && outcome && (
        <GameOverOverlay
          open
          outcome={outcome}
          myPet={state.myPet}
          finalStreak={streak}
          onNext={outcome === 'victory' ? handleNext : undefined}
          onRestart={outcome === 'defeat' ? handleRestart : undefined}
          onInvite={() => setShowInvite(true)}
        />
      )}

      {/* Invite modal */}
      {state.kind === 'ready' && (
        <InviteShareCard
          open={showInvite}
          myPetId={state.myPet.pet_id}
          onClose={() => setShowInvite(false)}
        />
      )}

      <footer
        className="relative z-10 mt-10"
        style={{
          padding: '12px 32px',
          borderTop: '1px solid rgba(212,175,55,0.18)',
          fontSize: '10px',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: 'rgba(212,175,55,0.4)',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          background: 'rgba(8, 4, 14, 0.4)',
        }}
      >
        <span>// public pool · evidence local-only</span>
        <span style={{ color: 'rgba(245,233,200,0.3)' }}>arcade · battle · 2026</span>
      </footer>
    </div>
  );
}
