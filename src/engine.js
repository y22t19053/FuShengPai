// ===== src/engine.js · 核心算法与工具 =====
import { GONG_WUXING, getWuxing } from './data.js';

// ---- 干支基础 ----
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const SHENG_XIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

// ---- 牌面数值 ----
const CARD_VALUE_MAP = { A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13 };

export function getCardValue(card) {
  if (!card) return 0;
  if (card.isJoker) return 0;
  return CARD_VALUE_MAP[String(card.rank)] || 0;
}

// ---- 节气（日期级近似）----
const JIEQI = [
  { month: 1,  day: 6,  branch: 1  },  // 小寒 → 丑月
  { month: 2,  day: 4,  branch: 2  },  // 立春 → 寅月
  { month: 3,  day: 5,  branch: 3  },  // 惊蛰 → 卯月
  { month: 4,  day: 5,  branch: 4  },  // 清明 → 辰月
  { month: 5,  day: 6,  branch: 5  },  // 立夏 → 巳月
  { month: 6,  day: 6,  branch: 6  },  // 芒种 → 午月
  { month: 7,  day: 7,  branch: 7  },  // 小暑 → 未月
  { month: 8,  day: 8,  branch: 8  },  // 立秋 → 申月
  { month: 9,  day: 8,  branch: 9  },  // 白露 → 酉月
  { month: 10, day: 8,  branch: 10 },  // 寒露 → 戌月
  { month: 11, day: 7,  branch: 11 },  // 立冬 → 亥月
  { month: 12, day: 7,  branch: 0  },  // 大雪 → 子月
];

// ===== 年柱：以立春为界 =====
export function calcYearPillar(year, month, day) {
  let ly = year;
  if (month > 2 || (month === 2 && day >= 4)) ly = year;
  else ly = year - 1;
  const gan = ((ly - 4) % 10 + 10) % 10;
  const zhi = ((ly - 4) % 12 + 12) % 12;
  return { gan, zhi, full: TIAN_GAN[gan] + DI_ZHI[zhi], shengXiao: SHENG_XIAO[zhi], year: ly };
}

// ===== 月柱：以节气为界，五虎遁 =====
export function calcMonthPillar(year, month, day) {
  const yp = calcYearPillar(year, month, day);
  const yearGan = yp.gan;

  let branch;
  if (month === 1 && day < 6) {
    branch = 0; // 1/1-1/5 为前一年子月
  } else {
    const current = month * 100 + day;
    let last = JIEQI[0];
    for (const jq of JIEQI) {
      if (jq.month * 100 + jq.day <= current) last = jq;
      else break;
    }
    branch = last.branch;
  }

  const firstGan = ((yearGan % 5) * 2 + 2) % 10; // 五虎遁
  const offset = (branch - 2 + 12) % 12;
  const gan = (firstGan + offset) % 10;
  return { gan, zhi: branch, full: TIAN_GAN[gan] + DI_ZHI[branch] };
}

// ===== 日柱：基准 1984-02-02 = 甲子 =====
export function calcDayPillar(year, month, day, hour = 12) {
  const target = new Date(year, month - 1, day);
  if (hour >= 23) target.setDate(target.getDate() + 1);
  const base = new Date(1984, 1, 2);
  const days = Math.round((target - base) / 86400000);
  const gan = ((days % 10) + 10) % 10;
  const zhi = ((days % 12) + 12) % 12;
  return { gan, zhi, full: TIAN_GAN[gan] + DI_ZHI[zhi], days };
}

// ===== 时柱：五鼠遁 =====
export function calcHourPillar(year, month, day, hour) {
  const h = ((hour % 24) + 24) % 24;
  const hourIndex = Math.floor((h + 1) / 2) % 12; // 23/0→子, 1→丑
  const dp = calcDayPillar(year, month, day, hour);
  const ziGan = ((dp.gan % 5) * 2) % 10;
  const gan = (ziGan + hourIndex) % 10;
  return { gan, zhi: hourIndex, full: TIAN_GAN[gan] + DI_ZHI[hourIndex] };
}

// ===== 完整八字 =====
export function calcFullBaZi(year, month, day, hour = 12, longitude = 120) {
  // 真太阳时修正（近似：每15°经度约1小时，未含均时差）
  const solarHour = hour + (longitude - 120) / 15;
  const yp = calcYearPillar(year, month, day);
  const mp = calcMonthPillar(year, month, day);
  const dp = calcDayPillar(year, month, day, solarHour);
  const hp = calcHourPillar(year, month, day, solarHour);
  return {
    yearPillar: yp,
    monthPillar: mp,
    dayPillar: dp,
    hourPillar: hp,
    fullText: `${yp.full} ${mp.full} ${dp.full} ${hp.full}`,
    ganZhi: [yp.full, mp.full, dp.full, hp.full],
  };
}

// ===== 牌堆（恢复 includeJokers 语义）=====
export function createDeck(includeJokers = true) {
  const suits = ['♥', '♦', '♣', '♠'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const deck = [];
  let uid = 1;
  for (const s of suits) for (const r of ranks) deck.push({ suit: s, rank: r, isJoker: false, _uid: uid++ });
  if (includeJokers) deck.push({ isJoker: true, type: '大王', _uid: uid++ }, { isJoker: true, type: '小王', _uid: uid++ });
  return deck;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function drawTiYong(deck) {
  const d = [...deck];
  const ti = d.shift();
  const yong = d.shift();
  return { ti, yong, remaining: d };
}

// ===== 差值：宫位数 - 牌面数值（恢复算术差）=====
export function calcDiff(gong, card) {
  const gongNum = (typeof gong === 'number') ? gong : parseInt(String(gong), 10) || 0;
  return gongNum - getCardValue(card);
}

// ===== 差值绝对值（供 durian.js / texts-readings.js 用）=====
export function getDiffMagnitude(gong, card) {
  return Math.abs(calcDiff(gong, card));
}

// ===== 差值颜色分级 =====
export function getDiffLevel(diff) {
  const abs = Math.abs(diff);
  if (abs === 0)  return { color: '#9ca3af', label: '无差' };
  if (abs <= 3)   return { color: '#10b981', label: '小差' };
  if (abs <= 6)   return { color: '#f59e0b', label: '中差' };
  if (abs <= 9)   return { color: '#f97316', label: '大差' };
  return { color: '#ef4444', label: '巨差' };
}

// ===== 五行生克（保留，供其它逻辑使用）=====
export function getWuxingRelation(gong, card) {
  const gongWx = GONG_WUXING[gong];
  const cardWx = getWuxing(card);
  if (!gongWx || !cardWx) return null;
  const order = ['木', '火', '土', '金', '水'];
  const idx1 = order.indexOf(cardWx);
  const idx2 = order.indexOf(gongWx);
  if (idx1 < 0 || idx2 < 0) return null;
  return (idx1 - idx2 + 5) % 5;
}