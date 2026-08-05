// ===== src/share2/theme.js · 分享图统一设计系统（手绘绘本档案） =====
// 三张分享图（牌灵 / 日运 / 解读）共用同一套版式骨架：
//   品牌栏 → 标题区 → 内容区 → 落款行 + 二维码
// 设计原则：
//   1. 精确网格：四边距 96、内容宽 888，一切坐标由常量推导，杜绝随手摆放
//   2. 克制光效：无噪点、无随机光斑、无夸张 shadowBlur，仅 1px 半透明鼠尾草线分隔
//   3. 双色板：DARK 暖纸（牌灵/解读）+ LIGHT 浅纸（日运），骨架与字体完全一致
//   4. 二维码统一右下角白底墨点 88px，深/浅色底上都是唯一亮块，扫描友好
// 所有模板只 import 本文件，禁止各自为政。

import { loadQRImage } from '../utils/qr.js';
import rough from 'roughjs';

const _g = rough.generator();

// ---------- 手绘质感（rough.js 封装） ----------
// 全部 helper 用固定 seed（由坐标推导）：同位置同抖动，多图统一精致。
// sets 类型：'path'=描边轮廓、'fillPath'=实心多边形、'fillSketch'=纹理线（须逐线 stroke）

function _seed(x, y) {
  return Math.abs(Math.round(x * 13.7 + y * 7.3)) % 99991;
}

/** 逐 op 执行 rough 路径（ops 数据在 o.data 数组） */
function applyOps(ctx, ops) {
  ctx.beginPath();
  for (const o of ops) {
    const d = o.data || [];
    switch (o.op) {
      case 'move': ctx.moveTo(d[0], d[1]); break;
      case 'lineTo': ctx.lineTo(d[0], d[1]); break;
      case 'bcurveTo': ctx.bezierCurveTo(d[0], d[1], d[2], d[3], d[4], d[5]); break;
      case 'qcurveTo': ctx.quadraticCurveTo(d[0], d[1], d[2], d[3]); break;
      case 'arcTo': ctx.arcTo(d[0], d[1], d[2], d[3], d[4]); break;
      case 'close': ctx.closePath(); break;
    }
  }
}

/** 渲染 rough drawable 到现有 ctx（fill/stroke 按 sets 类型分派） */
function roughRender(ctx, drawable, { fill, stroke, lineWidth = 1.5, fillWidth = 1.2 } = {}) {
  for (const set of drawable.sets) {
    if (set.type === 'fillPath' && fill) {
      ctx.save();
      ctx.fillStyle = fill;
      applyOps(ctx, set.ops);
      ctx.fill();
      ctx.restore();
    } else if (set.type === 'fillSketch' && fill) {
      ctx.save();
      ctx.strokeStyle = fill;
      ctx.lineWidth = fillWidth;
      applyOps(ctx, set.ops);
      ctx.stroke();
      ctx.restore();
    } else if (set.type === 'path' && stroke) {
      ctx.save();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = lineWidth;
      applyOps(ctx, set.ops);
      ctx.stroke();
      ctx.restore();
    }
  }
}

/** 手绘矩形框（替代直角描边，r=0 直角 / r>0 圆角） */
export function roughBox(ctx, x, y, w, h, { r = 0, stroke = 'rgba(58,52,37,0.4)', lineWidth = 1.5, roughness = 1.1, bowing = 1.2, fill = null, fillStyle = 'solid', fillWidth = 1.2 } = {}) {
  const d = r > 0
    ? _g.path(roundRectD(x, y, w, h, r), { roughness, bowing, stroke, strokeWidth: lineWidth, fill, fillStyle, seed: _seed(x, y) })
    : _g.rectangle(x, y, w, h, { roughness, bowing, stroke, strokeWidth: lineWidth, fill, fillStyle, seed: _seed(x, y) });
  roughRender(ctx, d, { fill, stroke, lineWidth, fillWidth });
}

