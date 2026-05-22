import type { Pet, Skill, Element } from '@/lib/pet/schema';
import type {
  BattleConfig,
  BattleEvent,
  BattleResult,
  ElementCounter,
  Fighter,
  Rng,
} from './types';

// ── 元素克制循环 ──────────────────────────────────────────────────
// 火 → 土 → 雷 → 水 → 暗 → 火（五行循环）
// 金 → 土（特殊：金属胜土）
// （从 UI/Pet Arena __ Battle.html 反向工程出的对照表）
export const ELEMENT_COUNTERS: ElementCounter = {
  火: ['土'],
  土: ['雷'],
  雷: ['水'],
  水: ['暗'],
  暗: ['火'],
  金: ['土'],
};

/**
 * 元素压制倍率
 *   attacker beats any of defender's elements   → 1.4
 *   any of defender's elements beats attacker   → 0.7
 *   neutral                                     → 1.0
 */
export function elementMultiplier(attackerEl: Element, defenderEls: Element[]): number {
  const counters = ELEMENT_COUNTERS[attackerEl];
  if (counters.some((c) => defenderEls.includes(c))) return 1.4;
  const beaten = defenderEls.some((d) => ELEMENT_COUNTERS[d].includes(attackerEl));
  if (beaten) return 0.7;
  return 1.0;
}

/**
 * 单次攻击的伤害 ——
 *   base = skill.power × (atk/100) × 2.4
 *   crit chance = (luk/4 + 5) %, multiplier 1.7
 *   variance ∈ [0.85, 1.15]
 *   defense reduction = 100 / (100 + def)
 *   dmg = round(base × elMult × critMult × variance × reduction)
 */
export interface DamageInput {
  skill: Skill;
  attacker: Pet;
  defender: Pet;
  rng: Rng;
}

export interface DamageOutput {
  damage: number;
  crit: boolean;
  elMult: number;
}

export function rollDamage({ skill, attacker, defender, rng }: DamageInput): DamageOutput {
  const elMult = elementMultiplier(skill.element, defender.elements);
  const critChance = attacker.stats.LUK / 4 + 5;
  const crit = rng.next() * 100 < critChance;
  const critMult = crit ? 1.7 : 1.0;
  const variance = 0.85 + rng.next() * 0.3; // 0.85 - 1.15
  const base = skill.power * (attacker.stats.ATK / 100) * 2.4;
  const reduction = 100 / (100 + defender.stats.DEF);
  const damage = Math.max(1, Math.round(base * elMult * critMult * variance * reduction));
  return { damage, crit, elMult };
}

/**
 * AI 选技 —— 简单加权随机（按 skill.power）
 *
 * 历史版本（HTML 原型）有 "HP<35% → heal" 分支，但 LLM 生成的 pet
 * 不带 heal flag，所以 v1 走简化版：纯加权随机。
 * power 高 → 选中概率高，符合直觉。
 */
export function chooseSkill(pet: Pet, rng: Rng): Skill {
  const pool = pet.skills;
  const total = pool.reduce((sum, s) => sum + s.power, 0);
  let r = rng.next() * total;
  for (const s of pool) {
    r -= s.power;
    if (r <= 0) return s;
  }
  return pool[pool.length - 1];
}

/**
 * 出手顺序 —— 高 SPD 先手；并列时 a 先（稳定）
 */
export function firstActor(a: Pet, b: Pet): 'a' | 'b' {
  return a.stats.SPD >= b.stats.SPD ? 'a' : 'b';
}

/**
 * Fighter 初始化 —— HP stat 1-100 × 比例 = 实际可承受伤害
 *
 * HP=100 应该约能扛 6-10 次中等攻击（power 70），所以放大系数 ≈ 5
 * → maxHp = HP * 5, 范围 5-500
 */
export const HP_SCALE = 5;

export function makeFighter(pet: Pet): Fighter {
  const maxHp = pet.stats.HP * HP_SCALE;
  return { pet, hp: maxHp, maxHp, fainted: false };
}

// ── Default RNG ─────────────────────────────────────────────────

export function defaultRng(): Rng {
  return { next: () => Math.random() };
}

/**
 * Seeded LCG —— 测试用确定性 RNG
 * 经典常数 (Numerical Recipes)：a=1664525, c=1013904223, m=2^32
 */
export function seededRng(seed: number): Rng {
  let state = seed >>> 0;
  return {
    next() {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 0x100000000;
    },
  };
}

/**
 * 完整对战模拟 —— 从两 pet 跑到一方倒下 / round limit
 *
 * 返回完整 event 列表，UI 可按时间轴回放（加 setTimeout 延迟 + 动画）
 */
export function simulateBattle(petA: Pet, petB: Pet, config: BattleConfig = {}): BattleResult {
  const maxRounds = config.maxRounds ?? 12;
  const rng = config.rng ?? defaultRng();

  const a = makeFighter(petA);
  const b = makeFighter(petB);
  const events: BattleEvent[] = [];

  const order: ('a' | 'b')[] = firstActor(petA, petB) === 'a' ? ['a', 'b'] : ['b', 'a'];

  let round = 1;
  while (round <= maxRounds && !a.fainted && !b.fainted) {
    events.push({ kind: 'round_start', round });

    for (const actor of order) {
      const attacker = actor === 'a' ? a : b;
      const defender = actor === 'a' ? b : a;
      if (attacker.fainted || defender.fainted) continue;

      const skill = chooseSkill(attacker.pet, rng);
      events.push({ kind: 'skill_use', actor, skill });

      const { damage, crit, elMult } = rollDamage({
        skill,
        attacker: attacker.pet,
        defender: defender.pet,
        rng,
      });
      defender.hp = Math.max(0, defender.hp - damage);
      events.push({
        kind: 'damage',
        actor,
        target: actor === 'a' ? 'b' : 'a',
        damage,
        crit,
        elMult,
      });

      if (defender.hp <= 0) {
        defender.fainted = true;
        events.push({ kind: 'faint', target: actor === 'a' ? 'b' : 'a' });
        break;
      }
    }

    round += 1;
  }

  // 胜负裁决
  let winner: 'a' | 'b' | 'draw';
  if (a.fainted && b.fainted) winner = 'draw';
  else if (a.fainted) winner = 'b';
  else if (b.fainted) winner = 'a';
  else {
    // round limit 到达 —— 剩余 HP 高者胜
    if (a.hp > b.hp) winner = 'a';
    else if (b.hp > a.hp) winner = 'b';
    else winner = 'draw';
  }

  events.push({ kind: 'battle_end', winner });

  return {
    winner,
    rounds: round - 1,
    events,
    finalHp: { a: a.hp, b: b.hp },
  };
}
