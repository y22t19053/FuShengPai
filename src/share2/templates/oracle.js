// ===== src/share2/templates/oracle.js · 今日黄历（DOM 版 · 深纸） =====
// 主题「历书」：日期 → 建除 · 宜忌 → 冲煞/纳音/九星/旬空 → 真太阳时辰 → 落款。
// 数据来自 daily 引擎的 oracle（含 almanac 真实历法字段），与页内黄历块同源。

import { getPaper, FONT_SANS, FOOTER_NOTES, pickBySeed, paperBackground } from '../style.js';
import { frameBoxSVG, sealBoxSVG, dividerSVG, wxIconSVG } from '../frame-svg.js';
import { qrBoxHTML } from './cards.js';
import { escapeForHTML } from '../../utils/safe.js';
import { getTrueSolarHour, getLonForCity } from '../../utils/solar-time.js';
import { pickHourLine } from '../../texts/hour-pools.js';

const W = 1080;
const H = 1440;
const M = 96;

function mmdd(dateText) {
  if (!dateText) return '';
  const m = String(dateText).match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!m) return dateText;
  return `${Number(m[2])}月${Number(m[3])}日`;
}

/**
 * 今日黄历海报（DOM 版）
 * data: { dateText, oracle: { jianchu:{name}, yi:[], ji:[], chong:{name,animal}, almanac:{...} } }
 */
