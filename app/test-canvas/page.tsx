'use client';

/**
 * Canvas Renderer 测试页 — M1 阶段 only-frame 验证
 *
 * 目的：把 renderPetCardToCanvas 在浏览器里直接画出来，
 *      贴到 <canvas> + 提供下载按钮，方便像素级 audit。
 *
 * 路径：http://localhost:3000/test-canvas
 *
 * 该页面 **不出现在产品 UI**，仅供开发期 milestone 验证使用。
 */

import { useEffect, useRef, useState } from 'react';
import { renderPetCardToCanvas, exportPetCardAsPng } from '@/lib/export/canvas-renderer';
import { ArcadeCard } from '@/components/v-arcade/ArcadeCard';
import type { Pet } from '@/lib/pet/schema';
import { PetSchema } from '@/lib/pet/schema';

// 内联 fixture，避免 server-side import 麻烦
const TESSERA: Pet = PetSchema.parse({
  pet_id: 'bryan_finmage_009',
  name: 'Tessera',
  title: '尽调炼狱的执灯人',
  rarity: 'SSR',
  main_class: '金融术士',
  sub_class: '内容召唤师',
  elements: ['金', '暗'],
  faction_affinity: { chat: 62, cowork: 92, code: 71 },
  stats: { HP: 88, ATK: 82, DEF: 94, SPD: 70, INT: 96, LUK: 67 },
  skills: [
    { name: 'Look-Ahead Banishment', element: '金', power: 92, type: 'ult',
      description: '穿透时间污染，强制暴露未来信息泄漏。' },
    { name: 'Granular Reweaving', element: '金', power: 85, type: 'main',
      description: '重织信息颗粒度，分层重建。' },
    { name: 'Lemma Lock', element: '暗', power: 72, type: 'std',
      description: '锁定前提假设，封禁递归质疑。' },
    { name: '尺度纠偏', element: '金', power: 68, type: 'std',
      description: '校准估算尺度，剥离单位偏差。' },
  ],
  lore: '于报告与代码之间游走',
  generation_evidence: [],
  source_llm: 'claude',
  generated_at: '2026-05-09T00:37:00Z',
});

export default function TestCanvasPage() {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [info, setInfo] = useState<string>('initializing...');

  useEffect(() => {
    let cancelled = false;
    // 等 100ms 让 React 把 ArcadeCard 预览先 mount 完，再读 PetCreature SVG
    const timer = setTimeout(async () => {
      try {
        // PetCreature SVG 唯一签名：viewBox="0 0 400 340"
        const svg = previewRef.current?.querySelector('svg[viewBox="0 0 400 340"]') as SVGElement | null;
        console.log('[test-canvas] starting renderPetCardToCanvas, svg=', svg);
        const canvas = await renderPetCardToCanvas(TESSERA, {
          petCreatureSvg: svg,
        });
        console.log('[test-canvas] render complete');
        if (cancelled) return;
        // 用 CSS 把物理 2160×2700 缩到 432×540（5:1）方便页面对比
        canvas.style.width = '432px';
        canvas.style.height = '540px';
        canvas.style.display = 'block';
        canvas.style.borderRadius = '13px';
        canvas.style.boxShadow = '0 0 40px rgba(212,175,55,0.3)';
        if (canvasHostRef.current) {
          canvasHostRef.current.innerHTML = '';
          canvasHostRef.current.appendChild(canvas);
        }
        setInfo(`canvas ${canvas.width}×${canvas.height} · pet creature svg: ${svg ? 'found' : 'MISSING'}`);
      } catch (e) {
        console.error('[test-canvas] render failed:', e);
        setInfo(`ERROR: ${(e as Error).message}`);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const handleDownload = () => {
    const svg = previewRef.current?.querySelector('svg[viewBox="0 0 400 340"]') as SVGElement | null;
    void exportPetCardAsPng(TESSERA, 'canvas-tessera.png', { petCreatureSvg: svg });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0510',
      color: '#f5e9c8',
      fontFamily: 'monospace',
      padding: '24px',
    }}>
      <h1 style={{ fontSize: 18, letterSpacing: '0.2em', color: '#ffd700' }}>
        CANVAS RENDERER · MILESTONE TEST
      </h1>
      <p style={{ fontSize: 12, color: 'rgba(212,175,55,0.6)', marginTop: 4 }}>
        {info}
      </p>

      <button
        onClick={handleDownload}
        style={{
          marginTop: 16,
          padding: '8px 20px',
          background: '#1a0a06',
          color: '#ffd700',
          border: '1px solid #d4af37',
          borderRadius: 4,
          letterSpacing: '0.2em',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        ↓ DOWNLOAD PNG
      </button>

      <div style={{
        marginTop: 24,
        display: 'flex',
        gap: 24,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(212,175,55,0.5)', marginBottom: 6 }}>
            CANVAS RENDERER OUTPUT (M1 frame-only)
          </div>
          <div ref={canvasHostRef} />
        </div>

        <div>
          <div style={{ fontSize: 11, color: 'rgba(212,175,55,0.5)', marginBottom: 6 }}>
            CURRENT REACT/CSS REFERENCE (full content)
          </div>
          <div style={{
            width: 432,
            height: 540,
            overflow: 'hidden',
            borderRadius: 13,
            boxShadow: '0 0 40px rgba(212,175,55,0.3)',
          }}>
            <div
              ref={previewRef}
              style={{
                width: 1080,
                height: 1350,
                transformOrigin: 'top left',
                transform: 'scale(0.4)',
              }}
            >
              <ArcadeCard pet={TESSERA} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
