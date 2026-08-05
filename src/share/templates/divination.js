// ===== src/share/templates/divination.js · 解读海报（统一设计系统 · 暖纸手绘） =====
// 基于 theme.js 骨架（DARK 色板）：品牌栏 → 标题 + 金句 → 体用双卡 + 关系徽章
//   → 天机线三宫 → 解读正文（可读优先）→ 张力指数条 → 落款 + 二维码。
// 原则：左对齐网格、1px 细线分隔、无噪点无光斑、光效只留体用卡微光（克制）。

import {
  W, H, M, CW, DARK, SERIF, SANS, NUM, font,
  roundRectPath, wrapText, hairline, paintBackground, drawBrandBar, drawFooter,
} from '../../share2/theme.js';
import { drawPokerCard } from '../../share2/poker.js';

/** 关系徽章：生克 → 中文标签 + 颜色（克制，不做夸张渐变） */
const REL_LABEL = { 生我: '大吉', 我生: '小凶', 克我: '大凶', 我克: '小吉', 同我: '平' };
const REL_COLOR = { 生我: '#6fae9c', 我生: '#8fc0ad', 克我: '#c96f52', 我克: '#7a9cb0', 同我: '#7ba88f' };

/** 天机线三宫标签 */
const GONG_PHASE = { 0: '起点', 1: '经过', 2: '结果' };

/** 牌面小字（♠8 / ♥A / 大王） */
function cardText(card) {
  if (!card) return '?';
  return (card.suit || '') + (card.rank || '?');
}

/** 日期 2026.08.03 */
function dotDate(dateText) {
  if (!dateText) return '';
  const m = dateText.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : dateText;
}

/**
 * 解读玄金档案（1080×1440）
 * data: { title, line, cardMain, yongMain, element, relation, durian, keywords,
 *         lineInfo[3], gridSummary[{gong,cardMain,rel}], body, dateText }
 */
