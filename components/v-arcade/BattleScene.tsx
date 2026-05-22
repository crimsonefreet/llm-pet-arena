'use client';

import { useEffect, useRef } from 'react';
import type { Pet } from '@/lib/pet/schema';
import { useBattle } from '@/lib/battle/use-battle';
import { BattlePetPanel } from './BattlePetPanel';
import styles from './BattleArena.module.css';

interface Props {
  petA: Pet;
  petB: Pet;
  onEnd?: (winner: 'a' | 'b' | 'draw') => void;
}

/**
 * Battle 主舞台 —— 两宠物面板 + VS block + skill banner + damage pop + log
 *
 * 视觉契约：v-arcade 金/暗配色 + Cinzel 标题 + Inter 正文，禁止引入新色谱
 */
export function BattleScene({ petA, petB, onEnd }: Props) {
  const battle = useBattle(petA, petB, { autoStart: true });
  const logRef = useRef<HTMLDivElement>(null);
  const onEndFired = useRef(false);

  // log 自动滚底
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [battle.log.length]);

  // battle_end 触发 callback（仅一次）
  useEffect(() => {
    if (battle.status === 'ended' && battle.winner && !onEndFired.current) {
      onEndFired.current = true;
      onEnd?.(battle.winner);
    }
  }, [battle.status, battle.winner, onEnd]);

  // pet 变化 → 重置 firedflag
  useEffect(() => {
    onEndFired.current = false;
  }, [petA.pet_id, petB.pet_id]);

  return (
    <div className="relative w-full max-w-5xl mx-auto">
      {/* ROUND marker */}
      <div className="text-center mb-4">
        <span className={styles.roundMarker}>
          {battle.status === 'idle' && '· awaiting battle ·'}
          {battle.status === 'running' && `round ${battle.round} / 12`}
          {battle.status === 'ended' && '· battle concluded ·'}
        </span>
      </div>

      {/* 主战斗区：左 a / 中 VS / 右 b */}
      <div className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 lg:gap-10 items-start mb-6">
        <BattlePetPanel fighter={battle.fighterA} side="a" stage={battle.stageA} />

        <div className="flex flex-col items-center justify-center py-12 lg:py-32">
          <span className={styles.vsBlock}>VS</span>
        </div>

        <BattlePetPanel fighter={battle.fighterB} side="b" stage={battle.stageB} />

        {/* skill banner overlay */}
        {battle.banner && (
          <div className={styles.skillBanner}>
            ✦ {battle.banner.text} ✦
          </div>
        )}

        {/* damage popup 定位在被击侧 */}
        {battle.damagePop && (
          <div
            className={`${styles.dmgPop} ${battle.damagePop.crit ? styles.crit : ''}`}
            style={{
              top: '35%',
              left: battle.damagePop.target === 'a' ? '18%' : '82%',
              transform: 'translateX(-50%)',
            }}
          >
            -{battle.damagePop.value}
            {battle.damagePop.crit && <span style={{ fontSize: '0.5em', marginLeft: 4 }}>CRIT</span>}
          </div>
        )}
      </div>

      {/* battle log */}
      <div ref={logRef} className={styles.log} aria-live="polite">
        {battle.log.length === 0 && (
          <div style={{ color: 'rgba(212,175,55,0.4)' }}>// waiting for first strike...</div>
        )}
        {battle.log.map((line, i) => {
          const cls =
            line.kind === 'round_start'
              ? styles.logLineRound
              : line.kind === 'skill_use'
              ? styles.logLineSkill
              : line.crit
              ? styles.logLineCrit
              : line.kind === 'damage'
              ? styles.logLineDamage
              : line.kind === 'faint'
              ? styles.logLineFaint
              : line.kind === 'battle_end'
              ? styles.logLineEnd
              : '';
          return (
            <div key={i} className={cls}>
              {line.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}
