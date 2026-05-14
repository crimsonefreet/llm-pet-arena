import { PetSchema, type Pet } from './schema';

export type ParseResult =
  | { ok: true; pet: Pet }
  | { ok: false; kind: 'empty' }
  | { ok: false; kind: 'json_error'; message: string }
  | { ok: false; kind: 'schema_error'; message: string };

// 平衡括号扫描：从首个 { 开始，忽略字符串内的括号
function findFirstBalancedJsonObject(s: string): string | null {
  const start = s.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

// 多策略提取：原样 parse → 剥 fence → 平衡括号
function extractJsonCandidate(raw: string): string | null {
  try {
    JSON.parse(raw);
    return raw;
  } catch {}
  const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  try {
    JSON.parse(stripped);
    return stripped;
  } catch {}
  const balanced = findFirstBalancedJsonObject(stripped);
  if (balanced) {
    try {
      JSON.parse(balanced);
      return balanced;
    } catch {}
  }
  return null;
}

export function parsePetJson(raw: string): ParseResult {
  if (!raw.trim()) return { ok: false, kind: 'empty' };

  const candidate = extractJsonCandidate(raw);
  if (!candidate) {
    return {
      ok: false,
      kind: 'json_error',
      message: '没找到有效 JSON。请把 LLM 输出整段粘贴（含 ```json``` 围栏也 OK）。',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch (e) {
    return { ok: false, kind: 'json_error', message: (e as Error).message };
  }

  const result = PetSchema.safeParse(parsed);
  if (!result.success) {
    const message = result.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    return { ok: false, kind: 'schema_error', message };
  }
  return { ok: true, pet: result.data };
}
