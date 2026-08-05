// ===== src/calendar.js · 真实黄历（lunar-javascript 薄封装） =====
// 把农历日期 / 干支 / 建除值星 / 冲煞 / 神煞方位 / 节气 / 星座 统一成一份「当日历法快照」。
// 原则：历法计算交给 lunar-javascript（真实、跨年与闰月边界正确，MIT 协议），
//       白话文案仍由浮生牌自己的池子负责（JIANGCHU / CHONG），这里只出结构化数据。
// 这份数据直接支撑：
//   - 日运 oracle 的真实建除/冲煞（替换原先「按日期伪随机」）
//   - 今日黄历小组件（农历、干支、财神方位、节气、星座）

import { Solar } from 'lunar-javascript';

function parseSolar(dateStr) {
  if (!dateStr) return null;
  const m = String(dateStr).match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (!m) return null;
  return { y: Number(m[1]), mo: Number(m[2]), d: Number(m[3]) };
}

/**
 * 当日历法快照（真实历法）
 * @param {string} [dateStr] 如 '2026-08-06'；缺省为今天（本地时间）
 * @returns {{
 *   date: string,
 *   lunarYear: string,   // 二〇二六
 *   lunarDate: string,   // 六月廿四
 *   ganZhiDay: string,   // 壬子
 *   jianchu: string,     // 执（建除十二值星之一）
 *   chong: { zhi: string, animal: string, desc: string },  // 冲煞
 *   xiu: { name: string, zheng: string, animal: string },  // 二十八宿
 *   term: string|null,   // 当天恰逢节气时非空，如 '立秋'
 *   xingzuo: string,     // 狮子座
 *   shengXiao: string,   // 日生肖
 *   shenSha: { xi: string, fu: string, cai: string }       // 喜神/福神/财神方位
 * }}
 */
export function getAlmanac(dateStr) {
  const p = parseSolar(dateStr);
  const solar = p ? Solar.fromYmd(p.y, p.mo, p.d) : Solar.fromDate(new Date());
  const l = solar.getLunar();
  const term = l.getJieQi() || null;
  return {
    date: solar.toYmd(),
    lunarYear: l.getYearInChinese(),
    lunarDate: `${l.getMonthInChinese()}月${l.getDayInChinese()}`,
    ganZhiDay: l.getDayInGanZhi(),
    jianchu: l.getZhiXing(),
    chong: {
      zhi: l.getDayChong(),
      animal: l.getDayChongShengXiao(),
      desc: l.getDayChongDesc(),
    },
    xiu: { name: l.getXiu(), zheng: l.getZheng(), animal: l.getAnimal() },
    term,
    xingzuo: `${solar.getXingZuo()}座`,
    shengXiao: l.getDayShengXiao(),
    shenSha: {
      xi: l.getDayPositionXiDesc(),
      fu: l.getDayPositionFuDesc(),
      cai: l.getDayPositionCaiDesc(),
    },
  };
}

/**
 * 建除名 → 白话池匹配名（'执' → '执日'），未命中返回原值
 */
export function toJianChuName(raw) {
  return raw ? `${raw}日` : '';
}
