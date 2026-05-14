import html2canvas from 'html2canvas';

interface ExportOptions {
  filename?: string;
  scale?: number;
}

// 将 DOM 元素导出为 1080×1350 的 PNG，自动处理：
// 1. 等字体加载完，避免 FOUT 进 PNG
// 2. 克隆节点到 off-screen 1080px 容器，避开 preview 的 transform: scale
export async function exportElementAsPng(
  element: HTMLElement,
  { filename = 'pet-card.png', scale = 2 }: ExportOptions = {},
): Promise<void> {
  if (document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // 字体 API 不可用，继续
    }
  }

  const clone = element.cloneNode(true) as HTMLElement;
  const wrap = document.createElement('div');
  Object.assign(wrap.style, {
    position: 'fixed',
    left: '-99999px',
    top: '0',
    width: '1080px',
  });
  wrap.appendChild(clone);
  document.body.appendChild(wrap);
  // 兜底：清除 preview 内联缩放
  (clone.firstElementChild as HTMLElement | null)?.style.setProperty(
    'transform',
    'none',
    'important',
  );

  try {
    const canvas = await html2canvas(clone, {
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
  } finally {
    document.body.removeChild(wrap);
  }
}
