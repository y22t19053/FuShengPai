// ===== src/utils/solar-time.js · 真太阳时（纯函数，无 DOM） =====
// 用途：把「钟表时间」换算成「真太阳时」，用于：
//   - 日运/牌灵页面展示「此刻真太阳时辰」（历法事实，不是命运判决）
//   - 八字预览：出生地经度 → 出生真太阳时 → 时辰更准
// 算法（精度约 ±1 分钟内，对时辰划分足够）：
//   1. 均时差 EoT（Jean Meeus 简化公式）
//   2. 经度差修正：中国法定 UTC+8（东经 120°），每偏离 1° 差 4 分钟
//   3. 真太阳时 = 钟表时间 + EoT + (经度 − 120) × 4 分钟
// 参考：zengzhan/rili-bazi 的 jw.json 城市经纬度思路（本文件内置精简版）。

import { Solar } from 'lunar-javascript';

/** 主要城市经纬度（省会 + 计划单列市 + 港澳台，约 36 城；西经用负数） */
export const CITIES = [
  { name: '北京', lon: 116.41, lat: 39.9 },
  { name: '上海', lon: 121.47, lat: 31.23 },
  { name: '天津', lon: 117.2, lat: 39.13 },
  { name: '重庆', lon: 106.55, lat: 29.56 },
  { name: '广州', lon: 113.26, lat: 23.13 },
  { name: '深圳', lon: 114.06, lat: 22.55 },
  { name: '杭州', lon: 120.15, lat: 30.28 },
  { name: '南京', lon: 118.78, lat: 32.04 },
  { name: '成都', lon: 104.07, lat: 30.67 },
  { name: '武汉', lon: 114.3, lat: 30.59 },
  { name: '西安', lon: 108.94, lat: 34.34 },
  { name: '郑州', lon: 113.65, lat: 34.76 },
  { name: '济南', lon: 117.12, lat: 36.65 },
  { name: '青岛', lon: 120.38, lat: 36.07 },
  { name: '沈阳', lon: 123.43, lat: 41.8 },
  { name: '大连', lon: 121.61, lat: 38.91 },
  { name: '长春', lon: 125.32, lat: 43.9 },
  { name: '哈尔滨', lon: 126.63, lat: 45.75 },
  { name: '石家庄', lon: 114.5, lat: 38.05 },
  { name: '太原', lon: 112.55, lat: 37.87 },
  { name: '呼和浩特', lon: 111.75, lat: 40.84 },
  { name: '兰州', lon: 103.83, lat: 36.06 },
  { name: '西宁', lon: 101.78, lat: 36.62 },
  { name: '银川', lon: 106.23, lat: 38.49 },
  { name: '乌鲁木齐', lon: 87.62, lat: 43.83 },
  { name: '拉萨', lon: 91.11, lat: 29.97 },
  { name: '昆明', lon: 102.71, lat: 25.05 },
  { name: '贵阳', lon: 106.63, lat: 26.65 },
  { name: '南宁', lon: 108.37, lat: 22.82 },
  { name: '海口', lon: 110.32, lat: 20.03 },
  { name: '福州', lon: 119.3, lat: 26.08 },
  { name: '厦门', lon: 118.09, lat: 24.48 },
  { name: '南昌', lon: 115.86, lat: 28.68 },
  { name: '长沙', lon: 112.94, lat: 28.23 },
  { name: '合肥', lon: 117.23, lat: 31.82 },
  { name: '香港', lon: 114.17, lat: 22.32 },
  { name: '澳门', lon: 113.55, lat: 22.2 },
  { name: '台北', lon: 121.56, lat: 25.03 },
];

/** 城市名 → 经度（未命中返回 null） */
export function getLonForCity(name) {
  if (!name) return null;
  const hit = CITIES.find(c => c.name === name.trim()) || CITIES.find(c => name.includes(c.name));
  return hit ? hit.lon : null;
}

/** 年内天数（1 月 1 日为 1） */
function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date - start) / 86400000) + 1;
}

/**
 * 均时差（分钟）。Meeus 简化公式：全年 ±17 分钟内的近似，精度优于 1 分钟。
 * @param {Date} date
 * @returns {number} 分钟（可为负）
 */
