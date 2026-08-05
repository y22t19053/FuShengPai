// ===== src/season.js · 旬：四季 accent + 二十四节气 + 迎客/常客/昨日之牌 =====
// 日料店的菜单跟着季节变，牌也跟着天时走：
//   - 一季一个 accent 色（春竹绿 / 夏青瓷 / 秋玄金 / 冬雪青）
//   - 节气当天换一行副题：「今日小满，宜问前程。」
//   - 「过了季就不上」——今日一签，只此一签（天然稀缺，比徽章高级）

// 二十四节气（日期级近似，±1 天，与 engine.js 的 JIEQI 口径一致）
const SOLAR_TERMS = [
  { m: 1,  d: 6,  name: '小寒', ask: '宜敛藏' },
  { m: 1,  d: 20, name: '大寒', ask: '宜守静' },
  { m: 2,  d: 4,  name: '立春', ask: '宜立志' },
  { m: 2,  d: 19, name: '雨水', ask: '宜滋润' },
  { m: 3,  d: 6,  name: '惊蛰', ask: '宜苏醒' },
  { m: 3,  d: 21, name: '春分', ask: '宜平衡' },
  { m: 4,  d: 5,  name: '清明', ask: '宜清朗' },
  { m: 4,  d: 20, name: '谷雨', ask: '宜播种' },
  { m: 5,  d: 6,  name: '立夏', ask: '宜生长' },
  { m: 5,  d: 21, name: '小满', ask: '宜问前程' },
  { m: 6,  d: 6,  name: '芒种', ask: '宜耕耘' },
  { m: 6,  d: 21, name: '夏至', ask: '宜养阳' },
  { m: 7,  d: 7,  name: '小暑', ask: '宜静心' },
  { m: 7,  d: 23, name: '大暑', ask: '宜避暑' },
  { m: 8,  d: 8,  name: '立秋', ask: '宜收敛' },
  { m: 8,  d: 23, name: '处暑', ask: '宜疏解' },
  { m: 9,  d: 8,  name: '白露', ask: '宜养润' },
  { m: 9,  d: 23, name: '秋分', ask: '宜均衡' },
  { m: 10, d: 8,  name: '寒露', ask: '宜保暖' },
  { m: 10, d: 23, name: '霜降', ask: '宜收藏' },
  { m: 11, d: 7,  name: '立冬', ask: '宜蓄力' },
  { m: 11, d: 22, name: '小雪', ask: '宜内省' },
  { m: 12, d: 7,  name: '大雪', ask: '宜安顿' },
  { m: 12, d: 22, name: '冬至', ask: '宜归根' },
];

// 四季 accent（--accent / --accent-rgb 覆盖值；秋 = 默认鼠尾草绿，与 :root 自洽）
// 铁律：手绘绘本风——莫兰迪低饱和，暖纸底 + 鼠尾草薄荷绿主色 + 陶土红点缀，忌高饱和撞色。
export const SEASON_ACCENTS = {
  '春': { accent: '#8fc0ad', rgb: '143,192,173' }, // 春芽鼠尾草（春醒）
  '夏': { accent: '#7aa8b8', rgb: '122,168,184' }, // 雾蓝（夏凉）
  '秋': { accent: '#6fae9c', rgb: '111,174,156' }, // 鼠尾草（默认主色）
  '冬': { accent: '#5c8a7a', rgb: '92,138,122' }, // 深鼠尾草（冬敛）
};

/** 季节（2-4 春 / 5-7 夏 / 8-10 秋 / 11-1 冬） */
export function seasonOf(d = new Date()) {
  const m = d.getMonth() + 1;
  if (m >= 2 && m <= 4) return '春';
  if (m >= 5 && m <= 7) return '夏';
  if (m >= 8 && m <= 10) return '秋';
  return '冬';
}

/** 今天是否恰逢节气 → { name, ask } | null */
export function getJieqiToday(d = new Date()) {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  for (const t of SOLAR_TERMS) {
    if (t.m === m && t.d === day) return { name: t.name, ask: t.ask };
  }
  return null;
}

/** 旬信息：{ season, accent, rgb, jieqi } */
export function getSeasonInfo(d = new Date()) {
  const season = seasonOf(d);
  const { accent, rgb } = SEASON_ACCENTS[season];
  return { season, accent, rgb, jieqi: getJieqiToday(d) };
}

/** 应用季节 accent 到 :root（--accent / --accent-rgb 由 CSS 变量化后全站跟随） */
export function applySeasonAccent(d = new Date()) {
  const { accent, rgb } = getSeasonInfo(d);
  const root = document.documentElement;
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-rgb', rgb);
}

// ---------- 进门迎客：时段一句 + 常客承认 + 昨日之牌回访 ----------

// 时段按 from 升序排列——循环在第一个 h < from 处 break，
// 数组乱序（23 排首位）会导致 0-22 点全部误命中最晚的深夜语。
const HOUR_GREETINGS = [
  { from: 5,  text: '天刚亮，来问点什么？' },
  { from: 8,  text: '今天来问点什么？' },
  { from: 11, text: '午间小憩，抽一张歇一歇。' },
  { from: 14, text: '下午好，来问点什么？' },
  { from: 18, text: '收工了，抽一张听听它说什么。' },
  { from: 21, text: '晚上好，今天想聊点什么？' },
  { from: 23, text: '这么晚还在想事，先抽一张安静一下。' },
];

/** 时段迎客语（安静一句，像店家隔着门帘点头） */
export function getHourGreeting(d = new Date()) {
  const h = d.getHours();
  // 兜底取末位（深夜档）：0-4 点同样归「这么晚还在想事」
  let g = HOUR_GREETINGS[HOUR_GREETINGS.length - 1];
  for (const item of HOUR_GREETINGS) {
    if (h >= item.from) g = item;
    else break;
  }
  return g.text;
}

/**
 * 常客连续天数：从今天向前数，每天有一次记录即 +1，断签即停。
 * 注意是「安静的承认」，不是打卡炫耀——只显示数字，不喊口号。
 */
export function getVisitStreak(timestamps = []) {
  const days = new Set(timestamps.map(ts => new Date(ts).toDateString()));
  let streak = 0;
  const d = new Date();
  if (!days.has(d.toDateString())) return 0;
  streak = 1;
  for (let i = 1; i < 730; i++) {
    const prev = new Date(d);
    prev.setDate(d.getDate() - i);
    if (days.has(prev.toDateString())) streak++;
    else break;
  }
  return streak;
}

/** 牌面中文标签：♠7 → 黑桃7 · 大王 */
const SUIT_NAMES = { '♠': '黑桃', '♥': '红心', '♦': '方块', '♣': '梅花' };
export function cardLabel(card) {
  if (!card) return '';
  if (card.isJoker) return card.type || '大小王';
  const suit = SUIT_NAMES[card.suit] || card.suit || '';
  return `${suit}${card.rank ?? ''}`;
}

/**
 * 昨日之牌：从历史里找昨天最新的那张牌（period 有 card；普通解读取 ti）。
 * 送客的跨天连续：第二天回来，第一句问「昨天那张牌，今天还在你心里吗」。
 */
export function getYesterdayCard(history = []) {
  const now = new Date();
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  const yStr = y.toDateString();
  for (const h of history) {
    if (!h || !h.time) continue;
    if (new Date(h.time).toDateString() !== yStr) continue;
    const card = h.card || h.ti || h.yong;
    if (card && (card.rank || card.isJoker)) return card;
  }
  return null;
}
