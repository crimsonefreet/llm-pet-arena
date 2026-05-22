'use client';

// Arcade 视觉风格的全屏背景层
// 4 层渐变叠加：base velvet + top gold halo + giant ✦ + dot pattern + vignette
// 共享给 / 与 /v-arcade 两个页面使用
export function ArcadeBackground() {
  return (
    <div
      aria-hidden
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      {/* base velvet 渐变 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(135deg, #0a0510 0%, #08101a 40%, #100510 70%, #0a0510 100%)',
        }}
      />
      {/* 顶部金色光晕 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212,175,55,0.08) 0%, transparent 60%)',
        }}
      />
      {/* 中央巨大 ✦ 装饰 */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '600px',
          lineHeight: 1,
          color: 'rgba(212,175,55,0.02)',
          fontFamily: 'serif',
          userSelect: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        ✦
      </div>
      {/* 金色粒子点阵 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle, rgba(212,175,55,0.04) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      {/* vignette 暗角 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
        }}
      />
    </div>
  );
}
