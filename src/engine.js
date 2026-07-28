// ===== 浮生牌 · 核心引擎 =====
// 纯算法集合，无副作用，无状态依赖。
// 从 data.js 导入规则和判定函数，对外输出可组合的纯函数。

import {
  SUITS, RANKS, GONG_ORDER, ALL_LINES, TIME_LABELS,
  getWuxing, getCardValue, getCardId, getShengKe, getShengKeLabel, getWangState,
} from './data.js';

// ===== 牌组创建 =====

/**
 * 生成一副完整的 54 张牌（52 张普通牌 + 2 张大小王）
 * @param {boolean} includeJokers - 是否包含大小王，默认 true
 * @returns {Array} 牌组数组
 */
export function createDeck(includeJokers = true) {
  let uid = 0;
  const deck = [];

  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        isJoker: false,
        _uid: uid++,
      });
    }
  }

  if (includeJokers) {
    deck.push({ isJoker: true, type: '大王', _uid: uid++ });
    deck.push({ isJoker: true, type: '小王', _uid: uid++ });
  }

  return deck;
}

// ===== 随机与洗牌 =====

/**
 * Fisher-Yates 洗牌，优先使用密码学安全随机
 * @param {Array} arr
 * @returns {Array} 新数组，不改变原数组
 */
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

// ===== 体用相关 =====

/**
 * 从牌堆中抽取体用两张牌（不改变原牌堆）
 * @param {Array} deck - 尚未洗入大小王的 52 张牌
 * @returns {{ ti: Object, yong: Object, remaining: Array }}
 */
export function drawTiYong(deck) {
  const shuffled = shuffle(deck);
  const ti = shuffled[0];
  const yong = shuffled[1];
  const remaining = shuffled.slice(2);
  return { ti, yong, remaining };
}

/**
 * 将大小王注入牌堆并重新洗牌
 * @param {Array} deck - 体用抽出后的剩余牌（50张）
 * @returns {Array} 洗入大小王后的 52 张牌
 */
export function injectJokers(deck) {
  const jokers = [
    { isJoker: true, type: '大王', _uid: Date.now() + Math.random() },
    { isJoker: true, type: '小王', _uid: Date.now() + Math.random() + 1 },
  ];
  return shuffle([...deck, ...jokers]);
}

/**
 * 计算体用生克关系
 * @param {Object} ti
 * @param {Object} yong
 * @returns {{ tiWx: string, yongWx: string, relation: string|null, label: string }}
 */
export function evaluateTiYong(ti, yong) {
  const tiWx = getWuxing(ti);
  const yongWx = getWuxing(yong);
  const relation = getShengKe(tiWx, yongWx);
  const label = getShengKeLabel(relation);
  return { tiWx, yongWx, relation, label };
}

// ===== 九宫与天机线 =====

/**
 * 将一张牌放入指定宫位（返回新的宫位映射）
 * @param {Object} grid - 当前九宫对象
 * @param {number} gong - 宫位数字 1-9
 * @param {Object} card - 要放入的牌
 * @param {number} maxPerGong - 每宫最大牌数，默认 3
 * @returns {{ success: boolean, grid: Object }}
 */
export function placeCardInGong(grid, gong, card, maxPerGong = 3) {
  const newGrid = { ...grid };
  const current = newGrid[gong] || [];
  if (current.length >= maxPerGong) {
    return { success: false, grid };
  }
  newGrid[gong] = [...current, card];
  return { success: true, grid: newGrid };
}

/**
 * 检测所有已填满宫位的连线
 * @param {Object} grid
 * @returns {Array} 可能的天机线
 */
export function detectLines(grid) {
  const filledGongs = Object.keys(grid)
    .filter(g => grid[g] && grid[g].length > 0)
    .map(Number);

  return ALL_LINES.filter(line => line.every(g => filledGongs.includes(g)));
}

/**
 * 根据放牌顺序和可选线，确定实际生效的天机线及方向
 * @param {Array} possibleLines
 * @param {Array} gongOrder
 * @returns {{ line: Array|null, direction: string|null }}
 */
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

/**
 * 根据确认的天机线方向，生成各宫的时间身份映射
 * @param {string} direction
 * @returns {Object}
 */
export function getTimeLabels(direction) {
  const labels = TIME_LABELS[direction];
  if (!labels) return {};
  const result = {};
  for (let g = 1; g <= 9; g++) {
    result[g] = labels[g] || '';
  }
  return result;
}

/**
 * 计算牌面数值与宫位数字的差值
 * @param {number} gongNumber
 * @param {Object} card
 * @returns {number}
 */
export function calcDiff(gongNumber, card) {
  return Math.abs(gongNumber - getCardValue(card));
}

/**
 * 为九宫中所有牌生成结构化分析结果
 * @param {Object} grid
 * @param {Object} lineOrder
 * @param {Object} ti
 * @returns {Array}
 */
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

      results.push({
        gong: g,
        card,
        cardWx,
        diff,
        wangState,
        relToTi,
        timeRole,
        position: index,
      });
    });
  }

  return results;
}

// ===== 四柱计算 =====

// 天干地支
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const SHENG_XIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

// 时辰对应表（24小时制 → 地支）
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

/**
 * 根据公历年份计算年柱
 * @param {number} year
 * @returns {{ gan: string, zhi: string, full: string, shengXiao: string }}
 */
export function calcYearPillar(year) {
  const ganIndex = (year - 4) % 10;
  const zhiIndex = (year - 4) % 12;
  return {
    gan: TIAN_GAN[ganIndex],
    zhi: DI_ZHI[zhiIndex],
    full: TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex],
    shengXiao: SHENG_XIAO[zhiIndex],
  };
}

