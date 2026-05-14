// 一键复制工具：现代 API 优先，老浏览器降级到 execCommand。
// 返回 true 表示已写入剪贴板；false 表示需要用户手动复制。

export async function copyToClipboard(text: string): Promise<boolean> {
  // 现代 API（HTTPS / localhost 才可用）
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 继续走 fallback
    }
  }
  // Fallback：临时 textarea + execCommand
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-99999px';
    ta.style.top = '0';
    ta.setAttribute('readonly', '');
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
