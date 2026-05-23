import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handlePostPet, handleGetPet, handleRandomPet } from '@/worker/routes/pets';
import tessera from '@/fixtures/tessera.json';

// ─── RateLimit mock ────────────────────────────────────────────────
// 默认 success=true（放行），传 false 模拟超额
function makeRateLimit(success = true) {
  return {
    limit: vi.fn().mockResolvedValue({ success }),
  };
}

// 默认 env 工厂：DB + 两个放行的限速器（被测函数实际用得到的最小集）
function makeEnv(db: ReturnType<typeof makeDb>, opts: { postOk?: boolean; getOk?: boolean } = {}) {
  return {
    DB: db as any,
    ASSETS: {} as any,
    PETS_POST_LIMITER: makeRateLimit(opts.postOk ?? true) as any,
    PETS_GET_LIMITER: makeRateLimit(opts.getOk ?? true) as any,
  };
}

// ─── D1 mock ───────────────────────────────────────────────────────
// 极简模拟：把 prepare().bind().run() 链路捕获到 spy，first() 返回预设值
function makeDb(opts: { firstReturn?: unknown; runReturn?: unknown } = {}) {
  const runSpy = vi.fn().mockResolvedValue(opts.runReturn ?? { success: true });
  const firstSpy = vi.fn().mockResolvedValue(opts.firstReturn ?? null);
  const lastBind: unknown[][] = [];
  const lastQuery: string[] = [];

  const stmt: { run: typeof runSpy; first: typeof firstSpy; bind: (...args: unknown[]) => typeof stmt } = {
    run: runSpy,
    first: firstSpy,
    bind: (...args: unknown[]) => {
      lastBind.push(args);
      return stmt;
    },
  };

  return {
    prepare: vi.fn((q: string) => {
      lastQuery.push(q);
      return stmt;
    }),
    runSpy,
    firstSpy,
    lastBind,
    lastQuery,
  };
}

const baseHeaders = { origin: 'https://llm-pet-arena.vercel.app', 'content-type': 'application/json' };

function reqJson(method: string, url: string, body?: unknown): Request {
  const init: RequestInit = { method, headers: baseHeaders };
  if (body !== undefined) {
    const text = JSON.stringify(body);
    init.body = text;
    (init.headers as Record<string, string>)['content-length'] = String(text.length);
  }
  return new Request(url, init);
}

// ─── POST /api/pets ────────────────────────────────────────────────

describe('POST /api/pets', () => {
  let db: ReturnType<typeof makeDb>;
  let env: ReturnType<typeof makeEnv>;

  beforeEach(() => {
    db = makeDb();
    env = makeEnv(db);
  });

  it('accepts a valid pet and returns 201 with pet_id', async () => {
    const res = await handlePostPet(reqJson('POST', 'https://w/api/pets', tessera), env as any);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.pet_id).toBe((tessera as any).pet_id);
    expect(db.runSpy).toHaveBeenCalledOnce();
  });

  it('strips generation_evidence before insert', async () => {
    const withEvidence = { ...tessera, generation_evidence: ['LEAK_TEST_PAYLOAD'] };
    await handlePostPet(reqJson('POST', 'https://w/api/pets', withEvidence), env as any);
    const insertedData = db.lastBind[0][4] as string;
    expect(insertedData).not.toContain('LEAK_TEST_PAYLOAD');
    expect(insertedData).not.toContain('generation_evidence');
  });

  it('rejects forbidden origin with 403', async () => {
    const req = new Request('https://w/api/pets', {
      method: 'POST',
      headers: { origin: 'https://evil.example', 'content-type': 'application/json', 'content-length': '4' },
      body: '{}',
    });
    const res = await handlePostPet(req, env as any);
    expect(res.status).toBe(403);
    expect(db.runSpy).not.toHaveBeenCalled();
  });

  it('accepts request with NO Origin header (same-origin from CF Workers domain)', async () => {
    // 浏览器同源 GET 不发 Origin —— 此前 worker 错误地 403，是这次 hotfix 的根因
    const text = JSON.stringify(tessera);
    const req = new Request('https://w/api/pets', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': String(text.length) },
      body: text,
    });
    const res = await handlePostPet(req, env as any);
    expect(res.status).toBe(201);
  });

  it('rejects invalid json with 400', async () => {
    const req = new Request('https://w/api/pets', {
      method: 'POST',
      headers: { ...baseHeaders, 'content-length': '8' },
      body: '{ broken',
    });
    const res = await handlePostPet(req, env as any);
    expect(res.status).toBe(400);
  });

  it('rejects schema-invalid pet with 400', async () => {
    const res = await handlePostPet(reqJson('POST', 'https://w/api/pets', { name: 'x' }), env as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('schema invalid');
  });

  it('rejects oversized body with 413', async () => {
    const huge = 'x'.repeat(20 * 1024);
    const req = new Request('https://w/api/pets', {
      method: 'POST',
      headers: { ...baseHeaders, 'content-length': String(huge.length) },
      body: huge,
    });
    const res = await handlePostPet(req, env as any);
    expect(res.status).toBe(413);
  });

  it('uses INSERT OR REPLACE so re-paste does not duplicate', async () => {
    await handlePostPet(reqJson('POST', 'https://w/api/pets', tessera), env as any);
    expect(db.lastQuery[0]).toMatch(/INSERT OR REPLACE INTO pets/);
  });

  it('returns 429 when POST rate limiter rejects', async () => {
    const limitedEnv = makeEnv(db, { postOk: false });
    const res = await handlePostPet(reqJson('POST', 'https://w/api/pets', tessera), limitedEnv as any);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('60');
    const body = await res.json();
    expect(body.error).toBe('rate limit exceeded');
    // 限速命中后绝不应进 DB
    expect(db.runSpy).not.toHaveBeenCalled();
  });

  it('passes client IP as rate-limit key (cf-connecting-ip)', async () => {
    const req = new Request('https://w/api/pets', {
      method: 'POST',
      headers: {
        ...baseHeaders,
        'cf-connecting-ip': '203.0.113.42',
        'content-length': String(JSON.stringify(tessera).length),
      },
      body: JSON.stringify(tessera),
    });
    await handlePostPet(req, env as any);
    expect(env.PETS_POST_LIMITER.limit).toHaveBeenCalledWith({ key: '203.0.113.42' });
  });
});