/** 手绘圆形（cx,cy 圆心，r 半径） */
export function roughCircle(ctx, cx, cy, r, { stroke = 'rgba(58,52,37,0.4)', lineWidth = 1.5, roughness = 1.1, bowing = 1.2, fill = null, fillStyle = 'solid', fillWidth = 1.2 } = {}) {
  const d = _g.circle(cx, cy, r * 2, { roughness, bowing, stroke, strokeWidth: lineWidth, fill, fillStyle, seed: _seed(cx, cy) });
  roughRender(ctx, d, { fill, stroke, lineWidth, fillWidth });
}

/** 手绘线段（轻微抖动，替代 hairline 的克制动感） */
export function roughLine(ctx, x1, y1, x2, y2, { stroke = 'rgba(58,52,37,0.4)', lineWidth = 1.4, roughness = 1.4, bowing = 1.6 } = {}) {
  const d = _g.line(x1, y1, x2, y2, { roughness, bowing, stroke, strokeWidth: lineWidth, seed: _seed(x1, y1) });
  roughRender(ctx, d, { stroke, lineWidth });
}

// ---------- 落款池 + 确定性挑选（分享图文案花样，同一天稳定不变） ----------

/** 落款金句池：疏离哲学人设——牌是镜子不是灯 */
export const FOOTER_NOTES = [
  '牌是提示，不是命令。',
  '牌不替你活，路是你走的。',
  '观牌知势，不语已明。',
  '你抽到的，只是你已知道的。',
  '牌是镜子，照见的是你自己。',
  '问牌不如问心，牌只是引子。',
  '这一签，与今天的你有约。',
  '命如纸，笔在你手。',
  '牌落无声，心照不宣。',
  '浮生若梦，牌是醒着做的梦。',
];

