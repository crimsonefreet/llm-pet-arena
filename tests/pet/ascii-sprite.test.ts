import { describe, it, expect } from 'vitest';
import { generateAsciiSprite } from '@/lib/pet/ascii-sprite';

describe('generateAsciiSprite', () => {
  it('is deterministic for same pet_id', () => {
    const a = generateAsciiSprite('bryan_finmage_009');
    const b = generateAsciiSprite('bryan_finmage_009');
    expect(a).toBe(b);
  });

  it('returns different sprites across pet_ids', () => {
    const a = generateAsciiSprite('pet_alpha_001');
    const b = generateAsciiSprite('pet_omega_999');
    // 不要求一定不同（哈希碰撞理论存在），但样本里这两个 id 应当不同
    expect(a).not.toBe(b);
  });

  it('returns multi-line string', () => {
    const s = generateAsciiSprite('demo');
    expect(s.split('\n').length).toBeGreaterThanOrEqual(5);
  });
});
