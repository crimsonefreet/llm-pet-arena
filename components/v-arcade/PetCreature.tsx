'use client';

import type { Pet, Element } from '@/lib/pet/schema';

// 每个元素一组配色（明暗 + glow + accent）
const PALETTE: Record<Element, { light: string; mid: string; dark: string; glow: string; accent: string }> = {
  '火': { light: '#ffd6a8', mid: '#ff7a3a', dark: '#7a1f00', glow: '#ff6b35', accent: '#ffe05f' },
  '水': { light: '#cfeefd', mid: '#4fc3f7', dark: '#0d3b66', glow: '#4fc3f7', accent: '#80deea' },
  '土': { light: '#e8d9c8', mid: '#a07a55', dark: '#3e2511', glow: '#c89a5e', accent: '#ffb74d' },
  '雷': { light: '#fff5b0', mid: '#ffd54f', dark: '#7a5800', glow: '#fff176', accent: '#fff59d' },
  '暗': { light: '#d6c5ee', mid: '#7e57c2', dark: '#1f0a4d', glow: '#b39ddb', accent: '#e040fb' },
  '金': { light: '#fff6cc', mid: '#e9c25a', dark: '#5a4012', glow: '#ffd700', accent: '#ffeb99' },
};

// 简单稳定哈希——同一个 pet_id 永远长一样
function strHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

interface Props {
  pet: Pet;
}

/**
 * 由 pet_id 哈希决定外形变化的"魂兽"造型。每只宠物独一无二，
 * 由元素色、稀有度、INT/ATK/LUK 等数据共同驱动几何参数。
 *
 *   body shape   ← hash % 4         (圆 / 高 / 宽 / 棱)
 *   crown spikes ← rarity           (UR=5, SSR=3, SR=2, R=1, N=0)
 *   eye count    ← INT 分档          (低=2, 中=3, 高=4)
 *   spikes/horns ← ATK 分档          (低=0, 中=2, 高=4)
 *   pattern      ← (hash >> 4) % 3  (符文 / 条纹 / 斑点)
 */
