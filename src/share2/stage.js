// ===== src/share2/stage.js · 分享图 DOM 渲染引擎（新一代） =====
// HTML+CSS 排版 → html-to-image 截图 → 画到 canvas（保存/复制/Electron 链路零改动复用）。
// 出图固定 1080×1440（3:4 朋友圈黄金比例），pixelRatio=2 输出 2160×2880 高清 PNG。
// 工作流（对齐现代开源方案如 ray.so / @vercel/og 的思路）：
//   1. 模板函数返回完整 HTML 字符串（含 rough.js SVG 手绘装饰）
//   2. 挂到隐藏舞台节点（fixed 左移出视口，不占布局、不触发滚动）
//   3. html-to-image 克隆节点 → 内联资源 → SVG foreignObject → canvas → PNG blob
//   4. blob 画回目标 canvas，下游保存/复制/系统分享全部复用

import { toBlob } from 'html-to-image';
import { loadQRImage } from '../utils/qr.js';
import { QR_TARGET } from './style.js';
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
let qrPromise = null;

/** 二维码 dataURL（缓存；失败给空串，模板自行降级） */
function getQRDataUrl() {
  if (qrCache !== null && qrCache !== undefined) return Promise.resolve(qrCache);
  qrPromise = qrPromise || loadQRImage(QR_TARGET, 160, { dark: '#3a3226', light: '#efe9d8' })
    .then(img => { qrCache = img.src; return qrCache; })
    .catch(() => { qrCache = ''; return qrCache; });
  return qrPromise;
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
  const qr = await getQRDataUrl();
  const html = renderer(data, qr);

  // 注意：舞台节点必须在视口内（left:0/top:0）——html-to-image 对离屏节点（如 left:-12000px）
  // 的 foreignObject 克隆渲染会整图为空（实测全背景色、零内容）。故放视口内 + opacity:0 隐藏，
  // 截图时用 style 选项强制可见（html-to-image 官方推荐处理隐藏节点的方式），零闪烁、不挡交互。
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
      backgroundColor: '#efe9d8',
      skipFonts: true, // 纯系统字体栈，无需 webfont 内联（避免 base64 膨胀）
      style: { opacity: '1' }, // 覆盖舞台节点的 opacity:0，否则克隆节点继承透明样式 → 空白
    });
    if (!blob) throw new Error('html-to-image 返回空 blob');

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

/** 可用模板列表（供注册/展示用） */
export function getDomTemplates() {
  return Object.keys(TEMPLATE_RENDERERS);
}

/** 动态注册 DOM 模板：name → renderHTML(data, qr) 返回 HTML 字符串 */
export function registerDomTemplate(name, renderFn) {
  if (typeof renderFn === 'function') {
    TEMPLATE_RENDERERS[name] = renderFn;
  }
  return TEMPLATE_RENDERERS;
}
