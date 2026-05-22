/**
 * localStorage helpers —— 用户状态全本地，不入服务器
 *
 * Keys:
 *   petarena.consent.v1    '1' if user clicked through consent modal
 *   petarena.myPetId       current user's pet_id (drives "my pet" in battle)
 *   petarena.streak        current streak count (resets on loss)
 *
 * 全部 SSR-safe：typeof window 检查避免 Next build 阶段崩溃。
 */

const K_CONSENT = 'petarena.consent.v1';
const K_MY_PET = 'petarena.myPetId';
const K_STREAK = 'petarena.streak';

function get(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function set(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage 满 / 隐私模式禁用 → silent fail
  }
}

function remove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// ─── Consent ──────────────────────────────────────────────────────

export function hasConsent(): boolean {
  return get(K_CONSENT) === '1';
}

export function grantConsent(): void {
  set(K_CONSENT, '1');
}

// ─── My pet ───────────────────────────────────────────────────────

export function getMyPetId(): string | null {
  return get(K_MY_PET);
}

export function setMyPetId(petId: string): void {
  set(K_MY_PET, petId);
}

// ─── Streak ───────────────────────────────────────────────────────

export function getStreak(): number {
  const raw = get(K_STREAK);
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function setStreak(n: number): void {
  set(K_STREAK, String(Math.max(0, Math.floor(n))));
}

export function bumpStreak(): number {
  const next = getStreak() + 1;
  setStreak(next);
  return next;
}

export function resetStreak(): void {
  remove(K_STREAK);
}
