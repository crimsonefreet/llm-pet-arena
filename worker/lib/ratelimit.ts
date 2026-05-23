import type { RateLimit } from '@cloudflare/workers-types';

/**
 * Rate limit gate —— 取 client IP 作 key，调 limiter.limit()。
 *
 * 返回值二选一：
 * - { allowed: true }  → 业务继续
 * - { allowed: false, rejection: Response } → 直接 return rejection
 *
 * IP 取值优先级：
 *   1. cf-connecting-ip（CF 自加，最权威）
 *   2. x-forwarded-for 第一段（dev / 反代场景）
 *   3. 'unknown' fallback（同 key 共享配额，宁严勿松）
 */
export interface RateLimitResult {
  allowed: boolean;
  rejection?: Response;
}

export function clientIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf;
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'unknown';
}

export async function checkRateLimit(
  req: Request,
  limiter: RateLimit,
  corsHeaders: Record<string, string>
): Promise<RateLimitResult> {
  const key = clientIp(req);
  const { success } = await limiter.limit({ key });

  if (success) return { allowed: true };

  return {
    allowed: false,
    rejection: new Response(
      JSON.stringify({ error: 'rate limit exceeded', retry_after_seconds: 60 }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
          ...corsHeaders,
        },
      }
    ),
  };
}
