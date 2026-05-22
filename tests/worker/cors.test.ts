import { describe, it, expect } from 'vitest';
import { corsFor, handlePreflight, __ALLOWED_ORIGINS } from '@/worker/lib/cors';

describe('cors · corsFor', () => {
  it('returns headers for allowed origin', () => {
    const h = corsFor('https://llm-pet-arena.vercel.app');
    expect(h['Access-Control-Allow-Origin']).toBe('https://llm-pet-arena.vercel.app');
    expect(h['Access-Control-Allow-Methods']).toContain('POST');
    expect(h.Vary).toBe('Origin');
  });

  it('echoes localhost origin in dev', () => {
    const h = corsFor('http://localhost:3000');
    expect(h['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
  });

  it('returns empty object for forbidden origin', () => {
    const h = corsFor('https://evil.example');
    expect(h).toEqual({});
  });

  it('returns empty object when origin is null (same-origin)', () => {
    const h = corsFor(null);
    expect(h).toEqual({});
  });

  it('whitelist contains all expected canonical origins', () => {
    // 防文档漂移：白名单变化必须刷新测试
    expect(__ALLOWED_ORIGINS.has('https://llm-pet-arena.vercel.app')).toBe(true);
    expect(__ALLOWED_ORIGINS.has('https://llm-pet-arena.crimsonefr.workers.dev')).toBe(true);
    expect(__ALLOWED_ORIGINS.has('http://localhost:3000')).toBe(true);
  });
});

describe('cors · handlePreflight', () => {
  it('returns 204 with CORS headers for allowed origin', async () => {
    const req = new Request('https://api.example/api/pets', {
      method: 'OPTIONS',
      headers: { origin: 'https://llm-pet-arena.vercel.app' },
    });
    const res = handlePreflight(req);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://llm-pet-arena.vercel.app');
  });

  it('returns 403 for forbidden origin', async () => {
    const req = new Request('https://api.example/api/pets', {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example' },
    });
    const res = handlePreflight(req);
    expect(res.status).toBe(403);
  });
});