/**
 * 根据公历年月计算月柱
 * 月柱以节气为界，此处使用简化算法（基于年份天干推算正月起始）
 * @param {number} year
 * @param {number} month - 1-12
 * @returns {{ gan: string, zhi: string, full: string }}
 */
export function calcMonthPillar(year, month) {
  // 年天干决定正月（寅月）的天干
  const yearGanIndex = (year - 4) % 10;
  // 甲己之年丙作首，乙庚戊为头，丙辛庚起，丁壬壬位，戊癸甲寅
  const startGanMap = [2, 4, 6, 8, 0]; // 丙、戊、庚、壬、甲 对应索引
  const firstMonthGanIndex = startGanMap[yearGanIndex % 5];

  // 月地支：正月为寅（索引2），二月卯（3）...十二月丑（1）
  const zhiIndex = (month + 1) % 12; // 正月对应寅=2，month=1 → (1+1)%12=2
  const ganIndex = (firstMonthGanIndex + month - 1) % 10;

  return {
    gan: TIAN_GAN[ganIndex],
    zhi: DI_ZHI[zhiIndex],
    full: TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex],
  };
}

/**
 * 根据公历日期计算日柱
 * 使用已知基准日：2000年1月1日为戊午日（ganIndex=4, zhiIndex=6）
 * @param {number} year
 * @param {number} month - 1-12
 * @param {number} day
 * @returns {{ gan: string, zhi: string, full: string }}
 */
export function calcDayPillar(year, month, day) {
  // 计算从2000-01-01到目标日期的天数差
  const baseDate = new Date(2000, 0, 1);
  const targetDate = new Date(year, month - 1, day);
  const diffDays = Math.round((targetDate - baseDate) / (1000 * 60 * 60 * 24));

  // 基准日干支索引：戊=4, 午=6
  const baseGanIndex = 4;
  const baseZhiIndex = 6;

  let ganIndex = (baseGanIndex + diffDays) % 10;
  let zhiIndex = (baseZhiIndex + diffDays) % 12;
  if (ganIndex < 0) ganIndex += 10;
  if (zhiIndex < 0) zhiIndex += 12;

  return {
    gan: TIAN_GAN[ganIndex],
    zhi: DI_ZHI[zhiIndex],
    full: TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex],
  };
}

/**
 * 根据小时数计算时柱
 * @param {number} hour - 0-23
 * @param {number} dayGanIndex - 日柱天干索引（0-9），时柱天干由此推算
 * @returns {{ gan: string, zhi: string, full: string }}
 */
export function calcHourPillar(hour, dayGanIndex) {
  // 确定时辰地支
  let zhiIndex = -1;
  for (const entry of HOUR_TO_ZHI) {
    if (entry.start === 23 && entry.end === 1) {
      if (hour >= 23 || hour < 1) { zhiIndex = entry.index; break; }
    } else if (hour >= entry.start && hour < entry.end) {
      zhiIndex = entry.index;
      break;
    }
  }
  if (zhiIndex === -1) zhiIndex = 0; // fallback

  // 时柱天干：根据日柱天干推算子时天干
  // 甲己日甲子时，乙庚日丙子时，丙辛日戊子时，丁壬日庚子时，戊癸日壬子时
  const ziGanMap = [0, 2, 4, 6, 8]; // 甲丙戊庚壬 对应索引
  const ziGanIndex = ziGanMap[dayGanIndex % 5];
  const ganIndex = (ziGanIndex + zhiIndex) % 10;

  return {
    gan: TIAN_GAN[ganIndex],
    zhi: DI_ZHI[zhiIndex],
    full: TIAN_GAN[ganIndex] + DI_ZHI[zhiIndex],
  };
}

/**
 * 完整四柱计算
 * @param {number} year - 公历年
 * @param {number} month - 1-12
 * @param {number} day
 * @param {number} hour - 0-23
 * @returns {{ yearPillar, monthPillar, dayPillar, hourPillar, fullText: string }}
 */
export function calcFullBaZi(year, month, day, hour) {
  const yearPillar = calcYearPillar(year);
  const monthPillar = calcMonthPillar(year, month);
  const dayPillar = calcDayPillar(year, month, day);

  // 获取日柱天干索引用于时柱计算
  const dayGanIndex = TIAN_GAN.indexOf(dayPillar.gan);
  const hourPillar = calcHourPillar(hour, dayGanIndex);

  const fullText = `${yearPillar.full} ${monthPillar.full} ${dayPillar.full} ${hourPillar.full}`;

  return {
    yearPillar,
    monthPillar,
    dayPillar,
    hourPillar,
    fullText,
  };
}

// ===== 健康使用提醒 =====

/**
 * 根据用户的占卜历史时间戳，评估是否需要提醒休息
 * @param {Array<number>} drawTimestamps
 * @param {Object} options
 * @returns {{ level: 'normal'|'gentle'|'strong', message: string }}
 */
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
    return {
      level: 'strong',
      message: '你在短时间内抽了很多次牌。牌只是镜子，多看容易模糊。不妨先回到手头的事里，过一阵子再问。',
    };
  }

  if (longCount >= maxLong) {
    return {
      level: 'gentle',
      message: '今天你已经抽了好几次牌了。如果心里还是拿不准，不如先去散个步、喝杯水，牌不会跑的。',
    };
  }

  return {
    level: 'normal',
    message: '',
  };
}