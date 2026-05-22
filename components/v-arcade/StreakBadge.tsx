'use client';

interface Props {
  streak: number;
}

/**
 * Streak counter —— 连胜计数 badge
 *
 * v-arcade 风格：gold 数字 + Cinzel + 小 caps label
 */
export function StreakBadge({ streak }: Props) {
  return (
    <div
      className="inline-flex items-baseline gap-3 px-5 py-2"
      style={{
        border: '1px solid rgba(212, 175, 55, 0.4)',
        background: 'rgba(8, 4, 14, 0.6)',
      }}
    >
      <span
        className="text-[10px] tracking-[0.35em] uppercase"
        style={{ color: 'rgba(212, 175, 55, 0.7)' }}
      >
        // streak
      </span>
      <span
        className="text-2xl tabular-nums"
        style={{
          fontFamily: 'var(--font-cinzel), Cinzel, serif',
          fontWeight: 700,
          color: streak > 0 ? '#ffd700' : 'rgba(212, 175, 55, 0.5)',
          textShadow: streak > 0 ? '0 0 12px rgba(255, 215, 0, 0.4)' : 'none',
        }}
      >
        {String(streak).padStart(2, '0')}
      </span>
    </div>
  );
}