/** 简易字符串哈希（FNV-1a 变体，够用即可） */
function hashStr(s) {
  let h = 0x811c9dc5;
  for (const ch of String(s || '')) {
    h ^= ch.charCodeAt(0);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}

/** 按种子确定性挑选（同一种子永远同一条，分享图/解读同一天稳定） */
export function pickBySeed(seedText, arr) {
  if (!arr || !arr.length) return '';
  return arr[hashStr(String(seedText || '')) % arr.length];
}

/** 五行手绘小图标（24×24 视口，rough 线条绘本感——小元素也用手绘） */
export function roughWxIcon(ctx, x, y, wx, { size = 24, color = '#6fae9c' } = {}) {
  ctx.save();
  const s = size / 24;
  const L = (x1, y1, x2, y2) => roughLine(ctx, x + x1 * s, y + y1 * s, x + x2 * s, y + y2 * s, {
    stroke: color, lineWidth: 1.6, roughness: 1.3, bowing: 1.5,
  });
  if (wx === '水') {
    // 波纹三道
    L(2, 16, 9, 10); L(7, 19, 14, 13); L(12, 18, 22, 8);
  } else if (wx === '木') {
    // 主干 + 两枝
    L(12, 21, 12, 7); L(12, 15, 7, 10); L(12, 12, 17, 7);
  } else if (wx === '火') {
    // 火苗外廓 + 内焰
    L(12, 3, 6, 14); L(6, 14, 12, 21); L(12, 21, 18, 14); L(18, 14, 12, 3);
    L(12, 10, 9, 15); L(9, 15, 12, 17); L(12, 17, 15, 15); L(15, 15, 12, 10);
  } else if (wx === '土') {
    // 山丘 + 地平线
    L(2, 18, 12, 8); L(12, 8, 22, 18); L(5, 18, 19, 18); L(9, 14, 12, 11); L(12, 11, 15, 14);
  } else {
    // 金：菱中菱
    L(12, 2, 18, 12); L(18, 12, 12, 22); L(12, 22, 6, 12); L(6, 12, 12, 2);
    L(12, 6, 15, 12); L(15, 12, 12, 18); L(12, 18, 9, 12); L(9, 12, 12, 6);
  }
  ctx.restore();
}

/** 圆角矩形 SVG path（供 roughBox 的 r>0 使用） */
function roundRectD(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  return `M${x + rr},${y} L${x + w - rr},${y} A${rr},${rr} 0 0 1 ${x + w},${y + rr} L${x + w},${y + h - rr} A${rr},${rr} 0 0 1 ${x + w - rr},${y + h} L${x + rr},${y + h} A${rr},${rr} 0 0 1 ${x},${y + h - rr} L${x},${y + rr} A${rr},${rr} 0 0 1 ${x + rr},${y} Z`;
}

export const W = 1080;
export const H = 1440;
export const M = 96;       // 左右边距
export const CW = W - M * 2; // 内容宽 = 888

// ---------- 色板 ----------

/** 暖纸底（牌灵 / 解读）——手绘绘本：暖纸米白、鼠尾草点缀、暖墨字 */
export const DARK = {
  bg0: '#efe9d8',
  bg1: '#e6ddc9',
  bg2: '#dbd0b6',
  ink: '#3a3425',                 // 主文字（暖墨）
  inkDim: 'rgba(58,52,37,0.58)',
  inkFaint: 'rgba(58,52,37,0.32)',
  gold: '#6fae9c',
  goldDim: 'rgba(111,174,156,0.45)',
  goldFaint: 'rgba(111,174,156,0.16)',
  red: '#c96f52',                 // 陶土红（红牌 / 警示）
  line: 'rgba(58,52,37,0.14)',
};

/** 浅纸底（日运） */
export const LIGHT = {
  bg0: '#f6f0e2',
  bg1: '#eae2cf',
  bg2: '#efe9d8',
  ink: '#3a3425',                 // 暖墨
  inkDim: 'rgba(58,52,37,0.55)',
  inkFaint: 'rgba(58,52,37,0.3)',
  gold: '#4d8f7e',                // 深鼠尾草
  goldDim: 'rgba(77,143,126,0.45)',
  goldFaint: 'rgba(77,143,126,0.16)',
  red: '#c96f52',                 // 陶土红
  line: 'rgba(58,52,37,0.22)',
};

/** 分享图静态色板：DARK 暖纸 + LIGHT 浅纸，全鼠尾草手绘系全一致 */

// ---------- 字体栈 ----------
// 统一圆润无衬线：奶油糖果风不留衬线尖角（与 style.css --font-serif 对齐）

export const SERIF = '"PingFang SC","HarmonyOS Sans SC","MiSans","Noto Sans SC","Microsoft YaHei","Segoe UI",sans-serif';
export const SANS = '"PingFang SC","HarmonyOS Sans SC","MiSans","Noto Sans SC","Microsoft YaHei","Segoe UI",sans-serif';
export const NUM = '"Segoe UI","PingFang SC","Microsoft YaHei","Helvetica Neue",sans-serif';

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
  const qrSize = 80;
  const qrX = W - M - qrSize;
  const sealSize = 48;
  drawSeal(ctx, t, qrX - sealSize - 36, y - sealSize + 6, sealSize);

  // 二维码：白底墨点（深浅底色通用）
  const qrY = y - qrSize + 4;
  // 死链接钉死：不用 window.location，防止本地环境干扰
  const qrTarget = 'https://y22t19053.github.io/FuShengPai/';
  const qrImg = await loadQRImage(qrTarget, qrSize, { dark: '#3a3226', light: '#efe9d8' });
  if (!qrImg) return;
  ctx.save();
  ctx.fillStyle = '#efe9d8';
  roundRectPath(ctx, qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(58,50,38,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
  ctx.restore();
}

/** 落款朱砂印章：手绘描边 + 竖排两字（克制高级感，不喧宾夺主） */
export function drawSeal(ctx, t, x, y, size = 48) {
  const sealColor = '#a83b32'; // 朱砂
  ctx.save();
  roughBox(ctx, x, y, size, size, {
    r: 8,
    stroke: sealColor,
    lineWidth: 1.6,
    roughness: 1.0,
    fill: 'rgba(168,59,50,0.07)',
    fillStyle: 'solid',
  });
  ctx.fillStyle = sealColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = font(600, 18);
  ctx.fillText('浮', x + size / 2, y + size * 0.33);
  ctx.fillText('生', x + size / 2, y + size * 0.72);
  ctx.restore();
}

/** 色值取亮（用于画布上判断是否深色主题） */
export function isDark(t) {
  return t === DARK;
}
