// ===== src/share2/poker.js · 标准扑克牌绘制引擎（终局版） =====
// 手绘暖纸 #fcf8ef 底 + 1px 暖灰 #6b6352 极细边框；
// 左上角标 rank+suit、右下角标旋转 180° 倒置（正反交错）；
// 中心图案：A-10 单一巨大花色符号（占据卡面中心 ~60%，摒弃分散小点）；
// J/Q/K 极简几何宫廷符号（J=剑+盾、Q=皇冠+权杖、K=王冠+交叉双剑）；
// 大小王：小丑帽徽章 + JOKER 艺术字（红/金勾线 vs 白/金勾线）。
// 纯原生 Canvas 2D，无 DOM 依赖。

/** 花色字符 */
const SUIT_GLYPH = { '♠': '♠', '♥': '♥', '♦': '♦', '♣': '♣' };

/** 全局圆润无衬线字体栈（奶油糖果风，无衬线尖角） */
const FONT = '"PingFang SC","HarmonyOS Sans SC","MiSans","Noto Sans SC","Microsoft YaHei","Segoe UI",sans-serif';

/** 是否为 Joker（支持 cardMain 形态 rank='大王'/'小王' 与原始牌 isJoker） */
function isJokerCard(card) {
  return !!(card && (card.isJoker || card.rank === '大王' || card.rank === '小王'));
}
function isBigJoker(card) {
  return !!(card && (card.type === '大王' || card.rank === '大王'));
}

/** 红黑判断（兼容 cardMain.color / card.color） */
function isRedCard(card, opts) {
  if (opts && opts.forceRed !== undefined) return opts.forceRed;
  const c = card && (card.color || '');
  return c === 'red' || (card && card.suit === '♥') || (card && card.suit === '♦');
}

/** 极简王冠（Q/K 用） */
function crown(ctx, cx, cy, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.48, cy);
  ctx.lineTo(cx - s * 0.34, cy - s * 0.58);
  ctx.lineTo(cx - s * 0.12, cy - s * 0.22);
  ctx.lineTo(cx, cy - s * 0.66);
  ctx.lineTo(cx + s * 0.12, cy - s * 0.22);
  ctx.lineTo(cx + s * 0.34, cy - s * 0.58);
  ctx.lineTo(cx + s * 0.48, cy);
  ctx.closePath();
  ctx.fill();
  // 底部横带
  ctx.fillRect(cx - s * 0.48, cy - s * 0.06, s * 0.96, s * 0.12);
}

/** 盾牌外轮廓（J 用，描边） */
function shield(ctx, cx, cy, s, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, s * 0.055);
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.5, cy - s * 0.4);
  ctx.quadraticCurveTo(cx, cy - s * 0.56, cx + s * 0.5, cy - s * 0.4);
  ctx.lineTo(cx + s * 0.4, cy + s * 0.12);
  ctx.quadraticCurveTo(cx + s * 0.27, cy + s * 0.5, cx, cy + s * 0.6);
  ctx.quadraticCurveTo(cx - s * 0.27, cy + s * 0.5, cx - s * 0.4, cy + s * 0.12);
  ctx.closePath();
  ctx.stroke();
}

/** 抽象利剑（J/K 用：刃 + 护手 + 柄 + 圆头，可旋转） */
function sword(ctx, cx, cy, s, color, angle = 0) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  // 刃：细长三角（尖端向上）
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.75);
  ctx.lineTo(-s * 0.08, -s * 0.08);
  ctx.lineTo(s * 0.08, -s * 0.08);
  ctx.closePath();
  ctx.fill();
  // 护手横条
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, s * 0.07);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-s * 0.24, 0);
  ctx.lineTo(s * 0.24, 0);
  ctx.stroke();
  // 柄
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, s * 0.32);
  ctx.stroke();
  // 圆头
  ctx.beginPath();
  ctx.arc(0, s * 0.42, s * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 极简几何宫廷符号：J=剑+盾 / Q=皇冠+权杖 / K=王冠+交叉双剑（中心禁止字母） */
function courtSymbol(ctx, cx, cy, s, kind, color) {
  if (kind === 'J') {
    shield(ctx, cx, cy, s, color);
    sword(ctx, cx, cy, s * 0.55, color, 0);
  } else if (kind === 'Q') {
    crown(ctx, cx, cy - s * 0.28, s * 0.72, color);
    // 权杖：竖杆 + 顶部宝珠 + 底部横座
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, s * 0.06);
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.3, cy - s * 0.12);
    ctx.lineTo(cx + s * 0.3, cy + s * 0.55);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx + s * 0.3, cy - s * 0.16, s * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx + s * 0.14, cy + s * 0.55, s * 0.32, s * 0.08);
  } else if (kind === 'K') {
    crown(ctx, cx, cy - s * 0.36, s * 0.6, color);
    sword(ctx, cx, cy + s * 0.1, s * 0.54, color, -Math.PI / 5.2);
    sword(ctx, cx, cy + s * 0.1, s * 0.54, color, Math.PI / 5.2);
  }
}

