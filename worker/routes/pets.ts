import type { Env } from '../types';
import { corsFor, originAllowed } from '../lib/cors';
import { stripEvidence } from '@/lib/pet/strip-evidence';
import { PetSchema } from '@/lib/pet/schema';

const MAX_BODY_BYTES = 16 * 1024; // 16 KB hard cap

function json(status: number, body: unknown, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

/**
 * POST /api/pets —— 上传 pet 入公共池
 * - 16KB body size cap
 * - zod 校验
 * - evidence 服务端剥离
 * - INSERT OR REPLACE（pet_id 是 PK，re-paste 覆盖）
 */
export async function handlePostPet(req: Request, env: Env): Promise<Response> {
  const origin = req.headers.get('origin');
  if (!originAllowed(origin)) {
    return new Response('forbidden origin', { status: 403 });
  }
  const corsHeaders = corsFor(origin);

  // body size guard
  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    return json(413, { error: 'body too large' }, corsHeaders);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'invalid json' }, corsHeaders);
  }

  // zod 重校验（前端可能绕过）
  const parsed = PetSchema.safeParse(body);
  if (!parsed.success) {
    return json(400, { error: 'schema invalid', issues: parsed.error.issues.slice(0, 5) }, corsHeaders);
  }

  // evidence 服务端剥离
  const safe = stripEvidence(parsed.data as unknown as Record<string, unknown>);

  // INSERT OR REPLACE
  await env.DB.prepare(
    `INSERT OR REPLACE INTO pets (pet_id, name, rarity, source_llm, data, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(
      parsed.data.pet_id,
      parsed.data.name,
      parsed.data.rarity,
      parsed.data.source_llm,
      JSON.stringify(safe),
      Date.now()
    )
    .run();

  return json(201, { pet_id: parsed.data.pet_id }, corsHeaders);
}

/**
 * GET /api/pets/:id —— 获取单个 pet（invite URL unfurl）
 */
export async function handleGetPet(req: Request, env: Env, petId: string): Promise<Response> {
  const origin = req.headers.get('origin');
  if (!originAllowed(origin)) {
    return new Response('forbidden origin', { status: 403 });
  }
  const corsHeaders = corsFor(origin);

  const row = await env.DB.prepare(`SELECT data FROM pets WHERE pet_id = ?`).bind(petId).first<{ data: string }>();

  if (!row) {
    return json(404, { error: 'pet not found' }, corsHeaders);
  }

  // data 字段已经是 JSON 字符串，直接返回 parsed
  try {
    const pet = JSON.parse(row.data);
    return json(200, pet, corsHeaders);
  } catch {
    return json(500, { error: 'stored data corrupt' }, corsHeaders);
  }
}

/**
 * GET /api/pets/random?exclude=<pet_id> —— 随机抽对手
 * 简单实现：ORDER BY RANDOM() LIMIT 1（D1 数据量 <100k 时性能可接受）
 */
export async function handleRandomPet(req: Request, env: Env): Promise<Response> {
  const origin = req.headers.get('origin');
  if (!originAllowed(origin)) {
    return new Response('forbidden origin', { status: 403 });
  }
  const corsHeaders = corsFor(origin);

  const url = new URL(req.url);
  const exclude = url.searchParams.get('exclude') ?? '';

  const query = exclude
    ? `SELECT data FROM pets WHERE pet_id != ? ORDER BY RANDOM() LIMIT 1`
    : `SELECT data FROM pets ORDER BY RANDOM() LIMIT 1`;

  const stmt = exclude ? env.DB.prepare(query).bind(exclude) : env.DB.prepare(query);
  const row = await stmt.first<{ data: string }>();

  if (!row) {
    return json(404, { error: 'pool empty' }, corsHeaders);
  }

  try {
    const pet = JSON.parse(row.data);
    return json(200, pet, corsHeaders);
  } catch {
    return json(500, { error: 'stored data corrupt' }, corsHeaders);
  }
}
