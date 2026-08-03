// ===== src/share2/theme.js · 分享图统一设计系统（玄金档案） =====
// 三张分享图（牌灵 / 日运 / 解读）共用同一套版式骨架：
//   品牌栏 → 标题区 → 内容区 → 落款行 + 二维码
// 设计原则：
//   1. 精确网格：四边距 96、内容宽 888，一切坐标由常量推导，杜绝随手摆放
//   2. 克制光效：无噪点、无随机光斑、无夸张 shadowBlur，仅 1px 半透明金线分隔
//   3. 双色板：DARK 玄金（牌灵/解读）+ LIGHT 宣纸（日运），骨架与字体完全一致
//   4. 二维码统一右下角白底墨点 88px，深/浅色底上都是唯一亮块，扫描友好
// 所有模板只 import 本文件，禁止各自为政。

import { loadQRImage } from '../utils/qr.js';

export const W = 1080;
export const H = 1440;
export const M = 96;       // 左右边距
export const CW = W - M * 2; // 内容宽 = 888

// ---------- 色板 ----------

/** 深色玄金（牌灵 / 解读） */
export const DARK = {
  bg0: '#0e0e18',
  bg1: '#161625',
  bg2: '#1d1d2f',
  ink: '#ece8dd',                 // 主文字（米白）
  inkDim: 'rgba(236,232,221,0.58)',
  inkFaint: 'rgba(236,232,221,0.32)',
  gold: '#c9a96e',
  goldDim: 'rgba(201,169,110,0.45)',
  goldFaint: 'rgba(201,169,110,0.16)',
  red: '#d25b52',                 // 朱砂（红牌 / 警示）
  line: 'rgba(201,169,110,0.24)',
};

/** 浅色宣纸（日运） */
export const LIGHT = {
  bg0: '#f2ecde',
  bg1: '#e9e0cc',
  bg2: '#efe7d6',
  ink: '#3d3527',                 // 墨棕
  inkDim: 'rgba(61,53,39,0.55)',
  inkFaint: 'rgba(61,53,39,0.3)',
  gold: '#9c7c43',                // 哑金
  goldDim: 'rgba(156,124,67,0.45)',
  goldFaint: 'rgba(156,124,67,0.16)',
  red: '#b04a3d',                 // 朱砂
  line: 'rgba(61,53,39,0.22)',
};

// ---------- 字体栈 ----------

export const SERIF = '"Noto Serif SC","Source Han Serif SC","Songti SC","SimSun","STSong","KaiTi",serif';
export const SANS = '"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif';
export const NUM = '"Georgia","Times New Roman",serif';

/** 字体快捷：font(600, 24) / font(300, 14, NUM) */
export function font(weight, size, family = SERIF) {
  return `${weight} ${size}px ${family}`;
}

// ---------- 基础几何 ----------

/** 圆角矩形路径 */
export function roundRectPath(ctx, x, y, w, h, r) {
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

/** 文本换行（按字符，中文安全） */
export function wrapText(ctx, text, maxWidth, maxLines = Infinity) {
  const lines = [];
  let current = '';
  for (const ch of String(text || '')) {
    const test = current + ch;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = ch;
      if (lines.length >= maxLines) break;
    } else {
      current = test;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  return lines.slice(0, maxLines);
}

/** 1px 半透明细线（克制分隔） */
export function hairline(ctx, x1, y1, x2, y2, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/** 背景：垂直渐变 + 极淡中心径向（无噪点无光斑） */
export function paintBackground(ctx, t, w = W, h = H) {
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, t.bg0);
  bg.addColorStop(1, t.bg1);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const gx = w / 2, gy = h * 0.42;
  const halo = ctx.createRadialGradient(gx, gy, 0, gx, gy, h * 0.7);
  halo.addColorStop(0, 'rgba(255,255,255,0.028)');
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);
}

// ---------- 版式骨架 ----------

/**
 * 品牌栏：左上「浮生牌」+ 英文衬线小字；右上日期 + 可选的右侧标签；下接 1px 金线
 */
export function drawBrandBar(ctx, t, { dateText = '', rightLabel = '' } = {}) {
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = t.gold;
  ctx.font = font(600, 26);
  ctx.fillText('浮 生 牌', M, 90);
  ctx.fillStyle = t.inkFaint;
  ctx.font = font(300, 13, NUM);
  ctx.fillText('FLOATING LIFE', M, 118);

  ctx.textAlign = 'right';
  ctx.fillStyle = t.inkDim;
  ctx.font = font(400, 16);
  ctx.fillText(dateText || '', W - M, 90);
  if (rightLabel) {
    ctx.fillStyle = t.inkFaint;
    ctx.font = font(300, 13);
    ctx.fillText(rightLabel, W - M, 118);
  }
  hairline(ctx, M, 144, W - M, 144, t.line);
  ctx.restore();
}

/**
 * 底部落款 + 二维码（统一 88px 白底墨点）
 * @param {string} note - 主落款（如「牌是提示，不是命令。」）
 * @param {string} sub  - 副落款（如「观牌知势 · 数据只存本机」）
 */
export async function drawFooter(ctx, t, { note = '牌是提示，不是命令。', sub = '观牌知势 · 数据只存本机' } = {}) {
  const y = H - 90;
  hairline(ctx, M, y - 56, W - M, y - 56, t.line);
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.gold;
  ctx.font = font(600, 26);
  ctx.fillText(note, M, y);
  ctx.fillStyle = t.inkDim;
  ctx.font = font(300, 16);
  ctx.fillText(sub, M, y + 34);
  ctx.restore();

  // 朱砂落款印（二维码左侧，书画落款式克制装饰）
  const qrSize = 88;
  const qrX = W - M - qrSize;
  const sealSize = 52;
  drawSeal(ctx, t, qrX - sealSize - 34, y - sealSize + 4, sealSize);

  // 二维码：白底墨点（深浅底色通用）
  const qrY = y - qrSize + 4;
  // 死链接钉死：不用 window.location，防止本地环境干扰
  const qrTarget = 'https://y22t19053.github.io/FuShengPai/';
  const qrImg = await loadQRImage(qrTarget, qrSize, { dark: '#3a3226', light: '#f6f1e6' });
  if (!qrImg) return;
  ctx.save();
  ctx.fillStyle = '#f6f1e6';
  roundRectPath(ctx, qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(58,50,38,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  ctx.restore();
}

/** 落款朱砂印章：细描边 + 竖排两字（克制高级感，不喧宾夺主） */
export function drawSeal(ctx, t, x, y, size = 52) {
  const sealColor = '#a83b32'; // 朱砂
  ctx.save();
  ctx.fillStyle = 'rgba(168,59,50,0.06)';
  roundRectPath(ctx, x, y, size, size, 6);
  ctx.fill();
  ctx.strokeStyle = sealColor;
  ctx.lineWidth = 1.6;
  roundRectPath(ctx, x, y, size, size, 6);
  ctx.stroke();
  ctx.fillStyle = sealColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font(600, 19);
  ctx.fillText('浮', x + size / 2, y + size * 0.33);
  ctx.fillText('生', x + size / 2, y + size * 0.72);
  ctx.restore();
}

/** 色值取亮（用于画布上判断是否深色主题） */
export function isDark(t) {
  return t === DARK;
}
