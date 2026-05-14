import { describe, it, expect } from 'vitest';
import { parsePetJson } from '@/lib/pet/parse';
import fixture from '@/fixtures/tessera.json';

const validJson = JSON.stringify(fixture);

describe('parsePetJson', () => {
  // 1. 纯 JSON
  it('accepts pure JSON', () => {
    const r = parsePetJson(validJson);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.pet.name).toBe('Tessera');
  });

  // 2. ```json markdown fence
  it('strips ```json markdown fence', () => {
    const r = parsePetJson('```json\n' + validJson + '\n```');
    expect(r.ok).toBe(true);
  });

  // 3. 无 language 的 fence
  it('strips bare ``` fence', () => {
    const r = parsePetJson('```\n' + validJson + '\n```');
    expect(r.ok).toBe(true);
  });

  // 4. 前置 prose
  it('extracts JSON from prose preamble', () => {
    const r = parsePetJson("Here's your pet, hope you like it:\n\n" + validJson);
    expect(r.ok).toBe(true);
  });

  // 5. 前后 prose 双向包裹
  it('extracts JSON sandwiched in prose', () => {
    const r = parsePetJson('Generated:\n```json\n' + validJson + '\n```\nLet me know!');
    expect(r.ok).toBe(true);
  });

  // 6. 平衡括号：字符串内含 {
  it('handles braces inside string values', () => {
    const pet = { ...fixture, name: 'A{B' };
    const r = parsePetJson('preamble ' + JSON.stringify(pet) + ' postamble');
    expect(r.ok).toBe(true);
  });

  // 7. 截断 JSON
  it('returns json_error for truncated JSON', () => {
    const truncated = validJson.slice(0, validJson.length - 30);
    const r = parsePetJson(truncated);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe('json_error');
  });

  // 8. 纯 prose 无 JSON
  it('returns json_error for plain prose', () => {
    const r = parsePetJson('hello world, no json here');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe('json_error');
  });

  // 9. 空白：返回 empty
  it('returns empty for whitespace-only input', () => {
    const r = parsePetJson('   \n\t  ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe('empty');
  });

  // 10. schema 不合
  it('returns schema_error for valid JSON failing schema', () => {
    const r = parsePetJson('{"name":"x"}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.kind).toBe('schema_error');
  });
});
