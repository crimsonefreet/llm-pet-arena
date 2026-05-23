'use client';

import { useCallback, useEffect, useRef, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Pet } from '@/lib/pet/schema';
import { fetchPet, fetchRandomPet, uploadPet } from '@/lib/api/endpoints';
import {
  getMyPetId,
  setMyPetId,
  getStreak,
  bumpStreak,
  resetStreak as resetStreakStore,
  hasConsent,
  grantConsent,
} from '@/lib/api/storage';
import { ArcadeBackground } from '@/components/v-arcade/ArcadeBackground';
import { ArcadeHeader } from '@/components/v-arcade/ArcadeHeader';
import { ArcadeCard } from '@/components/v-arcade/ArcadeCard';
import { BattleScene } from '@/components/v-arcade/BattleScene';
import { StreakBadge } from '@/components/v-arcade/StreakBadge';
import { GameOverOverlay } from '@/components/v-arcade/GameOverOverlay';
import { InviteShareCard } from '@/components/social/InviteShareCard';
import { JsonPaster } from '@/components/JsonPaster';
import { ConsentModal } from '@/components/social/ConsentModal';

type LoadState =
  | { kind: 'init' }
  | { kind: 'no-pet' }
  | { kind: 'loading' }
  | { kind: 'pool-empty' }
  | { kind: 'challenged'; challenger: Pet } // 收到 invite URL 但还没生成 pet
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
    <div
      className="relative min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0a0510' }}
    >
      <p
        className="text-[11px] tracking-[0.4em] uppercase"
        style={{ color: 'rgba(212,175,55,0.5)' }}
      >
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

  // challenged 状态下的 consent + upload
  const [pendingUpload, setPendingUpload] = useState<Pet | null>(null);
  const [showConsent, setShowConsent] = useState(false);

  // 加载初始 pet pair
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const myId = getMyPetId();

      // 路径 1：朋友收到 invite URL 但还没生成 pet → 拉 challenger，进 challenged 状态
      if (inviteOpId && !myId) {
        try {
          setState({ kind: 'loading' });
          const challenger = await fetchPet(inviteOpId);
          if (cancelled) return;
          setState({ kind: 'challenged', challenger });
        } catch (e: any) {
          if (cancelled) return;
          setState({
            kind: 'error',
            msg:
              e?.status === 404
                ? `Challenger pet "${inviteOpId}" not found in pool`
                : e?.error ?? 'failed to fetch challenger',
          });
        }
        return;
      }

      // 路径 2：完全没 pet 且没 invite → 让用户去首页生成
      if (!myId) {
        setState({ kind: 'no-pet' });
        return;
      }

      // 路径 3：有 myPet → 加载 myPet + 对手（invite 指定 / 随机）
      setState({ kind: 'loading' });
      setStreak(getStreak());

      try {
        const myPet = await fetchPet(myId);
        let opponent: Pet | null = null;

        if (inviteOpId) {
          opponent = await fetchPet(inviteOpId);
        } else {
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
  const handleBattleEnd = useCallback((winner: 'a' | 'b' | 'draw') => {
    if (winner === 'a') {
      const next = bumpStreak();
      setStreak(next);
      setOutcome('victory');
    } else if (winner === 'b') {
      setOutcome('defeat');
    } else {
      setOutcome('draw');
    }
  }, []);

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

  // ── Challenged 状态：朋友粘 JSON → 上传 → 自动开战 ────────────
  const handleAccepted = useCallback(
    async (myPet: Pet) => {
      if (state.kind !== 'challenged') return;
      setMyPetId(myPet.pet_id);
      try {
        await uploadPet(myPet);
      } catch {
        // upload 失败也继续：local 玩
      }
      setState({ kind: 'ready', myPet, opponent: state.challenger });
      setBattleKey((k) => k + 1);
    },
    [state]
  );

  const handleUploadable = useCallback(
    (p: Pet) => {
      if (hasConsent()) {
        handleAccepted(p);
      } else {
        setPendingUpload(p);
        setShowConsent(true);
      }
    },
    [handleAccepted]
  );

  const onConsentAccept = useCallback(() => {
    grantConsent();
    if (pendingUpload) handleAccepted(pendingUpload);
    setShowConsent(false);
    setPendingUpload(null);
  }, [pendingUpload, handleAccepted]);

  const onConsentDecline = useCallback(() => {
    setShowConsent(false);
    setPendingUpload(null);
  }, []);

  // ── 顶部 status ────────────────────────────────────────────────
  const headerStatus =
    state.kind === 'ready'
      ? `${state.myPet.name.toUpperCase()} vs ${state.opponent.name.toUpperCase()}`
      : state.kind === 'challenged'
      ? `incoming_challenge · ${state.challenger.name.toUpperCase()}`
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
    <div className="relative min-h-screen" style={{ backgroundColor: '#0a0510', color: '#f5e9c8' }}>
      <ArcadeBackground />
      <ArcadeHeader status={headerStatus} />

      <ConsentModal open={showConsent} onAccept={onConsentAccept} onDecline={onConsentDecline} />

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
          {state.kind === 'ready' && <StreakBadge streak={streak} />}
        </section>

        {/* MAIN */}
        {(state.kind === 'init' || state.kind === 'loading') && (
          <div className="text-center py-32" style={{ color: 'rgba(212,175,55,0.6)' }}>
            <p className="text-[11px] tracking-[0.4em] uppercase">// loading combatants...</p>
          </div>
        )}

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
            <p
              className="text-[11px] tracking-[0.3em] uppercase"
              style={{ color: 'rgba(212,175,55,0.5)' }}
            >
              try refresh / check connection
            </p>
          </div>
        )}

        {state.kind === 'challenged' && (
          <ChallengedView challenger={state.challenger} onUploadable={handleUploadable} />
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

// ────────────────────────────────────────────────────────────────
// CHALLENGED view —— invite recipient 的内嵌应战面板
// 左：挑战者卡片预览；右：JsonPaster + 提示
// ────────────────────────────────────────────────────────────────
function ChallengedView({
  challenger,
  onUploadable,
}: {
  challenger: Pet;
  onUploadable: (p: Pet) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <section className="grid grid-cols-12 gap-x-8 gap-y-10">
      {/* CHALLENGE BANNER */}
      <div className="col-span-12 text-center">
        <p
          className="text-[11px] tracking-[0.5em] uppercase mb-2"
          style={{ color: 'rgba(212,175,55,0.6)' }}
        >
          ✦ INCOMING CHALLENGE ✦
        </p>
        <h2
          style={{
            fontFamily: 'var(--font-cinzel), Cinzel, serif',
            fontWeight: 700,
            fontSize: 'clamp(28px, 4vw, 48px)',
            color: '#ffd700',
            textShadow: '0 0 16px rgba(255,215,0,0.4)',
            letterSpacing: '0.04em',
          }}
        >
          {challenger.name.toUpperCase()}
          <span style={{ color: '#ffe082', marginLeft: 8 }}>·</span>
          <span
            style={{ color: 'rgba(212,175,55,0.7)', fontSize: '0.5em', letterSpacing: '0.3em' }}
            className="ml-3"
          >
            CHALLENGES YOU
          </span>
        </h2>
      </div>

      {/* LEFT · challenger card preview */}
      <div className="col-span-12 lg:col-span-5">
        <p
          className="text-[10px] tracking-[0.3em] uppercase mb-3"
          style={{ color: 'rgba(212,175,55,0.5)' }}
        >
          // adversary
        </p>
        <div className="relative w-full max-w-[460px]" style={{ containerType: 'inline-size' }}>
          <div
            aria-hidden
            className="absolute pointer-events-none"
            style={{
              inset: '-20px',
              borderRadius: '32px',
              background:
                'radial-gradient(ellipse at center, rgba(212,175,55,0.18) 0%, transparent 70%)',
            }}
          />
          <div
            className="relative overflow-hidden"
            style={{
              width: '100%',
              aspectRatio: '1080 / 1350',
              borderRadius: '20px',
              boxShadow: '0 30px 90px rgba(0,0,0,0.85), 0 0 40px rgba(212,175,55,0.18)',
            }}
          >
            <div
              style={{
                width: '1080px',
                height: '1350px',
                transformOrigin: 'top left',
                transform: 'scale(calc(100cqw / 1080px))',
              }}
            >
              <div ref={cardRef}>
                <ArcadeCard pet={challenger} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT · accept by pasting */}
      <div
        className="col-span-12 lg:col-span-7"
        style={{
          ['--c-line' as string]: 'rgba(212,175,55,0.3)',
          ['--c-line-dim' as string]: 'rgba(212,175,55,0.15)',
          ['--c-line-hot' as string]: 'rgba(255,215,0,0.55)',
          ['--c-bg-surface' as string]: 'rgba(20,12,8,0.45)',
          ['--c-text' as string]: '#f5e9c8',
          ['--c-text-bright' as string]: '#ffe082',
          ['--c-text-dim' as string]: 'rgba(212,175,55,0.5)',
          ['--c-amber' as string]: '#ffd700',
          ['--c-red' as string]: '#e57373',
        }}
      >
        <div
          className="text-[10px] tracking-[0.3em] uppercase mb-3"
          style={{ color: 'rgba(212,175,55,0.5)' }}
        >
          // accept_challenge · paste your pet json
        </div>
        <h3
          className="text-2xl mb-4"
          style={{
            fontFamily: 'var(--font-cinzel), Cinzel, serif',
            fontWeight: 700,
            color: '#ffd700',
            letterSpacing: '0.03em',
          }}
        >
          Send Your Champion
        </h3>
        <p className="text-[13px] mb-5 leading-relaxed" style={{ color: '#f5e9c8' }}>
          Paste your own LLM-generated pet to accept the challenge. The arena will pit your two
          creatures against each other immediately.
        </p>

        <JsonPaster onParsed={() => {}} onUploadable={onUploadable} />

        <p
          className="mt-4 text-[10px] tracking-[0.3em] uppercase"
          style={{ color: 'rgba(212,175,55,0.4)' }}
        >
          // need a pet? &nbsp;
          <a
            href="/"
            style={{
              color: 'rgba(212,175,55,0.7)',
              textDecoration: 'underline',
              textUnderlineOffset: '4px',
            }}
          >
            generate one on the home page →
          </a>
        </p>
      </div>
    </section>
  );
}
