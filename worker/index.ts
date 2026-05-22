import type { Env } from './types';
import { handlePreflight } from './lib/cors';
import { handlePostPet, handleGetPet, handleRandomPet } from './routes/pets';

/**
 * Cloudflare Worker entry —— Static Assets + /api/* 单脚本
 *
 * wrangler.toml [assets] 的 run_worker_first=["/api/*"] 让 /api/* 优先进入 worker；
 * 其它路径会 fall-through 到 env.ASSETS（静态资产）。
 * 但保险起见：worker 内部也按 pathname 做兜底分流。
 */
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const { pathname } = url;

    // CORS preflight
    if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
      return handlePreflight(req);
    }

    // GET /api/pets/random?exclude=<id>
    if (pathname === '/api/pets/random' && req.method === 'GET') {
      return handleRandomPet(req, env);
    }

    // GET /api/pets/:id
    const petMatch = pathname.match(/^\/api\/pets\/([^/]+)$/);
    if (petMatch && req.method === 'GET') {
      return handleGetPet(req, env, decodeURIComponent(petMatch[1]));
    }

    // POST /api/pets
    if (pathname === '/api/pets' && req.method === 'POST') {
      return handlePostPet(req, env);
    }

    // /api/* 其它未定义 → 405
    if (pathname.startsWith('/api/')) {
      return new Response('method not allowed', { status: 405 });
    }

    // 静态资产兜底
    return env.ASSETS.fetch(req);
  },
};
