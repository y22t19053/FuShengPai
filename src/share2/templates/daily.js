// ===== src/share2/templates/daily.js · 日运海报（DOM 版 · 浅纸宣纸） =====
// HTML+CSS 排版：品牌栏 → 日期组 → 中央牌 → 五行标签 → 宜/忌双栏 → 金句意象 → 落款。
// 以 1080×1440 固定画布绝对定位铺陈；rough SVG 手绘边框/分隔/印章/五行图标。

import { getPaper, FONT_SANS, FOOTER_NOTES, pickBySeed, YI_JI, WEATHER, TAG_BY_WX, paperBackground } from '../style.js';
import { frameBoxSVG, wxIconSVG, sealBoxSVG, dividerSVG } from '../frame-svg.js';
import { pokerCardHTML, qrBoxHTML } from './cards.js';
import { escapeForHTML } from '../../utils/safe.js';

const W = 1080;
const H = 1440;
const M = 96;

/** 日期 MM.DD（严格匹配 YYYY-MM-DD 取月.日；旧正则会把年份前两位当月，如 2026-08-06 → 26.08 的错误） */
function mmdd(dateText) {
  if (!dateText) return '';
  const m = dateText.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return `${String(m[2]).padStart(2, '0')}.${String(m[3]).padStart(2, '0')}`;
  return dateText;
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
  const p = getPaper().light;
  const card = data.cardMain || data.card || { rank: '?', suit: '', wx: '土', color: 'black' };
  const wx = card.wx || data.element || '土';
  const yiji = YI_JI[wx] || YI_JI['土'];
  const dateText = data.dateText || '';
  const weather = pickBySeed(dateText, WEATHER[wx] || ['和']);
  const oracle = data.oracle || null;
  // YI_JI 每组为 3 组变体，按日期确定性选一组；oracle 有宜忌则优先用 oracle 的
  const yijiSet = Array.isArray(yiji) ? pickBySeed(dateText, yiji) : yiji;
  const yi = (oracle && oracle.yi && oracle.yi.length) ? oracle.yi : [pickBySeed(dateText, yijiSet.yi)];
  const ji = (oracle && oracle.ji && oracle.ji.length) ? oracle.ji : [pickBySeed(dateText, yijiSet.ji)];
  const moodTitle = (oracle && oracle.mood && oracle.mood.title) || weather;
  // 与页内横幅完全一致：title=hook.title（今日课题），line=hook.line（情绪金句）
  const topicTitle = data.title || moodTitle;
  let signLine = (data.line || data.quote || '').replace(/^“|”$/g, '');
  // 金句限 42 字：底部与右下二维码之间的横向空间有限，超长截断保证单行/双行内不重叠
  if (signLine.length > 42) signLine = signLine.slice(0, 42) + '…';
  const note = pickBySeed(dateText, FOOTER_NOTES);

  const brand = `${mmdd(dateText)} · ${weekday(dateText)}`;
  const metaLine = weekday(dateText) ? `${weekday(dateText)} · ${weather}象` : `${weather}象`;

  // 中央扑克牌（340×476）
  const cardHTML = pokerCardHTML(card, {
    size: 340,
    paper: p.paper,
    red: p.red,
    ink: p.ink,
    border: p.border,
    shadow: p.cardShadow,
    font: FONT_SANS,
  });

  // 五行 pill（手绘圆角标签 · 描边用当日结构色撞色）
  const pillW = 96;
  const pillH = 52;
  const pillHTML = `
    <div style="position:absolute;left:50%;top:902px;transform:translateX(-50%);width:${pillW}px;height:${pillH}px;">
      ${frameBoxSVG(0, 0, pillW, pillH, { r: 26, stroke: p.structure, strokeWidth: 2, fill: p.pillBg })}
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;color:${p.goldDeep};font-size:26px;font-weight:700;font-family:${FONT_SANS};">${escapeForHTML(wx)}</div>
    </div>`;

  // 宜/忌双栏（宜=当日结构色，忌=当日红系 → 撞色对比）
  const yiText = escapeForHTML(yi.join('、'));
  const jiText = escapeForHTML(ji.join('、'));
  const column = (title, color, text, left) => `
    <div style="position:absolute;${left ? 'left' : 'right'}:${M}px;top:984px;width:408px;height:152px;">
      ${frameBoxSVG(0, 0, 408, 152, { r: 18, stroke: left ? p.structure : p.red, strokeWidth: 1.8, fill: left ? p.pillBg : p.pillRed })}
      <div style="position:absolute;left:26px;top:20px;color:${color};font-size:30px;font-weight:800;font-family:${FONT_SANS};letter-spacing:6px;">${title}</div>
      <div style="position:absolute;left:26px;top:76px;right:20px;color:${p.ink};font-size:26px;font-weight:600;font-family:${FONT_SANS};line-height:1.4;">${text}</div>
    </div>`;
  const yiJiHTML = column('宜', p.goldDeep, yiText, true) + column('忌', p.red, jiText, false);

  // 今日课题（hook.title）+ 情绪金句（hook.line）：与页内横幅同一来源，观感统一
  // 纵向重新排布：课题 1146 → 金句 1190（两行内）→ footer/QR 1267 起，互不重叠；金句右边界止于 720px，避开右下二维码列
  const quoteHTML = `
    <div style="position:absolute;left:0;right:0;top:1146px;text-align:center;">
      <div style="display:inline-flex;align-items:center;gap:10px;color:${p.goldDeep};font-size:24px;font-weight:600;font-family:${FONT_SANS};letter-spacing:2px;">
        <div style="width:6px;height:28px;background:${p.mood};border-radius:3px;flex-shrink:0;"></div>
        ${wxIconSVG(wx, p.gold, 26)}
        <span>${escapeForHTML(topicTitle)}</span>
      </div>
    </div>
    <div style="position:absolute;left:150px;right:360px;top:1190px;text-align:center;color:${p.ink};font-size:26px;font-weight:500;font-family:${FONT_SANS};line-height:1.5;overflow-wrap:break-word;">「${escapeForHTML(signLine || '观牌知势，不语已明。')}」</div>`;

  // 底部：落款（左）+ 印章 + 二维码引导（右）；bottom:34 与右下二维码同底对齐，为金句腾出纵向空间
  const footerHTML = `
    <div style="position:absolute;left:${M}px;bottom:34px;">
      ${dividerSVG(0, 480, 0, { stroke: p.line })}
      <div style="display:flex;align-items:center;gap:16px;margin-top:20px;">
        <div style="width:46px;height:46px;position:relative;text-align:center;color:${p.red};font-size:16px;font-weight:700;font-family:${FONT_SANS};line-height:1.24;flex-shrink:0;">
          ${sealBoxSVG(46, p.red)}
          <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);">浮<br>生</div>
        </div>
        <div>
          <div style="color:${p.goldDeep};font-size:26px;font-weight:600;font-family:${FONT_SANS};">${escapeForHTML(note)}</div>
          <div style="margin-top:6px;color:${p.inkFaint};font-size:16px;font-family:${FONT_SANS};">浮生牌 · 观牌知势 · 数据只存本机</div>
        </div>
      </div>
    </div>
    <div style="position:absolute;right:${M}px;bottom:34px;">
      ${qrBoxHTML(qr, { size: 128, bg: p.qrLight, border: p.line, ink: p.goldDeep, inkFaint: p.inkFaint, font: FONT_SANS })}
    </div>`;

  return `
    <div style="width:${W}px;height:${H}px;position:relative;overflow:hidden;font-family:${FONT_SANS};${paperBackground(p)}">
      ${frameBoxSVG(26, 26, W - 52, H - 52, { r: 30, stroke: p.border, strokeWidth: 2.4 })}

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
