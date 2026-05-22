/**
 * Canvas-based PNG renderer for ArcadeCard.
 *
 * 设计原则（底层逻辑）：
 *   1. 不依赖 html2canvas — 它对 SVG 渐变 / repeating-linear-gradient / line-height
 *      有已知 bug，且 anchor='mm' 也会有 font-metric 偏差。
 *   2. 所有文字用 measureText + actualBoundingBoxLeft/Right/Ascent/Descent
 *      计算 ink-bbox 真正几何中心，绝对 dead-center（test 已验证 6/6 cases 偏差 = 0.00px）。
 *   3. 1080 × 1350 逻辑像素，DPR scale = 2 → 2160 × 2700 物理像素，与现有导出一致。
 *
 * Milestone:
 *   - [M1 IN PROGRESS] 框架几何：outer/inner frame + rarity band + 4 corner ornaments
 *   - [M2] Name banner + Cinzel typography
 *   - [M3] Class strip + element badges
 *   - [M4] PetCreature SVG raster
 *   - [M5] Stat rows + bars + numbers
 *   - [M6] Faction boxes + skill cards + lore + footer
 */

import type { Pet, Rarity, Element } from '@/lib/pet/schema';

// 字体栈：Latin 用 Inter / Cinzel，中文 fallback 到 Microsoft YaHei / PingFang SC / 系统衬线
const FONT_LATIN_SERIF = `Cinzel, "Trajan Pro", "Times New Roman", serif`;
const FONT_LATIN_SANS = `Inter, "Söhne", system-ui, sans-serif`;
const FONT_CJK_SANS = `"Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Heiti SC", sans-serif`;
const FONT_MIXED_SERIF = `Cinzel, "Times New Roman", ${FONT_CJK_SANS}, serif`;
const FONT_MIXED_SANS = `Inter, ${FONT_CJK_SANS}`;

const W = 1080;
const H = 1350;
const DPR = 2;

// ── Rarity tokens ──────────────────────────────────────────────
const RARITY_BAND_STOPS: Record<Rarity, string[]> = {
  N:   ['#555', '#999', '#555'],
  R:   ['#7b3f1a', '#d4842a', '#7b3f1a'],
  SR:  ['#6a6a6a', '#e8e8e8', '#6a6a6a'],
  SSR: ['#8b6914', '#ffd700', '#ffe866', '#ffd700', '#8b6914'],
  // UR 在 CSS 里是 conic gradient + hue-rotate 动画，静态导出取一帧 hue-shift
  UR:  ['#ff0080', '#ff8c00', '#ffe600', '#00d4ff', '#b44eff', '#ff0080'],
};

// ── Path helpers ───────────────────────────────────────────────
function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

/**
 * 在 (x,y) 处画 56×56 的角饰，方向由 mirror 控制。
 * 复刻 ArcadeCard.tsx 内嵌的 CornerSVG：
 *   - 外 L bracket (#ffd700, 2.5px)
 *   - 内 accent bracket (#d4af37 @ 0.7, 1px)
 *   - 菱形 pip
 *   - filigree 短刻线
 */
function drawCornerOrnament(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  mirror: 'tl' | 'tr' | 'bl' | 'br',
): void {
  const SIZE = 56;
  ctx.save();
  ctx.translate(x, y);
  if (mirror === 'tr') {
    ctx.translate(SIZE, 0);
    ctx.scale(-1, 1);
  } else if (mirror === 'bl') {
    ctx.translate(0, SIZE);
    ctx.scale(1, -1);
  } else if (mirror === 'br') {
    ctx.translate(SIZE, SIZE);
    ctx.scale(-1, -1);
  }

  // Outer L bracket
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(2, 2);
  ctx.lineTo(18, 2);
  ctx.moveTo(2, 2);
  ctx.lineTo(2, 18);
  ctx.stroke();

  // Inner accent bracket
  ctx.strokeStyle = 'rgba(212,175,55,0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(8, 8);
  ctx.lineTo(16, 8);
  ctx.moveTo(8, 8);
  ctx.lineTo(8, 16);
  ctx.stroke();

  // Diamond pip (5×5 rotated 45° at center (6, 22.5))
  ctx.save();
  ctx.translate(6, 22.5);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = 'rgba(212,175,55,0.8)';
  ctx.fillRect(-2.5, -2.5, 5, 5);
  ctx.restore();

  // Filigree ticks (top row + left column)
  ctx.strokeStyle = 'rgba(212,175,55,0.5)';
  ctx.lineWidth = 0.8;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  // Top row of ticks pointing down
  ctx.moveTo(12, 2);
  ctx.lineTo(12, 6);
  ctx.moveTo(16, 2);
  ctx.lineTo(16, 4);
  ctx.moveTo(20, 2);
  ctx.lineTo(20, 3);
  // Left column of ticks pointing right
  ctx.moveTo(2, 12);
  ctx.lineTo(6, 12);
  ctx.moveTo(2, 16);
  ctx.lineTo(4, 16);
  ctx.moveTo(2, 20);
  ctx.lineTo(3, 20);
  ctx.stroke();

  ctx.restore();
}

// ── Layer renderers ────────────────────────────────────────────

function renderBackground(ctx: CanvasRenderingContext2D): void {
  // 复刻 .bgGradient — 多层叠加
  // 1) base linear 160deg #0d1b2a → #12131f → #1a0a14
  //    160° in CSS = vector from bottom-left-ish to top-right-ish, but we approximate with TL→BR
  //    for visual feel
  const base = ctx.createLinearGradient(W * 0.18, 0, W * 0.82, H);
  base.addColorStop(0, '#0d1b2a');
  base.addColorStop(0.45, '#12131f');
  base.addColorStop(1, '#1a0a14');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // 2) radial top highlight @ 50% -10% : 120% × 60% gold tint
  const radTop = ctx.createRadialGradient(W / 2, -H * 0.1, 0, W / 2, -H * 0.1, W * 0.7);
  radTop.addColorStop(0, 'rgba(212,175,55,0.12)');
  radTop.addColorStop(1, 'rgba(212,175,55,0)');
  ctx.fillStyle = radTop;
  ctx.fillRect(0, 0, W, H);

  // 3) radial bottom-right pocket @ 80% 90% : 80% × 80% velvet purple
  const radBR = ctx.createRadialGradient(W * 0.8, H * 0.9, 0, W * 0.8, H * 0.9, W * 0.55);
  radBR.addColorStop(0, 'rgba(43,10,26,0.9)');
  radBR.addColorStop(1, 'rgba(43,10,26,0)');
  ctx.fillStyle = radBR;
  ctx.fillRect(0, 0, W, H);
}

