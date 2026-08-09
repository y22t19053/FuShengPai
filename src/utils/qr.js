// ===== src/utils/qr.js · 二维码生成器（纯JS实现） =====

import { encode } from 'uqr';

// ---------- 内联 SVG 二维码（分享图专用：uqr 零依赖，返回 SVG 字符串） ----------
// 优势：无 <img> 时序问题（html-to-image/dom-to-image-more 克隆 img 曾导致空白/花边框）、
// 颜色完全可控（深码可配当日强调色，浅底恒为近白保证可扫）。
// 行扫描合并相邻模块，减少 path 体积。

/**
 * 生成内联 SVG 二维码
 * @param {string} content 内容（分享图钉死 QR_TARGET，不用 window.location）
 * @param {{dark?:string, light?:string, size?:number, ecc?:string}} opts
 * @returns {string} <svg> 字符串（viewBox=size×size，可被 rasterize 直接绘制）
 */
export function qrSVGHTML(content, { dark = '#3a3425', light = '#FFFFFF', size = 132, ecc = 'M' } = {}) {
  let data;
  let n;
  try {
    const res = encode(String(content || ''), { ecc });
    data = res.data;
    n = res.size;
  } catch (e) {
    // 兜底：返回一个带“QR”占位的灰块 SVG（不抛错，保住分享图）
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${light}"/><text x="50%" y="55%" font-family="sans-serif" font-size="${Math.round(size / 4)}" fill="${dark}" text-anchor="middle">QR</text></svg>`;
  }
  const cell = size / n;
  let d = '';
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (!data[y][x]) { x++; continue; }
      let x2 = x;
      while (x2 < n && data[y][x2]) x2++;
      const w = x2 - x;
      d += `M${(x * cell).toFixed(2)} ${(y * cell).toFixed(2)}h${(w * cell).toFixed(2)}v${cell.toFixed(2)}h-${(w * cell).toFixed(2)}z`;
      x = x2;
    }
  }
  const lightBg = /^rgba?\(/i.test(light) ? light : (light.startsWith('#') ? light : '#FFFFFF');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="${lightBg}"/><path d="${d}" fill="${dark}"/></svg>`;
}

// ---------- 颜色归一化：qrcode 库只接受 hex，rgba() 会抛 Invalid hex color ----------
// rgba 的 alpha 丢弃（半透明由调用方 drawImage 的 globalAlpha 控制）
export function normalizeHexColor(color) {
  if (!color) return color;
  if (typeof color !== 'string') return color;
  const trimmed = color.trim();
  if (trimmed.startsWith('#')) return trimmed;
  const m = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) {
    const toHex = (n) => Math.max(0, Math.min(255, Number(n))).toString(16).padStart(2, '0');
    return '#' + toHex(m[1]) + toHex(m[2]) + toHex(m[3]);
  }
  return trimmed;
}

// ---------- 加载二维码图片（uqr 实现：与分享图同源，零外部依赖） ----------
export async function loadQRImage(content, size = 100, colors = {}) {
  try {
    // 与分享图同源的 uqr 内联 SVG → data URL（qrcode 依赖已移除，不再落 QR 占位）
    const svg = qrSVGHTML(String(content || ''), {
      size,
      dark: normalizeHexColor(colors.dark) || '#000000',
      light: normalizeHexColor(colors.light) || '#ffffff',
      ecc: 'M'
    });
    const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = dataUrl;
    });
    return img;
  } catch (e) {
    console.warn('二维码生成失败:', e);
    // 降级：灰色 QR 占位块（不抛错，保住弹窗）
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('QR', size/2, size/2);
    const img = new Image();
    await new Promise(resolve => {
      img.onload = resolve;
      img.src = canvas.toDataURL();
    });
    return img;
  }
}