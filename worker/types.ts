import type { D1Database, Fetcher, RateLimit } from '@cloudflare/workers-types';

// CF Workers env bindings —— 对齐 wrangler.toml
export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  // Per-IP 限速器（period 60s）
  PETS_POST_LIMITER: RateLimit;  // 上传：10 / min
  PETS_GET_LIMITER: RateLimit;   // 读取：60 / min
}
