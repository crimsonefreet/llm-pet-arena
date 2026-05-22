/**
 * Legacy html2canvas-based PNG export — **DEPRECATED** since C1 rewrite (2026-05-22).
 *
 * 已被 `lib/export/canvas-renderer.ts` 取代。新路径用 Canvas 2D API + measureText
 * dead-center 渲染，根治了 html2canvas 的：
 *   - SVG radial gradient banding（水平横条）
 *   - background-clip: text 无 fallback（金属字消失）
 *   - line-height < 1.15 时 baseline 下沉
 *   - font-metric center ≠ ink-bbox center（文字"中间偏下"）
 *
 * 本文件保留作为：
 *   1. Git 历史可追溯的 reference
 *   2. 万一 Canvas 路径出现关键缺陷时的紧急 fallback
 *
 * 不要在新代码引用。`ExportButton` 已切到 canvas-renderer。
 */

import html2canvas from 'html2canvas';

interface ExportOptions {
  filename?: string;
  scale?: number;
}

/**
 * @deprecated 用 `exportPetCardAsPng` from `@/lib/export/canvas-renderer` 代替。
 */
export async function exportElementAsPng(
  element: HTMLElement,
  { filename = 'pet-card.png', scale = 2 }: ExportOptions = {},
): Promise<void> {
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* font API 不可用 */
    }
  }
  const canvas = await html2canvas(element, {
    backgroundColor: '#000000',
    scale,
    useCORS: true,
    logging: false,
    width: 1080,
    height: 1350,
  });
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
