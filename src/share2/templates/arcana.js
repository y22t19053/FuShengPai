// ===== src/share2/templates/arcana.js · 牌灵海报（统一设计系统 · 奶油薄荷蒂芙尼） =====
// 基于 theme.js 骨架：品牌栏 → 大标题 → 左侧大牌面 + 右侧档案 → 底部金句 → 落款+二维码。
// 原则：左对齐网格、1px 薄荷细线分隔、无噪点无光斑、光效只留薄荷细框微光（克制）。

import {
  W, H, M, CW, DARK, SERIF, SANS, NUM, font,
  roundRectPath, wrapText, paintBackground, drawBrandBar, drawFooter,
  roughBox, roughCircle,
} from '../theme.js';
import { drawPokerCard } from '../poker.js';

/** 五行力量点阵：满点数（木/金旺 4，火 3，土/水平 2） */
const POWER = { 木: 4, 火: 3, 土: 2, 金: 4, 水: 2 };

/** 五行属性文案（克制点缀） */
const WX_LABEL = { 木: '生长', 火: '明动', 土: '承载', 金: '肃敛', 水: '润下' };
const WX_COLOR = { 木: '#7ba88f', 火: '#c96f52', 土: '#c9b184', 金: '#a89f8f', 水: '#7a9cb0' };

/** 日期 2026.08.03 */
function dotDate(dateText) {
  if (!dateText) return '';
  const m = dateText.match(/(\d{4})[-/](\d{2})[-/](\d{2})/);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : dateText;
}

/**
 * 牌灵深空档案（1080×1440）
 * data: { cardMain{rank,suit,wx,color}, element, relation, keywords, quote, line, title, dateText }
 */
