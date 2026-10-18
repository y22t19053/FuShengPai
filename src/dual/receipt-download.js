// ===== src/dual/receipt-download.js · 把回执 HTML 渲染成 PNG 并下载 =====
import { toBlob } from 'dom-to-image-more';
import { renderReceiptHTML, W, H } from './receipt-html.js';

export async function downloadReceipt(data, filename = `浮生牌_对读回执_${data?.voucher?.fp || 'FS'}.png`) {
  const html = renderReceiptHTML(data);
  const stage = document.createElement('div');
  stage.style.cssText = `position:fixed;left:0;top:0;width:${W}px;height:${H}px;z-index:-1;opacity:0;pointer-events:none;`;
  stage.innerHTML = html;
  document.body.appendChild(stage);
  try {
    const blob = await toBlob(stage, { width: W, height: H, pixelRatio: 2, backgroundColor: '#efe9d8', skipFonts: true, ensureShown: true, style: { opacity: '1' } });
    if (!blob) throw new Error('渲染失败');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  } finally {
    stage.remove();
  }
}
