// ===== src/share2/rough-svg.js · rough.js → SVG 手绘装饰（DOM 分享图专用） =====
// 思路与旧 canvas 版一致：固定 seed 保证同位置同抖动；但输出是 SVG path 字符串，
// 可直接内联进分享图 DOM，由 html-to-image 一起栅格化。
// sets 类型：'path'=描边轮廓、'fillPath'=实心多边形、'fillSketch'=纹理线（逐线 stroke）。

import rough from 'roughjs';

const _g = rough.generator();

function _seed(x, y) {
  return Math.abs(Math.round(x * 13.7 + y * 7.3)) % 99991;
}

function num(n) {
  return Math.round(n * 100) / 100;
}

/** rough ops 数组 → SVG path d 字符串 */
export function opsToPath(ops) {
  let d = '';
  for (const o of ops || []) {
    const p = o.data || [];
    switch (o.op) {
      case 'move': d += `M${num(p[0])} ${num(p[1])}`; break;
      case 'lineTo': d += `L${num(p[0])} ${num(p[1])}`; break;
      case 'bcurveTo': d += `C${num(p[0])} ${num(p[1])},${num(p[2])} ${num(p[3])},${num(p[4])} ${num(p[5])}`; break;
      case 'qcurveTo': d += `Q${num(p[0])} ${num(p[1])},${num(p[2])} ${num(p[3])}`; break;
      case 'arcTo': d += `A${num(p[4])} ${num(p[4])} 0 0 1 ${num(p[2])} ${num(p[3])}`; break;
      case 'close': d += 'Z'; break;
      default: break;
    }
  }
  return d;
}

/** drawable → 多个 <path> 字符串（fill/stroke/sketch 分派） */
function drawablePaths(drawable, { fill, stroke, strokeWidth = 1.5, fillWidth = 1.2 } = {}) {
  let out = '';
  for (const set of drawable.sets) {
    const d = opsToPath(set.ops);
    if (!d) continue;
    if (set.type === 'fillPath' && fill) {
      out += `<path d="${d}" fill="${fill}" stroke="none"/>`;
    } else if (set.type === 'fillSketch' && fill) {
      out += `<path d="${d}" fill="none" stroke="${fill}" stroke-width="${fillWidth}" stroke-linecap="round"/>`;
    } else if (set.type === 'path' && stroke) {
      out += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`;
    }
  }
  return out;
}

/** 手绘矩形框 → <svg> 字符串（r>0 圆角） */
export function roughBoxSVG(x, y, w, h, { r = 0, stroke = 'rgba(58,52,37,0.4)', strokeWidth = 1.5, roughness = 1.1, bowing = 1.2, fill = null, fillStyle = 'solid', fillWidth = 1.2 } = {}) {
  const drawable = r > 0
    ? _g.path(roundRectD(x, y, w, h, r), { roughness, bowing, stroke, strokeWidth, fill, fillStyle, seed: _seed(x, y) })
    : _g.rectangle(x, y, w, h, { roughness, bowing, stroke, strokeWidth, fill, fillStyle, seed: _seed(x, y) });
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" overflow="visible">${drawablePaths(drawable, { fill, stroke, strokeWidth, fillWidth })}</svg>`;
}

/** 手绘线段 → <svg> 字符串（代替 hairline 的克制动感） */
export function roughLineSVG(x1, y1, x2, y2, { stroke = 'rgba(58,52,37,0.4)', strokeWidth = 1.4, roughness = 1.4, bowing = 1.6 } = {}) {
  const drawable = _g.line(x1, y1, x2, y2, { roughness, bowing, stroke, strokeWidth, seed: _seed(x1, y1) });
  return `<svg x="0" y="0" width="${Math.abs(x2 - x1) + 8}" height="${Math.abs(y2 - y1) + 8}" overflow="visible">${drawablePaths(drawable, { stroke, strokeWidth })}</svg>`;
}

/** SVG 圆角矩形 path 字符串（供 rough generator.path 用） */
export function roundRectD(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  return `M${x + r},${y} A${r},${r} 0 0 1 ${x + w},${y} L${x + w},${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} L${x + r},${y + h} A${r},${r} 0 0 1 ${x},${y + h - r} L${x},${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
}

/** 朱砂印章框（手绘描边；「浮/生」文字由 HTML 叠印） */
export function sealBoxSVG(size = 48, color = '#a83b32') {
  return roughBoxSVG(0, 0, size, size, {
    r: 8,
    stroke: color,
    strokeWidth: 1.6,
    roughness: 1.0,
    fill: 'rgba(168,59,50,0.07)',
  });
}

/**
 * 五行手绘图标（24×24 视口，rough 线条绘本感）
 * wx: 木/火/土/金/水；默认（不识别）画金=菱中菱
 */
export function wxIconSVG(wx = '', color = '#6fae9c', size = 24) {
  const s = size / 24;
  const L = (x1, y1, x2, y2, w = 1.6) => {
    const drawable = _g.line(x1 * s, y1 * s, x2 * s, y2 * s, { roughness: 1.4, bowing: 1.6, stroke: color, strokeWidth: w, seed: _seed(x1, y1) });
    return drawablePaths(drawable, { stroke: color, strokeWidth: w });
  };
  let body = '';
  switch (wx) {
    case '水': // 波纹三道（上疏下密）
      body = L(3, 6, 21, 6) + L(4, 12, 20, 12, 1.7) + L(5, 18, 19, 18, 1.9);
      break;
    case '木': // 主干 + 左右两枝
      body = L(12, 4, 12, 20, 1.8) + L(12, 9, 6, 5) + L(12, 13, 18, 9);
      break;
    case '火': // 火苗外廓 + 内焰
      body = L(12, 3, 6, 14, 1.9) + L(6, 14, 18, 14, 1.6) + L(18, 14, 12, 3, 1.6)
        + L(12, 9, 9.5, 16.5, 1.4) + L(9.5, 16.5, 14.5, 16.5, 1.2) + L(14.5, 16.5, 12, 9, 1.2);
      break;
    case '土': // 山丘 + 地平线
      body = L(3, 17, 10, 8, 1.8) + L(10, 8, 17, 17, 1.8) + L(3, 17, 17, 17, 1.4) + L(17, 17, 21, 17, 1.4);
      break;
    case '金':
    default: // 菱中菱（收敛、贵重）
      body = L(12, 3, 21, 12, 1.8) + L(21, 12, 12, 21, 1.8) + L(12, 21, 3, 12, 1.8) + L(3, 12, 12, 3, 1.8)
        + L(12, 8.5, 15.5, 12, 1.3) + L(15.5, 12, 12, 15.5, 1.3) + L(12, 15.5, 8.5, 12, 1.3) + L(8.5, 12, 12, 8.5, 1.3);
      break;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" aria-hidden="true">${body}</svg>`;
}

/** 手绘分隔线（占满宽度的带两端刻度的细线，比纯 CSS 边框有绘本感） */
export function dividerSVG(x1, x2, y, { stroke = 'rgba(58,52,37,0.3)', strokeWidth = 1.3 } = {}) {
  const drawable = _g.line(x1, y, x2, y, { roughness: 1.6, bowing: 1.8, stroke, strokeWidth, seed: _seed(x1, y) });
  return `<svg width="${Math.round(x2 - x1) + 4}" height="${strokeWidth + 8}" overflow="visible">${drawablePaths(drawable, { stroke, strokeWidth })}</svg>`;
}