export async function renderArcana(ctx, w, h, data) {
  const t = DARK;
  const card = data.cardMain || { rank: '?', suit: '', wx: '土', color: 'black' };
  const wx = card.wx || data.element || '土';
  const relation = data.relation || '受克 · 宜守';
  const power = POWER[wx] || 3;
  // 底部金句：优先取牌灵课题原文（paige.question）——「牌是镜子」的定位下，
  // 课题比名人名言更像这面镜子；无课题时才回退名人名言/兜底文案。
  const quote = (data.paige?.question || data.quote || data.line || '观牌知势').replace(/^“|”$/g, '');
  const dateText = data.dateText || '';
  const wxColor = WX_COLOR[wx] || '#6fae9c';
  const wxLabel = WX_LABEL[wx] || '';
  const keywords = (data.keywords || []).slice(0, 3);
  const L = M;

  // ---------- 1. 背景 + 品牌栏 ----------
  paintBackground(ctx, t, w, h);
  drawBrandBar(ctx, t, {
    dateText: dotDate(dateText),
    rightLabel: '这是你的牌灵 · 长期陪伴你的象征',
  });

  // ---------- 2. 大标题（左对齐，留白充足） ----------
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.ink;
  ctx.font = font(700, 104);
  ctx.fillText('牌灵', L, 262);
  ctx.font = font(300, 26);
  ctx.fillStyle = t.inkDim;
  ctx.fillText('一张长期陪伴你的牌', L, 316);
  ctx.restore();

  // ---------- 3. 左侧大牌面（真实扑克牌）+ 暗金极细轮廓框（微光克制） ----------
  const bx = L, by = 430, bw = 420, bh = 588;
  const cx = bx + bw / 2, cy = by + bh / 2;

  // 3.1 蒂芙尼极细外框（只留一层细框 + 极淡微光，无第二层噪线）
  ctx.save();
  const gold = ctx.createLinearGradient(bx - 8, by - 8, bx + bw + 8, by + bh + 8);
  gold.addColorStop(0, '#4d8f7e');
  gold.addColorStop(0.5, '#6fae9c');
  gold.addColorStop(1, '#4d8f7e');
  ctx.strokeStyle = gold;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = 'rgba(111,174,156,0.28)';
  ctx.shadowBlur = 18;
  roundRectPath(ctx, bx - 8, by - 8, bw + 16, bh + 16, 6);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.restore();

  // 3.2 真实扑克牌主体
  drawPokerCard(ctx, card, bx, by, bw, bh, {
    red: '#c96f52',
    black: '#3a3425',
    paper: '#f6f0e2',
    border: '#6b6352',
  });

  // 3.3 手绘勾边（绘本质感，双线轻微抖动）
  roughBox(ctx, bx - 16, by - 16, bw + 32, bh + 32, {
    r: 12,
    stroke: 'rgba(111,174,156,0.5)',
    lineWidth: 1.5,
    roughness: 1.15,
    bowing: 1.3,
  });

  // ---------- 4. 右侧档案区（严格对齐，x 由网格推导） ----------
  const dx = L + bw + 48;          // 档案左 x
  const dw = W - M - dx;           // 档案宽
  let dy = by;                     // 档案顶与牌顶对齐

  // 4.1 牌名（大号 rank + 花色）
  const rankStr = card.rank == null ? '?' : String(card.rank);
  const suitStr = card.suit || '';
  const isRed = card.color === 'red' || suitStr === '♥' || suitStr === '♦';
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = isRed ? t.red : t.ink;
  ctx.font = font(700, 84, NUM);
  ctx.fillText(rankStr, dx, dy + 72);
  if (suitStr) {
    const rw = ctx.measureText(rankStr).width;
    ctx.font = font(400, 64, NUM);
    ctx.fillText(suitStr, dx + rw + 26, dy + 68);
  }
  ctx.restore();
  dy += 112;

  // 4.2 元素（五行）
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.inkFaint;
  ctx.font = font(400, 18, SANS);
  ctx.fillText('元素', dx, dy);
  ctx.fillStyle = wxColor;
  roughCircle(ctx, dx + 58, dy - 6, 6, {
    stroke: wxColor, lineWidth: 1.6, roughness: 1.2,
    fill: wxColor, fillStyle: 'solid',
  });
  ctx.fillStyle = t.ink;
  ctx.font = font(600, 30);
  ctx.fillText(wx, dx + 76, dy + 2);
  if (wxLabel) {
    ctx.fillStyle = t.inkDim;
    ctx.font = font(300, 19);
    ctx.fillText(wxLabel, dx + 76 + ctx.measureText(wx).width + 16, dy + 2);
  }
  ctx.restore();
  dy += 64;

  // 4.3 体用关系
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.inkFaint;
  ctx.font = font(400, 18, SANS);
  ctx.fillText('体用', dx, dy);
  ctx.fillStyle = t.gold;
  ctx.font = font(600, 26);
  ctx.fillText(relation, dx + 58, dy);
  ctx.restore();
  dy += 60;

  // 4.4 五行力量点阵（5 点，前空后实，右对齐网格）
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.inkFaint;
  ctx.font = font(400, 18, SANS);
  ctx.fillText('力量', dx, dy);
  const dotR = 8, gap = 30;
  for (let i = 0; i < 5; i++) {
    const px = dx + 58 + i * gap;
    if (i < power) {
      roughCircle(ctx, px, dy - 8, dotR, {
        stroke: wxColor, lineWidth: 1.5, roughness: 1.1,
        fill: wxColor, fillStyle: 'solid',
      });
    } else {
      roughCircle(ctx, px, dy - 8, dotR, { stroke: t.inkFaint, lineWidth: 1.5, roughness: 1.1 });
    }
  }
  ctx.restore();
  dy += 56;

  // 4.5 关键词（圆角标签，克制排布）
  if (keywords.length) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    keywords.forEach((kw, i) => {
      const tw = Math.min(ctx.measureText(kw).width + 44, 136);
      const tx = dx + tw / 2;
      roughBox(ctx, tx - tw / 2, dy - 22, tw, 44, {
        r: 22,
        stroke: 'rgba(111,174,156,0.3)',
        lineWidth: 1.3,
        roughness: 1.0,
        fill: 'rgba(111,174,156,0.16)',
        fillStyle: 'solid',
      });
      ctx.fillStyle = t.gold;
      ctx.font = font(400, 20);
      ctx.fillText(kw, tx, dy + 1);
      dy += 54;
    });
    ctx.restore();
  }

  // ---------- 5. 底部金句（左对齐跨整行） ----------
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = t.goldDim;
  ctx.font = font(500, 26);
  const qLines = wrapText(ctx, `「${quote}」`, CW, 2);
  qLines.forEach((ln, i) => ctx.fillText(ln, L, h - 214 + i * 42));
  ctx.restore();

  // ---------- 6. 落款 + 二维码 ----------
  await drawFooter(ctx, t, {
    note: '「牌是提示，不是命令。」',
    sub: `观牌知势 · ${dotDate(dateText) || ''}`,
  });
}
