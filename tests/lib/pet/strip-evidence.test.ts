import { describe, it, expect } from 'vitest';
import { stripEvidence } from '@/lib/pet/strip-evidence';

describe('stripEvidence', () => {
  it('removes generation_evidence field', () => {
    const pet = {
      pet_id: 'x1',
      name: 'X',
      generation_evidence: ['secret-prompt', 'private-msg'],
    };
    const safe = stripEvidence(pet);
    expect('generation_evidence' in safe).toBe(false);
    expect(safe.pet_id).toBe('x1');
    expect(safe.name).toBe('X');
  });

  it('is no-op when field already absent', () => {
    const pet = { pet_id: 'x1', name: 'X' };
    const safe = stripEvidence(pet);
    expect(safe).toEqual(pet);
  });

  it('does not mutate input', () => {
    const pet = { pet_id: 'x1', generation_evidence: ['a'] };
    stripEvidence(pet);
    expect(pet.generation_evidence).toEqual(['a']);
  });

  it('survives JSON.stringify with no evidence substring', () => {
    const pet = {
      pet_id: 'leak-test',
      name: 'X',
      generation_evidence: ['SUPER_SECRET_STRING_42'],
    };
    const safe = stripEvidence(pet);
    const blob = JSON.stringify(safe);
    expect(blob).not.toContain('SUPER_SECRET_STRING_42');
    expect(blob).not.toContain('generation_evidence');
  });
});