/** 小丑帽徽章（Joker 用，勾线版：主体填充 + 金线描边） */
function jesterHat(ctx, cx, cy, s, color, outline) {
  ctx.fillStyle = color;
  ctx.strokeStyle = outline;
  ctx.lineWidth = Math.max(1.2, s * 0.045);
  // 三角帽体
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.5, cy);
  ctx.lineTo(cx, cy - s * 0.95);
  ctx.lineTo(cx + s * 0.5, cy);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 帽沿横带
  ctx.fillRect(cx - s * 0.5, cy - s * 0.08, s, s * 0.16);
  ctx.strokeRect(cx - s * 0.5 + 0.5, cy - s * 0.08 + 0.5, s - 1, s * 0.16 - 1);
  // 三个绒球
  const balls = [[-0.5, 0], [0.5, 0], [0, -0.95]];
  balls.forEach(([bx, by]) => {
    ctx.beginPath();
    ctx.arc(cx + bx * s, cy + by * s, s * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  // 帽尖弯勾（右侧）
  ctx.lineWidth = Math.max(1.5, s * 0.055);
  ctx.beginPath();
  ctx.moveTo(cx + s * 0.5, cy - s * 0.08);
  ctx.quadraticCurveTo(cx + s * 0.78, cy - s * 0.3, cx + s * 0.55, cy - s * 0.55);
  ctx.stroke();
}

/** 带字距的 JOKER 艺术字（圆润无衬线粗体，逐字绘制 + 金线描边） */
function jokerWord(ctx, text, cx, cy, font, color, outline) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.strokeStyle = outline;
  const size = Number((font.match(/\d+/) || [0])[0]) || 10;
  ctx.lineWidth = Math.max(1, size * 0.045);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tracking = Math.round(size * 0.18);
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width + tracking);
  const total = widths.reduce((a, b) => a + b, 0) - tracking;
  let x = cx - total / 2;
  chars.forEach((ch, i) => {
    ctx.fillText(ch, x + ctx.measureText(ch).width / 2, cy);
    ctx.strokeText(ch, x + ctx.measureText(ch).width / 2, cy);
    x += widths[i];
  });
}

