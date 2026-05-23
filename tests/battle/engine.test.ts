import { describe, it, expect } from 'vitest';
import {
  elementMultiplier,
  rollDamage,
  chooseSkill,
  firstActor,
  makeFighter,
  HP_SCALE,
  seededRng,
  simulateBattle,
  ELEMENT_COUNTERS,
} from '@/lib/battle/engine';
import type { Pet } from '@/lib/pet/schema';
import tessera from '@/fixtures/tessera.json';
import aether from '@/fixtures/aether.json';
import vesper from '@/fixtures/vesper.json';

const T = tessera as Pet;
const A = aether as Pet;
const V = vesper as Pet;

describe('elementMultiplier', () => {
  it('1.4× when attacker beats one of defender elements (火 → 土)', () => {
    expect(elementMultiplier('火', ['土', '水'])).toBe(1.4);
  });

  it('0.7× when defender element beats attacker (土 → 雷)', () => {
    expect(elementMultiplier('雷', ['土'])).toBe(0.7);
  });

  it('1.0× neutral', () => {
    expect(elementMultiplier('火', ['水'])).toBe(1.0);
  });

  it('金 beats 土 (special non-五行 case)', () => {
    expect(elementMultiplier('金', ['土'])).toBe(1.4);
  });

  it('full counter cycle covered', () => {
    // 五行循环 + 金特例 —— 每条 counter 都 1.4
    for (const [atkEl, beats] of Object.entries(ELEMENT_COUNTERS)) {
      for (const def of beats) {
        expect(elementMultiplier(atkEl as any, [def as any])).toBe(1.4);
      }
    }
  });

  it('does not get confused by dual-element defender', () => {
    // attacker 金 vs defender 金/暗 —— 金对暗 neutral, 金对金 neutral → 1.0
    expect(elementMultiplier('金', ['金', '暗'])).toBe(1.0);
  });
});

describe('rollDamage', () => {
  it('produces deterministic damage with seeded RNG', () => {
    const rng = seededRng(42);
    const d1 = rollDamage({ skill: T.skills[0], attacker: T, defender: A, rng });
    const rng2 = seededRng(42);
    const d2 = rollDamage({ skill: T.skills[0], attacker: T, defender: A, rng: rng2 });
    expect(d1).toEqual(d2);
  });

  it('damage is at least 1', () => {
    // 极端 wimp vs tank：power 1, atk 1, def 100
    const wimp: Pet = { ...T, stats: { ...T.stats, ATK: 1 } };
    const tank: Pet = { ...A, stats: { ...A.stats, DEF: 100 } };
    const weak: any = { ...T.skills[0], power: 1, element: '水' as const };
    const rng = seededRng(7);
    const { damage } = rollDamage({ skill: weak, attacker: wimp, defender: tank, rng });
    expect(damage).toBeGreaterThanOrEqual(1);
  });

  it('crit rate ≈ luk/4 + 5 percent over many trials', () => {
    // 用 LUK 99 → 期望 29.75% crit
    // 注意：必须共享 RNG state（不能每 iteration new seed，否则首位采样高度相关）
    const hyperLuck: Pet = { ...T, stats: { ...T.stats, LUK: 99 } };
    const rng = seededRng(42);
    let critsSeen = 0;
    const trials = 2000;
    for (let i = 0; i < trials; i++) {
      const { crit } = rollDamage({ skill: T.skills[0], attacker: hyperLuck, defender: A, rng });
      if (crit) critsSeen += 1;
    }
    const rate = critsSeen / trials;
    // 期望 29.75%，允许 ±5pp 误差
    expect(rate).toBeGreaterThan(0.25);
    expect(rate).toBeLessThan(0.35);
  });

  it('element advantage multiplies damage roughly by 1.4 / 0.7 vs neutral', () => {
    // 同样 attacker/defender，只换 skill element，对比期望值
    const sharedRng = seededRng(99);
    const neutralSkill: any = { ...T.skills[0], element: '水' as const };
    const beatSkill: any = { ...T.skills[0], element: '金' as const };

    const sum = (skill: any, n: number) => {
      let s = 0;
      for (let i = 0; i < n; i++) {
        const r = seededRng(i * 13);
        const d = rollDamage({ skill, attacker: T, defender: A, rng: r });
        s += d.damage;
      }
      return s / n;
    };

    const neutral = sum(neutralSkill, 50);
    const advantage = sum(beatSkill, 50);
    // advantage 应明显 > neutral（约 1.4× 但 RNG 有 variance），不能更低
    expect(advantage).toBeGreaterThan(neutral * 1.2);
  });
});

