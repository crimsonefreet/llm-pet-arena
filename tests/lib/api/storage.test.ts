import { describe, it, expect, beforeEach } from 'vitest';
import {
  hasConsent,
  grantConsent,
  getMyPetId,
  setMyPetId,
  getStreak,
  setStreak,
  bumpStreak,
  resetStreak,
} from '@/lib/api/storage';

describe('storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('consent default false, grantConsent flips to true', () => {
    expect(hasConsent()).toBe(false);
    grantConsent();
    expect(hasConsent()).toBe(true);
  });

  it('myPetId roundtrip', () => {
    expect(getMyPetId()).toBeNull();
    setMyPetId('tessera');
    expect(getMyPetId()).toBe('tessera');
  });

  it('streak default 0', () => {
    expect(getStreak()).toBe(0);
  });

  it('bumpStreak increments and returns new value', () => {
    expect(bumpStreak()).toBe(1);
    expect(bumpStreak()).toBe(2);
    expect(getStreak()).toBe(2);
  });

  it('resetStreak puts back to 0', () => {
    setStreak(5);
    resetStreak();
    expect(getStreak()).toBe(0);
  });

  it('rejects garbage streak value gracefully', () => {
    window.localStorage.setItem('petarena.streak', 'not-a-number');
    expect(getStreak()).toBe(0);
  });

  it('clamps streak to >= 0', () => {
    setStreak(-5);
    expect(getStreak()).toBe(0);
  });
});
