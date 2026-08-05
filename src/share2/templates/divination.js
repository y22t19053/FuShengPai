// ===== src/share2/templates/divination.js · 体用解读（DOM 版 · 深纸） =====
// 主题「观牌知势」：品牌栏 → 卦名 → 体用双卡+生克 → 关键词 → 解读正文 → 落款。

import { PAPER, FONT_SANS, FOOTER_NOTES, pickBySeed, TAG_BY_WX, paperBackground } from '../style.js';
import { roughBoxSVG, wxIconSVG, sealBoxSVG, dividerSVG } from '../rough-svg.js';
import { pokerCardHTML } from './cards.js';
import { escapeForHTML } from '../../utils/safe.js';

const W = 1080;
const H = 1440;
const M = 96;

/** 正文截断（约 150 字 + 省略号，防超出版面） */
function clampText(text, max = 150) {
  if (!text) return '';
  const t = String(text).trim();
  return t.length > max ? t.slice(0, max) + '……' : t;
}

/**
 * 体用解读（DOM 版）
 * data: { title, line, cardMain, yongMain, element, relation, durian, keywords, quote, tags, topic, body, dateText }
 */
export function renderDivinationHTML(data, qr) {
  const p = PAPER.dark;
  const body = data.body || data.quote || data.line || '观牌知势。';
  const title = (data.title || '观牌知势').replace(/^“|”$/g, '');
  const sub = (data.line || '').replace(/^“|”$/g, '');
  const main = data.cardMain || { rank: '?', suit: '', wx: '土', color: 'black' };
  const yong = data.yongMain || null;
  const wx = main.wx || data.element || '土';
  const relation = data.relation || '';
  const keywords = (data.keywords && data.keywords.length ? data.keywords : []).slice(0, 4);
  const dateText = data.dateText || '';
  const note = pickBySeed(dateText, FOOTER_NOTES);
  const signTag = TAG_BY_WX[wx] || '今日一句';

  // 体用双卡（230×322）+ 关系徽标
  const mainCardHTML = pokerCardHTML(main, {
    size: 230,
    paper: p.paper,
    red: p.red,
    ink: p.ink,
    border: 'rgba(243,235,220,0.42)',
    shadow: p.cardShadow,
    font: FONT_SANS,
  });
  const yongCardHTML = yong
    ? pokerCardHTML(yong, {
        size: 230,
        paper: p.paper,
        red: p.red,
        ink: p.ink,
        border: 'rgba(243,235,220,0.42)',
        shadow: p.cardShadow,
        font: FONT_SANS,
      })
    : '';

  const cardsHTML = `
    <div style="position:absolute;left:${M}px;top:398px;">
      <div style="text-align:center;color:${p.gold};font-size:20px;font-weight:600;font-family:${FONT_SANS};letter-spacing:6px;margin-bottom:12px;">体</div>
      ${mainCardHTML}
    </div>
    ${yong ? `
      <div style="position:absolute;right:${M}px;top:398px;">
        <div style="text-align:center;color:${p.inkDim};font-size:20px;font-weight:600;font-family:${FONT_SANS};letter-spacing:6px;margin-bottom:12px;">用</div>
        ${yongCardHTML}
      </div>
      <div style="position:absolute;left:50%;top:560px;transform:translateX(-50%);width:140px;height:52px;text-align:center;">
        ${roughBoxSVG(0, 0, 140, 52, { r: 26, stroke: p.gold, strokeWidth: 1.8, roughness: 1.3, fill: p.pillBg })}
        <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);color:${p.goldDeep};font-size:23px;font-weight:700;font-family:${FONT_SANS};">${escapeForHTML(relation || '相生')}</div>
      </div>
    ` : ''}`;

  // 关键词 chips（无 yong 时显示在下方更居中）
  const chipW = 132;
  const chipGap = 20;
  const kw = keywords.length ? keywords : [signTag, wx + '行', '观牌', '知势'];
  const chipsTotal = kw.length * chipW + (kw.length - 1) * chipGap;
  const chipsStart = (W - chipsTotal) / 2;
  const chipsHTML = kw.map((k, i) => `
    <div style="position:absolute;left:${chipsStart + i * (chipW + chipGap)}px;top:796px;width:${chipW}px;height:46px;">
      ${roughBoxSVG(0, 0, chipW, 46, { r: 14, stroke: p.line, strokeWidth: 1.4, roughness: 1.3, fill: 'transparent' })}
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;color:${p.inkDim};font-size:21px;font-weight:600;font-family:${FONT_SANS};">${escapeForHTML(k)}</div>
    </div>`).join('');

  // 解读正文（max-height + 渐变遮罩）
  const bodyHTML = `
    <div style="position:absolute;left:140px;right:140px;top:880px;">
      <div style="display:flex;align-items:center;justify-content:center;gap:10px;color:${p.gold};font-size:22px;font-weight:600;font-family:${FONT_SANS};letter-spacing:3px;">
        ${wxIconSVG(wx, p.gold, 22)}
        <span>解读 · ${escapeForHTML(signTag)}</span>
      </div>
      <div style="margin-top:22px;color:${p.ink};font-size:28px;font-weight:500;font-family:${FONT_SANS};line-height:1.7;text-align:justify;text-justify:inter-ideograph;overflow:hidden;max-height:200px;">
        ${escapeForHTML(clampText(body, 148))}
      </div>
    </div>`;

  // 底部：落款 + 印章 + QR
  const footerHTML = `
    <div style="position:absolute;left:${M}px;bottom:${M}px;">
      ${dividerSVG(0, 480, 0, { stroke: p.line })}
      <div style="margin-top:34px;color:${p.goldDeep};font-size:26px;font-weight:600;font-family:${FONT_SANS};">${escapeForHTML(note)}</div>
      <div style="margin-top:10px;color:${p.inkFaint};font-size:16px;font-family:${FONT_SANS};">观牌知势 · 数据只存本机</div>
    </div>
    <div style="position:absolute;right:${M}px;bottom:${M - 8}px;width:96px;height:96px;background:${p.qrLight};border-radius:10px;border:1px solid rgba(243,235,220,0.2);padding:8px;box-sizing:border-box;">
      ${qr ? `<img src="${qr}" alt="" style="display:block;width:100%;height:100%;">` : '<div style="width:100%;height:100%;background:repeating-linear-gradient(45deg,#3f3a2c,#3f3a2c 6px,#58513e 6px,#58513e 12px);"></div>'}
    </div>
    <div style="position:absolute;right:${M + 128}px;bottom:${M + 14}px;width:50px;height:50px;text-align:center;color:#c05648;font-size:17px;font-weight:700;font-family:${FONT_SANS};line-height:1.28;">
      ${sealBoxSVG(50, '#c05648')}
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);">浮<br>生</div>
    </div>`;

  return `
    <div style="width:${W}px;height:${H}px;position:relative;overflow:hidden;font-family:${FONT_SANS};${paperBackground(p)}">
      ${roughBoxSVG(26, 26, W - 52, H - 52, { r: 30, stroke: p.border, strokeWidth: 2.4, roughness: 1.1 })}

      <!-- 品牌栏 -->
      <div style="position:absolute;left:${M}px;top:52px;color:${p.inkDim};font-size:22px;font-weight:600;font-family:${FONT_SANS};">浮生牌 · <span style="color:${p.gold};">观牌知势</span></div>
      <div style="position:absolute;right:${M}px;top:52px;color:${p.inkFaint};font-size:20px;font-family:${FONT_SANS};">卦象 · ${escapeForHTML(wx)}</div>

      <!-- 标题 -->
      <div style="position:absolute;left:0;right:0;top:190px;text-align:center;">
        <div style="color:${p.gold};font-size:24px;font-weight:500;font-family:${FONT_SANS};letter-spacing:12px;">观 牌 知 势</div>
        <div style="margin-top:16px;color:${p.ink};font-size:52px;font-weight:800;font-family:${FONT_SANS};line-height:1;">${escapeForHTML(title)}</div>
        ${sub ? `<div style="margin-top:16px;color:${p.inkDim};font-size:22px;font-family:${FONT_SANS};">${escapeForHTML(sub)}</div>` : ''}
      </div>

      ${cardsHTML}
      ${chipsHTML}
      ${bodyHTML}
      ${footerHTML}
    </div>`;
}
