// ===== src/share2/templates/cards.js · 扑克牌 HTML 组件（DOM 分享图共用） =====
// 替代旧 canvas 版 poker.js：纯 HTML/CSS 画卡面，由 html-to-image 一起栅格化。
// 卡面：暖纸白底 + rough 手绘边框 + 左上角标（rank+suit）+ 右下倒置角标 + 中心符号。

import { roughBoxSVG } from '../rough-svg.js';

const SUIT_GLYPH = { '♠': '♠', '♥': '♥', '♦': '♦', '♣': '♣' };
const COURT_GLYPH = { 'J': '⚔', 'Q': '♛', 'K': '♚' };

/** 统一二维码组件：白底圆角框 + 内联 SVG 二维码 + 「扫码 · 抽你的牌灵」引导文字
 * qr 为 uqr 生成的 <svg> 字符串（受控内容，直接内联）：
 * 无 <img> 时序/克隆问题 → 不再出现空白码或花边框；白底近纯白保证可扫。 */
export function qrBoxHTML(qr, o = {}) {
  const size = o.size || 132;
  const label = o.label || '扫码 · 抽你的牌灵';
  const sub = o.sub || '长按识别 或 扫码';
  const bg = o.bg || '#ffffff';
  const border = o.border || 'rgba(58,52,37,0.14)';
  const ink = o.ink || '#6b6352';
  const inkFaint = o.inkFaint || '#887d65';
  const font = o.font || `'PingFang SC','HarmonyOS Sans SC','MiSans','Noto Sans SC','Microsoft YaHei','Segoe UI',sans-serif`;
  const fallback = `<div style="width:100%;height:100%;background:repeating-linear-gradient(45deg,#3f3a2c,#3f3a2c 6px,#58513e 6px,#58513e 12px);border-radius:8px;"></div>`;
  // SVG 自带固定 width/height（160 高清源），内联时 CSS 缩放适配容器，防溢出裁切
  const qrInner = qr && /^<svg/i.test(String(qr).trim())
    ? String(qr).replace(/<svg\s/, '<svg style="width:100%;height:100%;display:block" ')
    : fallback;
  return `
    <div style="text-align:center;">
      <div style="width:${size}px;height:${size}px;background:${bg};border-radius:12px;border:1px solid ${border};padding:8px;box-sizing:border-box;">
        ${qrInner}
      </div>
      <div style="margin-top:10px;color:${ink};font-size:20px;font-weight:700;font-family:${font};letter-spacing:2px;">${label}</div>
      <div style="margin-top:4px;color:${inkFaint};font-size:15px;font-family:${font};">${sub}</div>
    </div>`;
}

function isJoker(card) {
  return !!(card && (card.isJoker || card.rank === '大王' || card.rank === '小王'));
}
function isBigJoker(card) {
  return !!(card && (card.type === '大王' || card.rank === '大王'));
}
function isRed(card, opts) {
  if (opts && opts.forceRed !== undefined) return opts.forceRed;
  const c = card && (card.color || '');
  return c === 'red' || card?.suit === '♥' || card?.suit === '♦';
}

/**
 * 扑克牌卡面 HTML
 * @param {Object} card {rank, suit, color, wx} 或 {isJoker, type}
 * @param {Object} o { size=180(宽), paper, red, ink, border, shadow }
 */
export function pokerCardHTML(card = {}, o = {}) {
  const size = o.size || 180;
  const h = Math.round(size * 1.4);
  const paper = o.paper || '#fdfaf1';
  const red = o.red || '#c96f52';
  const ink = o.ink || '#3a3425';
  const border = o.border || 'rgba(58,52,37,0.5)';
  const shadow = o.shadow || 'rgba(58,52,37,0.16)';
  const font = o.font || `'PingFang SC','HarmonyOS Sans SC','MiSans','Noto Sans SC','Microsoft YaHei','Segoe UI',sans-serif`;

  const joker = isJoker(card);
  const color = isRed(card, o) ? red : ink;
  const rank = card?.rank ?? '?';
  const suit = card?.suit || '';

  // 中心符号
  let center;
  if (joker) {
    center = `
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;line-height:1.15;">
        <div style="font-size:${Math.round(size * 0.5)}px;font-weight:900;letter-spacing:1px;color:${color};font-family:${font};">JOKER</div>
        <div style="font-size:${Math.round(size * 0.2)}px;color:${red};margin-top:${Math.round(size * 0.05)}px;">✦ ${card?.type || '王牌'} ✦</div>
      </div>`;
  } else if (COURT_GLYPH[rank]) {
    center = `
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;line-height:1.25;">
        <div style="font-size:${Math.round(size * 0.5)}px;font-weight:900;color:${color};font-family:${font};">${rank}</div>
        <div style="font-size:${Math.round(size * 0.34)}px;color:${color};margin-top:${Math.round(size * 0.04)}px;">${COURT_GLYPH[rank]}</div>
      </div>`;
  } else {
    center = `
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;">
        <div style="font-size:${Math.round(size * 0.62)}px;line-height:1;color:${color};">${SUIT_GLYPH[suit] || '?'}</div>
      </div>`;
  }

  const corner = (rot) => `
    <div style="position:absolute;${rot ? 'right:8px;bottom:6px;transform:rotate(180deg);' : 'left:8px;top:6px;'}text-align:center;line-height:1.08;">
      <div style="font-size:${Math.round(size * 0.16)}px;font-weight:800;color:${color};font-family:${font};">${joker ? '☆' : rank}</div>
      ${suit ? `<div style="font-size:${Math.round(size * 0.15)}px;color:${color};">${SUIT_GLYPH[suit]}</div>` : ''}
    </div>`;

  return `
    <div style="position:relative;width:${size}px;height:${h}px;background:${paper};border-radius:14px;box-shadow:0 ${Math.round(size * 0.02)}px ${Math.round(size * 0.07)}px ${shadow};">
      ${roughBoxSVG(3, 3, size - 6, h - 6, { r: 12, stroke: border, strokeWidth: 1.8, roughness: 1.1 })}
      ${corner(false)}
      ${corner(true)}
      ${center}
    </div>`;
}
