// ===== src/share2/stage.js · 分享图 DOM 渲染引擎（新一代） =====
// HTML+CSS 排版 → dom-to-image-more 截图 → 画到 canvas（保存/复制/Electron 链路零改动复用）。
// 出图固定 1080×1440（3:4 朋友圈黄金比例），pixelRatio=2 输出 2160×2880 高清 PNG。
// 工作流（对齐现代开源方案如 ray.so / @vercel/og 的思路）：
//   1. 模板函数返回完整 HTML 字符串（含 rough.js SVG 手绘装饰）
//   2. 挂到隐藏舞台节点（fixed 视口内 + opacity:0，不占布局、不触发滚动）
//   3. dom-to-image-more 克隆节点（ensureShown 官方隐藏节点修复）→ SVG foreignObject → PNG blob
//   4. blob 画回目标 canvas，下游保存/复制/系统分享全部复用

import { toBlob } from 'dom-to-image-more';
import { qrSVGHTML } from '../utils/qr.js';
import { QR_TARGET, getPaper } from './style.js';
import { renderDailyHTML } from './templates/daily.js';
import { renderArcanaHTML } from './templates/arcana.js';
import { renderDivinationHTML } from './templates/divination.js';

const TEMPLATE_RENDERERS = {
  daily: renderDailyHTML,
  arcana: renderArcanaHTML,
  divination: renderDivinationHTML,
};

const OUT_W = 1080;
const OUT_H = 1440;
const RATIO = 2;

let qrCache = '';
let qrBuilt = false;

/** 二维码内联 SVG（同步缓存：uqr 无网络/无 img 时序，天然防花边框/空白） */
function getQRSVG() {
  if (!qrBuilt) {
    const p = getPaper().dark;
    qrCache = qrSVGHTML(QR_TARGET, { size: 160, dark: p.goldDeep, light: '#FFFFFF' });
    qrBuilt = true;
  }
  return qrCache;
}

function waitFor(node) {
  const imgs = [...node.querySelectorAll('img')]
    .filter(img => !img.complete)
    .map(img => new Promise(res => { img.onload = res; img.onerror = res; }));
  const fonts = typeof document !== 'undefined' && document.fonts
    ? document.fonts.ready.catch(() => {})
    : Promise.resolve();
  return Promise.all([...imgs, fonts]);
}

/** 核心：模板 → DOM → PNG blob → 画回 canvas（2160×2880） */
export async function renderShareCardDOM(canvas, data, template = 'divination') {
  const renderer = TEMPLATE_RENDERERS[template] || TEMPLATE_RENDERERS.divination;
  const html = renderer(data, getQRSVG());

  // 舞台节点保持视口内（left:0/top:0）+ opacity:0：
  // dom-to-image-more 提供 ensureShown 官方修复（克隆前强制可见再还原），
  // style.opacity:'1' 双保险覆盖，避免 foreignObject 整图为空。
  const node = document.createElement('div');
  node.id = 'fsp-share-stage';
  node.style.cssText = `position:fixed;left:0;top:0;width:${OUT_W}px;height:${OUT_H}px;pointer-events:none;z-index:-1;opacity:0;`;
  node.innerHTML = html;
  document.body.appendChild(node);

  try {
    await waitFor(node);
    const blob = await toBlob(node, {
      width: OUT_W,
      height: OUT_H,
      pixelRatio: RATIO,
      backgroundColor: getPaper().dark.bg0,
      skipFonts: true, // 纯系统字体栈，无需 webfont 内联（避免 base64 膨胀）
      ensureShown: true, // 官方隐藏节点修复（替代手动 opacity hack）
      style: { opacity: '1' }, // 双保险：克隆时强制可见
    });
    if (!blob) throw new Error('dom-to-image-more 返回空 blob');

    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = () => rej(new Error('PNG blob 解码失败'));
        img.src = url;
      });
      canvas.width = OUT_W * RATIO;
      canvas.height = OUT_H * RATIO;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } finally {
      URL.revokeObjectURL(url);
    }
  } finally {
    node.remove();
  }
}