export function PetCreature({ pet }: Props) {
  const primaryEl = pet.elements[0];
  const secondaryEl = pet.elements[1];
  const p = PALETTE[primaryEl];
  const p2 = secondaryEl ? PALETTE[secondaryEl] : null;

  const seed = strHash(pet.pet_id);
  const bodyVariant = seed % 4;          // 圆 / 高 / 宽 / 棱
  const patternVariant = (seed >> 4) % 3; // 符文 / 条纹 / 斑点
  const hornVariant = (seed >> 7) % 4;    // 无 / 双尖 / 鹿角 / 触须

  const crownSpikes = pet.rarity === 'UR' ? 5 : pet.rarity === 'SSR' ? 3 : pet.rarity === 'SR' ? 2 : pet.rarity === 'R' ? 1 : 0;
  const eyeCount = pet.stats.INT > 90 ? 4 : pet.stats.INT > 75 ? 3 : 2;
  const sideSpikes = pet.stats.ATK > 90 ? 4 : pet.stats.ATK > 75 ? 2 : 0;
  const isLucky = pet.stats.LUK > 80;     // LUK 高出双瞳

  // 身体几何（不同 variant 不同长宽比）—— 放大到主导 viewBox
  const bodyRX = bodyVariant === 2 ? 155 : bodyVariant === 1 ? 105 : 130;
  const bodyRY = bodyVariant === 1 ? 165 : bodyVariant === 2 ? 120 : 140;
  const isAngular = bodyVariant === 3;

  // ID 唯一化前缀，避免 SVG defs 在同页多实例时撞 ID
  const uid = `c${seed.toString(36).slice(-6)}`;

  return (
    <svg
      viewBox="0 0 400 340"
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block' }}
    >
      <defs>
        {/* 主体径向渐变 */}
        <radialGradient id={`${uid}-body`} cx="0.5" cy="0.35" r="0.7">
          <stop offset="0%" stopColor={p.light} />
          <stop offset="55%" stopColor={p.mid} />
          <stop offset="100%" stopColor={p.dark} />
        </radialGradient>

        {/* 光晕径向 */}
        <radialGradient id={`${uid}-aura`}>
          <stop offset="0%" stopColor={p.glow} stopOpacity="0.5" />
          <stop offset="60%" stopColor={p.glow} stopOpacity="0.12" />
          <stop offset="100%" stopColor={p.glow} stopOpacity="0" />
        </radialGradient>

        {/* 镜面高光线性 */}
        <linearGradient id={`${uid}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="40%" stopColor="#ffffff" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>

        {/* 双色 pet 第二元素装饰 */}
        {p2 && (
          <linearGradient id={`${uid}-accent`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={p.accent} />
            <stop offset="100%" stopColor={p2.accent} />
          </linearGradient>
        )}

        {/* 浮动动画 */}
        <style>{`
          @keyframes ${uid}-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }
          @keyframes ${uid}-glow {
            0%, 100% { opacity: 0.55; }
            50% { opacity: 0.85; }
          }
          .${uid}-floater { animation: ${uid}-float 4.2s ease-in-out infinite; transform-origin: center; }
          .${uid}-pulse   { animation: ${uid}-glow  3.5s ease-in-out infinite; }
        `}</style>
      </defs>

      {/* ── Aura ── */}
      <ellipse
        cx="200"
        cy="170"
        rx="195"
        ry="170"
        fill={`url(#${uid}-aura)`}
        className={`${uid}-pulse`}
      />

      {/* ── Ground shadow ── */}
      <ellipse cx="200" cy="315" rx="120" ry="14" fill="#000" opacity="0.5" />

      {/* ── Floating body group ── */}
      <g className={`${uid}-floater`}>
        {/* 侧翼小刺（ATK 高的有） */}
        {Array.from({ length: sideSpikes }, (_, i) => {
          const side = i % 2 === 0 ? -1 : 1;
          const yOff = -30 + Math.floor(i / 2) * 35;
          const baseX = 200 + side * (bodyRX - 5);
          const tipX = baseX + side * 30;
          return (
            <polygon
              key={`spike-${i}`}
              points={`${baseX},${165 + yOff - 8} ${tipX},${165 + yOff} ${baseX},${165 + yOff + 8}`}
              fill={p.mid}
              stroke={p.dark}
              strokeWidth="1.5"
            />
          );
        })}

        {/* 主体（圆滑 OR 棱角） */}
        {isAngular ? (
          <polygon
            points={[
              `200,${165 - bodyRY}`,
              `${200 + bodyRX},${165 - bodyRY * 0.3}`,
              `${200 + bodyRX * 0.8},${165 + bodyRY * 0.8}`,
              `200,${165 + bodyRY}`,
              `${200 - bodyRX * 0.8},${165 + bodyRY * 0.8}`,
              `${200 - bodyRX},${165 - bodyRY * 0.3}`,
            ].join(' ')}
            fill={`url(#${uid}-body)`}
            stroke={p.dark}
            strokeWidth="2.5"
          />
        ) : (
          <ellipse
            cx="200"
            cy="165"
            rx={bodyRX}
            ry={bodyRY}
            fill={`url(#${uid}-body)`}
            stroke={p.dark}
            strokeWidth="2.5"
          />
        )}

        {/* 主体上光泽 */}
        <ellipse
          cx="180"
          cy={165 - bodyRY * 0.55}
          rx={bodyRX * 0.55}
          ry={bodyRY * 0.35}
          fill={`url(#${uid}-shine)`}
          opacity="0.7"
        />

        {/* 顶部 crown spikes（rarity 越高越多） */}
        {Array.from({ length: crownSpikes }, (_, i) => {
          const total = crownSpikes;
          const center = (total - 1) / 2;
          const offset = (i - center) * 14;
          const baseX = 200 + offset;
          const baseY = 165 - bodyRY + 4;
          const tipY = baseY - 26 + Math.abs(i - center) * 6;
          return (
            <g key={`crown-${i}`}>
              <polygon
                points={`${baseX - 5},${baseY} ${baseX},${tipY} ${baseX + 5},${baseY}`}
                fill={p.accent}
                stroke={p.dark}
                strokeWidth="1.5"
              />
              {/* 顶端高光小点 */}
              <circle cx={baseX} cy={tipY + 2} r="2" fill="#fff" opacity="0.7" />
            </g>
          );
        })}

        {/* 触角 / 鹿角变体 */}
        {hornVariant === 1 && (
          <>
            <path
              d={`M ${200 - 24},${165 - bodyRY + 8} Q ${200 - 40},${165 - bodyRY - 20} ${200 - 32},${165 - bodyRY - 36}`}
              stroke={p.dark}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M ${200 + 24},${165 - bodyRY + 8} Q ${200 + 40},${165 - bodyRY - 20} ${200 + 32},${165 - bodyRY - 36}`}
              stroke={p.dark}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx={200 - 32} cy={165 - bodyRY - 36} r="4" fill={p.accent} />
            <circle cx={200 + 32} cy={165 - bodyRY - 36} r="4" fill={p.accent} />
          </>
        )}
        {hornVariant === 2 && (
          <>
            {/* 鹿角风 */}
            <path
              d={`M ${200 - 20},${165 - bodyRY + 10} l -5,-18 l -10,-4 m 10,4 l -3,-15`}
              stroke={p.dark}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={`M ${200 + 20},${165 - bodyRY + 10} l 5,-18 l 10,-4 m -10,4 l 3,-15`}
              stroke={p.dark}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
        {hornVariant === 3 && (
          <>
            {/* 触须风 */}
            <path
              d={`M ${200 - 18},${165 - bodyRY + 14} q -28,-22 -34,-50`}
              stroke={p.dark}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M ${200 + 18},${165 - bodyRY + 14} q 28,-22 34,-50`}
              stroke={p.dark}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx={200 - 52} cy={165 - bodyRY - 36} r="5" fill={p.glow} className={`${uid}-pulse`} />
            <circle cx={200 + 52} cy={165 - bodyRY - 36} r="5" fill={p.glow} className={`${uid}-pulse`} />
          </>
        )}

        {/* 装饰图案已全部删除（patternVariant 0/1/2）— 用户反馈
            "脸上横线 / 体表点点" 分散注意力，PetCreature 保持纯净形态 */}

        {/* 眼睛——按 INT 分档数量 */}
        {Array.from({ length: eyeCount }, (_, i) => {
          const total = eyeCount;
          const center = (total - 1) / 2;
          const spacing = total === 2 ? 56 : total === 3 ? 40 : 30;
          const cx = 200 + (i - center) * spacing;
          const cy = 130;
          const rOuter = total >= 4 ? 12 : total === 3 ? 14 : 16;
          const rPupil = total >= 4 ? 7 : total === 3 ? 8 : 9;
          return (
            <g key={`eye-${i}`}>
              {/* 眼眶（白色） */}
              <ellipse
                cx={cx}
                cy={cy}
                rx={rOuter}
                ry={rOuter * 1.1}
                fill="#fff8e7"
                stroke={p.dark}
                strokeWidth="2"
              />
              {/* 瞳孔（元素色） */}
              <circle cx={cx} cy={cy + 1} r={rPupil} fill={p.glow} />
              {/* 瞳孔中心黑 */}
              <circle cx={cx} cy={cy + 1} r={rPupil * 0.5} fill="#0a0a0a" />
              {/* 高光点 */}
              <circle cx={cx + rPupil * 0.45} cy={cy - rPupil * 0.45} r="2" fill="#fff" />
              {/* LUK 高时加副瞳 */}
              {isLucky && (
                <circle cx={cx - rPupil * 0.45} cy={cy + rPupil * 0.45} r="1.5" fill="#fff" opacity="0.7" />
              )}
            </g>
          );
        })}

        {/* 嘴部小弧（根据稀有度调整笑容） */}
        <path
          d={`M ${200 - 22},${178} Q 200,${crownSpikes >= 3 ? 192 : 186} ${200 + 22},${178}`}
          stroke={p.dark}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* 浮空粒子已删 — 用户反馈 PNG 上"宠物旁边的点点"分散注意力 */}
    </svg>
  );
}
