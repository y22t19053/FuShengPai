// ===== src/share2/frame-svg.js · 手绘装饰 SVG（有界 · 无 rough.js 依赖） =====
// 替换 rough-svg.js：roughjs 的贝塞尔控制点会溢出盒子（实测可达 -598 / +1383），
// 在分享图上留下穿越整图的乱线。本模块所有路径坐标都严格限定在自身盒子内：
//   1. 抖动 ±0.9px 内（固定正弦种子 → 确定性，同参数同形状）
//   2. 描边内缩 strokeWidth/2 + 0.5，配合 overflow:hidden 不会裁掉半条线
//   3. 每个 <svg> 强制 overflow:hidden，从根上杜绝溢出
// 保留原 API 名（wxIconSVG/sealBoxSVG/dividerSVG），frameBoxSVG 取代 roughBoxSVG。

const num = (n) => Math.round(n * 100) / 100;
const wob = (seed, amp = 0.75) => Math.sin(seed * 12.9898 + 78.233) * amp;

function strokePath(d, color, width) {
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/** 圆角矩形路径（手绘感：逐角微差 + 四边中点微弧，全部抖动限定在盒子内） */
function framePath(x, y, w, h, r, seed = 1) {
  const rr = Math.min(Math.max(0, r), w / 2, h / 2);
  const rTL = Math.max(0, rr + wob(seed, 1.1));
  const rTR = Math.max(0, rr + wob(seed + 1, 1.1));
  const rBR = Math.max(0, rr + wob(seed + 2, 1.1));
  const rBL = Math.max(0, rr + wob(seed + 3, 1.1));
  const mx = wob(seed + 4, 0.9);
  const my = wob(seed + 5, 0.9);
  return [
    `M${num(x + rTL)} ${num(y)}`,
    `Q${num(x + w / 2 + mx)} ${num(y + 0.6)} ${num(x + w - rTR)} ${num(y)}`,
    `A${num(rTR)} ${num(rTR)} 0 0 1 ${num(x + w)} ${num(y + rTR)}`,
    `Q${num(x + w - 0.6)} ${num(y + h / 2 + mx)} ${num(x + w)} ${num(y + h - rBR)}`,
    `A${num(rBR)} ${num(rBR)} 0 0 1 ${num(x + w - rBR)} ${num(y + h)}`,
    `Q${num(x + w / 2 + my)} ${num(y + h - 0.6)} ${num(x + rBL)} ${num(y + h)}`,
    `A${num(rBL)} ${num(rBL)} 0 0 1 ${num(x)} ${num(y + h - rBL)}`,
    `Q${num(x + 0.6)} ${num(y + h / 2 + my)} ${num(x)} ${num(y + rTL)}`,
    `A${num(rTL)} ${num(rTL)} 0 0 1 ${num(x + rTL)} ${num(y)}`,
    'Z',
  ].join(' ');
}

/** 手绘矩形框 → <svg>（r>0 圆角；fill 可选，描边内缩不裁线，overflow:hidden 防乱线） */
export function frameBoxSVG(x, y, w, h, { r = 0, stroke = 'rgba(58,52,37,0.4)', strokeWidth = 1.5, fill = null } = {}) {
  const inset = Math.max(0.75, strokeWidth / 2 + 0.5);
  const d = framePath(
    x + inset, y + inset,
    Math.max(0, w - inset * 2), Math.max(0, h - inset * 2),
    Math.max(0, r - inset),
    Math.abs(Math.round(x * 13.7 + y * 7.3)),
  );
  const fillAttr = fill ? `<path d="${d}" fill="${fill}" stroke="none"/>` : '';
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" overflow="hidden">${fillAttr}${strokePath(d, stroke, strokeWidth)}</svg>`;
}

/** 朱砂印章框（双圈 + 轻微手绘差；「浮/生」文字由 HTML 叠印） */
export function sealBoxSVG(size = 48, color = '#a83b32') {
  const d1 = framePath(1.6, 1.6, size - 3.2, size - 3.2, 7, 91);
  const d2 = framePath(5.5, 5.5, size - 11, size - 11, 3.5, 92);
  return `<svg width="${size}" height="${size}" overflow="hidden" fill="none">${strokePath(d1, color, 1.6)}${strokePath(d2, color, 1.1)}</svg>`;
}

/**
 * 五行手绘图标（viewBox 有界，端点抖动 ±0.5px，overflow:hidden 兜底）
 * wx: 木/火/土/金/水；默认（不识别）画金=菱中菱
 */
export function wxIconSVG(wx = '', color = '#6fae9c', size = 24) {
  const s = size / 24;
  const L = (x1, y1, x2, y2, w = 1.6, seed) => {
    const jx = wob(seed, 0.5) * s;
    const jy = wob(seed + 3, 0.5) * s;
    return `<path d="M${num(x1 * s + jx)} ${num(y1 * s + jy)} L${num(x2 * s + jx)} ${num(y2 * s + jy)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
  };
  let body = '';
  switch (wx) {
    case '水': // 波纹三道（上疏下密）
      body = L(3, 6, 21, 6, 1.6, 1) + L(4, 12, 20, 12, 1.7, 2) + L(5, 18, 19, 18, 1.9, 3);
      break;
    case '木': // 主干 + 左右两枝
      body = L(12, 4, 12, 20, 1.8, 4) + L(12, 9, 6, 5, 1.6, 5) + L(12, 13, 18, 9, 1.6, 6);
      break;
    case '火': // 火苗外廓 + 内焰
      body = L(12, 3, 6, 14, 1.9, 7) + L(6, 14, 18, 14, 1.6, 8) + L(18, 14, 12, 3, 1.6, 9)
        + L(12, 9, 9.5, 16.5, 1.4, 10) + L(9.5, 16.5, 14.5, 16.5, 1.2, 11) + L(14.5, 16.5, 12, 9, 1.2, 12);
      break;
    case '土': // 山丘 + 地平线
      body = L(3, 17, 10, 8, 1.8, 13) + L(10, 8, 17, 17, 1.8, 14) + L(3, 17, 17, 17, 1.4, 15) + L(17, 17, 21, 17, 1.4, 16);
      break;
    case '金':
    default: // 菱中菱（收敛、贵重）
      body = L(12, 3, 21, 12, 1.8, 17) + L(21, 12, 12, 21, 1.8, 18) + L(12, 21, 3, 12, 1.8, 19) + L(3, 12, 12, 3, 1.8, 20)
        + L(12, 8.5, 15.5, 12, 1.3, 21) + L(15.5, 12, 12, 15.5, 1.3, 22) + L(12, 15.5, 8.5, 12, 1.3, 23) + L(8.5, 12, 12, 8.5, 1.3, 24);
      break;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" overflow="hidden" fill="none" aria-hidden="true">${body}</svg>`;
}

/** 手绘分隔线（两端带刻度细线，宽度精确等于区间，overflow:hidden） */
export function dividerSVG(x1, x2, y, { stroke = 'rgba(58,52,37,0.3)', strokeWidth = 1.3 } = {}) {
  const w = Math.round(x2 - x1) + 6;
  const ly = strokeWidth / 2 + 2;
  const d = `M2 ${num(ly + wob(7, 0.5))} L${num(w - 4)} ${num(ly + wob(8, 0.5))}`;
  const ticks = `M1 ${num(ly - 3)} L5 ${num(ly + 1)} M${num(w - 5)} ${num(ly + 1)} L${num(w - 1)} ${num(ly - 3)}`;
  return `<svg x="0" y="0" width="${w}" height="${strokeWidth + 7}" overflow="hidden" fill="none">${strokePath(d, stroke, strokeWidth)}${strokePath(ticks, stroke, strokeWidth * 0.7)}</svg>`;
}
