import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

/**
 * 开发期 ONLY：接收 base64 PNG，写到 public/test-output/<name>.png。
 * 目的：让 Claude Code agent 能在浏览器 canvas 渲染后把结果保存到本地，方便 Read 工具像素级 audit。
 *
 * 安全：仅在 NODE_ENV !== 'production' 时启用。文件名做白名单校验（字母数字/-/_/. only）。
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'disabled in production' }, { status: 403 });
  }

  const body = await req.json();
  const { name, dataUrl } = body as { name?: string; dataUrl?: string };

  if (!name || !dataUrl) {
    return NextResponse.json({ error: 'missing name or dataUrl' }, { status: 400 });
  }
  if (!/^[a-zA-Z0-9_\-.]+$/.test(name)) {
    return NextResponse.json({ error: 'invalid filename' }, { status: 400 });
  }
  if (!dataUrl.startsWith('data:image/png;base64,')) {
    return NextResponse.json({ error: 'expected data:image/png;base64,...' }, { status: 400 });
  }

  const b64 = dataUrl.slice('data:image/png;base64,'.length);
  const buf = Buffer.from(b64, 'base64');

  const outDir = path.join(process.cwd(), 'public', 'test-output');
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, name);
  await writeFile(outPath, buf);

  return NextResponse.json({ ok: true, bytes: buf.length, path: outPath });
}
