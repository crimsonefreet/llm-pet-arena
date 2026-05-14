import { describe, it, expect } from 'vitest';
import { PetSchema } from '@/lib/pet/schema';

// 构造合法 pet（基于 Context.md §6.2 Tessera）
const validPet = {
  pet_id: 'bryan_finmage_009',
  name: 'Tessera',
  title: '尽调炼狱的执灯人',
  rarity: 'SSR',
  main_class: '金融术士',
  sub_class: '内容召唤师',
  elements: ['金', '暗'],
  faction_affinity: { chat: 62, cowork: 92, code: 71 },
  stats: { HP: 88, ATK: 82, DEF: 94, SPD: 70, INT: 96, LUK: 67 },
  skills: [
    { name: 'Look-Ahead Banishment', element: '金', power: 92, type: 'ult', description: '穿透时间污染。' },
    { name: 'Granular Reweaving', element: '金', power: 85, type: 'main', description: '重织信息颗粒度。' },
    { name: 'Lemma Lock', element: '暗', power: 72, type: 'std', description: '锁定前提假设。' },
    { name: '尺度纠偏', element: '金', power: 68, type: 'std', description: '校准估算尺度。' },
  ],
  lore: '于报告与代码之间游走',
  generation_evidence: ['evidence A', 'evidence B'],
  source_llm: 'claude',
  generated_at: '2026-05-09T00:37:00Z',
};

describe('PetSchema', () => {
  it('accepts a valid pet', () => {
    const r = PetSchema.safeParse(validPet);
    expect(r.success).toBe(true);
  });

  it('rejects unknown rarity', () => {
    const r = PetSchema.safeParse({ ...validPet, rarity: 'MEGA' });
    expect(r.success).toBe(false);
  });

  it('rejects stat out of 1-100 range', () => {
    const r = PetSchema.safeParse({ ...validPet, stats: { ...validPet.stats, HP: 150 } });
    expect(r.success).toBe(false);
  });

  it('rejects skills with wrong length', () => {
    const r = PetSchema.safeParse({ ...validPet, skills: validPet.skills.slice(0, 3) });
    expect(r.success).toBe(false);
  });

  it('rejects faction_affinity out of 0-100 range', () => {
    const r = PetSchema.safeParse({
      ...validPet,
      faction_affinity: { chat: -1, cowork: 50, code: 50 },
    });
    expect(r.success).toBe(false);
  });
});
