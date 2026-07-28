// ===== 浮生牌 · 核心引擎 =====
import {
  SUITS, RANKS, GONG_ORDER, ALL_LINES, TIME_LABELS,
  getWuxing, getCardValue, getCardId, getShengKe, getShengKeLabel, getWangState,
} from './data.js';

// ===== 牌组创建 =====
export function createDeck(includeJokers = true) {
  let uid = 0;
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, isJoker: false, _uid: uid++ });
    }
  }
  if (includeJokers) {
    deck.push({ isJoker: true, type: '大王', _uid: uid++ });
    deck.push({ isJoker: true, type: '小王', _uid: uid++ });
  }
  return deck;
}

// ===== 洗牌 =====
export function shuffle(arr) {
  const a = [...arr];
  const n = a.length;
  if (window.crypto && window.crypto.getRandomValues) {
    const rand = new Uint32Array(n);
    window.crypto.getRandomValues(rand);
    for (let i = n - 1; i > 0; i--) {
      const j = rand[i] % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
  } else {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }
  return a;
}

// ===== 体用 =====
export function drawTiYong(deck) {
  const shuffled = shuffle(deck);
  const ti = shuffled[0];
  const yong = shuffled[1];
  const remaining = shuffled.slice(2);
  return { ti, yong, remaining };
}

export function injectJokers(deck) {
  const jokers = [
    { isJoker: true, type: '大王', _uid: Date.now() + Math.random() },
    { isJoker: true, type: '小王', _uid: Date.now() + Math.random() + 1 },
  ];
  return shuffle([...deck, ...jokers]);
}

export function evaluateTiYong(ti, yong) {
  const tiWx = getWuxing(ti);
  const yongWx = getWuxing(yong);
  const relation = getShengKe(tiWx, yongWx);
  const label = getShengKeLabel(relation);
  return { tiWx, yongWx, relation, label };
}

// ===== 九宫与天机线 =====
export function placeCardInGong(grid, gong, card, maxPerGong = 3) {
  const newGrid = { ...grid };
  const current = newGrid[gong] || [];
  if (current.length >= maxPerGong) {
    return { success: false, grid };
  }
  newGrid[gong] = [...current, card];
  return { success: true, grid: newGrid };
}

export function detectLines(grid) {
  const filledGongs = Object.keys(grid)
    .filter(g => grid[g] && grid[g].length > 0)
    .map(Number);
  return ALL_LINES.filter(line => line.every(g => filledGongs.includes(g)));
}

export function resolveLine(possibleLines, gongOrder) {
  if (possibleLines.length === 0) return { line: null, direction: null };
  if (possibleLines.length === 1) {
    const line = possibleLines[0];
    const firstGong = gongOrder.find(g => line.includes(g));
    if (firstGong) {
      const idx = line.indexOf(firstGong);
      const ordered = [...line.slice(idx), ...line.slice(0, idx)];
      return { line: ordered, direction: ordered.join(',') };
    }
    return { line, direction: line.join(',') };
  }
  return { line: null, direction: null, candidates: possibleLines };
}

export function getTimeLabels(direction) {
  const labels = TIME_LABELS[direction];
  if (!labels) return {};
  const result = {};
  for (let g = 1; g <= 9; g++) {
    result[g] = labels[g] || '';
  }
  return result;
}

export function calcDiff(gongNumber, card) {
  return Math.abs(gongNumber - getCardValue(card));
}

export function analyzeGrid(grid, lineOrder, ti) {
  const results = [];
  const tiWx = getWuxing(ti);
  for (const gStr in grid) {
    const g = Number(gStr);
    const cards = grid[g];
    if (!cards || cards.length === 0) continue;
    cards.forEach((card, index) => {
      const cardWx = getWuxing(card);
      const diff = calcDiff(g, card);
      const wangState = getWangState(cardWx, GONG_ORDER.includes(g) ? cardWx : '土');
      const relToTi = getShengKe(tiWx, cardWx);
      const timeRole = lineOrder[g] || '';
      results.push({ gong: g, card, cardWx, diff, wangState, relToTi, timeRole, position: index });
    });
  }
  return results;
}

// ===== 四柱计算 =====
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const SHENG_XIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const HOUR_TO_ZHI = [
  { start: 23, end: 1, zhi: '子', index: 0 },
  { start: 1, end: 3, zhi: '丑', index: 1 },
  { start: 3, end: 5, zhi: '寅', index: 2 },
  { start: 5, end: 7, zhi: '卯', index: 3 },
  { start: 7, end: 9, zhi: '辰', index: 4 },
  { start: 9, end: 11, zhi: '巳', index: 5 },
  { start: 11, end: 13, zhi: '午', index: 6 },
  { start: 13, end: 15, zhi: '未', index: 7 },
  { start: 15, end: 17, zhi: '申', index: 8 },
  { start: 17, end: 19, zhi: '酉', index: 9 },
  { start: 19, end: 21, zhi: '戌', index: 10 },
  { start: 21, end: 23, zhi: '亥', index: 11 },
];

export function calcYearPillar(year) {
  const ganIndex = (year - 4) % 10;
  const zhiIndex = (year - 4) % 12;
  return { gan: TIAN_GAN[ganIndex], zhi: DI_ZHI[zhiIndex], full: TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex], shengXiao: SHENG_XIAO[zhiIndex] };
}