export function equationOfTimeMinutes(date) {
  const d = date instanceof Date ? date : new Date(date);
  const n = dayOfYear(d);
  const b = (2 * Math.PI * (n - 81)) / 365;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

/**
 * 真太阳时换算：把钟表时间 + 均时差 + 经度差，得到一个新的 Date（允许跨天）。
 * @param {Date|number|string} clockTime 钟表时间
 * @param {number} [lon] 东经正数；缺省 120（UTC+8 标准经线）
 * @returns {Date} 真太阳时对应的 Date
 */
export function toTrueSolarTime(clockTime, lon = 120) {
  const base = clockTime instanceof Date ? new Date(clockTime) : new Date(clockTime);
  if (isNaN(base.getTime())) return null;
  const l = Number.isFinite(lon) ? lon : 120;
  const eot = equationOfTimeMinutes(base);
  const lonShift = (l - 120) * 4; // 每度 4 分钟
  return new Date(base.getTime() + (eot + lonShift) * 60000);
}

/**
 * 真太阳时 → 时辰地支（23 点后归次日子时）。
 * @param {Date} date
 * @returns {{ zhi: string, index: number, hour: number, minute: number, isNextDay: boolean }}
 */
export function hourZhiOf(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return null;
  let h = d.getHours();
  const m = d.getMinutes();
  let zhiIndex = Math.floor((h + 1) / 2) % 12; // 子0 丑1 寅2 … 亥11
  let isNextDay = false;
  if (h >= 23) { zhiIndex = 0; isNextDay = true; } // 23-24 属次日子时
  const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  return { zhi: ZHI[zhiIndex], index: zhiIndex, hour: h, minute: m, isNextDay };
}

/**
 * 五鼠遁：日干 + 时支 → 时干（甲己还加甲，乙庚丙作初，丙辛从戊起，丁壬庚子居，戊癸起壬子）。
 * @param {string} dayGan 日干（如 '壬'）
 * @param {number} zhiIndex 时支索引（子=0 … 亥=11）
 * @returns {string} 时干
 */
export function hourGanOf(dayGan, zhiIndex) {
  const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const start = { 甲: 0, 己: 0, 乙: 2, 庚: 2, 丙: 4, 辛: 4, 丁: 6, 壬: 6, 戊: 8, 癸: 8 };
  const s = start[dayGan];
  if (s === undefined) return '';
  return GAN[(s + zhiIndex) % 10];
}

/**
 * 当前真太阳时辰快照（含干支/生肖/象义索引）。
 * @param {Date} [clockTime] 缺省为现在
 * @param {number} [lon] 经度；缺省 120
 * @returns {{ date: Date, solar: Date, zhi: string, zhiIndex: number, gan: string, ganZhi: string, shengXiao: string, label: string, wuxing: string, isNextDay: boolean }|null}
 */
export function getTrueSolarHour(clockTime, lon = 120) {
  const base = clockTime instanceof Date ? new Date(clockTime) : new Date(clockTime || Date.now());
  const solar = toTrueSolarTime(base, lon);
  if (!solar) return null;
  const hour = hourZhiOf(solar);
  if (!hour) return null;
  // 日干支按真太阳时可能跨天：跨天时用次日干支
  const ganZhiDay = getDayGanZhiFor(base, hour.isNextDay);
  const dayGan = ganZhiDay ? ganZhiDay.charAt(0) : '';
  const gan = hourGanOf(dayGan, hour.index);
  const ZHI_WX = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' };
  const SHENGXIAO = { 子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇', 午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪' };
  const LABEL = { 子: '夜半', 丑: '鸡鸣', 寅: '平旦', 卯: '日出', 辰: '食时', 巳: '隅中', 午: '日中', 未: '日昳', 申: '晡时', 酉: '日入', 戌: '黄昏', 亥: '人定' };
  return {
    date: base,
    solar,
    zhi: hour.zhi,
    zhiIndex: hour.index,
    gan,
    ganZhi: gan ? gan + hour.zhi : hour.zhi,
    shengXiao: SHENGXIAO[hour.zhi],
    label: LABEL[hour.zhi],
    wuxing: ZHI_WX[hour.zhi],
    isNextDay: hour.isNextDay,
  };
}

/** 取「真太阳日」的日干支（跨天时取次日），供五鼠遁使用；返回如 '壬子' */
function getDayGanZhiFor(clockTime, isNextDay) {
  try {
    const d = new Date(clockTime);
    if (isNextDay) d.setDate(d.getDate() + 1);
    return Solar.fromDate(d).getLunar().getDayInGanZhi();
  } catch (e) { return ''; }
}
