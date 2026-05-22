import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiFetch, API_BASE } from '@/lib/api/client';

describe('apiFetch', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
    vi.clearAllMocks();
  });

  it('hits API_BASE + path with JSON content-type', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );
    global.fetch = fetchMock as any;

    await apiFetch('/api/pets/x');

    const calledUrl = fetchMock.mock.calls[0][0];
    expect(calledUrl).toBe(`${API_BASE}/api/pets/x`);
    const calledInit = fetchMock.mock.calls[0][1];
    expect(calledInit.headers['Content-Type']).toBe('application/json');
  });

  it('returns parsed body on 200', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ name: 'X' }), { status: 200 })) as any;
    const r = await apiFetch<{ name: string }>('/api/x');
    expect(r.name).toBe('X');
  });

  it('throws ApiError with status + parsed body.error on non-2xx', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: 'schema invalid', issues: [1, 2] }), { status: 400 })
      ) as any;

    await expect(apiFetch('/api/pets', { method: 'POST', body: '{}' })).rejects.toMatchObject({
      status: 400,
      error: 'schema invalid',
      issues: [1, 2],
    });
  });

  it('throws ApiError with default error string when body is not JSON', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('forbidden origin', { status: 403 })) as any;

    await expect(apiFetch('/api/pets')).rejects.toMatchObject({
      status: 403,
      error: 'http 403',
    });
  });
});
