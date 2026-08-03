// ===== src/share2/templates/daily.js · 日运海报（宣纸 · 垂直中轴） =====
// 布局：品牌栏 → 日期组（居中） → 中央牌 → 五行标签 → 宜/忌双栏 → 金句 → 落款。
// 原则：全图以 W/2 为垂直中轴线对称；hairline 分段；无噪点无光晕；
//       朱砂只用于牌面红字与「忌」，金色只用于「宜」与标签，克制不夺目。

import {
  W, H, M, LIGHT, SERIF, NUM, font,
  roundRectPath, wrapText, hairline, paintBackground, drawBrandBar, drawFooter,
} from '../theme.js';
import { drawPokerCard } from '../poker.js';

/** 五行 → 宜 / 忌（传统取象，平实可读） */
const YI_JI = {
  '木': { yi: '生长', ji: '壅塞' },
  '火': { yi: '明动', ji: '虚浮' },
  '土': { yi: '承载', ji: '停滞' },
  '金': { yi: '收敛', ji: '刚愎' },
  '水': { yi: '流动', ji: '泛滥' },
  '天': { yi: '定志', ji: '游移' },
  '人': { yi: '和合', ji: '独断' },
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
 * 日运宣纸海报（1080×1440，垂直中轴）
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
  const wd = weekday(dateText);
  const metaLine = wd ? `${wd} · ${weather}象` : `${weather}象`;

  // ---------- 1. 背景 + 品牌栏 ----------
  paintBackground(ctx, t, w, h);
  drawBrandBar(ctx, t, {
    dateText: `${mmdd(dateText)} · ${weekday(dateText)}`,
    rightLabel: `今日气象 · ${weather}`,
  });

  // ---------- 2. 日期组（居中收拢，成为第一视觉锚点） ----------
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.goldDim;
  ctx.font = font(400, 24, SERIF);
  ctx.fillText('观 于 今 日', W / 2, 232);
  ctx.fillStyle = t.ink;
  ctx.font = font(700, 92, NUM);
  ctx.fillText(mmdd(dateText) || '—', W / 2, 322);
  ctx.fillStyle = t.inkDim;
  ctx.font = font(400, 22, SERIF);
  ctx.fillText(metaLine, W / 2, 360);
  ctx.restore();

  // ---------- 3. 中央扑克牌（白底 + 细线 + 角标/花色/宫廷，投影仅一层） ----------
  const bw = 340, bh = 480;
  const bx = W / 2 - bw / 2, by = 400;
  ctx.save();
  ctx.shadowColor = 'rgba(61,53,39,0.15)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 5;
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

  // ---------- 4. 五行标签（朱砂系 pill，克制） ----------
  const infoY = by + bh + 42;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tagText = `今日五行 · ${wx}`;
  const tagW = Math.min(ctx.measureText(tagText).width + 60, 280);
  ctx.fillStyle = t.goldFaint;
  roundRectPath(ctx, W / 2 - tagW / 2, infoY - 24, tagW, 48, 24);
  ctx.fill();
  ctx.fillStyle = t.gold;
  ctx.font = font(500, 22, SERIF);
  ctx.fillText(tagText, W / 2, infoY + 2);
  ctx.restore();

  // ---------- 5. 宜 / 忌 双栏（左右各半，hairline 分隔，横竖各一条） ----------
  const rowY = infoY + 58;
  hairline(ctx, M, rowY, W - M, rowY, t.line);
  const halfY = rowY + 84;

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // 宜（左半，从 M 起）
  ctx.fillStyle = t.gold;
  ctx.font = font(600, 26, SERIF);
  ctx.fillText('宜', M, halfY);
  ctx.fillStyle = t.ink;
  ctx.font = font(400, 26, SERIF);
  ctx.fillText(yiji.yi, M + 62, halfY);
  // 忌（右半，从 W/2 起）
  ctx.fillStyle = t.red;
  ctx.font = font(600, 26, SERIF);
  ctx.fillText('忌', W / 2, halfY);
  ctx.fillStyle = t.ink;
  ctx.font = font(400, 26, SERIF);
  ctx.fillText(yiji.ji, W / 2 + 62, halfY);
  ctx.restore();

  // 两栏之间极淡竖线（中轴）
  hairline(ctx, W / 2, rowY + 20, W / 2, rowY + 92, t.line);

  // ---------- 6. 金句（居中，1-2 行，克制小字） ----------
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.goldDim;
  ctx.font = font(400, 26, SERIF);
  const qLines = wrapText(ctx, `“${line}”`, CW - 160, 2);
  qLines.forEach((ln, i) => ctx.fillText(ln, W / 2, h - 250 + i * 40));
  ctx.restore();

  // ---------- 7. 落款 + 二维码 ----------
  await drawFooter(ctx, t, {
    note: '「牌是提示，不是命令。」',
    sub: `观牌知势 · ${mmdd(dateText) || ''}`,
  });
}
