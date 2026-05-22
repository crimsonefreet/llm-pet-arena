'use client';

import type { Pet } from '@/lib/pet/schema';

interface Props {
  open: boolean;
  outcome: 'victory' | 'defeat' | 'draw';
  myPet: Pet | null;
  finalStreak: number;
  onNext?: () => void;       // win 时显示：下一关
  onRestart?: () => void;    // lose 时显示：重启 streak
  onInvite?: () => void;     // 始终显示：邀请朋友
}

/**
 * Battle 结束覆盖层 —— v-arcade 金色 + Cinzel
 *
 * - victory: 大字 VICTORY + ✦ + Next Challenge / Invite a Friend
 * - defeat:  大字 DEFEAT + 显示最终 streak + 🔄 Restart / 🔗 Invite
 */
export function GameOverOverlay({
  open,
  outcome,
  myPet,
  finalStreak,
  onNext,
  onRestart,
  onInvite,
}: Props) {
  if (!open) return null;

  const isWin = outcome === 'victory';
  const label = outcome === 'draw' ? 'DRAW' : outcome === 'victory' ? 'VICTORY' : 'DEFEAT';
  const labelColor = isWin ? '#ffd700' : outcome === 'draw' ? '#f5e9c8' : '#e57373';
  const labelShadow = isWin
    ? '0 0 28px rgba(255, 215, 0, 0.5), 0 0 64px rgba(255, 215, 0, 0.25)'
    : outcome === 'draw'
    ? '0 0 14px rgba(245, 233, 200, 0.3)'
    : '0 0 28px rgba(229, 115, 115, 0.4), 0 0 64px rgba(229, 115, 115, 0.2)';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="battle-outcome"
      className="fixed inset-0 z-40 flex items-center justify-center p-6"
      style={{
        background: 'rgba(8, 4, 14, 0.86)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        animation: 'fadeIn 600ms ease-out',
      }}
    >
      <div className="relative text-center max-w-xl">
        <div
          className="text-[10px] tracking-[0.5em] uppercase mb-6"
          style={{ color: 'rgba(212, 175, 55, 0.6)' }}
        >
          ✦ ✦ ✦
        </div>

        <h2
          id="battle-outcome"
          style={{
            fontFamily: 'var(--font-cinzel), Cinzel, serif',
            fontWeight: 800,
            fontSize: 'clamp(72px, 14vw, 160px)',
            color: labelColor,
            textShadow: labelShadow,
            letterSpacing: '0.06em',
            lineHeight: 1,
            marginBottom: '24px',
          }}
        >
          {label}
        </h2>

        {/* streak / context */}
        <p
          className="text-sm tracking-[0.2em] uppercase mb-8"
          style={{ color: 'rgba(212, 175, 55, 0.8)' }}
        >
          {isWin && myPet && (
            <>
              {myPet.name.toUpperCase()} ascends · streak {String(finalStreak).padStart(2, '0')}
            </>
          )}
          {!isWin && outcome !== 'draw' && (
            <>
              streak ended at {String(finalStreak).padStart(2, '0')}
            </>
          )}
          {outcome === 'draw' && <>both fell · the arena is silent</>}
        </p>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-center gap-3">
          {/* Invite 始终可用 */}
          <button
            onClick={onInvite}
            className="px-6 py-3 text-[11px] tracking-[0.25em] uppercase"
            style={{
              color: 'rgba(245, 233, 200, 0.85)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              background: 'transparent',
              transition: 'border-color 200ms, color 200ms',
            }}
          >
            🔗 Invite a Friend
          </button>

          {/* Win → Next, Lose → Restart */}
          {isWin && (
            <button
              onClick={onNext}
              className="px-7 py-3 text-[11px] tracking-[0.3em] uppercase"
              style={{
                color: '#0a0510',
                background: 'linear-gradient(135deg, #ffd700, #d4af37)',
                border: '1px solid #ffd700',
                fontWeight: 700,
                boxShadow: '0 0 18px rgba(212, 175, 55, 0.4)',
              }}
            >
              ▶ Next Challenge
            </button>
          )}
          {!isWin && (
            <button
              onClick={onRestart}
              className="px-7 py-3 text-[11px] tracking-[0.3em] uppercase"
              style={{
                color: '#0a0510',
                background: 'linear-gradient(135deg, #ffd700, #d4af37)',
                border: '1px solid #ffd700',
                fontWeight: 700,
                boxShadow: '0 0 18px rgba(212, 175, 55, 0.4)',
              }}
            >
              🔄 Restart Streak
            </button>
          )}
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
      </div>
    </div>
  );
}
