import { describe, it, expect, vi } from 'vitest';
import { clientIp, checkRateLimit } from '@/worker/lib/ratelimit';

function rl(success: boolean) {
  return { limit: vi.fn().mockResolvedValue({ success }) } as any;
}

describe('ratelimit · clientIp', () => {
  it('prefers cf-connecting-ip over xff', () => {
    const req = new Request('https://w/a', {
      headers: { 'cf-connecting-ip': '203.0.113.1', 'x-forwarded-for': '198.51.100.9, 10.0.0.1' },
    });
    expect(clientIp(req)).toBe('203.0.113.1');
  });

  it('falls back to first hop of x-forwarded-for', () => {
    const req = new Request('https://w/a', {
      headers: { 'x-forwarded-for': '198.51.100.9, 10.0.0.1' },
    });
    expect(clientIp(req)).toBe('198.51.100.9');
  });

  it('falls back to "unknown" when no IP header', () => {
    const req = new Request('https://w/a');
    expect(clientIp(req)).toBe('unknown');
  });
});

describe('ratelimit · checkRateLimit', () => {
  it('returns allowed when limiter succeeds', async () => {
    const req = new Request('https://w/a', { headers: { 'cf-connecting-ip': '1.2.3.4' } });
    const result = await checkRateLimit(req, rl(true), {});
    expect(result.allowed).toBe(true);
    expect(result.rejection).toBeUndefined();
  });

  it('returns rejection Response with 429 + Retry-After when limiter denies', async () => {
    const req = new Request('https://w/a', { headers: { 'cf-connecting-ip': '1.2.3.4' } });
    const corsHeaders = { 'Access-Control-Allow-Origin': 'https://app.example' };
    const result = await checkRateLimit(req, rl(false), corsHeaders);
    expect(result.allowed).toBe(false);
    expect(result.rejection?.status).toBe(429);
    expect(result.rejection?.headers.get('Retry-After')).toBe('60');
    // CORS 头必须随 429 一起回，否则浏览器读不到
    expect(result.rejection?.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example');
  });

  it('passes resolved IP as the limit key', async () => {
    const limiter = rl(true);
    const req = new Request('https://w/a', { headers: { 'cf-connecting-ip': '203.0.113.42' } });
    await checkRateLimit(req, limiter, {});
    expect(limiter.limit).toHaveBeenCalledWith({ key: '203.0.113.42' });
  });
});
