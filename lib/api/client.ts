/**
 * API base URL —— dev hit local wrangler，prod hit CF Workers domain
 *
 * Next.js 在 build time 内联 process.env.NODE_ENV，所以这是 zero-config 的：
 * - npm run dev → 'http://localhost:8787'
 * - vercel/cf build → 'https://llm-pet-arena.crimsonefr.workers.dev'
 *
 * 即使 Vercel 静态资产走 vercel.app 域，API 调用全跨域到 CF Workers——
 * CORS 白名单已在 worker/lib/cors.ts 配好。
 */
export const API_BASE =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:8787'
    : 'https://llm-pet-arena.crimsonefr.workers.dev';

export interface ApiError {
  status: number;
  error: string;
  issues?: unknown[];
}

/**
 * 通用 fetch wrapper —— 自动拼 BASE、parse JSON、统一错误形态
 *
 * 成功：返回 parsed body T
 * 失败：throw 一个 { status, error } 风格的 Error
 */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // 非 JSON 响应（如 403 plain text）→ body 留 null
  }

  if (!res.ok) {
    const err: ApiError = {
      status: res.status,
      error: (body as { error?: string } | null)?.error ?? `http ${res.status}`,
      issues: (body as { issues?: unknown[] } | null)?.issues,
    };
    throw err;
  }

  return body as T;
}
