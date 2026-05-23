import type { Pet, Skill, Element } from '@/lib/pet/schema';

/**
 * Battle-time pet state —— 派生自原始 Pet 但带可变 HP / fainted flag
 */
export interface Fighter {
  pet: Pet;
  hp: number;        // current
  maxHp: number;     // 满血基准（HP stat × 比例放大）
  fainted: boolean;
}

/**
 * 单回合事件 —— 用于 driver / log / 动画 step 调度
 */
export type BattleEvent =
  | { kind: 'round_start'; round: number }
  | { kind: 'skill_use'; actor: 'a' | 'b'; skill: Skill }
  | { kind: 'damage'; actor: 'a' | 'b'; target: 'a' | 'b'; damage: number; crit: boolean; elMult: number }
  | { kind: 'faint'; target: 'a' | 'b' }
  | { kind: 'battle_end'; winner: 'a' | 'b' | 'draw' };

export interface BattleResult {
  winner: 'a' | 'b' | 'draw';
  rounds: number;
  events: BattleEvent[];
  finalHp: { a: number; b: number };
}

/**
 * 注入式 RNG —— 测试中用 seeded RNG 让伤害可复现
 */
export interface Rng {
  next(): number; // [0, 1)
}

export interface BattleConfig {
  /** 默认 12 */
  maxRounds?: number;
  /** 默认 Math.random */
  rng?: Rng;
}

export type ElementCounter = Record<Element, Element[]>;