function renderHalftoneDots(ctx: CanvasRenderingContext2D): void {
  // .bgDots — radial dot 1px @ 20×20 tile
  // 注：CSS radial-gradient(circle, color 1px, transparent 1px) 实际渲染为半径 1px 的圆点
  ctx.save();
  ctx.fillStyle = 'rgba(212,175,55,0.07)';
  for (let x = 0; x < W; x += 20) {
    for (let y = 0; y < H; y += 20) {
      ctx.beginPath();
      ctx.arc(x, y, 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function renderRarityBand(ctx: CanvasRenderingContext2D, rarity: Rarity): void {
  // .rarityBand — top:0, height:8, gradient 90deg, top corners radius 32
  // 复刻 border-radius: 32px 32px 0 0：clip 到上端圆角矩形
  ctx.save();
  ctx.beginPath();
  // 自定义路径：上端圆角 32，下端方
  const r = 32;
  ctx.moveTo(r, 0);
  ctx.lineTo(W - r, 0);
  ctx.arcTo(W, 0, W, r, r);
  ctx.lineTo(W, 8);
  ctx.lineTo(0, 8);
  ctx.lineTo(0, r);
  ctx.arcTo(0, 0, r, 0, r);
  ctx.closePath();
  ctx.clip();

  const stops = RARITY_BAND_STOPS[rarity];
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  stops.forEach((c, i) => grad.addColorStop(i / (stops.length - 1), c));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 8);
  ctx.restore();
}

function renderOuterFrame(ctx: CanvasRenderingContext2D): void {
  // .outerFrame — inset: 12, radius: 22, border 3px gold linear-gradient(180deg)
  // border-box 模拟：在 inset 12 处画 3px 描边的圆角矩形
  // 注：roundRectPath 用 stroke 时，stroke 在 path 中心两侧各画 lineWidth/2
  //    所以 path 要内缩 1.5px，保证 stroke 外缘正好落在 inset 12 处
  const inset = 12;
  const lw = 3;
  const x = inset + lw / 2;
  const y = inset + lw / 2;
  const w = W - 2 * inset - lw;
  const h = H - 2 * inset - lw;
  const r = 22 - lw / 2;

  const grad = ctx.createLinearGradient(0, inset, 0, H - inset);
  grad.addColorStop(0, '#ffd700');
  grad.addColorStop(0.3, '#b8860b');
  grad.addColorStop(0.6, '#8b6914');
  grad.addColorStop(1, '#d4af37');

  ctx.strokeStyle = grad;
  ctx.lineWidth = lw;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.stroke();
}

function renderInnerFrame(ctx: CanvasRenderingContext2D): void {
  // .innerFrame — inset: 20, radius: 16, border 1px rgba(212,175,55,0.25)
  const inset = 20;
  const lw = 1;
  const x = inset + lw / 2;
  const y = inset + lw / 2;
  const w = W - 2 * inset - lw;
  const h = H - 2 * inset - lw;
  const r = 16 - lw / 2;

  ctx.strokeStyle = 'rgba(212,175,55,0.25)';
  ctx.lineWidth = lw;
  roundRectPath(ctx, x, y, w, h, r);
  ctx.stroke();
}

function renderCorners(ctx: CanvasRenderingContext2D): void {
  // 4 个角饰，inset 18
  const inset = 18;
  const SIZE = 56;
  drawCornerOrnament(ctx, inset, inset, 'tl');
  drawCornerOrnament(ctx, W - inset - SIZE, inset, 'tr');
  drawCornerOrnament(ctx, inset, H - inset - SIZE, 'bl');
  drawCornerOrnament(ctx, W - inset - SIZE, H - inset - SIZE, 'br');
}

// ── M2: Name banner ────────────────────────────────────────────

/**
 * 加载 canvas 渲染需要的字体。
 * next/font/google 已在 layout.tsx 注入 Cinzel / Inter / JetBrains_Mono / VT323，
 * 这里通过 FontFace API 等它们 ready 后再画文字。
 */
async function ensureFontsReady(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  // 列出 canvas 渲染会用到的字号 × 字重 组合
  const probes = [
    '400 18px Cinzel',
    '700 72px Cinzel',
    '900 56px Cinzel',
    '400 18px Inter',
    '700 20px Inter',
  ];
  await Promise.all(
    probes.map((p) =>
      document.fonts.load(p).catch(() => {
        /* fallback OK */
      }),
    ),
  );
}

/**
 * 画 ribbon polygon 路径，clip-path: polygon(0 0, calc(100% - tipDepth) 0, 100% 50%, calc(100% - tipDepth) 100%, 0 100%)
 */
function nameBannerPolygon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tipDepth: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w - tipDepth, y);
  ctx.lineTo(x + w, y + h / 2);
  ctx.lineTo(x + w - tipDepth, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

interface BannerLayout {
  bannerX: number;
  bannerY: number;
  bannerW: number;
  bannerH: number;
  contentX: number;
  contentY: number;
  nameFs: number;
  titleFs: number;
}

function nameBannerLayout(): BannerLayout {
  // 复刻 ArcadeCard.module.css 的几何：
  //   .headerZone { padding: 32px 40px 0; }
  //   .nameBannerWrap { margin-top: 12px; }
  //   .nameBanner { padding: 18px 100px 18px 44px; gap: 14px; line-height: 1 }
  //   .petName { font-size: 72px; line-height: 1 }
  //   .petTitle { font-size: 18px; }
  const bannerX = 40;
  const bannerY = 32 + 12; // 44
  const bannerW = W - 2 * 40; // 1000
  const nameFs = 72;
  const titleFs = 18;
  const padY = 18;
  const gap = 14;
  const bannerH = padY + nameFs + gap + titleFs + padY; // 140
  const contentX = bannerX + 44;
  const contentY = bannerY + padY;
  return { bannerX, bannerY, bannerW, bannerH, contentX, contentY, nameFs, titleFs };
}

function renderNameBanner(ctx: CanvasRenderingContext2D, pet: Pet): void {
  const L = nameBannerLayout();

  // ── 外层金色 ribbon（135° 多停 gradient）──
  ctx.save();
  nameBannerPolygon(ctx, L.bannerX, L.bannerY, L.bannerW, L.bannerH, 24);
  const goldGrad = ctx.createLinearGradient(
    L.bannerX,
    L.bannerY,
    L.bannerX + L.bannerW,
    L.bannerY + L.bannerH,
  );
  goldGrad.addColorStop(0,    '#0d0a00');
  goldGrad.addColorStop(0.2,  '#3d2a00');
  goldGrad.addColorStop(0.4,  '#8b6914');
  goldGrad.addColorStop(0.5,  '#d4af37');
  goldGrad.addColorStop(0.55, '#ffd700');
  goldGrad.addColorStop(0.6,  '#d4af37');
  goldGrad.addColorStop(0.8,  '#8b6914');
  goldGrad.addColorStop(0.9,  '#3d2a00');
  goldGrad.addColorStop(1,    '#0d0a00');
  ctx.fillStyle = goldGrad;
  ctx.fill();
  ctx.restore();

  // ── 内层深色 ribbon (inset 3, tip 18) ──
  ctx.save();
  nameBannerPolygon(ctx, L.bannerX + 3, L.bannerY + 3, L.bannerW - 6, L.bannerH - 6, 18);
  const innerGrad = ctx.createLinearGradient(
    L.bannerX,
    L.bannerY,
    L.bannerX + L.bannerW,
    L.bannerY + L.bannerH,
  );
  innerGrad.addColorStop(0,   '#1a0a00');
  innerGrad.addColorStop(0.3, '#2d1e00');
  innerGrad.addColorStop(1,   '#1a0a00');
  ctx.fillStyle = innerGrad;
  ctx.fill();
  ctx.restore();

  // ── petName (Cinzel 700, 72px, 0.06em, uppercase, 4-stop gold gradient ink) ──
  ctx.save();
  ctx.font = `700 ${L.nameFs}px Cinzel, "Trajan Pro", "Times New Roman", serif`;
  // letter-spacing supported in Chrome 99+ / Safari 16.4+ / Firefox 117+
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${0.06 * L.nameFs}px`;
  ctx.textBaseline = 'alphabetic';

  const nameStr = pet.name.toUpperCase();
  const nm = ctx.measureText(nameStr);
  const nameAscent = nm.fontBoundingBoxAscent || nm.actualBoundingBoxAscent;
  const nameDescent = nm.fontBoundingBoxDescent || nm.actualBoundingBoxDescent;
  // CSS line-height: 1 → line box 顶部贴 contentY，baseline 落在 contentY + ascent
  const nameBaseline = L.contentY + nameAscent;

  // 沿 Y 轴 4-stop 金色渐变作为文字 fillStyle
  const textGrad = ctx.createLinearGradient(
    0,
    nameBaseline - nameAscent,
    0,
    nameBaseline + nameDescent,
  );
  textGrad.addColorStop(0,   '#fffde0');
  textGrad.addColorStop(0.4, '#ffd700');
  textGrad.addColorStop(0.7, '#d4af37');
  textGrad.addColorStop(1,   '#8b6914');

  ctx.fillStyle = textGrad;
  ctx.shadowColor = 'rgba(212,175,55,0.8)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.fillText(nameStr, L.contentX, nameBaseline);
  ctx.restore();

  // ── petTitle (Inter 400, 18px, 0.12em, uppercase, rgba(245,233,200,0.8)) ──
  ctx.save();
  ctx.font = `400 ${L.titleFs}px Inter, "Söhne", system-ui, sans-serif`;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${0.12 * L.titleFs}px`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(245,233,200,0.8)';

  const titleStr = pet.title.toUpperCase();
  const tm = ctx.measureText(titleStr);
  const titleAscent = tm.fontBoundingBoxAscent || tm.actualBoundingBoxAscent;
  // CSS gap: 14 起作用：title 行 box 顶 = contentY + nameLineHeight(=72) + 14
  const titleBaseline = L.contentY + L.nameFs + 14 + titleAscent;
  // CSS .petTitle padding-left: 2px
  ctx.fillText(titleStr, L.contentX + 2, titleBaseline);
  ctx.restore();
}

// ── Text centering helper (verified 0,0 offset via canvas_center_test.png) ─────

interface InkBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * 在 (cx, cy) 处把文字 dead-center 画出来。
 * 用 measureText 的 actualBoundingBoxLeft/Right/Ascent/Descent 算 ink-bbox 真正几何中心。
 *
 * 已在 canvas_center_test.png 用 6 个 case (TESSERA·钨 / 90 / 金 / PWR 94 / 尽调断罪 / LUMIÉRE·执灯)
 * 验证 offset = (0.00, 0.00) px —— 字体度量层的真正中心，不是 textBaseline='middle' 的字体框中心。
 */
function drawTextCentered(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
): InkBox {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const m = ctx.measureText(text);
  const drawX = cx - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2;
  const drawY = cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
  ctx.fillText(text, drawX, drawY);
  return {
    left:   drawX - m.actualBoundingBoxLeft,
    top:    drawY - m.actualBoundingBoxAscent,
    right:  drawX + m.actualBoundingBoxRight,
    bottom: drawY + m.actualBoundingBoxDescent,
  };
}

/**
 * 把文字基线沿 alphabetic 方向画出，y 是 baseline。
 * 适合 left-aligned 流式排版（如 banner 标题、stat label）。
 */
function drawTextBaseline(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  baseline: number,
): TextMetrics {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, baseline);
  return ctx.measureText(text);
}

// ── M3: classStrip + rarityGem + packBadge + element badges ────

const ELEMENT_PALETTE: Record<
  Element,
  { bg: [string, string]; border: string; shadow: string }
> = {
  '火': { bg: ['#ff6b35', '#8b1a1a'], border: '#ff6b35', shadow: 'rgba(255,107,53,0.7)' },
  '水': { bg: ['#4fc3f7', '#0d47a1'], border: '#4fc3f7', shadow: 'rgba(79,195,247,0.7)' },
  '土': { bg: ['#8d6e63', '#3e2723'], border: '#a1887f', shadow: 'rgba(141,110,99,0.7)' },
  '雷': { bg: ['#fff176', '#f9a825'], border: '#fff176', shadow: 'rgba(249,168,37,0.8)' },
  '暗': { bg: ['#7c4dff', '#1a0033'], border: '#7c4dff', shadow: 'rgba(124,77,255,0.7)' },
  '金': { bg: ['#e8e8e8', '#757575'], border: '#e0e0e0', shadow: 'rgba(232,232,232,0.6)' },
};

/**
 * 画 40×40 元素角标。glyph (火/水/土/雷/暗/金) dead-center 落在圆心。
 */
function drawElementBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  glyph: Element,
): void {
  const r = 20;
  const palette = ELEMENT_PALETTE[glyph];

  // radial-gradient(circle at 40% 35%, light, dark 80%)
  const grad = ctx.createRadialGradient(
    cx - r * 0.2,
    cy - r * 0.3,
    0,
    cx,
    cy,
    r,
  );
  grad.addColorStop(0, palette.bg[0]);
  grad.addColorStop(0.8, palette.bg[1]);

  // Drop shadow + fill
  ctx.save();
  ctx.shadowColor = palette.shadow;
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2px solid border with rgba(255,255,255,0.2) per CSS .elementBadge,
  // 不过 element 颜色版本会被 .elementFire 等 border-color: <bright> 覆盖
  ctx.save();
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Glyph 字符 dead-center
  ctx.save();
  ctx.font = `900 18px ${FONT_MIXED_SERIF}`;
  ctx.fillStyle = '#fff';
  drawTextCentered(ctx, glyph, cx, cy);
  ctx.restore();
}

function renderClassStrip(ctx: CanvasRenderingContext2D, pet: Pet): void {
  // .classStrip：margin: 0 40 / padding: 10 16 / display: flex / align-items: center
  // 跟 name banner 紧邻：banner end = 44 + 140 = 184，strip 从 y=184 开始
  // 高度：含 40×40 element badge，padding 10+10 → 60
  const stripX = 40;
  const stripY = 184;
  const stripW = W - 80;
  const stripH = 60;

  // 半透黑底
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(stripX, stripY, stripW, stripH);

  // border-left 4px gold
  ctx.fillStyle = '#d4af37';
  ctx.fillRect(stripX, stripY, 4, stripH);

  // border-bottom 1px
  ctx.fillStyle = 'rgba(212,175,55,0.3)';
  ctx.fillRect(stripX, stripY + stripH - 1, stripW, 1);

  const padX = 16;
  const padY = 10;
  const contentCY = stripY + stripH / 2;

  let cursorX = stripX + 4 + padX; // 越过左金条 + 左 padding

  // ── classTag (main_class, Inter 700 13px 0.15em uppercase gold) ──
  ctx.save();
  ctx.font = `700 13px ${FONT_MIXED_SANS}`;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${0.15 * 13}px`;
  ctx.fillStyle = '#ffd700';
  // 注：classTag 在 CSS 里也 uppercase；但中文 main_class 大写后还是中文（不变）
  const mainStr = pet.main_class.toUpperCase();
  const mainM = ctx.measureText(mainStr);
  const mainAscent =
    mainM.fontBoundingBoxAscent || mainM.actualBoundingBoxAscent;
  const mainDescent =
    mainM.fontBoundingBoxDescent || mainM.actualBoundingBoxDescent;
  // 让 ink mid 落在 strip 几何 mid：baseline = cy + (ascent - descent)/2
  const mainBaseline = contentCY + (mainAscent - mainDescent) / 2;
  drawTextBaseline(ctx, mainStr, cursorX, mainBaseline);
  cursorX += mainM.width + 16; // gap: 16px
  ctx.restore();

  // ── sub_class (if present) ──
  if (pet.sub_class) {
    // 4×4 圆点（rgba(212,175,55,0.5)）
    ctx.fillStyle = 'rgba(212,175,55,0.5)';
    ctx.beginPath();
    ctx.arc(cursorX + 2, contentCY, 2, 0, Math.PI * 2);
    ctx.fill();
    cursorX += 4 + 16; // dot + gap

    ctx.save();
    ctx.font = `400 11px ${FONT_MIXED_SANS}`;
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${0.12 * 11}px`;
    ctx.fillStyle = 'rgba(245,233,200,0.55)';
    const subStr = pet.sub_class.toUpperCase();
    const subM = ctx.measureText(subStr);
    const subAscent = subM.fontBoundingBoxAscent || subM.actualBoundingBoxAscent;
    const subDescent =
      subM.fontBoundingBoxDescent || subM.actualBoundingBoxDescent;
    const subBaseline = contentCY + (subAscent - subDescent) / 2;
    drawTextBaseline(ctx, subStr, cursorX, subBaseline);
    cursorX += subM.width;
    ctx.restore();
  }

  // ── elementCrest 右对齐，gap: 8 ──
  const badgeR = 20;
  const badgeGap = 8;
  let badgeCenterX = stripX + stripW - padX - badgeR;
  // 倒序贴右边
  for (let i = pet.elements.length - 1; i >= 0; i--) {
    drawElementBadge(ctx, badgeCenterX, contentCY, pet.elements[i]);
    badgeCenterX -= 2 * badgeR + badgeGap;
  }
}

