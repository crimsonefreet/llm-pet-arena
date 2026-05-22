import type { D1Database, Fetcher } from '@cloudflare/workers-types';

// CF Workers env bindings —— 对齐 wrangler.toml
export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}
