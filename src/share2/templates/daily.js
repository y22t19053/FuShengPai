// ===== src/share2/templates/daily.js · 日运海报（宣纸 · 垂直中轴） =====
// 布局：品牌栏 → 日期组（居中） → 中央牌 → 五行标签 → 宜/忌双栏 → 金句 → 落款。
// 原则：全图以 W/2 为垂直中轴线对称；hairline 分段；无噪点无光晕；
//       朱砂只用于牌面红字与「忌」，金色只用于「宜」与标签，克制不夺目。

import {
  W, H, M, CW, LIGHT, SERIF, NUM, font,
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
 * 日运海报（1080×1440，垂直中轴）
 * data: { cardMain{rank,suit,wx,color}, title, line, quote, dateText, fortuneType, element }
 * t: 主题色板（LIGHT 宣纸）
 */
async function renderDailyCore(ctx, w, h, data, t) {
  const card = data.cardMain || { rank: '?', suit: '', wx: '土', color: 'black' };
  const wx = card.wx || data.element || '土';
  const yiji = YI_JI[wx] || YI_JI['土'];
  const weather = WEATHER[wx] || '和';
  const dateText = data.dateText || '';
  // 赛博黄历：宜/忌/建除/冲煞/气象/金句优先取 oracle（当日确定性），缺数据时回退静态池
  const oracle = data.oracle || null;
  const yi = oracle?.yi?.length ? oracle.yi : [yiji.yi];
  const ji = oracle?.ji?.length ? oracle.ji : [yiji.ji];
  const jianchu = oracle?.jianchu || null;
  const chong = oracle?.chong || null;
  const moodTitle = oracle?.mood?.title || weather;
  const line = (oracle?.combo?.text || data.line || data.quote || '观牌知势').replace(/^“|”$/g, '');
  const wd = weekday(dateText);
  const metaLine = wd ? `${wd} · ${weather}象` : `${weather}象`;

  // 纸牌配色随主题走（暖纸=暖墨棕，鼠尾草=墨绿）
  const cardStyle = {
    red: t.cardRed || '#c96f52',
    black: t.cardBlack || '#3a3425',
    paper: t.cardPaper || '#fcf8ef',
    border: t.cardBorder || 'rgba(58,52,37,0.55)',
  };
  const cardShadow = t.shadow || 'rgba(58,52,37,0.15)';

  // ---------- 1. 背景 + 品牌栏 ----------
  paintBackground(ctx, t, w, h);
  drawBrandBar(ctx, t, {
    dateText: `${mmdd(dateText)} · ${weekday(dateText)}`,
    rightLabel: `今日气象 · ${moodTitle}`,
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
  ctx.shadowColor = cardShadow;
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 5;
  roundRectPath(ctx, bx, by, bw, bh, 6);
  ctx.fillStyle = cardStyle.paper;
  ctx.fill();
  ctx.restore();
  drawPokerCard(ctx, card, bx, by, bw, bh, cardStyle);

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

  // 5.1 建除 · 冲煞（黄历两栏，中轴分隔，普通人不读术语：建日·宜建基 / 冲子·鼠）
  if (jianchu && chong) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = t.inkDim;
    ctx.font = font(400, 20, SERIF);
    ctx.fillText(`${jianchu.name} · ${jianchu.label}`, W / 4, 1012);
    ctx.fillText(`冲${chong.name} · ${chong.animal}`, W * 3 / 4, 1012);
    ctx.restore();
  }

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
  ctx.fillText(yi.join('、'), M + 62, halfY);
  // 忌（右半，从 W/2 起）
  ctx.fillStyle = t.red;
  ctx.font = font(600, 26, SERIF);
  ctx.fillText('忌', W / 2, halfY);
  ctx.fillStyle = t.ink;
  ctx.font = font(400, 26, SERIF);
  ctx.fillText(ji.join('、'), W / 2 + 62, halfY);
  ctx.restore();

  // 两栏之间极淡竖线（中轴）
  hairline(ctx, W / 2, rowY + 20, W / 2, rowY + 92, t.line);

  // ---------- 6. 金句（居中，1-2 行，克制小字） ----------
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.goldDim;
  ctx.font = font(400, 26, SERIF);
  const qLines = wrapText(ctx, `「${line}」`, CW - 160, 2);
  qLines.forEach((ln, i) => ctx.fillText(ln, W / 2, h - 250 + i * 40));
  ctx.restore();

  // ---------- 7. 落款 + 二维码 ----------
  await drawFooter(ctx, t, {
    note: '「牌是提示，不是命令。」',
    sub: `观牌知势 · ${mmdd(dateText) || ''}`,
  });
}

/** 日运宣纸海报（默认款） */
export function renderDaily(ctx, w, h, data) {
  return renderDailyCore(ctx, w, h, data, LIGHT);
}