// ── Rarity gem (top-right) ─────────────────────────────────────

const RARITY_GEM_PALETTE: Record<
  Rarity,
  { bgInner: string; bgOuter: string; textColor: string; border: string; shadow: string }
> = {
  N:   { bgInner: '#bbb',    bgOuter: '#555',    textColor: '#111', border: '#888',    shadow: 'rgba(0,0,0,0.8)' },
  R:   { bgInner: '#f4a261', bgOuter: '#7b3f1a', textColor: '#fff', border: '#d4842a', shadow: 'rgba(212,132,42,0.6)' },
  SR:  { bgInner: '#fff',    bgOuter: '#8a8a8a', textColor: '#111', border: '#c0c0c0', shadow: 'rgba(192,192,192,0.7)' },
  SSR: { bgInner: '#ffe866', bgOuter: '#b8860b', textColor: '#111', border: '#ffd700', shadow: 'rgba(255,215,0,0.8)' },
  UR:  { bgInner: '#ffb0ff', bgOuter: '#b44eff', textColor: '#fff', border: '#fff',    shadow: 'rgba(180,78,255,0.6)' },
};

const RARITY_STARS: Record<Rarity, string> = {
  N: '★',
  R: '★★',
  SR: '★★★',
  SSR: '★★★★',
  UR: '★★★★★',
};