export async function drawDivinationShare(ctx, w, h, data) {
  const t = DARK;
  const L = M;
  const R = W - M;

  // ---------- 1. 背景 + 品牌栏 ----------
  paintBackground(ctx, t, w, h);
  drawBrandBar(ctx, t, {
    dateText: dotDate(data.dateText || ''),
    rightLabel: '解读 · 观牌知势',
  });

  // ---------- 2. 标题 + 金句 ----------
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.ink;
  ctx.font = font(700, 52);
  ctx.fillText(data.title || '观牌知势', L, 240);
  ctx.font = font(300, 24);
  ctx.fillStyle = t.inkDim;
  const lineText = (data.line || '').replace(/^“|”$/g, '');
  ctx.fillText(lineText, L, 292);
  ctx.restore();

  // ---------- 3. 体用双卡 + 关系徽章（暗金微光只在这一处） ----------
  const cardW = 350, cardH = 208;
  const cardY = 356;
  const gap = 88;                       // 徽章宽度占位
  const leftX = L, rightX = W - M - cardW;
  const badgeCX = W / 2, badgeCY = cardY + cardH / 2;

  // 3.1 体卡（你）
  drawTiyongCard(ctx, t, leftX, cardY, cardW, cardH, data.cardMain, '你');
  // 3.2 用卡（所问之事）
  drawTiyongCard(ctx, t, rightX, cardY, cardW, cardH, data.yongMain, '所问之事');

  // 3.3 关系徽章（居中，圆形 + 细描边，克制微光）
  const badgeR = 40;
  ctx.save();
  ctx.shadowColor = 'rgba(111,174,156,0.18)';
  ctx.shadowBlur = 12;
  ctx.fillStyle = 'rgba(111,174,156,0.12)';
  ctx.beginPath();
  ctx.arc(badgeCX, badgeCY, badgeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  const rel = data.relation || '未知';
  const relLabel = REL_LABEL[rel] || '平';
  const relColor = REL_COLOR[rel] || t.gold;
  ctx.strokeStyle = 'rgba(111,174,156,0.4)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = relColor;
  ctx.font = font(600, 22);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(rel, badgeCX, badgeCY - 11);
  ctx.fillStyle = t.inkDim;
  ctx.font = font(300, 15);
  ctx.fillText(relLabel, badgeCX, badgeCY + 16);
  ctx.restore();

  // ---------- 4. 天机线三宫（横排三格，等宽对齐） ----------
  const cellW = (CW - 40) / 3;
  const lineY = cardY + cardH + 52;
  const lineH = 108;
  hairline(ctx, L, lineY - 12, R, lineY - 12, t.line);

  (data.lineInfo || []).forEach((name, i) => {
    const x = L + i * (cellW + 20);
    const summary = (data.gridSummary || []).find(s => s.gong === name);
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    // 阶段标签（小）
    ctx.fillStyle = t.inkFaint;
    ctx.font = font(400, 15, SANS);
    ctx.fillText(GONG_PHASE[i] || String(i + 1), x, lineY + 18);
    // 宫名（主）
    ctx.fillStyle = t.ink;
    ctx.font = font(600, 24);
    ctx.fillText(String(name).replace('宫', ''), x, lineY + 54);
    // 落牌（小字，五行色或金）
    const sc = summary ? (summary.cardMain || {}) : null;
    if (sc) {
      ctx.fillStyle = t.gold;
      ctx.font = font(400, 20, NUM);
      ctx.fillText(cardText(sc), x, lineY + 88);
    }
    ctx.restore();
  });
  const afterLine = lineY + lineH + 28;

  // ---------- 5. 解读正文（可读优先：24px，行高 40，克制截断） ----------
  const bodyStart = afterLine;
  const bodyMaxY = h - 318;
  // 过滤：空行、【】小标题、张力指数行（张力条已单独展示）、纯分隔符行
  const bodyText = String(data.body || '')
    .split('\n')
    .filter(l => l.trim() && !l.includes('【') && !l.includes('张力指数') && !l.includes('榴莲指数') && !l.includes('🍈') && !/^-{2,}$/.test(l.trim()))
    .join('\n');

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = font(400, 24);
  ctx.fillStyle = t.inkDim;

  let y = bodyStart;
  const blocks = bodyText.split('\n');
  outer: for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) { y += 14; continue; }
    const isHead = /^[^\s]{1,4}[：:]/.test(trimmed) && trimmed.length <= 14;
    const lines = wrapText(ctx, trimmed, CW, 8);
    for (const ln of lines) {
      if (y > bodyMaxY) break outer;
      if (isHead) {
        ctx.fillStyle = t.gold;
        ctx.font = font(600, 24);
      } else {
        ctx.fillStyle = t.inkDim;
        ctx.font = font(400, 24);
      }
      ctx.fillText(ln, L, y);
      y += 40;
    }
    y += 6;
  }
  ctx.restore();

  // ---------- 6. 张力指数条（简洁：数字 + 10 格刻度 + 三档文案；无榴莲图形） ----------
  const score = Number(data.durian) || 0;
  const idxY = h - 246;
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.inkDim;
  ctx.font = font(400, 18, SANS);
  ctx.fillText('张力指数', L, idxY);
  ctx.fillStyle = t.gold;
  ctx.font = font(700, 34, NUM);
  ctx.fillText(score.toFixed(1), R - ctx.measureText('/10').width - 56, idxY);
  ctx.fillStyle = t.inkFaint;
  ctx.font = font(300, 18, NUM);
  ctx.fillText('/10', R, idxY);

  // 刻度条：10 格，填充色随档位
  const barY = idxY + 22;
  const barH = 8;
  const n = 10;
  const segW = (CW - (n - 1) * 4) / n;
  const fillCount = Math.max(1, Math.round(score));
  const barColor = score >= 7 ? '#c96a5a' : score >= 4 ? t.gold : '#8a9a5a';
  for (let i = 0; i < n; i++) {
    const x = L + i * (segW + 4);
    ctx.fillStyle = i < fillCount ? barColor : 'rgba(58,52,37,0.1)';
    roundRectPath(ctx, x, barY, segW, barH, 2);
    ctx.fill();
  }

  // 档位文案
  const levelText = score >= 7 ? '张力偏高 · 宜缓一缓' : score >= 4 ? '张力适中 · 顺势而为' : '张力偏低 · 平稳可期';
  ctx.fillStyle = t.inkDim;
  ctx.font = font(300, 16, SANS);
  ctx.fillText(levelText, L, barY + barH + 30);
  ctx.restore();

  // ---------- 7. 落款 + 二维码 ----------
  await drawFooter(ctx, t, {
    note: '「牌是提示，不是命令。」',
    sub: `观牌知势 · ${dotDate(data.dateText || '')}`,
  });
}

/** 体用卡：细描边圆角卡 + 左上角标 + 底部五行小字（克制，无光斑） */
function drawTiyongCard(ctx, t, x, y, w, h, card, label) {
  const c = card || { rank: '?', suit: '', wx: '土', color: 'black' };
  const isRed = c.color === 'red' || c.suit === '♥' || c.suit === '♦';

  // 卡底
  ctx.save();
  ctx.fillStyle = 'rgba(252,248,239,0.85)';
  roundRectPath(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = t.line;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // 左上标签（你 / 所问之事）
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.inkFaint;
  ctx.font = font(400, 16, SANS);
  ctx.fillText(label, x + 18, y + 28);
  ctx.restore();

  // 大牌面（rank + suit，红黑分离）
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = isRed ? t.red : t.ink;
  ctx.font = font(700, 64, NUM);
  const rankStr = c.rank == null ? '?' : String(c.rank);
  ctx.fillText(rankStr, x + 18, y + 96);
  if (c.suit) {
    const rw = ctx.measureText(rankStr).width;
    ctx.font = font(400, 52, NUM);
    ctx.fillText(c.suit, x + 18 + rw + 14, y + 92);
  }
  ctx.restore();

  // 右下五行小字
  ctx.save();
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.goldDim;
  ctx.font = font(400, 18, SERIF);
  ctx.fillText(`五行 · ${c.wx || '土'}`, x + w - 18, y + h - 18);
  ctx.restore();
}
