// ===== src/share2/templates/arcana.js · 牌灵档案（DOM 版 · 深纸） =====
// 主题「它想对你说」：品牌栏 → 大字标题 → 中央牌 → 五行/关键词 → 签语 → 落款。

import { getPaper, FONT_SANS, FOOTER_NOTES, pickBySeed, TAG_BY_WX, paperBackground } from '../style.js';
import { roughBoxSVG, wxIconSVG, sealBoxSVG, dividerSVG } from '../rough-svg.js';
import { pokerCardHTML, qrBoxHTML } from './cards.js';
import { escapeForHTML } from '../../utils/safe.js';

const W = 1080;
const H = 1440;
const M = 96;

/**
 * 牌灵档案（DOM 版）
 * data: { cardMain/card, title, line, quote, element, keywords, dateText, paige }
 */
export function renderArcanaHTML(data, qr) {
  const p = getPaper().dark;
  const card = data.cardMain || data.card || { rank: '?', suit: '', wx: '土', color: 'black' };
  const wx = card.wx || data.element || '土';
  const dateText = data.dateText || '';
  const keywords = (data.keywords && data.keywords.length ? data.keywords : ['观牌', '知势']).slice(0, 4);
  const line = (data.line || data.quote || '它想对你说').replace(/^“|”$/g, '');
  const signTag = TAG_BY_WX[wx] || '今日一句';
  const note = pickBySeed(dateText, FOOTER_NOTES);

  // 中央牌（300×420）
  const cardHTML = pokerCardHTML(card, {
    size: 300,
    paper: p.paper,
    red: p.red,
    ink: p.ink,
    border: p.border,
    shadow: p.cardShadow,
    font: FONT_SANS,
  });

  // 五行 pill（描边用当日结构色撞色）
  const pillHTML = `
    <div style="position:absolute;left:50%;top:872px;transform:translateX(-50%);width:96px;height:52px;">
      ${roughBoxSVG(0, 0, 96, 52, { r: 26, stroke: p.structure, strokeWidth: 2, roughness: 1.2, fill: p.pillBg })}
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;color:${p.goldDeep};font-size:26px;font-weight:700;font-family:${FONT_SANS};">${escapeForHTML(wx)}</div>
    </div>`;

  // 关键词 chips（手绘圆角 · 描边当日结构色）
  const chipW = 132;
  const chipGap = 20;
  const chipsTotal = keywords.length * chipW + (keywords.length - 1) * chipGap;
  const chipsStart = (W - chipsTotal) / 2;
  const chipsHTML = keywords.map((k, i) => `
    <div style="position:absolute;left:${chipsStart + i * (chipW + chipGap)}px;top:952px;width:${chipW}px;height:46px;">
      ${roughBoxSVG(0, 0, chipW, 46, { r: 14, stroke: p.structure, strokeWidth: 1.6, roughness: 1.3, fill: 'transparent' })}
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;color:${p.inkDim};font-size:21px;font-weight:600;font-family:${FONT_SANS};">${escapeForHTML(k)}</div>
    </div>`).join('');

  // 签语区
  const quoteHTML = `
    <div style="position:absolute;left:0;right:0;top:1046px;text-align:center;">
      <div style="display:inline-flex;align-items:center;gap:10px;color:${p.gold};font-size:23px;font-weight:600;font-family:${FONT_SANS};letter-spacing:2px;">
        <div style="width:6px;height:24px;background:${p.mood};border-radius:3px;flex-shrink:0;"></div>
        ${wxIconSVG(wx, p.mood, 24)}
        <span>${escapeForHTML(signTag)}</span>
      </div>
    </div>
    <div style="position:absolute;left:140px;right:140px;top:1096px;text-align:center;color:${p.ink};font-size:31px;font-weight:500;font-family:${FONT_SANS};line-height:1.62;">「${escapeForHTML(line)}」</div>`;

  // 底部：落款 + 印章 + 二维码引导
  const footerHTML = `
    <div style="position:absolute;left:${M}px;bottom:${M}px;">
      ${dividerSVG(0, 480, 0, { stroke: p.line })}
      <div style="display:flex;align-items:center;gap:16px;margin-top:28px;">
        <div style="width:46px;height:46px;position:relative;text-align:center;color:${p.red};font-size:16px;font-weight:700;font-family:${FONT_SANS};line-height:1.24;flex-shrink:0;">
          ${sealBoxSVG(46, p.red)}
          <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);">浮<br>生</div>
        </div>
        <div>
          <div style="color:${p.goldDeep};font-size:26px;font-weight:600;font-family:${FONT_SANS};">${escapeForHTML(note)}</div>
          <div style="margin-top:6px;color:${p.inkFaint};font-size:16px;font-family:${FONT_SANS};">你的牌灵 · 只存本机 · 每天一观</div>
        </div>
      </div>
    </div>
    <div style="position:absolute;right:${M}px;bottom:${M - 14}px;">
      ${qrBoxHTML(qr, { size: 128, bg: p.qrLight, border: p.line, ink: p.goldDeep, inkFaint: p.inkFaint, font: FONT_SANS })}
    </div>`;

  return `
    <div style="width:${W}px;height:${H}px;position:relative;overflow:hidden;font-family:${FONT_SANS};${paperBackground(p)}">
      ${roughBoxSVG(26, 26, W - 52, H - 52, { r: 30, stroke: p.border, strokeWidth: 2.4, roughness: 1.1 })}

      <!-- 品牌栏 -->
      <div style="position:absolute;left:${M}px;top:52px;color:${p.inkDim};font-size:22px;font-weight:600;font-family:${FONT_SANS};">浮生牌 · <span style="color:${p.gold};">牌灵档案</span></div>
      <div style="position:absolute;right:${M}px;top:52px;color:${p.inkFaint};font-size:20px;font-family:${FONT_SANS};">ARCANA</div>

      <!-- 标题 -->
      <div style="position:absolute;left:0;right:0;top:196px;text-align:center;">
        <div style="color:${p.gold};font-size:24px;font-weight:500;font-family:${FONT_SANS};letter-spacing:12px;">它 想 对 你 说</div>
        <div style="margin-top:18px;color:${p.ink};font-size:52px;font-weight:800;font-family:${FONT_SANS};line-height:1;">${escapeForHTML((data.title || '牌灵').replace(/^“|”$/g, ''))}</div>
      </div>

      <!-- 中央牌 -->
      <div style="position:absolute;left:50%;top:390px;transform:translateX(-50%);">
        ${cardHTML}
      </div>

      ${pillHTML}
      ${chipsHTML}
      ${quoteHTML}
      ${footerHTML}
    </div>`;
}
