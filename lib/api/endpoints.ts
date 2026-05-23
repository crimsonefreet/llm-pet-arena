import type { Pet } from '@/lib/pet/schema';
import { stripEvidence } from '@/lib/pet/strip-evidence';
import { apiFetch } from './client';

/**
 * 上传宠物到公共池（剥 evidence 后）
 *
 * 客户端先剥一次 evidence（第一道防御），服务端再剥一次（深度防御）。
 * 上传是 fire-and-forget——成功返回 pet_id，UI 不阻塞。
 */
export async function uploadPet(pet: Pet): Promise<{ pet_id: string }> {
  const safe = stripEvidence(pet as unknown as Record<string, unknown>);
  return apiFetch<{ pet_id: string }>('/api/pets', {
    method: 'POST',
    body: JSON.stringify(safe),
  });
}

/**
 * 获取特定宠物（invite URL unfurl）
 */
export async function fetchPet(petId: string): Promise<Pet> {
  return apiFetch<Pet>(`/api/pets/${encodeURIComponent(petId)}`);
}

/**
 * 随机抽对手（可排除自己）
 *
 * 404 表示池子为空——battle 页应做 fallback（用 fixture 演 demo）
 */
export async function fetchRandomPet(excludePetId?: string): Promise<Pet> {
  const q = excludePetId ? `?exclude=${encodeURIComponent(excludePetId)}` : '';
  return apiFetch<Pet>(`/api/pets/random${q}`);
}
