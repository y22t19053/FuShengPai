// ===== src/share2/templates/daily.js · 日运海报（DOM 版 · 浅纸宣纸） =====
// HTML+CSS 排版：品牌栏 → 日期组 → 中央牌 → 五行标签 → 宜/忌双栏 → 金句意象 → 落款。
// 以 1080×1440 固定画布绝对定位铺陈；rough SVG 手绘边框/分隔/印章/五行图标。

import { PAPER, FONT_SANS, FOOTER_NOTES, pickBySeed, YI_JI, WEATHER, TAG_BY_WX, paperBackground } from '../style.js';
import { roughBoxSVG, wxIconSVG, sealBoxSVG, dividerSVG } from '../rough-svg.js';
import { pokerCardHTML } from './cards.js';
import { escapeForHTML } from '../../utils/safe.js';

const W = 1080;
const H = 1440;
const M = 96;

/** 日期 08.06（MM.DD） */
function mmdd(dateText) {
  if (!dateText) return '';
  const m = dateText.match(/(\d{2})[-/](\d{2})/);
  return m ? `${m[1]}.${m[2]}` : dateText;
}

/** 星期（简体中文） */
function weekday(dateText) {
  const m = dateText && dateText.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
  if (!m) return '';
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return '星期' + '日一二三四五六'[d.getDay()];
}

/**
 * 日运海报（DOM 版）
 * data: { cardMain/card, title, line, quote, dateText, fortuneType, element, oracle }
 */
