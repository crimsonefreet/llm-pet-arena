'use client';

import type { Pet } from '@/lib/pet/schema';
import type { Fighter } from '@/lib/battle/types';
import type { StageState } from '@/lib/battle/use-battle';
import { PetCreature } from './PetCreature';
import styles from './BattleArena.module.css';

interface Props {
  fighter: Fighter;
  side: 'a' | 'b';
  stage: StageState;
}

/**
 * 单侧宠物面板 —— PetCreature 大尺寸展示 + 名字 / HP 条 / 元素 badge
 *
 * 关键设计：PetCreature 本体绝不改，4 态动画全靠外层 .petStage div 加 className
 * （保 PNG 导出纯净；状态切换 = CSS keyframe 重启）
 */
export function BattlePetPanel({ fighter, side, stage }: Props) {
  const { pet, hp, maxHp, fainted } = fighter;
  const hpRatio = hp / maxHp;
  const hpClass = hpRatio < 0.25 ? styles.danger : hpRatio < 0.5 ? styles.warn : '';

  const stageClass = [
    styles.petStage,
    stage === 'idle' && styles.stateIdle,
    stage === 'attacking' && styles.stateAttacking,
    stage === 'attacking' && (side === 'a' ? styles.actorA : styles.actorB),
    stage === 'takingHit' && styles.stateTakingHit,
    stage === 'fainted' && styles.stateFainted,
    stage === 'victory' && styles.stateVictory,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* 名字 + rarity */}
      <div className="flex items-baseline justify-between border-b border-dashed pb-2" style={{ borderColor: 'rgba(212,175,55,0.3)' }}>
        <span
          className="text-2xl"
          style={{
            fontFamily: 'var(--font-cinzel), Cinzel, serif',
            fontWeight: 700,
            color: fainted ? 'rgba(212,175,55,0.4)' : '#ffd700',
            textShadow: fainted ? 'none' : '0 0 8px rgba(255,215,0,0.4)',
            letterSpacing: '0.03em',
          }}
        >
          {pet.name.toUpperCase()}
        </span>
        <span className="text-[11px] tracking-[0.3em] uppercase tabular-nums" style={{ color: '#ffd700' }}>
          {pet.rarity}
        </span>
      </div>

      {/* HP bar + 数字 */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5 text-[10px] tracking-[0.3em] uppercase" style={{ color: 'rgba(212,175,55,0.7)' }}>
          <span>HP</span>
          <span className="tabular-nums" style={{ color: '#f5e9c8' }}>
            {hp} / {maxHp}
          </span>
        </div>
        <div className={styles.hpBar}>
          <div
            className={`${styles.hpFill} ${hpClass}`}
            style={{ width: `${(hpRatio * 100).toFixed(1)}%` }}
            role="progressbar"
            aria-valuenow={hp}
            aria-valuemin={0}
            aria-valuemax={maxHp}
            aria-label={`${pet.name} HP`}
          />
        </div>
      </div>

      {/* PetCreature 主舞台 —— art window 风格的 frame */}
      <div
        className="relative w-full"
        style={{
          aspectRatio: '4 / 3.4',
          border: '1px solid rgba(212,175,55,0.3)',
          background: 'rgba(8, 4, 14, 0.45)',
          overflow: 'hidden',
        }}
      >
        {/* 4 角金色 bracket */}
        <CornerBracket position="tl" />
        <CornerBracket position="tr" />
        <CornerBracket position="bl" />
        <CornerBracket position="br" />

        {/* 状态层 + PetCreature */}
        <div className={stageClass}>
          <div style={{ width: '92%', height: '92%' }}>
            <PetCreature pet={pet} />
          </div>
        </div>
      </div>

      {/* 元素 + faction dominant + 6 stat mini */}
      <div className="flex items-baseline justify-between text-[11px] tracking-[0.2em] uppercase" style={{ color: 'rgba(212,175,55,0.7)' }}>
        <span>
          {pet.elements.join(' · ')}
        </span>
        <span style={{ color: '#f5e9c8' }} className="tabular-nums">
          ATK {pet.stats.ATK} · DEF {pet.stats.DEF} · SPD {pet.stats.SPD}
        </span>
      </div>
    </div>
  );
}

function CornerBracket({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: '12px',
    height: '12px',
    border: '2px solid #ffd700',
    zIndex: 5,
  };
  const styles: Record<typeof position, React.CSSProperties> = {
    tl: { ...base, top: -1, left: -1, borderRight: 'none', borderBottom: 'none' },
    tr: { ...base, top: -1, right: -1, borderLeft: 'none', borderBottom: 'none' },
    bl: { ...base, bottom: -1, left: -1, borderRight: 'none', borderTop: 'none' },
    br: { ...base, bottom: -1, right: -1, borderLeft: 'none', borderTop: 'none' },
  };
  return <span aria-hidden style={styles[position]} />;
}