// ─── GET /api/pets/:id ─────────────────────────────────────────────

describe('GET /api/pets/:id', () => {
  it('returns pet JSON for existing id', async () => {
    const db = makeDb({ firstReturn: { data: JSON.stringify({ pet_id: 'x', name: 'X' }) } });
    const env = makeEnv(db);
    const req = new Request('https://w/api/pets/x', { headers: { origin: 'https://llm-pet-arena.vercel.app' } });
    const res = await handleGetPet(req, env as any, 'x');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pet_id).toBe('x');
  });

  it('returns 404 for missing id', async () => {
    const db = makeDb({ firstReturn: null });
    const env = makeEnv(db);
    const req = new Request('https://w/api/pets/nope', { headers: { origin: 'http://localhost:3000' } });
    const res = await handleGetPet(req, env as any, 'nope');
    expect(res.status).toBe(404);
  });

  it('forbids non-allowlisted origin', async () => {
    const db = makeDb();
    const env = makeEnv(db);
    const req = new Request('https://w/api/pets/x', { headers: { origin: 'https://evil.example' } });
    const res = await handleGetPet(req, env as any, 'x');
    expect(res.status).toBe(403);
  });

  it('returns 429 when GET rate limiter rejects', async () => {
    const db = makeDb({ firstReturn: { data: '{}' } });
    const env = makeEnv(db, { getOk: false });
    const req = new Request('https://w/api/pets/x', { headers: { origin: 'http://localhost:3000' } });
    const res = await handleGetPet(req, env as any, 'x');
    expect(res.status).toBe(429);
    // 命中后不应再触达 DB
    expect(db.prepare).not.toHaveBeenCalled();
  });
});

// ─── GET /api/pets/random ──────────────────────────────────────────

describe('GET /api/pets/random', () => {
  it('returns a random pet', async () => {
    const db = makeDb({ firstReturn: { data: JSON.stringify({ pet_id: 'opp', name: 'Opponent' }) } });
    const env = makeEnv(db);
    const req = new Request('https://w/api/pets/random', { headers: { origin: 'http://localhost:3000' } });
    const res = await handleRandomPet(req, env as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pet_id).toBe('opp');
  });

  it('passes exclude param into query bind', async () => {
    const db = makeDb({ firstReturn: { data: '{}' } });
    const env = makeEnv(db);
    const req = new Request('https://w/api/pets/random?exclude=tessera', {
      headers: { origin: 'http://localhost:3000' },
    });
    await handleRandomPet(req, env as any);
    expect(db.lastBind[0]).toEqual(['tessera']);
    expect(db.lastQuery[0]).toMatch(/pet_id != \?/);
  });

  it('returns 404 when pool is empty', async () => {
    const db = makeDb({ firstReturn: null });
    const env = makeEnv(db);
    const req = new Request('https://w/api/pets/random', { headers: { origin: 'http://localhost:3000' } });
    const res = await handleRandomPet(req, env as any);
    expect(res.status).toBe(404);
  });

  it('returns 429 when GET rate limiter rejects (random endpoint shares GET bucket)', async () => {
    const db = makeDb({ firstReturn: { data: '{}' } });
    const env = makeEnv(db, { getOk: false });
    const req = new Request('https://w/api/pets/random', { headers: { origin: 'http://localhost:3000' } });
    const res = await handleRandomPet(req, env as any);
    expect(res.status).toBe(429);
    expect(db.prepare).not.toHaveBeenCalled();
  });
});