export function renderDailyHTML(data, qr) {
  const p = PAPER.light;
  const card = data.cardMain || data.card || { rank: '?', suit: '', wx: '土', color: 'black' };
  const wx = card.wx || data.element || '土';
  const yiji = YI_JI[wx] || YI_JI['土'];
  const weather = WEATHER[wx] || '和';
  const dateText = data.dateText || '';
  const oracle = data.oracle || null;
  const yi = (oracle && oracle.yi && oracle.yi.length) ? oracle.yi : [yiji.yi];
  const ji = (oracle && oracle.ji && oracle.ji.length) ? oracle.ji : [yiji.ji];
  const moodTitle = (oracle && oracle.mood && oracle.mood.title) || weather;
  const line = ((oracle && oracle.combo && oracle.combo.text) || data.line || data.quote || '观牌知势').replace(/^“|”$/g, '');
  const signTag = TAG_BY_WX[wx] || '今日一句';
  const note = pickBySeed(dateText, FOOTER_NOTES);

  const brand = `${mmdd(dateText)} · ${weekday(dateText)}`;
  const metaLine = weekday(dateText) ? `${weekday(dateText)} · ${weather}象` : `${weather}象`;

  // 中央扑克牌（340×476）
  const cardHTML = pokerCardHTML(card, {
    size: 340,
    paper: p.paper,
    red: p.red,
    ink: p.ink,
    border: 'rgba(58,52,37,0.5)',
    shadow: p.cardShadow,
    font: FONT_SANS,
  });

  // 五行 pill（手绘圆角标签）
  const pillW = 96;
  const pillH = 52;
  const pillHTML = `
    <div style="position:absolute;left:50%;top:902px;transform:translateX(-50%);width:${pillW}px;height:${pillH}px;">
      ${roughBoxSVG(0, 0, pillW, pillH, { r: 26, stroke: p.gold, strokeWidth: 2, roughness: 1.2, fill: p.pillBg })}
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;color:${p.goldDeep};font-size:26px;font-weight:700;font-family:${FONT_SANS};">${escapeForHTML(wx)}</div>
    </div>`;

  // 宜/忌双栏
  const yiText = escapeForHTML(yi.join('、'));
  const jiText = escapeForHTML(ji.join('、'));
  const column = (title, color, text, left) => `
    <div style="position:absolute;${left ? 'left' : 'right'}:${M}px;top:984px;width:408px;height:152px;">
      ${roughBoxSVG(0, 0, 408, 152, { r: 18, stroke: left ? p.gold : p.red, strokeWidth: 1.8, roughness: 1.2, fill: left ? p.pillBg : 'rgba(201,111,82,0.07)' })}
      <div style="position:absolute;left:26px;top:20px;color:${color};font-size:30px;font-weight:800;font-family:${FONT_SANS};letter-spacing:6px;">${title}</div>
      <div style="position:absolute;left:26px;top:76px;right:20px;color:${p.ink};font-size:26px;font-weight:600;font-family:${FONT_SANS};line-height:1.4;">${text}</div>
    </div>`;
  const yiJiHTML = column('宜', p.goldDeep, yiText, true) + column('忌', p.red, jiText, false);

  // 金句意象标签 + 签语
  const quoteHTML = `
    <div style="position:absolute;left:0;right:0;top:1186px;text-align:center;">
      <div style="display:inline-flex;align-items:center;gap:10px;color:${p.goldDeep};font-size:24px;font-weight:600;font-family:${FONT_SANS};letter-spacing:2px;">
        ${wxIconSVG(wx, p.gold, 26)}
        <span>${escapeForHTML(signTag)} · ${escapeForHTML(moodTitle)}</span>
      </div>
    </div>
    <div style="position:absolute;left:150px;right:150px;top:1240px;text-align:center;color:${p.ink};font-size:30px;font-weight:500;font-family:${FONT_SANS};line-height:1.6;">「${escapeForHTML(line)}」</div>`;

  // 底部：落款（左）+ 印章 + QR（右）
  const footerHTML = `
    <div style="position:absolute;left:${M}px;bottom:${M}px;">
      ${dividerSVG(0, 480, 0, { stroke: p.line })}
      <div style="margin-top:34px;color:${p.goldDeep};font-size:26px;font-weight:600;font-family:${FONT_SANS};">${escapeForHTML(note)}</div>
      <div style="margin-top:10px;color:${p.inkFaint};font-size:16px;font-family:${FONT_SANS};">观牌知势 · 数据只存本机</div>
    </div>
    <div style="position:absolute;right:${M}px;bottom:${M - 8}px;width:96px;height:96px;background:${p.qrLight};border-radius:10px;border:1px solid rgba(58,50,38,0.25);padding:8px;box-sizing:border-box;">
      ${qr ? `<img src="${qr}" alt="" style="display:block;width:100%;height:100%;">` : '<div style="width:100%;height:100%;background:repeating-linear-gradient(45deg,#efe9d8,#efe9d8 6px,#e2d9c2 6px,#e2d9c2 12px);"></div>'}
    </div>
    <div style="position:absolute;right:${M + 128}px;bottom:${M + 14}px;width:50px;height:50px;text-align:center;color:#a83b32;font-size:17px;font-weight:700;font-family:${FONT_SANS};line-height:1.28;">
      ${sealBoxSVG(50)}
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);">浮<br>生</div>
    </div>`;

  return `
    <div style="width:${W}px;height:${H}px;position:relative;overflow:hidden;font-family:${FONT_SANS};${paperBackground(p)}">
      ${roughBoxSVG(26, 26, W - 52, H - 52, { r: 30, stroke: p.border, strokeWidth: 2.4, roughness: 1.1 })}

      <!-- 品牌栏 -->
      <div style="position:absolute;left:${M}px;top:52px;color:${p.inkDim};font-size:22px;font-weight:600;font-family:${FONT_SANS};">浮生牌 · <span style="color:${p.goldDeep};">观牌知势</span></div>
      <div style="position:absolute;right:${M}px;top:52px;color:${p.inkFaint};font-size:20px;font-family:${FONT_SANS};">${escapeForHTML(brand)}</div>

      <!-- 日期组 -->
      <div style="position:absolute;left:0;right:0;top:176px;text-align:center;">
        <div style="color:${p.goldDeep};font-size:24px;font-weight:500;font-family:${FONT_SANS};letter-spacing:14px;">观 于 今 日</div>
        <div style="margin-top:14px;color:${p.ink};font-size:96px;font-weight:800;font-family:${FONT_SANS};line-height:1;">${escapeForHTML(mmdd(dateText) || '—')}</div>
        <div style="margin-top:16px;color:${p.inkDim};font-size:22px;font-family:${FONT_SANS};">${escapeForHTML(metaLine)}</div>
      </div>

      <!-- 中央牌 -->
      <div style="position:absolute;left:50%;top:388px;transform:translateX(-50%);">
        ${cardHTML}
      </div>

      ${pillHTML}
      ${yiJiHTML}
      ${quoteHTML}
      ${footerHTML}
    </div>`;
}