/** Joker 牌面（大王=白底红字金线，小王=黑底白字金线） */
function drawJokerFace(ctx, card, x, y, w, h, big) {
  const minDim = Math.min(w, h);
  const paper = big ? '#fcf8ef' : '#3a3425';
  const ink = big ? '#b05f45' : '#f2f2f0';
  const gold = 'rgba(111,174,156,0.9)';
  // 底
  ctx.fillStyle = paper;
  ctx.fillRect(x, y, w, h);
  // 极细边框（小王用淡白描边）
  ctx.strokeStyle = big ? '#6b6352' : 'rgba(242,242,240,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  // 中央小丑帽徽章（勾线版）
  const hatS = minDim * 0.34;
  jesterHat(ctx, x + w / 2, y + h * 0.32, hatS, ink, gold);
  // JOKER 艺术字（徽章下方，逐字 + 金线描边）
  const wordSize = Math.round(minDim * 0.13);
  jokerWord(ctx, 'JOKER', x + w / 2, y + h * 0.72, `700 ${wordSize}px ${FONT}`, ink, gold);
  // 角标 J / 倒置角标
  ctx.font = `600 ${Math.round(minDim * 0.07)}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = ink;
  ctx.fillText('J', x + minDim * 0.07, y + minDim * 0.16);
  ctx.save();
  ctx.translate(x + w - minDim * 0.07, y + h - minDim * 0.16);
  ctx.rotate(Math.PI);
  ctx.textAlign = 'left';
  ctx.fillText('J', 0, 0);
  ctx.restore();
}

/** 单一巨大花色符号（A-10 中心主图案） */
function bigSuit(ctx, x, y, w, h, suit, ink, isAce) {
  const minDim = Math.min(w, h);
  const size = Math.round(minDim * (isAce ? 0.58 : 0.52));
  ctx.save();
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const cx = x + w / 2;
  const cy = y + h / 2 + minDim * 0.01; // 光学下沉一丁点
  ctx.fillStyle = ink;
  ctx.fillText(SUIT_GLYPH[suit] || suit, cx, cy);
  // 极细内光描边（米白，浮雕质感）
  ctx.strokeStyle = 'rgba(252,248,239,0.38)';
  ctx.lineWidth = Math.max(1, minDim * 0.012);
  ctx.strokeText(SUIT_GLYPH[suit] || suit, cx, cy);
  ctx.restore();
}

/**
 * 标准扑克牌绘制（终局版：白底细边框 + 左上右下正反角标 + 巨大花色/几何宫廷/Joker）
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} card - { rank, suit, color, isJoker, type }（兼容 cardMain 形态）
 * @param {number} x y w h - 牌的位置与尺寸
 * @param {Object} [opts] - { red, black, paper, border }
 */
export function drawPokerCard(ctx, card, x, y, w, h, opts = {}) {
  if (!card) return;
  const rank = card.rank == null ? '?' : String(card.rank);
  const suit = card.suit || '';
  const minDim = Math.min(w, h);

  // Joker 分流
  if (isJokerCard(card)) {
    drawJokerFace(ctx, card, x, y, w, h, isBigJoker(card));
    return;
  }

  const isRed = isRedCard(card, opts);
  const red = opts.red || '#b05f45';
  const black = opts.black || '#3a3425';
  const paper = opts.paper || '#fcf8ef';
  const ink = isRed ? red : black;

  // 手绘暖纸底 + 1px 极细暖灰边框
  ctx.fillStyle = paper;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = opts.border || '#6b6352';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  // 角标：左上 rank+suit、右下旋转 180°（正反交错），字号适中偏大
  const corner = Math.round(minDim * 0.115);
  const padX = minDim * 0.075, padY = minDim * 0.15;
  ctx.fillStyle = ink;
  ctx.font = `600 ${corner}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(rank, x + padX, y + padY);
  if (suit) {
    ctx.font = `400 ${Math.round(corner * 0.66)}px ${FONT}`;
    ctx.fillText(SUIT_GLYPH[suit] || suit, x + padX + corner * 0.6, y + padY + corner * 0.78);
  }
  // 右下角标（旋转 180°）
  ctx.save();
  ctx.translate(x + w - padX, y + h - padY);
  ctx.rotate(Math.PI);
  ctx.font = `600 ${corner}px ${FONT}`;
  ctx.fillText(rank, 0, 0);
  if (suit) {
    ctx.font = `400 ${Math.round(corner * 0.66)}px ${FONT}`;
    ctx.fillText(SUIT_GLYPH[suit] || suit, corner * 0.6, corner * 0.78);
  }
  ctx.restore();

  // 中央图案：A-10 巨大花色符号 / JQK 几何宫廷符号 / 未知兜底
  const px = x + w / 2, py = y + h / 2;
  if (rank === 'J' || rank === 'Q' || rank === 'K') {
    const s = minDim * 0.2;
    courtSymbol(ctx, px, py + minDim * 0.02, s, rank, ink);
  } else if (/^[0-9]+$/.test(rank) || rank === 'A') {
    bigSuit(ctx, x, y, w, h, suit || '♠', ink, rank === 'A');
  } else {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = ink;
    ctx.font = `600 ${Math.round(minDim * 0.12)}px ${FONT}`;
    ctx.fillText(rank + suit, px, py);
    ctx.restore();
  }
}