export function renderOracleHTML(data, qr) {
  const p = getPaper().dark;
  const oracle = (data.oracle && data.oracle.almanac) ? data.oracle : null;
  const al = (oracle && oracle.almanac) || {};
  const dateText = data.dateText || '';
  const wx = (data.element || (data.card && data.card.wx)) || '土';
  const yi = (oracle && oracle.yi && oracle.yi.length) ? oracle.yi : ['安顿', '静观'];
  const ji = (oracle && oracle.ji && oracle.ji.length) ? oracle.ji : ['躁进', '妄动'];
  const note = pickBySeed(dateText, FOOTER_NOTES);

  // 真实历法字段（逐项判空，兼容旧数据）
  const jianchu = (oracle && oracle.jianchu && oracle.jianchu.name) || al.jianchu || '执日';
  const chongName = (oracle && oracle.chong && oracle.chong.name) || (al.chong && al.chong.zhi) || '';
  const chongAnimal = (oracle && oracle.chong && oracle.chong.animal) || (al.chong && al.chong.animal) || '';
  const cai = (al.shenSha && al.shenSha.cai) || '';
  const termText = al.term ? `今日${al.term} · ` : '';
  const lunarText = al.lunarDate ? `${al.lunarDate} · ${al.ganZhiDay}日` : '';
  const navin = [al.dayNaYin, al.yearNaYin].filter(Boolean).join('/');
  const nineStar = (al.nineStar && al.nineStar.name) ? `${al.nineStar.name}·${al.nineStar.color}` : '';
  const xunKong = al.xunKong ? `旬空·${al.xunKong}` : '';
  const facts = [navin && `纳音·${navin}`, nineStar && `九星·${nineStar}`, xunKong].filter(Boolean);

  // 真太阳时辰（出生地经度缺省东八区）
  let trueHourLine = '';
  try {
    const th = getTrueSolarHour(new Date(), getLonForCity(data.birthPlace) || null);
    if (th && th.ganZhi) {
      const hourLine = pickHourLine(dateText || '', th.zhi);
      trueHourLine = `${th.ganZhi}${th.label}时 ${String(th.solar.getHours()).padStart(2, '0')}:${String(th.solar.getMinutes()).padStart(2, '0')}${hourLine ? ' · ' + hourLine : ''}`;
    }
  } catch (e) { /* 忽略 */ }

  // 宜/忌双栏（沿用 daily 模板的撞色结构）
  const yiText = escapeForHTML(yi.slice(0, 6).join('、'));
  const jiText = escapeForHTML(ji.slice(0, 6).join('、'));
  const column = (title, color, text, left) => `
    <div style="position:absolute;${left ? 'left' : 'right'}:${M}px;top:852px;width:408px;height:150px;">
      ${frameBoxSVG(0, 0, 408, 150, { r: 18, stroke: left ? p.structure : p.red, strokeWidth: 1.8, fill: left ? p.pillBg : p.pillRed })}
      <div style="position:absolute;left:26px;top:18px;color:${color};font-size:28px;font-weight:800;font-family:${FONT_SANS};letter-spacing:6px;">${title}</div>
      <div style="position:absolute;left:26px;top:70px;right:20px;color:${p.ink};font-size:24px;font-weight:600;font-family:${FONT_SANS};line-height:1.45;">${text}</div>
    </div>`;
  const yiJiHTML = column('宜', p.goldDeep, yiText, true) + column('忌', p.red, jiText, false);

  // 冲煞 / 财神 / 真太阳时辰（信息带）
  const infoLine = [
    chongName && `冲${chongName}${chongAnimal ? '·' + chongAnimal : ''}`,
    cai && `财神在${cai}`,
  ].filter(Boolean).join('　');

  // 建除 pill + 五行
  const pillW = 120;
  const pillH = 52;
  const pillHTML = `
    <div style="position:absolute;left:50%;top:744px;transform:translateX(-50%);width:${pillW}px;height:${pillH}px;">
      ${frameBoxSVG(0, 0, pillW, pillH, { r: 26, stroke: p.gold, strokeWidth: 2, fill: p.pillBg })}
      <div style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;color:${p.goldDeep};font-size:24px;font-weight:700;font-family:${FONT_SANS};">${escapeForHTML(jianchu)}</div>
    </div>`;

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
          <div style="margin-top:6px;color:${p.inkFaint};font-size:16px;font-family:${FONT_SANS};">浮生牌 · 今日黄历 · 数据只存本机</div>
        </div>
      </div>
    </div>
    <div style="position:absolute;right:${M}px;bottom:${M - 14}px;">
      ${qrBoxHTML(qr, { size: 128, bg: p.qrLight, border: p.line, ink: p.goldDeep, inkFaint: p.inkFaint, font: FONT_SANS })}
    </div>`;

  return `
    <div style="width:${W}px;height:${H}px;position:relative;overflow:hidden;font-family:${FONT_SANS};${paperBackground(p)}">
      ${frameBoxSVG(26, 26, W - 52, H - 52, { r: 30, stroke: p.border, strokeWidth: 2.4 })}

      <!-- 品牌栏 -->
      <div style="position:absolute;left:${M}px;top:52px;color:${p.inkDim};font-size:22px;font-weight:600;font-family:${FONT_SANS};">浮生牌 · <span style="color:${p.goldDeep};">今日黄历</span></div>
      <div style="position:absolute;right:${M}px;top:52px;color:${p.inkFaint};font-size:20px;font-family:${FONT_SANS};">历书</div>

      <!-- 日期组 -->
      <div style="position:absolute;left:0;right:0;top:176px;text-align:center;">
        <div style="color:${p.gold};font-size:24px;font-weight:500;font-family:${FONT_SANS};letter-spacing:14px;">观 于 今 日</div>
        <div style="margin-top:14px;color:${p.ink};font-size:92px;font-weight:800;font-family:${FONT_SANS};line-height:1;">${escapeForHTML(mmdd(dateText) || '—')}</div>
        <div style="margin-top:16px;color:${p.inkDim};font-size:22px;font-family:${FONT_SANS};">${escapeForHTML(termText)}${escapeForHTML(lunarText)}</div>
      </div>

      ${pillHTML}

      ${yiJiHTML}

      <!-- 信息带：冲煞 / 财神 / 真太阳时辰 -->
      <div style="position:absolute;left:120px;right:120px;top:1062px;text-align:center;">
        ${infoLine ? `<div style="color:${p.inkDim};font-size:24px;font-weight:600;font-family:${FONT_SANS};letter-spacing:2px;">${escapeForHTML(infoLine)}</div>` : ''}
        ${facts.length ? `<div style="margin-top:14px;color:${p.inkFaint};font-size:19px;font-family:${FONT_SANS};">${escapeForHTML(facts.join('　'))}</div>` : ''}
        ${trueHourLine ? `
          <div style="margin-top:16px;display:inline-flex;align-items:center;gap:8px;color:${p.gold};font-size:20px;font-family:${FONT_SANS};">
            ${wxIconSVG(wx, p.gold, 20)}
            <span>此刻真太阳时 · ${escapeForHTML(trueHourLine)}</span>
          </div>` : ''}
      </div>

      ${footerHTML}
    </div>`;
}
