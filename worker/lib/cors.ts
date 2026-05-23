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
 * 判断 origin 是否允许访问 API
 * - null (browser 同源 simple request 不送 Origin) → 允许（same-origin）
 * - 白名单 → 允许（cross-origin allowed）
 * - 其它 → 拒绝
 */
export function originAllowed(origin: string | null): boolean {
  if (!origin) return true; // same-origin
  return ALLOWED.has(origin);
}

/**
 * 返回某 origin 对应的 CORS headers（仅 cross-origin 需要）
 * - null → {} （same-origin 不需要 CORS headers）
 * - 白名单 → 完整 CORS headers
 * - 非白名单 → {} （理论上 originAllowed 应已拦截）
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
 * OPTIONS 一定带 Origin（browser CORS spec）。null Origin 视为异常 → 403。
 * - 白名单 → 204 + CORS headers
 * - 非白名单 / 无 Origin → 403 plain
 */
export function handlePreflight(req: Request): Response {
  const origin = req.headers.get('origin');
  if (!origin) {
    return new Response('forbidden origin', { status: 403 });
  }
  const headers = corsFor(origin);
  if (Object.keys(headers).length === 0) {
    return new Response('forbidden origin', { status: 403 });
  }
  return new Response(null, { status: 204, headers });
}

// Test-only export，方便测试覆盖白名单逻辑
export const __ALLOWED_ORIGINS = ALLOWED;