describe('chooseSkill', () => {
  it('returns a skill from the pet pool', () => {
    const rng = seededRng(1);
    const s = chooseSkill(T, rng);
    expect(T.skills).toContain(s);
  });

  it('higher-power skills win more often (weighted)', () => {
    // 大量采样统计选中 ult vs std 的比例
    const counts: Record<string, number> = {};
    for (let i = 0; i < 5000; i++) {
      const s = chooseSkill(T, { next: () => Math.random() });
      counts[s.name] = (counts[s.name] ?? 0) + 1;
    }
    const ult = T.skills.find((s) => s.type === 'ult')!;
    const std = T.skills.filter((s) => s.type === 'std');
    // ult power 92, std power ~68-72 → ult 应至少比某个 std 多选
    expect(counts[ult.name]).toBeGreaterThan(counts[std[0].name] ?? 0);
  });
});

describe('firstActor', () => {
  it('higher SPD goes first', () => {
    // Tessera SPD=70, Aether SPD=90
    expect(firstActor(T, A)).toBe('b');
    expect(firstActor(A, T)).toBe('a');
  });

  it('tie goes to a (stable)', () => {
    expect(firstActor(T, T)).toBe('a');
  });
});

describe('makeFighter', () => {
  it('scales HP stat to maxHp', () => {
    const f = makeFighter(T);
    expect(f.maxHp).toBe(T.stats.HP * HP_SCALE);
    expect(f.hp).toBe(f.maxHp);
    expect(f.fainted).toBe(false);
  });
});

describe('simulateBattle', () => {
  it('terminates within maxRounds', () => {
    const result = simulateBattle(T, A, { rng: seededRng(123), maxRounds: 12 });
    expect(result.rounds).toBeLessThanOrEqual(12);
  });

  it('produces a non-draw result for most seeds (Tessera vs Aether)', () => {
    // 30 个随机 seed 跑下来应该绝大多数有明确赢家，少量 draw 可接受
    let decisive = 0;
    for (let s = 0; s < 30; s++) {
      const r = simulateBattle(T, A, { rng: seededRng(s) });
      if (r.winner !== 'draw') decisive += 1;
    }
    expect(decisive).toBeGreaterThan(25);
  });

  it('events sequence starts with round_start and ends with battle_end', () => {
    const r = simulateBattle(T, A, { rng: seededRng(1) });
    expect(r.events[0].kind).toBe('round_start');
    expect(r.events[r.events.length - 1].kind).toBe('battle_end');
  });

  it('winner pet has hp > 0', () => {
    const r = simulateBattle(T, A, { rng: seededRng(1) });
    if (r.winner === 'a') expect(r.finalHp.a).toBeGreaterThan(0);
    if (r.winner === 'b') expect(r.finalHp.b).toBeGreaterThan(0);
  });

  it('faint event precedes battle_end when there is a clear winner', () => {
    const r = simulateBattle(T, V, { rng: seededRng(5) });
    if (r.winner !== 'draw') {
      const faintIdx = r.events.findIndex((e) => e.kind === 'faint');
      const endIdx = r.events.findIndex((e) => e.kind === 'battle_end');
      expect(faintIdx).toBeGreaterThan(-1);
      expect(faintIdx).toBeLessThan(endIdx);
    }
  });

  it('both sides can win across many seeds (engine is not deterministic for one side)', () => {
    // 引擎正确性：RNG 应该让两边都有可能赢，不是 hard-coded 一方碾压。
    // 注意：60% Tessera (HTML 原型) 的精确平衡是 gameplay tuning 范畴（HP_SCALE 等），
    // 这里只验证"引擎给 RNG 留了空间"。
    const rng = seededRng(17);
    let aWins = 0;
    let bWins = 0;
    for (let s = 0; s < 200; s++) {
      const r = simulateBattle(T, A, { rng });
      if (r.winner === 'a') aWins += 1;
      if (r.winner === 'b') bWins += 1;
    }
    expect(aWins).toBeGreaterThan(0);
    expect(bWins).toBeGreaterThan(0);
  });
});
