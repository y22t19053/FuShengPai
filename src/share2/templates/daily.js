// ===== src/share2/templates/daily.js · 日运海报（统一设计系统 · 浅色宣纸） =====
// 基于 theme.js 骨架（LIGHT 色板）：品牌栏 → 超大日期 → 中央扑克牌 + 今日气象
//   → 宜/忌两栏 → 底部金句 → 落款+二维码。
// 原则：左对齐网格、1px 墨线分隔、无噪点无光斑、朱砂只用于气象与牌面红字。

import {
  W, H, M, CW, LIGHT, SERIF, SANS, NUM, font,
  roundRectPath, wrapText, hairline, paintBackground, drawBrandBar, drawFooter,
} from '../theme.js';
import { drawPokerCard } from '../poker.js';

/** 五行 → 宜 / 忌（知识库取象，可读无术语） */
const YI_JI = {
  '木': { yi: '扎根', ji: '内耗' },
  '火': { yi: '表达', ji: '急躁' },
  '土': { yi: '守成', ji: '投机' },
  '金': { yi: '决断', ji: '拖延' },
  '水': { yi: '流动', ji: '硬撑' },
  '天': { yi: '定方向', ji: '犹豫' },
  '人': { yi: '合作', ji: '独断' },
};
const WEATHER = { '木': '风', '火': '暑', '土': '湿', '金': '燥', '水': '寒', '天': '清', '人': '和' };

/** 日期 08.03（MM.DD） */
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
 * 日运宣纸海报（1080×1440）
 * data: { cardMain{rank,suit,wx,color}, title, line, quote, dateText, fortuneType, element }
 */
export async function renderDaily(ctx, w, h, data) {
  const t = LIGHT;
  const card = data.cardMain || { rank: '?', suit: '', wx: '土', color: 'black' };
  const wx = card.wx || data.element || '土';
  const yiji = YI_JI[wx] || YI_JI['土'];
  const weather = WEATHER[wx] || '和';
  const dateText = data.dateText || '';
  const line = (data.line || data.quote || '观牌知势').replace(/^“|”$/g, '');
  const isRed = card.color === 'red' || card.suit === '♥' || card.suit === '♦';

  // ---------- 1. 背景 + 品牌栏 ----------
  paintBackground(ctx, t, w, h);
  drawBrandBar(ctx, t, {
    dateText: `${mmdd(dateText)} · ${weekday(dateText)}`,
    rightLabel: `今日气象 · ${weather}`,
  });

  // ---------- 2. 超大日期（左对齐，成为视觉锚点） ----------
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.ink;
  ctx.font = font(700, 148, NUM);
  ctx.fillText(mmdd(dateText) || '—', M, 300);
  ctx.font = font(400, 24, SERIF);
  ctx.fillStyle = t.inkDim;
  ctx.fillText('观 于 今 日', M + 4, 352);
  ctx.restore();

  // ---------- 3. 中央扑克牌（真实牌面，白底 + 细线 + 角标/花色/宫廷） ----------
  const bw = 300, bh = 420;
  const bx = W / 2 - bw / 2, by = 420;
  // 极淡投影（克制：只有一层，无光晕）
  ctx.save();
  ctx.shadowColor = 'rgba(61,53,39,0.18)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  roundRectPath(ctx, bx, by, bw, bh, 6);
  ctx.fillStyle = '#fdfaf3';
  ctx.fill();
  ctx.restore();
  drawPokerCard(ctx, card, bx, by, bw, bh, {
    red: '#b03a2e',
    black: '#3a3226',
    paper: '#fdfaf3',
    border: 'rgba(61,53,39,0.55)',
  });

  // ---------- 4. 牌下信息行：等级标签 + 五行 ----------
  const infoY = by + bh + 46;
  // 朱砂标签「今日 · X运势」
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tagText = `今日 · ${wx}五行`;
  const tagW = Math.min(ctx.measureText(tagText).width + 56, 260);
  ctx.fillStyle = t.goldFaint;
  roundRectPath(ctx, W / 2 - tagW / 2, infoY - 24, tagW, 48, 24);
  ctx.fill();
  ctx.fillStyle = t.gold;
  ctx.font = font(500, 22, SERIF);
  ctx.fillText(tagText, W / 2, infoY + 2);
  ctx.restore();

  // ---------- 5. 宜 / 忌 两栏（左右分置，细线分隔，克制） ----------
  const rowY = infoY + 92;
  hairline(ctx, M, rowY, W - M, rowY, t.line);
  const colW = CW / 2;

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // 宜（左）
  ctx.fillStyle = t.gold;
  ctx.font = font(600, 30, SERIF);
  ctx.fillText('宜', M, rowY + 72);
  ctx.fillStyle = t.ink;
  ctx.font = font(400, 30, SERIF);
  ctx.fillText(yiji.yi, M + 68, rowY + 72);
  // 忌（右）
  ctx.fillStyle = t.red;
  ctx.font = font(600, 30, SERIF);
  ctx.fillText('忌', M + colW, rowY + 72);
  ctx.fillStyle = t.ink;
  ctx.font = font(400, 30, SERIF);
  ctx.fillText(yiji.ji, M + colW + 68, rowY + 72);
  ctx.restore();

  // 两栏之间极淡竖线
  hairline(ctx, M + colW, rowY + 16, M + colW, rowY + 84, t.line);

  // ---------- 6. 底部金句（左对齐） ----------
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.goldDim;
  ctx.font = font(400, 22, SERIF);
  const qLines = wrapText(ctx, `“${line}”`, CW, 2);
  qLines.forEach((ln, i) => ctx.fillText(ln, M, h - 200 + i * 36));
  ctx.restore();

  // ---------- 7. 落款 + 二维码 ----------
  await drawFooter(ctx, t, {
    note: '「牌是提示，不是命令。」',
    sub: `观牌知势 · ${mmdd(dateText) || ''}`,
  });
}