export function calcMonthPillar(year, month) {
  const yearGanIndex = (year - 4) % 10;
  const startGanMap = [2, 4, 6, 8, 0];
  const firstMonthGanIndex = startGanMap[yearGanIndex % 5];
  const zhiIndex = (month + 1) % 12;
  const ganIndex = (firstMonthGanIndex + month - 1) % 10;
  return { gan: TIAN_GAN[ganIndex], zhi: DI_ZHI[zhiIndex], full: TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex] };
}

export function calcDayPillar(year, month, day) {
  const baseDate = new Date(2000, 0, 1);
  const targetDate = new Date(year, month - 1, day);
  const diffDays = Math.round((targetDate - baseDate) / (1000 * 60 * 60 * 24));
  const baseGanIndex = 4;
  const baseZhiIndex = 6;
  let ganIndex = (baseGanIndex + diffDays) % 10;
  let zhiIndex = (baseZhiIndex + diffDays) % 12;
  if (ganIndex < 0) ganIndex += 10;
  if (zhiIndex < 0) zhiIndex += 12;
  return { gan: TIAN_GAN[ganIndex], zhi: DI_ZHI[zhiIndex], full: TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex] };
}

export function calcHourPillar(hour, dayGanIndex) {
  let zhiIndex = -1;
  for (const entry of HOUR_TO_ZHI) {
    if (entry.start === 23 && entry.end === 1) {
      if (hour >= 23 || hour < 1) { zhiIndex = entry.index; break; }
    } else if (hour >= entry.start && hour < entry.end) {
      zhiIndex = entry.index; break;
    }
  }
  if (zhiIndex === -1) zhiIndex = 0;
  const ziGanMap = [0, 2, 4, 6, 8];
  const ziGanIndex = ziGanMap[dayGanIndex % 5];
  const ganIndex = (ziGanIndex + zhiIndex) % 10;
  return { gan: TIAN_GAN[ganIndex], zhi: DI_ZHI[zhiIndex], full: TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex] };
}

export function calcFullBaZi(year, month, day, hour) {
  const yearPillar = calcYearPillar(year);
  const monthPillar = calcMonthPillar(year, month);
  const dayPillar = calcDayPillar(year, month, day);
  const dayGanIndex = TIAN_GAN.indexOf(dayPillar.gan);
  const hourPillar = calcHourPillar(hour, dayGanIndex);
  const fullText = `${yearPillar.full} ${monthPillar.full} ${dayPillar.full} ${hourPillar.full}`;
  return { yearPillar, monthPillar, dayPillar, hourPillar, fullText };
}

// ===== 健康使用提醒 =====
export function checkUsageFrequency(drawTimestamps, options = {}) {
  const now = Date.now();
  const sorted = [...drawTimestamps].sort((a, b) => a - b);
  const shortWindow = (options.shortWindow || 30) * 60 * 1000;
  const maxShort = options.maxInShortWindow || 3;
  const longWindow = (options.longWindow || 4) * 60 * 60 * 1000;
  const maxLong = options.maxInLongWindow || 6;
  const shortCount = sorted.filter(t => now - t <= shortWindow).length;
  const longCount = sorted.filter(t => now - t <= longWindow).length;
  if (shortCount >= maxShort) {
    return { level: 'strong', message: '你在短时间内抽了很多次牌。牌只是镜子，多看容易模糊。不妨先回到手头的事里，过一阵子再问。' };
  }
  if (longCount >= maxLong) {
    return { level: 'gentle', message: '今天你已经抽了好几次牌了。如果心里还是拿不准，不如先去散个步、喝杯水，牌不会跑的。' };
  }
  return { level: 'normal', message: '' };
}