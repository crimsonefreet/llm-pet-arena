'use client';

import { ArcadeCard } from '@/components/v-arcade/ArcadeCard';
import { ArcadeBackground } from '@/components/v-arcade/ArcadeBackground';
import type { Pet } from '@/lib/pet/schema';

// Tessera fixture — hardcoded for aesthetic showcase
const TESSERA: Pet = {
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
    { name: 'Look-Ahead Banishment', element: '金', power: 92, type: 'ult',  description: '穿透时间污染，强制暴露未来信息泄漏。' },
    { name: 'Granular Reweaving',    element: '金', power: 85, type: 'main', description: '重织信息颗粒度，分层重建。' },
    { name: 'Lemma Lock',             element: '暗', power: 72, type: 'std',  description: '锁定前提假设，封禁递归质疑。' },
    { name: '尺度纠偏',               element: '金', power: 68, type: 'std',  description: '校准估算尺度，剥离单位偏差。' },
  ],
  lore: '于报告与代码之间游走',
  generation_evidence: [],
  source_llm: 'claude',
  generated_at: '2026-05-09T00:37:00Z',
};

// ── Page ───────────────────────────────────────────────────────
// 卡片独占舞台。--card-w CSS 变量驱动尺寸 + scale，
// 卡片实际宽度 = min(72vw, (100vh - 100px) * 0.8)，确保不溢出，
// scale = --card-w / 1080px 给出无量纲数（注意 1080 必须带 px）。
export default function ArcadePage() {
  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#f5e9c8',
      // CSS 变量，下面 scaleHost 引用
      // card 高度上限 = 100vh - 120px（header+footer+padding 余量），
      // 由于 1080:1350 = 4:5，宽度 = 高度 / 1.25 = 高度 × 0.8
      ['--card-w' as string]: 'min(84vw, calc((100vh - 120px) * 0.8))',
    }}>
      <ArcadeBackground />

      {/* ── Thin top strip ── */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        padding: '10px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(212,175,55,0.12)',
        fontSize: '10px',
        letterSpacing: '0.4em',
        textTransform: 'uppercase',
        color: 'rgba(212,175,55,0.55)',
        fontWeight: 700,
      }}>
        <span>
          <span style={{ color: '#ffd700' }}>✦</span>
          <span style={{ marginLeft: 10, color: '#ffe082', letterSpacing: '0.35em' }}>LLMPETARENA</span>
          <span style={{ margin: '0 12px', color: 'rgba(212,175,55,0.3)' }}>·</span>
          <span>arcade edition</span>
        </span>
        <span style={{ color: 'rgba(245,233,200,0.35)' }}>
          tcg frame · {TESSERA.rarity}
          <span style={{ margin: '0 10px', color: 'rgba(212,175,55,0.3)' }}>·</span>
          {TESSERA.elements.join(' / ')}
        </span>
      </header>

      {/* ── Card stage — dominant ── */}
      <main style={{
        position: 'relative',
        zIndex: 10,
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 16px',
      }}>
        {/* 外圈金色辉光 + 阴影底座 */}
        <div style={{
          position: 'relative',
          width: 'var(--card-w)',
          aspectRatio: '1080 / 1350',
        }}>
          {/* 辉光环 */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: '-28px',
              borderRadius: '36px',
              background: 'radial-gradient(ellipse at center, rgba(212,175,55,0.18) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* 卡片裁剪容器（容器尺寸 = card-w x 1.25*card-w） */}
          <div style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            borderRadius: '24px',
            boxShadow: '0 30px 90px rgba(0,0,0,0.85), 0 0 40px rgba(212,175,55,0.18)',
          }}>
            {/* 等比缩放：card 原始 1080px，scale = card-w / 1080px（必须带 px，否则 calc 类型不匹配） */}
            <div style={{
              width: '1080px',
              height: '1350px',
              transformOrigin: 'top left',
              transform: 'scale(calc(var(--card-w) / 1080px))',
            }}>
              <ArcadeCard pet={TESSERA} />
            </div>
          </div>
        </div>
      </main>

      {/* ── Thin bottom strip ── */}
      <footer style={{
        position: 'relative',
        zIndex: 10,
        padding: '8px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid rgba(212,175,55,0.1)',
        fontSize: '9px',
        letterSpacing: '0.35em',
        textTransform: 'uppercase',
        color: 'rgba(212,175,55,0.4)',
        fontWeight: 700,
      }}>
        <span>{TESSERA.pet_id}</span>
        <span style={{ color: 'rgba(245,233,200,0.2)' }}>
          arcade · tcg · design exploration · 2026
        </span>
      </footer>
    </div>
  );
}
