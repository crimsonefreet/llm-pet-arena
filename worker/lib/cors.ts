// Origin 白名单 —— 拒绝陌生站点跨域调用
// 注意：next dev 可能在 3000 / 3001 等任意空端口启动，把常用 dev 端口都放进来
const ALLOWED = new Set<string>([
  'https://llm-pet-arena.vercel.app',
  'https://claude-pet-arena.vercel.app',
  'https://llm-pet-arena.crimsonefr.workers.dev',
  'https://petarena.xyz',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
]);

/**
 * 返回某 origin 是否允许，以及对应的 CORS headers
 * 不在白名单 → headers 为空 object（调用方据此返回 403）
 */
export function corsFor(origin: string | null): Record<string, string> {
  if (!origin) return {};
  if (!ALLOWED.has(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

/**
 * Preflight handler —— OPTIONS 请求专用
 * - 白名单 → 204 + CORS headers
 * - 非白名单 → 403 plain
 */
export function handlePreflight(req: Request): Response {
  const headers = corsFor(req.headers.get('origin'));
  if (Object.keys(headers).length === 0) {
    return new Response('forbidden origin', { status: 403 });
  }
  return new Response(null, { status: 204, headers });
}

// Test-only export，方便测试覆盖白名单逻辑
export const __ALLOWED_ORIGINS = ALLOWED;
