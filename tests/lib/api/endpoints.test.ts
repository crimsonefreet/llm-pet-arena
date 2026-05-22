import { describe, it, expect, vi, afterEach } from 'vitest';
import { uploadPet, fetchPet, fetchRandomPet } from '@/lib/api/endpoints';
import { API_BASE } from '@/lib/api/client';
import tessera from '@/fixtures/tessera.json';

describe('endpoints', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    vi.clearAllMocks();
  });

  describe('uploadPet', () => {
    it('strips generation_evidence before POST', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ pet_id: 'x' }), { status: 201 }));
      global.fetch = fetchMock as any;

      const withEvidence = { ...tessera, generation_evidence: ['CLIENT_LEAK_TOKEN'] };
      await uploadPet(withEvidence as any);

      const sentBody = fetchMock.mock.calls[0][1].body as string;
      expect(sentBody).not.toContain('CLIENT_LEAK_TOKEN');
      expect(sentBody).not.toContain('generation_evidence');
    });

    it('returns pet_id on success', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ pet_id: 'tessera' }), { status: 201 })) as any;
      const r = await uploadPet(tessera as any);
      expect(r.pet_id).toBe('tessera');
    });
  });

  describe('fetchPet', () => {
    it('URL-encodes pet id', async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
      global.fetch = fetchMock as any;
      await fetchPet('weird id with spaces');
      expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE}/api/pets/weird%20id%20with%20spaces`);
    });
  });

  describe('fetchRandomPet', () => {
    it('passes exclude param', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ pet_id: 'opp' }), { status: 200 }));
      global.fetch = fetchMock as any;
      await fetchRandomPet('tessera');
      expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE}/api/pets/random?exclude=tessera`);
    });

    it('omits exclude when not given', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ pet_id: 'opp' }), { status: 200 }));
      global.fetch = fetchMock as any;
      await fetchRandomPet();
      expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE}/api/pets/random`);
    });
  });
});