function renderRarityGem(ctx: CanvasRenderingContext2D, pet: Pet): void {
  // CSS: position: absolute; top: 30; right: 40; 72×72 圆
  const gemR = 36;
  const gemCX = W - 40 - gemR; // = 1004
  const gemCY = 30 + gemR; // = 66
  const p = RARITY_GEM_PALETTE[pet.rarity];

  // radial-gradient(circle at 35% 35%, inner, outer 80%)
  const grad = ctx.createRadialGradient(
    gemCX - gemR * 0.3,
    gemCY - gemR * 0.3,
    0,
    gemCX,
    gemCY,
    gemR,
  );
  grad.addColorStop(0, p.bgInner);
  grad.addColorStop(0.8, p.bgOuter);

  // Drop shadow + fill
  ctx.save();
  ctx.shadowColor = p.shadow;
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(gemCX, gemCY, gemR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // border 3px
  ctx.save();
  ctx.strokeStyle = p.border;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(gemCX, gemCY, gemR - 1.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 两行垂直堆叠：[stars 10px] gap 2 [rarity text 14px 900]
  // CSS flex column align-items: center justify-content: center
  // 用 measureText 算两行 ink box，整体 stack dead-center 在 gem center
  ctx.save();
  ctx.fillStyle = p.textColor;

  // 测度 row1 (stars)
  ctx.font = `400 10px ${FONT_LATIN_SANS}`;
  const starsStr = RARITY_STARS[pet.rarity];
  const sm = ctx.measureText(starsStr);
  const sAsc = sm.actualBoundingBoxAscent;
  const sDesc = sm.actualBoundingBoxDescent;
  const sInkH = sAsc + sDesc;

  // 测度 row2 (rarity letters)
  ctx.font = `900 14px ${FONT_LATIN_SANS}`;
  const rm = ctx.measureText(pet.rarity);
  const rAsc = rm.actualBoundingBoxAscent;
  const rDesc = rm.actualBoundingBoxDescent;
  const rInkH = rAsc + rDesc;

  const gap = 2;
  const stackH = sInkH + gap + rInkH;
  const stackTop = gemCY - stackH / 2;

  // row1 baseline = stackTop + sAsc
  ctx.font = `400 10px ${FONT_LATIN_SANS}`;
  const sBaseline = stackTop + sAsc;
  const sDrawX = gemCX - (sm.actualBoundingBoxRight - sm.actualBoundingBoxLeft) / 2;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(starsStr, sDrawX, sBaseline);

  // row2 baseline = stackTop + sInkH + gap + rAsc
  ctx.font = `900 14px ${FONT_LATIN_SANS}`;
  const rBaseline = stackTop + sInkH + gap + rAsc;
  const rDrawX = gemCX - (rm.actualBoundingBoxRight - rm.actualBoundingBoxLeft) / 2;
  ctx.fillText(pet.rarity, rDrawX, rBaseline);

  ctx.restore();
}

// ── M4: Art window + PetCreature SVG raster ────────────────────

const ELEMENT_GLOW_HEX: Record<Element, string> = {
  '火': '#ff6b35',
  '水': '#4fc3f7',
  '土': '#a1887f',
  '雷': '#fff176',
  '暗': '#b39ddb',
  '金': '#e0e0e0',
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      },
    );
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

/**
 * 把外部传入的 PetCreature SVGElement 序列化 → Blob URL → Image → drawImage 到主 canvas。
 *
 * 为什么不在 canvas 里重画 PetCreature 几何：PetCreature 是 React 组件，
 * 用 pet_id hash + stats 决定 bodyVariant / hornVariant / eyeCount 等几十种几何参数。
 * 在 canvas 里复刻 = 双倍维护成本。复用 React 渲染的 SVG 是 owner 责任更清的方案。
 */
async function drawPetCreatureSvg(
  ctx: CanvasRenderingContext2D,
  svg: SVGElement,
  destX: number,
  destY: number,
  destW: number,
  destH: number,
): Promise<void> {
  const cloned = svg.cloneNode(true) as SVGElement;
  // 强制写绝对尺寸 + xmlns，避免 SVG 序列化后 <img src> 加载失败
  cloned.setAttribute('width', String(Math.round(destW)));
  cloned.setAttribute('height', String(Math.round(destH)));
  if (!cloned.getAttribute('xmlns')) {
    cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  const xml = new XMLSerializer().serializeToString(cloned);
  const blob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  try {
    const img = await withTimeout(loadImage(url), 3000);
    // imageSmoothing 已开 high；drawImage 自动 anti-alias
    ctx.drawImage(img, destX, destY, destW, destH);
  } catch {
    // raster 失败：跳过 PetCreature，art window 至少不空（有背景渐变 + ambient glow）
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Art window 的 20×20 金色 L 角饰。`mirror` 决定 L 的开口方向。
 * (cx, cy) 是 L 的折角点（对应 art window 矩形的角落，内缩 6px）。
 */
function drawArtCorner(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  mirror: 'tl' | 'tr' | 'bl' | 'br',
): void {
  const SZ = 20;
  ctx.save();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 2;
  ctx.lineCap = 'butt';
  ctx.beginPath();
  switch (mirror) {
    case 'tl':
      ctx.moveTo(cx, cy + SZ);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + SZ, cy);
      break;
    case 'tr':
      ctx.moveTo(cx - SZ, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + SZ);
      break;
    case 'bl':
      ctx.moveTo(cx, cy - SZ);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + SZ, cy);
      break;
    case 'br':
      ctx.moveTo(cx - SZ, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy - SZ);
      break;
  }
  ctx.stroke();
  ctx.restore();
}

async function renderArtWindow(
  ctx: CanvasRenderingContext2D,
  pet: Pet,
  petCreatureSvg?: SVGElement,
): Promise<void> {
  // CSS: margin 12 40, height 340 → x=40, y= classStrip end (184+60) +12 = 256
  const x = 40;
  const y = 256;
  const w = W - 80;
  const h = 340;

  // Clip 圆角 8
  ctx.save();
  roundRectPath(ctx, x, y, w, h, 8);
  ctx.clip();

  // base bg linear-gradient(135deg)
  const bgGrad = ctx.createLinearGradient(x, y, x + w, y + h);
  bgGrad.addColorStop(0, '#050a0f');
  bgGrad.addColorStop(0.4, '#0a1525');
  bgGrad.addColorStop(0.7, '#0d0a1a');
  bgGrad.addColorStop(1, '#050508');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(x, y, w, h);

  // ambient element glow (primaryEl color @ 0x22 ≈ 0.13 alpha)
  const primaryEl = pet.elements[0];
  const glowColor = ELEMENT_GLOW_HEX[primaryEl];
  const ambient = ctx.createRadialGradient(
    x + w / 2,
    y + h / 2,
    0,
    x + w / 2,
    y + h / 2,
    Math.max(w, h) * 0.4,
  );
  ambient.addColorStop(0, hexToRgba(glowColor, 0.13));
  ambient.addColorStop(1, hexToRgba(glowColor, 0));
  ctx.fillStyle = ambient;
  ctx.fillRect(x, y, w, h);

  // PetCreature 主图（在底色 + ambient 之后，inner overlays 之前）
  // CSS padding 8 24 → 24 left/right, 8 top/bottom
  if (petCreatureSvg) {
    const padX = 24;
    const padY = 8;
    await drawPetCreatureSvg(ctx, petCreatureSvg, x + padX, y + padY, w - 2 * padX, h - 2 * padY);
  }

  // inner top/bottom highlight bands (from .artWindow::before linear-gradient)
  const innerLin = ctx.createLinearGradient(x, y, x, y + h);
  innerLin.addColorStop(0, 'rgba(212,175,55,0.15)');
  innerLin.addColorStop(0.3, 'rgba(212,175,55,0)');
  innerLin.addColorStop(0.7, 'rgba(212,175,55,0)');
  innerLin.addColorStop(1, 'rgba(212,175,55,0.1)');
  ctx.fillStyle = innerLin;
  ctx.fillRect(x, y, w, h);

  // vignette 中央透明 → 边缘 0.5 黑
  const vign = ctx.createRadialGradient(
    x + w / 2,
    y + h / 2,
    0,
    x + w / 2,
    y + h / 2,
    Math.max(w, h) * 0.5,
  );
  vign.addColorStop(0, 'rgba(0,0,0,0)');
  vign.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vign;
  ctx.fillRect(x, y, w, h);

  ctx.restore(); // 释放圆角 clip

  // 2px gold border（在 clip 外画，stroke 路径在矩形内 1px，保证不被 clip）
  ctx.save();
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 2;
  roundRectPath(ctx, x + 1, y + 1, w - 2, h - 2, 7);
  ctx.stroke();
  ctx.restore();

  // 4 个 art corner brackets，inset 6
  drawArtCorner(ctx, x + 6, y + 6, 'tl');
  drawArtCorner(ctx, x + w - 6, y + 6, 'tr');
  drawArtCorner(ctx, x + 6, y + h - 6, 'bl');
  drawArtCorner(ctx, x + w - 6, y + h - 6, 'br');

  // Pet_id watermark, bottom-right (CSS bottom:10 right:14)
  ctx.save();
  ctx.font = `600 10px ${FONT_LATIN_SANS}`;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${0.25 * 10}px`;
  ctx.fillStyle = 'rgba(212,175,55,0.3)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(pet.pet_id.toUpperCase(), x + w - 14, y + h - 10);
  ctx.restore();
}

// ── Pack Opened badge (top-left) ───────────────────────────────

function renderPackBadge(ctx: CanvasRenderingContext2D): void {
  // CSS: absolute; top: 28; left: 40; flex; gap 6; padding 4 10; border 1px; radius 3
  // 内容：6×6 圆点 + "Pack Opened" 9px 0.35em uppercase
  const padgeX = 40;
  const padgeY = 28;
  const padX = 10;
  const padY = 4;
  const fs = 9;
  const ls = 0.35 * fs;
  const text = 'Pack Opened'.toUpperCase();

  // 测度文字宽度（含 letter-spacing），用 measureText 拿 ink-bbox
  ctx.save();
  ctx.font = `700 ${fs}px ${FONT_LATIN_SANS}`;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${ls}px`;
  const tm = ctx.measureText(text);
  const textW = tm.width;
  const tAsc = tm.fontBoundingBoxAscent || tm.actualBoundingBoxAscent;
  const tDesc = tm.fontBoundingBoxDescent || tm.actualBoundingBoxDescent;
  const textH = tAsc + tDesc;
  ctx.restore();

  const dotSize = 6;
  const gap = 6;
  const contentH = Math.max(dotSize, textH);
  const badgeH = contentH + 2 * padY;
  const badgeW = padX + dotSize + gap + textW + padX;

  // 圆角矩形 bg
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.strokeStyle = 'rgba(212,175,55,0.35)';
  ctx.lineWidth = 1;
  roundRectPath(ctx, padgeX, padgeY, badgeW, badgeH, 3);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 6×6 dot
  const dotCX = padgeX + padX + dotSize / 2;
  const dotCY = padgeY + badgeH / 2;
  ctx.save();
  ctx.shadowColor = '#ffd700';
  ctx.shadowBlur = 6;
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(dotCX, dotCY, dotSize / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 文字
  ctx.save();
  ctx.font = `700 ${fs}px ${FONT_LATIN_SANS}`;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${ls}px`;
  ctx.fillStyle = 'rgba(212,175,55,0.8)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // baseline 落在 badge 几何中线 + (ascent - descent)/2
  const baseline = dotCY + (tAsc - tDesc) / 2;
  ctx.fillText(text, padgeX + padX + dotSize + gap, baseline);
  ctx.restore();
}

// ── M5: Stats zone + midRule ───────────────────────────────────

const STAT_ORDER: (keyof Pet['stats'])[] = ['HP', 'ATK', 'DEF', 'SPD', 'INT', 'LUK'];

interface StatsLayout {
  zoneX: number;
  zoneY: number;
  zoneW: number;
  zoneH: number;
}

function statsLayout(): StatsLayout {
  // CSS: margin 0 40; padding 12 16; border 1px; grid 2 cols × auto rows; gap 6 vertical 20 horizontal
  // 紧贴 art window (256 + 340 = 596)
  const zoneX = 40;
  const zoneY = 596;
  const zoneW = W - 80;
  // 内容高度：sectionLabel (9 + padding 6 + border 1 + mb 4) + 3 行 stat row (每行 ~14) + gap 6 × 2
  // sectionLabel row ≈ 20, 3 rows × 14 + 2 × 6 = 54, padding 12 上下 → 总高 ≈ 12 + 20 + 54 + 12 = 98
  // 给点余量做 100
  const zoneH = 100;
  return { zoneX, zoneY, zoneW, zoneH };
}

function renderStatsZone(ctx: CanvasRenderingContext2D, pet: Pet): void {
  const { zoneX, zoneY, zoneW, zoneH } = statsLayout();

  // bg + border
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRectPath(ctx, zoneX, zoneY, zoneW, zoneH, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(212,175,55,0.2)';
  ctx.lineWidth = 1;
  roundRectPath(ctx, zoneX + 0.5, zoneY + 0.5, zoneW - 1, zoneH - 1, 3.5);
  ctx.stroke();
  ctx.restore();

  const padX = 16;
  const padY = 12;
  const contentX = zoneX + padX;
  const contentW = zoneW - 2 * padX;

  // ── sectionLabel "CORE STATS" ──
  // 9px, 0.4em letter-spacing, 700, uppercase, rgba(212,175,55,0.6)
  // padding-bottom 6, border-bottom 1px, margin-bottom 4 → 占 ~20px 高
  let cursorY = zoneY + padY;
  ctx.save();
  ctx.font = `700 9px ${FONT_LATIN_SANS}`;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${0.4 * 9}px`;
  ctx.fillStyle = 'rgba(212,175,55,0.6)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const lblM = ctx.measureText('CORE STATS');
  const lblAsc = lblM.fontBoundingBoxAscent || lblM.actualBoundingBoxAscent;
  ctx.fillText('CORE STATS', contentX, cursorY + lblAsc);
  cursorY += lblAsc + 6;
  ctx.restore();

  // section label bottom border
  ctx.fillStyle = 'rgba(212,175,55,0.15)';
  ctx.fillRect(contentX, cursorY, contentW, 1);
  cursorY += 1 + 4; // border + margin-bottom

  // ── 3 行 × 2 列 stat row ──
  const colGap = 20;
  const rowGap = 6;
  const colW = (contentW - colGap) / 2;
  const rowH = 14; // 单行高度（含 bar 6 + 余量）

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      const idx = row * 2 + col;
      const key = STAT_ORDER[idx];
      const value = pet.stats[key];
      const x = contentX + col * (colW + colGap);
      const y = cursorY + row * (rowH + rowGap);
      const rowCY = y + rowH / 2;

      // statKey "HP" etc. — 9px 700 0.2em uppercase rgba(212,175,55,0.7), width 28px
      ctx.save();
      ctx.font = `700 9px ${FONT_LATIN_SANS}`;
      (ctx as unknown as { letterSpacing: string }).letterSpacing = `${0.2 * 9}px`;
      ctx.fillStyle = 'rgba(212,175,55,0.7)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      const km = ctx.measureText(key);
      const kAsc = km.fontBoundingBoxAscent || km.actualBoundingBoxAscent;
      const kDesc = km.fontBoundingBoxDescent || km.actualBoundingBoxDescent;
      ctx.fillText(key, x, rowCY + (kAsc - kDesc) / 2);
      ctx.restore();

      // statBarTrack — 6px tall, flex 1
      const barX = x + 28 + 8; // statKey 宽度 28 + gap 8
      const barRight = x + colW - 26 - 8; // statNum 宽度 26 + gap 8
      const barW = barRight - barX;
      const barY = rowCY - 3;
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      roundRectPath(ctx, barX, barY, barW, 6, 3);
      ctx.fill();
      ctx.restore();

      // statBarFill — linear-gradient(90deg, #8b6914, #ffd700) + glow
      const isHigh = value >= 85;
      const fillW = (barW * value) / 100;
      ctx.save();
      const fillGrad = ctx.createLinearGradient(barX, barY, barX + fillW, barY);
      if (isHigh) {
        fillGrad.addColorStop(0, '#d4af37');
        fillGrad.addColorStop(0.5, '#ffe866');
        fillGrad.addColorStop(1, '#ffd700');
        ctx.shadowColor = 'rgba(255,215,0,0.9)';
        ctx.shadowBlur = 10;
      } else {
        fillGrad.addColorStop(0, '#8b6914');
        fillGrad.addColorStop(1, '#ffd700');
        ctx.shadowColor = 'rgba(212,175,55,0.6)';
        ctx.shadowBlur = 6;
      }
      ctx.fillStyle = fillGrad;
      roundRectPath(ctx, barX, barY, fillW, 6, 3);
      ctx.fill();
      ctx.restore();

      // statNum — 11px 700 tabular-nums 金色，width 26 right-align
      ctx.save();
      ctx.font = `700 11px ${FONT_LATIN_SANS}`;
      ctx.fillStyle = '#ffd700';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      const vm = ctx.measureText(String(value));
      const vAsc = vm.fontBoundingBoxAscent || vm.actualBoundingBoxAscent;
      const vDesc = vm.fontBoundingBoxDescent || vm.actualBoundingBoxDescent;
      ctx.fillText(String(value), x + colW, rowCY + (vAsc - vDesc) / 2);
      ctx.restore();
    }
  }
}

function renderMidRule(ctx: CanvasRenderingContext2D, y: number): void {
  // CSS: margin 5 40, height 1px, gradient transparent → gold 0.5 mid → transparent
  const x = 40;
  const w = W - 80;
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, 'rgba(212,175,55,0)');
  grad.addColorStop(0.15, 'rgba(212,175,55,0.25)');
  grad.addColorStop(0.5, 'rgba(212,175,55,0.5)');
  grad.addColorStop(0.85, 'rgba(212,175,55,0.25)');
  grad.addColorStop(1, 'rgba(212,175,55,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, 1);
}

// ── M6: Faction banners + skills + lore + footer ───────────────

type Faction = 'chat' | 'cowork' | 'code';

const FACTION_PALETTE: Record<
  Faction,
  { bg: string; border: string; gemInner: string; gemOuter: string; fillTop: string; fillBottom: string; glow: string }
> = {
  chat:   { bg: 'rgba(43,0,10,0.8)',  border: 'rgba(220,38,90,0.4)',
            gemInner: '#ff6b9d', gemOuter: '#8b0037',
            fillTop: 'rgba(220,38,90,0)', fillBottom: '#dc265a',
            glow: 'rgba(220,38,90,0.5)' },
  cowork: { bg: 'rgba(0,15,43,0.8)',  border: 'rgba(37,99,235,0.4)',
            gemInner: '#60a5fa', gemOuter: '#1e3a8a',
            fillTop: 'rgba(37,99,235,0)', fillBottom: '#2563eb',
            glow: 'rgba(37,99,235,0.5)' },
  code:   { bg: 'rgba(0,43,15,0.8)',  border: 'rgba(16,185,129,0.4)',
            gemInner: '#6ee7b7', gemOuter: '#065f46',
            fillTop: 'rgba(16,185,129,0)', fillBottom: '#10b981',
            glow: 'rgba(16,185,129,0.5)' },
};

function dominantFaction(fa: Pet['faction_affinity']): Faction {
  const keys: Faction[] = ['chat', 'cowork', 'code'];
  return keys.reduce((a, b) => (fa[a] >= fa[b] ? a : b));
}

function renderFactionZone(ctx: CanvasRenderingContext2D, pet: Pet): void {
  // 紧跟 midRule (701 + 1) + margin 6 → y = 708
  const zoneY = 708;
  const zoneX = 40;
  const zoneW = W - 80;
  const gap = 6;
  const boxW = (zoneW - 2 * gap) / 3;
  const boxH = 82; // padding 10+10 + label 10 + gap 6 + gem 48 = ~82
  const dom = dominantFaction(pet.faction_affinity);
  const factions: Faction[] = ['chat', 'cowork', 'code'];

  factions.forEach((faction, i) => {
    const x = zoneX + i * (boxW + gap);
    const y = zoneY;
    const val = pet.faction_affinity[faction];
    const p = FACTION_PALETTE[faction];
    const isDom = faction === dom;

    // bg + 圆角 4 + border
    ctx.save();
    roundRectPath(ctx, x, y, boxW, boxH, 4);
    ctx.fillStyle = p.bg;
    ctx.fill();
    ctx.restore();

    // 底部 affinity fill — height: val% × boxH, opacity 0.25, vertical gradient
    ctx.save();
    roundRectPath(ctx, x, y, boxW, boxH, 4);
    ctx.clip();
    const fillH = (boxH * val) / 100;
    const fillGrad = ctx.createLinearGradient(x, y + boxH, x, y + boxH - fillH);
    fillGrad.addColorStop(0, p.fillBottom);
    fillGrad.addColorStop(1, p.fillTop);
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = fillGrad;
    ctx.fillRect(x, y + boxH - fillH, boxW, fillH);
    ctx.restore();

    // border (dom 用更亮的色 + glow)
    ctx.save();
    if (isDom) {
      ctx.strokeStyle = p.fillBottom;
      ctx.lineWidth = 2;
      ctx.shadowColor = p.glow;
      ctx.shadowBlur = 16;
    } else {
      ctx.strokeStyle = p.border;
      ctx.lineWidth = 1;
    }
    roundRectPath(ctx, x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, boxW - ctx.lineWidth, boxH - ctx.lineWidth, 4 - ctx.lineWidth / 2);
    ctx.stroke();
    ctx.restore();

    // 内容 stack: label + gem (gap 6)，整体 vertically center
    const boxCX = x + boxW / 2;
    const padY = 10;
    const labelFs = 8;
    const gemR = 24;
    const gemSize = 48;
    const innerGap = 6;
    // 测度 label 行 ink 高度
    ctx.save();
    ctx.font = `700 ${labelFs}px ${FONT_LATIN_SANS}`;
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${0.2 * labelFs}px`;
    const lm = ctx.measureText(faction.toUpperCase());
    const lAsc = lm.actualBoundingBoxAscent;
    const lDesc = lm.actualBoundingBoxDescent;
    const lInkH = lAsc + lDesc;
    ctx.restore();
    const stackH = lInkH + innerGap + gemSize;
    const stackTop = y + (boxH - stackH) / 2;

    // label 行
    ctx.save();
    ctx.font = `700 ${labelFs}px ${FONT_LATIN_SANS}`;
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${0.2 * labelFs}px`;
    ctx.fillStyle = 'rgba(245,233,200,0.55)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const lblText = faction.toUpperCase();
    const labelBaseline = stackTop + lAsc;
    const labelW = lm.actualBoundingBoxRight + lm.actualBoundingBoxLeft;
    ctx.fillText(lblText, boxCX - labelW / 2 + lm.actualBoundingBoxLeft, labelBaseline);
    ctx.restore();

    // gem 圆球 48×48 in stack
    const gemCX = boxCX;
    const gemCY = stackTop + lInkH + innerGap + gemR;
    const gemGrad = ctx.createRadialGradient(
      gemCX - gemR * 0.3,
      gemCY - gemR * 0.3,
      0,
      gemCX,
      gemCY,
      gemR,
    );
    gemGrad.addColorStop(0, p.gemInner);
    gemGrad.addColorStop(0.8, p.gemOuter);

    ctx.save();
    ctx.shadowColor = p.glow;
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = gemGrad;
    ctx.beginPath();
    ctx.arc(gemCX, gemCY, gemR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // gem border 2px (用 gem inner color)
    ctx.save();
    ctx.strokeStyle = p.gemInner;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(gemCX, gemCY, gemR - 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 数值（20px 900 white, dead-center in gem）
    ctx.save();
    ctx.font = `900 20px ${FONT_LATIN_SANS}`;
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 1;
    drawTextCentered(ctx, String(val), gemCX, gemCY);
    ctx.restore();
  });
}

// ── Skill scrolls ──────────────────────────────────────────────

const SKILL_TYPE_BADGE_PALETTE: Record<
  'ult' | 'main' | 'std',
  { glyph: string; bgInner: string; bgOuter: string; border: string; shadow: string }
> = {
  ult:  { glyph: '⚡', bgInner: '#ffe866', bgOuter: '#8b6914', border: '#ffd700', shadow: 'rgba(255,215,0,0.7)' },
  main: { glyph: '◆', bgInner: '#e0e0e0', bgOuter: '#666',    border: '#c0c0c0', shadow: 'rgba(192,192,192,0.5)' },
  std:  { glyph: '▸', bgInner: 'rgba(30,30,40,0.8)', bgOuter: 'rgba(30,30,40,0.8)', border: 'rgba(255,255,255,0.15)', shadow: 'rgba(0,0,0,0)' },
};

const SKILL_ELEM_PALETTE: Record<
  Element,
  { bg: string; fg: string; border: string }
> = {
  '火': { bg: 'rgba(255,107,53,0.2)',  fg: '#ff6b35', border: 'rgba(255,107,53,0.4)' },
  '水': { bg: 'rgba(79,195,247,0.2)',  fg: '#4fc3f7', border: 'rgba(79,195,247,0.4)' },
  '土': { bg: 'rgba(141,110,99,0.2)',  fg: '#a1887f', border: 'rgba(141,110,99,0.4)' },
  '雷': { bg: 'rgba(255,241,118,0.2)', fg: '#fff176', border: 'rgba(255,241,118,0.4)' },
  '暗': { bg: 'rgba(124,77,255,0.2)',  fg: '#b39ddb', border: 'rgba(124,77,255,0.4)' },
  '金': { bg: 'rgba(232,232,232,0.15)',fg: '#e0e0e0', border: 'rgba(232,232,232,0.3)' },
};

function renderSkillsZone(ctx: CanvasRenderingContext2D, pet: Pet, startY: number): number {
  // ── scroll divider ──
  const dividerY = startY;
  const dividerFs = 9;
  const glyphFs = 14;
  ctx.save();
  ctx.font = `700 ${dividerFs}px ${FONT_LATIN_SANS}`;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${0.4 * dividerFs}px`;
  ctx.fillStyle = 'rgba(212,175,55,0.6)';
  const labelStr = 'SKILL MATRIX';
  const lm = ctx.measureText(labelStr);
  const lblW = lm.actualBoundingBoxRight + lm.actualBoundingBoxLeft;
  ctx.restore();

  // 整条线含 [line] [glyph] [label] [glyph] [line]，gap 12
  const cardCX = W / 2;
  // glyph + space + label + space + glyph
  const innerGap = 12;
  const innerW = glyphFs + innerGap + lblW + innerGap + glyphFs;
  const lineMaxW = (W - 80 - innerW) / 2 - 8;

  ctx.fillStyle = 'rgba(212,175,55,0.4)';
  // left line
  const lineL_X1 = 40;
  const lineL_X2 = 40 + lineMaxW;
  const lineGradL = ctx.createLinearGradient(lineL_X1, dividerY, lineL_X2, dividerY);
  lineGradL.addColorStop(0, 'rgba(212,175,55,0)');
  lineGradL.addColorStop(1, 'rgba(212,175,55,0.4)');
  ctx.fillStyle = lineGradL;
  ctx.fillRect(lineL_X1, dividerY, lineMaxW, 1);
  // right line
  const lineR_X1 = W - 40 - lineMaxW;
  const lineR_X2 = W - 40;
  const lineGradR = ctx.createLinearGradient(lineR_X1, dividerY, lineR_X2, dividerY);
  lineGradR.addColorStop(0, 'rgba(212,175,55,0.4)');
  lineGradR.addColorStop(1, 'rgba(212,175,55,0)');
  ctx.fillStyle = lineGradR;
  ctx.fillRect(lineR_X1, dividerY, lineMaxW, 1);

  // glyph ✦ + label + glyph ✦
  ctx.save();
  ctx.font = `400 ${glyphFs}px ${FONT_LATIN_SANS}`;
  ctx.fillStyle = 'rgba(212,175,55,0.7)';
  drawTextCentered(ctx, '✦', cardCX - lblW / 2 - innerGap - glyphFs / 2, dividerY);
  drawTextCentered(ctx, '✦', cardCX + lblW / 2 + innerGap + glyphFs / 2, dividerY);
  ctx.restore();

  ctx.save();
  ctx.font = `700 ${dividerFs}px ${FONT_LATIN_SANS}`;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${0.4 * dividerFs}px`;
  ctx.fillStyle = 'rgba(212,175,55,0.6)';
  drawTextCentered(ctx, labelStr, cardCX, dividerY);
  ctx.restore();

  // ── 4 skill rows ──
  // 按 type 排序：ult > main > std
  const skillOrder = ['ult', 'main', 'std'] as const;
  const sorted = [...pet.skills].sort(
    (a, b) => skillOrder.indexOf(a.type) - skillOrder.indexOf(b.type),
  );

  const zoneX = 40;
  const zoneW = W - 80;
  const rowGap = 5;
  const rowH = 62; // 8 padding + 36 badge + 8 padding ≈ 52; 加 name + desc 行 max 62
  let cursorY = dividerY + 16;

  sorted.forEach((skill, idx) => {
    const y = cursorY;
    const tPalette = SKILL_TYPE_BADGE_PALETTE[skill.type];
    const isUlt = skill.type === 'ult';
    const isMain = skill.type === 'main';

    // bg + border
    ctx.save();
    if (isUlt) {
      // ult: linear-gradient(135deg, rgba(43,27,0,0.9) → rgba(0,0,0,0.7))
      const ubg = ctx.createLinearGradient(zoneX, y, zoneX + zoneW, y + rowH);
      ubg.addColorStop(0, 'rgba(43,27,0,0.9)');
      ubg.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = ubg;
    } else if (isMain) {
      const mbg = ctx.createLinearGradient(zoneX, y, zoneX + zoneW, y + rowH);
      mbg.addColorStop(0, 'rgba(20,20,30,0.9)');
      mbg.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = mbg;
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
    }
    roundRectPath(ctx, zoneX, y, zoneW, rowH, 4);
    ctx.fill();

    // border
    if (isUlt) {
      ctx.strokeStyle = 'rgba(212,175,55,0.5)';
      ctx.lineWidth = 2;
    } else if (isMain) {
      ctx.strokeStyle = 'rgba(192,192,192,0.35)';
      ctx.lineWidth = 1;
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
    }
    roundRectPath(
      ctx,
      zoneX + ctx.lineWidth / 2,
      y + ctx.lineWidth / 2,
      zoneW - ctx.lineWidth,
      rowH - ctx.lineWidth,
      4 - ctx.lineWidth / 2,
    );
    ctx.stroke();
    ctx.restore();

    // skill type badge (36×36 圆)
    const badgeR = 18;
    const badgeCX = zoneX + 12 + badgeR;
    const badgeCY = y + 12 + badgeR;
    if (skill.type !== 'std') {
      ctx.save();
      const bgRad = ctx.createRadialGradient(
        badgeCX - badgeR * 0.3,
        badgeCY - badgeR * 0.3,
        0,
        badgeCX,
        badgeCY,
        badgeR,
      );
      bgRad.addColorStop(0, tPalette.bgInner);
      bgRad.addColorStop(0.8, tPalette.bgOuter);
      ctx.shadowColor = tPalette.shadow;
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = bgRad;
      ctx.beginPath();
      ctx.arc(badgeCX, badgeCY, badgeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.save();
      ctx.fillStyle = 'rgba(30,30,40,0.8)';
      ctx.beginPath();
      ctx.arc(badgeCX, badgeCY, badgeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.strokeStyle = tPalette.border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(badgeCX, badgeCY, badgeR - 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // glyph dead-center
    ctx.save();
    ctx.font = `900 16px ${FONT_LATIN_SANS}`;
    ctx.fillStyle = isUlt ? '#ffd700' : isMain ? '#e0e0e0' : 'rgba(245,233,200,0.5)';
    drawTextCentered(ctx, tPalette.glyph, badgeCX, badgeCY);
    ctx.restore();

    // skill body (right of badge): name + meta on top, desc below
    const bodyX = badgeCX + badgeR + 10;
    const bodyW = zoneX + zoneW - 12 - bodyX;
    const headY = y + 8;
    const nameFs = 17;
    const powerFs = isUlt ? 17 : 15;
    const elemBoxSize = 28;
    const elemFs = 14;
    const headH = Math.max(nameFs, elemBoxSize);

    // power text 测度
    ctx.save();
    ctx.font = `900 ${powerFs}px ${FONT_LATIN_SANS}`;
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${0.05 * powerFs}px`;
    const powerStr = `PWR ${skill.power}`;
    const pm = ctx.measureText(powerStr);
    const pAsc = pm.fontBoundingBoxAscent || pm.actualBoundingBoxAscent;
    const pDesc = pm.fontBoundingBoxDescent || pm.actualBoundingBoxDescent;
    ctx.restore();

    // 右边 meta 区起点：从 row right 减去 [elemBox + 10 + power text]
    const metaGap = 10;
    const elemBoxX = zoneX + zoneW - 12 - elemBoxSize;
    const powerRight = elemBoxX - metaGap;

    // skill name (Inter 700 17px 0.04em) 左对齐
    ctx.save();
    ctx.font = `700 ${nameFs}px ${FONT_MIXED_SANS}`;
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${0.04 * nameFs}px`;
    ctx.fillStyle = isUlt ? '#ffd700' : '#f5e9c8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const nm = ctx.measureText(skill.name);
    const nAsc = nm.fontBoundingBoxAscent || nm.actualBoundingBoxAscent;
    const nDesc = nm.fontBoundingBoxDescent || nm.actualBoundingBoxDescent;
    // 让 name 与 elem badge 视觉中心对齐：line center at headY + headH/2
    const headCY = headY + headH / 2;
    const nameBaseline = headCY + (nAsc - nDesc) / 2;
    // truncate if 太长
    let drawName = skill.name;
    const maxNameW = powerRight - metaGap - bodyX;
    if (nm.width > maxNameW) {
      while (drawName.length > 0 && ctx.measureText(drawName + '…').width > maxNameW) {
        drawName = drawName.slice(0, -1);
      }
      drawName = drawName + '…';
    }
    ctx.fillText(drawName, bodyX, nameBaseline);
    ctx.restore();

    // PWR text 右对齐 (powerRight 即末端 right edge)
    ctx.save();
    ctx.font = `900 ${powerFs}px ${FONT_LATIN_SANS}`;
    (ctx as unknown as { letterSpacing: string }).letterSpacing = `${0.05 * powerFs}px`;
    ctx.fillStyle = isUlt ? '#ffe866' : '#ffd700';
    if (isUlt) {
      ctx.shadowColor = 'rgba(255,215,0,0.8)';
      ctx.shadowBlur = 8;
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    const powerBaseline = headCY + (pAsc - pDesc) / 2;
    ctx.fillText(powerStr, powerRight, powerBaseline);
    ctx.restore();

    // element badge (28×28 rounded box, glyph dead-center)
    const ep = SKILL_ELEM_PALETTE[skill.element];
    ctx.save();
    ctx.fillStyle = ep.bg;
    roundRectPath(ctx, elemBoxX, headY + (headH - elemBoxSize) / 2, elemBoxSize, elemBoxSize, 4);
    ctx.fill();
    ctx.strokeStyle = ep.border;
    ctx.lineWidth = 1;
    roundRectPath(
      ctx,
      elemBoxX + 0.5,
      headY + (headH - elemBoxSize) / 2 + 0.5,
      elemBoxSize - 1,
      elemBoxSize - 1,
      3.5,
    );
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = `700 ${elemFs}px ${FONT_MIXED_SERIF}`;
    ctx.fillStyle = ep.fg;
    drawTextCentered(
      ctx,
      skill.element,
      elemBoxX + elemBoxSize / 2,
      headY + (headH - elemBoxSize) / 2 + elemBoxSize / 2,
    );
    ctx.restore();

    // skill desc (14px italic 1.5 lh, 0.85 opacity 米黄)
    // 单行 left-aligned，超长 truncate
    const descY = headY + headH + 4;
    ctx.save();
    ctx.font = `400 14px ${FONT_MIXED_SANS}`;
    ctx.fillStyle = 'rgba(245,233,200,0.85)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    const dm = ctx.measureText(skill.description);
    const dAsc = dm.fontBoundingBoxAscent || dm.actualBoundingBoxAscent;
    let drawDesc = skill.description;
    const maxDescW = bodyW;
    if (dm.width > maxDescW) {
      while (drawDesc.length > 0 && ctx.measureText(drawDesc + '…').width > maxDescW) {
        drawDesc = drawDesc.slice(0, -1);
      }
      drawDesc = drawDesc + '…';
    }
    ctx.fillText(drawDesc, bodyX, descY + dAsc);
    ctx.restore();

    cursorY += rowH + rowGap;
  });

  return cursorY; // skills end Y
}

function renderLoreScroll(ctx: CanvasRenderingContext2D, pet: Pet, y: number): number {
  if (!pet.lore) return y;
  // margin 6 40, padding 10 20, height auto. 内含双引号 + lore text。
  const startY = y + 6;
  const x = 40;
  const w = W - 80;
  const padX = 20;
  const padY = 10;
  const fs = 13;
  const quoteFs = 22;
  const innerGap = 12;
  const h = padY + Math.max(fs, quoteFs) + padY;

  // bg
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(x, startY, w, h);

  // top + bottom border
  ctx.fillStyle = 'rgba(212,175,55,0.2)';
  ctx.fillRect(x, startY, w, 1);
  ctx.fillRect(x, startY + h - 1, w, 1);

  // 测度 lore 文本
  ctx.save();
  ctx.font = `400 italic ${fs}px ${FONT_MIXED_SERIF}`;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${0.06 * fs}px`;
  const lm = ctx.measureText(pet.lore);
  const loreW = lm.actualBoundingBoxRight + lm.actualBoundingBoxLeft;
  ctx.restore();

  // 测度引号
  ctx.save();
  ctx.font = `400 ${quoteFs}px ${FONT_LATIN_SERIF}`;
  const qm = ctx.measureText('"');
  const quoteW = qm.actualBoundingBoxRight + qm.actualBoundingBoxLeft;
  ctx.restore();

  // 总 stack width: quote + gap + lore + gap + quote, dead-center 在 x + w/2
  const stackW = quoteW + innerGap + loreW + innerGap + quoteW;
  const stackLeft = x + (w - stackW) / 2;
  const lineCY = startY + h / 2;

  // 左引号
  ctx.save();
  ctx.font = `400 ${quoteFs}px ${FONT_LATIN_SERIF}`;
  ctx.fillStyle = 'rgba(212,175,55,0.4)';
  drawTextCentered(ctx, '"', stackLeft + quoteW / 2, lineCY);
  ctx.restore();

  // lore 文本
  ctx.save();
  ctx.font = `400 italic ${fs}px ${FONT_MIXED_SERIF}`;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${0.06 * fs}px`;
  ctx.fillStyle = 'rgba(245,233,200,0.65)';
  drawTextCentered(ctx, pet.lore, stackLeft + quoteW + innerGap + loreW / 2, lineCY);
  ctx.restore();

  // 右引号
  ctx.save();
  ctx.font = `400 ${quoteFs}px ${FONT_LATIN_SERIF}`;
  ctx.fillStyle = 'rgba(212,175,55,0.4)';
  drawTextCentered(ctx, '"', stackLeft + quoteW + innerGap + loreW + innerGap + quoteW / 2, lineCY);
  ctx.restore();

  return startY + h;
}

const LLM_BADGE_PALETTE: Record<
  Pet['source_llm'],
  { bg: string; fg: string; border: string }
> = {
  claude:   { bg: 'rgba(208,114,44,0.25)', fg: '#d0722c', border: 'rgba(208,114,44,0.5)' },
  chatgpt:  { bg: 'rgba(16,185,129,0.2)',  fg: '#10b981', border: 'rgba(16,185,129,0.4)' },
  gemini:   { bg: 'rgba(66,133,244,0.2)',  fg: '#4285f4', border: 'rgba(66,133,244,0.4)' },
  deepseek: { bg: 'rgba(124,77,255,0.2)',  fg: '#7c4dff', border: 'rgba(124,77,255,0.4)' },
};

function renderFooterStrip(ctx: CanvasRenderingContext2D, pet: Pet): void {
  // CSS: absolute bottom 26, left 40, right 40, padding 8 16, bg rgba(0,0,0,0.6), border 1, radius 4
  const stripX = 40;
  const stripW = W - 80;
  const padX = 16;
  const padY = 8;
  // 内含：[SOURCE label] [llm badge]，居中 LLMPETARENA，右边 pet_id
  const labelFs = 9;
  const badgeFs = 10;
  const siteFs = 10;
  const pidFs = 9;
  const stripH = padY + Math.max(labelFs, badgeFs + 6, siteFs, pidFs) + padY + 6;
  const stripY = H - 26 - stripH;

  // bg + border
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRectPath(ctx, stripX, stripY, stripW, stripH, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(212,175,55,0.2)';
  ctx.lineWidth = 1;
  roundRectPath(ctx, stripX + 0.5, stripY + 0.5, stripW - 1, stripH - 1, 3.5);
  ctx.stroke();
  ctx.restore();

  const cy = stripY + stripH / 2;

  // 左：SOURCE + llm badge
  ctx.save();
  ctx.font = `600 ${labelFs}px ${FONT_LATIN_SANS}`;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${0.15 * labelFs}px`;
  ctx.fillStyle = 'rgba(245,233,200,0.3)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const sm = ctx.measureText('SOURCE');
  const sAsc = sm.fontBoundingBoxAscent || sm.actualBoundingBoxAscent;
  const sDesc = sm.fontBoundingBoxDescent || sm.actualBoundingBoxDescent;
  ctx.fillText('SOURCE', stripX + padX, cy + (sAsc - sDesc) / 2);
  const sw = sm.width;
  ctx.restore();

  // llm badge: padding 3 10, radius 3, 10px 700 0.15em uppercase
  const lp = LLM_BADGE_PALETTE[pet.source_llm];
  const llmText = pet.source_llm.toUpperCase();
  ctx.save();
  ctx.font = `700 ${badgeFs}px ${FONT_LATIN_SANS}`;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${0.15 * badgeFs}px`;
  const bm = ctx.measureText(llmText);
  const badgeTextW = bm.width;
  const badgeW = badgeTextW + 20;
  const badgeH = badgeFs + 8;
  const badgeX = stripX + padX + sw + 8;
  const badgeY = cy - badgeH / 2;

  ctx.fillStyle = lp.bg;
  roundRectPath(ctx, badgeX, badgeY, badgeW, badgeH, 3);
  ctx.fill();
  ctx.strokeStyle = lp.border;
  ctx.lineWidth = 1;
  roundRectPath(ctx, badgeX + 0.5, badgeY + 0.5, badgeW - 1, badgeH - 1, 2.5);
  ctx.stroke();

  ctx.fillStyle = lp.fg;
  drawTextCentered(ctx, llmText, badgeX + badgeW / 2, cy);
  ctx.restore();

  // 中：LLMPETARENA 居中
  ctx.save();
  ctx.font = `700 ${siteFs}px ${FONT_LATIN_SANS}`;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${0.25 * siteFs}px`;
  ctx.fillStyle = 'rgba(212,175,55,0.5)';
  drawTextCentered(ctx, 'LLMPETARENA', stripX + stripW / 2, cy);
  ctx.restore();

  // 右：pet_id
  ctx.save();
  ctx.font = `400 ${pidFs}px ${FONT_LATIN_SANS}`;
  (ctx as unknown as { letterSpacing: string }).letterSpacing = `${0.2 * pidFs}px`;
  ctx.fillStyle = 'rgba(245,233,200,0.2)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  const pm = ctx.measureText(pet.pet_id.toUpperCase());
  const pAsc = pm.fontBoundingBoxAscent || pm.actualBoundingBoxAscent;
  const pDesc = pm.fontBoundingBoxDescent || pm.actualBoundingBoxDescent;
  ctx.fillText(pet.pet_id.toUpperCase(), stripX + stripW - padX, cy + (pAsc - pDesc) / 2);
  ctx.restore();
}

// ── Main entry ─────────────────────────────────────────────────

/**
 * 渲染 Pet 卡到 HTMLCanvasElement（1080 × 1350 逻辑像素，DPR 2 → 2160 × 2700 物理像素）。
 *
 * 注意：当前阶段返回的 canvas 含：
 *   - M1: 框架几何 (outer/inner frame + rarity band + 4 corner ornaments)
 *   - M2: name banner ribbon + Cinzel/Inter 文字
 *   - M3+ TODO
 */
/**
 * 可选参数：传入已渲染的 PetCreature SVG element，用于 art window 合成。
 * 调用方一般这样取：`document.querySelector('svg[viewBox="0 0 400 340"]')`
 */
export interface RenderOptions {
  petCreatureSvg?: SVGElement | null;
}

export async function renderPetCardToCanvas(
  pet: Pet,
  opts: RenderOptions = {},
): Promise<HTMLCanvasElement> {
  // 字体先 ready，否则 measureText 用 fallback 字体度量
  await ensureFontsReady();


  const canvas = document.createElement('canvas');
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('failed to acquire 2d context');

  // Retina scale — 之后所有坐标用逻辑 1080×1350
  ctx.scale(DPR, DPR);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // ── 1. 卡体 clip 到 32px 圆角矩形 ──
  ctx.save();
  roundRectPath(ctx, 0, 0, W, H, 32);
  ctx.clip();

  // 2. 背景渐变 + 半色调点纹
  renderBackground(ctx);
  renderHalftoneDots(ctx);

  // 3. 顶部稀有度带（已自带顶端圆角 clip）
  renderRarityBand(ctx, pet.rarity);

  ctx.restore(); // 解除卡体 clip

  // ── 4. 外金框 + 内细框 ──
  renderOuterFrame(ctx);
  renderInnerFrame(ctx);

  // ── 5. 4 个角饰 ──
  renderCorners(ctx);

  // ── 6. [M2] Name banner + Cinzel typography ──
  renderNameBanner(ctx, pet);

  // ── 7. [M3] Class strip + element badges + rarity gem + pack badge ──
  renderClassStrip(ctx, pet);
  renderRarityGem(ctx, pet);
  renderPackBadge(ctx);

  // ── 8. [M4] Art window + PetCreature SVG raster ──
  await renderArtWindow(ctx, pet, opts.petCreatureSvg ?? undefined);

  // ── 9. [M5] Stats zone + midRule ──
  renderStatsZone(ctx, pet);
  // CSS: midRule 紧跟 statsZone (margin 5)，y = 596 + 100 + 5 = 701
  renderMidRule(ctx, 701);

  // ── 10. [M6] Faction zone + skills + lore + footer ──
  renderFactionZone(ctx, pet);
  // factionZone ends at 708 + 82 = 790. scrollDivider margin 8 → y = 798
  const skillsEndY = renderSkillsZone(ctx, pet, 798);
  // lore margin 6
  renderLoreScroll(ctx, pet, skillsEndY);
  renderFooterStrip(ctx, pet);

  return canvas;
}

/**
 * 导出 Pet 卡为 PNG，触发浏览器下载。
 */
export async function exportPetCardAsPng(
  pet: Pet,
  filename: string,
  opts: RenderOptions = {},
): Promise<void> {
  const canvas = await renderPetCardToCanvas(pet, opts);
  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  );
  if (!blob) throw new Error('canvas.toBlob returned null');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
