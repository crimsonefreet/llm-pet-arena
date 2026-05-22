'use client';

// 倒扣的金色 TCG 卡背 — 1080×1350 原生尺寸（与 ArcadeCard 同尺寸）
// 用于 pet === null 时占位，配合 scale wrapper 确保 layout box 不抖
export function PetCardBack() {
  return (
    <div
      style={{
        position: 'relative',
        width: '1080px',
        height: '1350px',
        background:
          'linear-gradient(135deg, #1a0f24 0%, #0a0a18 50%, #1f0a14 100%)',
        border: '8px solid #d4af37',
        boxShadow:
          'inset 0 0 0 2px #ffd700, inset 0 0 80px rgba(212,175,55,0.15)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '48px',
        color: '#ffd700',
        fontFamily: 'Inter, system-ui, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* 内圈金色装饰边框 */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: '32px',
          border: '1px solid rgba(212,175,55,0.4)',
          pointerEvents: 'none',
        }}
      />

      {/* 四角金色角饰 */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: '48px',
          left: '48px',
          width: '64px',
          height: '64px',
          borderTop: '3px solid #ffd700',
          borderLeft: '3px solid #ffd700',
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: '48px',
          right: '48px',
          width: '64px',
          height: '64px',
          borderTop: '3px solid #ffd700',
          borderRight: '3px solid #ffd700',
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          bottom: '48px',
          left: '48px',
          width: '64px',
          height: '64px',
          borderBottom: '3px solid #ffd700',
          borderLeft: '3px solid #ffd700',
        }}
      />
      <span
        aria-hidden
        style={{
          position: 'absolute',
          bottom: '48px',
          right: '48px',
          width: '64px',
          height: '64px',
          borderBottom: '3px solid #ffd700',
          borderRight: '3px solid #ffd700',
        }}
      />

      {/* 中心菱形 + ✦ glyph */}
      <div
        style={{
          position: 'relative',
          width: '320px',
          height: '320px',
          transform: 'rotate(45deg)',
          border: '3px solid #ffd700',
          background:
            'radial-gradient(ellipse at center, rgba(212,175,55,0.18) 0%, transparent 70%)',
          boxShadow: '0 0 60px rgba(255,215,0,0.3)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '24px',
            border: '1px solid rgba(212,175,55,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'rotate(-45deg)',
            fontSize: '160px',
            color: '#ffd700',
            textShadow: '0 0 24px rgba(255,215,0,0.6)',
          }}
        >
          ✦
        </div>
      </div>

      {/* 主标 + 副标 */}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div
          style={{
            fontSize: '56px',
            letterSpacing: '0.32em',
            fontWeight: 800,
            color: '#ffe082',
            textShadow: '0 0 20px rgba(255,215,0,0.45)',
            marginBottom: '24px',
          }}
        >
          LLMPETARENA
        </div>
        <div
          style={{
            fontSize: '24px',
            letterSpacing: '0.5em',
            color: '#d4af37',
            fontWeight: 700,
          }}
        >
          PACK UNOPENED
        </div>
      </div>

      {/* 底部 hint，闪烁动画 */}
      <div
        style={{
          position: 'absolute',
          bottom: '120px',
          fontSize: '20px',
          letterSpacing: '0.4em',
          color: 'rgba(255,215,0,0.7)',
          animation: 'arcade-back-pulse 2.2s ease-in-out infinite',
        }}
      >
        ◂ PASTE JSON TO SUMMON ▸
      </div>

      <style>{`
        @keyframes arcade-back-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
