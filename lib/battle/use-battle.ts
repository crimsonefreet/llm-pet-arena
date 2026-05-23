'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { Pet } from '@/lib/pet/schema';
import { simulateBattle, makeFighter, defaultRng } from './engine';
import type { BattleEvent, BattleResult, Fighter } from './types';

export type StageState = 'idle' | 'attacking' | 'takingHit' | 'fainted' | 'victory';

export interface BattleLogLine {
  text: string;
  kind: BattleEvent['kind'] | 'system';
  crit?: boolean;
}

export interface UseBattleReturn {
  fighterA: Fighter;
  fighterB: Fighter;
  stageA: StageState;
  stageB: StageState;
  log: BattleLogLine[];
  banner: { actor: 'a' | 'b'; text: string; element: string } | null;
  damagePop: { target: 'a' | 'b'; value: number; crit: boolean } | null;
  status: 'idle' | 'running' | 'ended';
  winner: 'a' | 'b' | 'draw' | null;
  round: number;
  /** 启动战斗（应在用户点 START 时调用，或自动） */
  start: () => void;
  /** 重置以重新开打（不切换 pet） */
  reset: () => void;
}

const DEFAULT_TIMING = {
  roundStart: 200,
  windup: 350,
  damageHit: 320,
  reset: 480,
  faint: 600,
  victory: 600,
};

interface Options {
  speedMultiplier?: number; // 1 = normal, 2 = double speed, etc
  autoStart?: boolean;
  /** Inject result for tests (skips simulateBattle) */
  precomputed?: BattleResult;
}

/**
 * Battle React hook —— 在 pet pair 上跑完整时间线 + 4 态动画
 *
 * 设计：
 * 1. mount 时 simulateBattle 把全部 events 算好（pure 函数）
 * 2. useEffect 启动 setTimeout 链，按时间轴依次 dispatch event
 * 3. 每个 dispatch 同时更新 fighter HP / stage / log / banner
 * 4. battle_end → status='ended'，UI 渲染 GameOverOverlay
 *
 * 不可变：events 一旦算出，整场战斗结果就定了（适合 share 战报 URL）
 */
export function useBattle(petA: Pet, petB: Pet, opts: Options = {}): UseBattleReturn {
  const speedMul = opts.speedMultiplier ?? 1;
  const autoStart = opts.autoStart ?? true;

  // 预计算 events —— 同一对 pet 同一 RNG seed 永远同结果
  const result = useMemo<BattleResult>(
    () => opts.precomputed ?? simulateBattle(petA, petB, { rng: defaultRng() }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [petA.pet_id, petB.pet_id]
  );

  const [fighterA, setFighterA] = useState<Fighter>(() => makeFighter(petA));
  const [fighterB, setFighterB] = useState<Fighter>(() => makeFighter(petB));
  const [stageA, setStageA] = useState<StageState>('idle');
  const [stageB, setStageB] = useState<StageState>('idle');
  const [log, setLog] = useState<BattleLogLine[]>([]);
  const [banner, setBanner] = useState<UseBattleReturn['banner']>(null);
  const [damagePop, setDamagePop] = useState<UseBattleReturn['damagePop']>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'ended'>('idle');
  const [winner, setWinner] = useState<UseBattleReturn['winner']>(null);
  const [round, setRound] = useState(0);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const runIdRef = useRef(0); // 防 race：reset 后旧 timeline 不再写状态

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  }, []);

  const reset = useCallback(() => {
    runIdRef.current += 1;
    clearTimers();
    setFighterA(makeFighter(petA));
    setFighterB(makeFighter(petB));
    setStageA('idle');
    setStageB('idle');
    setLog([]);
    setBanner(null);
    setDamagePop(null);
    setStatus('idle');
    setWinner(null);
    setRound(0);
  }, [petA, petB, clearTimers]);

  const run = useCallback(() => {
    runIdRef.current += 1;
    const myRun = runIdRef.current;

    const T = (ms: number) => Math.round(ms / speedMul);
    let cursor = 0;
    const schedule = (ms: number, fn: () => void) => {
      timers.current.push(
        setTimeout(() => {
          if (runIdRef.current !== myRun) return;
          fn();
        }, cursor + ms)
      );
      cursor += ms;
    };

    setStatus('running');

    for (const e of result.events) {
      switch (e.kind) {
        case 'round_start':
          schedule(T(DEFAULT_TIMING.roundStart), () => {
            setRound(e.round);
            setLog((l) => [...l, { text: `── round ${e.round} ──`, kind: 'round_start' }]);
          });
          break;

        case 'skill_use':
          schedule(T(DEFAULT_TIMING.windup), () => {
            const name = e.actor === 'a' ? petA.name : petB.name;
            setBanner({ actor: e.actor, text: e.skill.name, element: e.skill.element });
            setLog((l) => [
              ...l,
              { text: `${name.toUpperCase()} 释放 ${e.skill.name}`, kind: 'skill_use' },
            ]);
            if (e.actor === 'a') setStageA('attacking');
            else setStageB('attacking');
          });
          break;

        case 'damage':
          schedule(T(DEFAULT_TIMING.damageHit), () => {
            // 扣血
            if (e.target === 'a') {
              setFighterA((f) => ({ ...f, hp: Math.max(0, f.hp - e.damage) }));
              setStageA('takingHit');
            } else {
              setFighterB((f) => ({ ...f, hp: Math.max(0, f.hp - e.damage) }));
              setStageB('takingHit');
            }
            setDamagePop({ target: e.target, value: e.damage, crit: e.crit });
            const tag = e.crit ? ' 暴击!' : e.elMult > 1 ? ' 克制!' : e.elMult < 1 ? ' 抗性...' : '';
            setLog((l) => [
              ...l,
              { text: `→ ${e.damage} dmg${tag}`, kind: 'damage', crit: e.crit },
            ]);
          });
          schedule(T(DEFAULT_TIMING.reset), () => {
            // 回 idle（如未 faint）
            setStageA((s) => (s === 'takingHit' || s === 'attacking' ? 'idle' : s));
            setStageB((s) => (s === 'takingHit' || s === 'attacking' ? 'idle' : s));
            setBanner(null);
            setDamagePop(null);
          });
          break;

        case 'faint':
          schedule(T(DEFAULT_TIMING.faint), () => {
            if (e.target === 'a') setStageA('fainted');
            else setStageB('fainted');
            const name = e.target === 'a' ? petA.name : petB.name;
            setLog((l) => [...l, { text: `${name.toUpperCase()} 倒下`, kind: 'faint' }]);
          });
          break;

        case 'battle_end':
          schedule(T(DEFAULT_TIMING.victory), () => {
            setWinner(e.winner);
            if (e.winner === 'a') setStageA('victory');
            else if (e.winner === 'b') setStageB('victory');
            setStatus('ended');
            const label =
              e.winner === 'draw'
                ? '平局'
                : `${(e.winner === 'a' ? petA.name : petB.name).toUpperCase()} 获胜`;
            setLog((l) => [...l, { text: `═══ ${label} ═══`, kind: 'battle_end' }]);
          });
          break;
      }
    }
  }, [result, petA, petB, speedMul]);

  // 自动启动
  useEffect(() => {
    if (autoStart) run();
    return () => clearTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petA.pet_id, petB.pet_id]);

  return {
    fighterA,
    fighterB,
    stageA,
    stageB,
    log,
    banner,
    damagePop,
    status,
    winner,
    round,
    start: run,
    reset,
  };
}
