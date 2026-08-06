// ===== src/services/trend.js · 月度张力聚合（纯函数） =====
// 把 timeline（每次观测的 durianScore）按自然月聚合成「月度张力曲线」。
// 无第三方图表库：返回数据，UI 用纯 CSS/SVG 画柱状图。
// 哲学提醒：这是「张力的季节」——记录你问过的事有多少在拉扯，不是给人生打分的命理K线。

/** 时间戳 → 'YYYY-MM' */
export function monthKeyOf(ts) {
  const d = ts ? new Date(ts) : new Date();
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * 构建最近 N 个月的月度张力（倒序=旧到新；无数据月份 avg/count 为 null）。
 * @param {Array} timeline - [{ time, durianScore }]
 * @param {number} [months] 取几个月，默认 12
 * @returns {Array<{ key: string, label: string, avg: number|null, count: number }>}
 */
export function buildMonthlyTension(timeline, months = 12) {
  const n = Math.max(1, Math.min(24, months));
  const now = new Date();
  const keys = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const buckets = {};
  for (const t of timeline || []) {
    if (!t || typeof t.time === 'undefined') continue;
    const k = monthKeyOf(t.time);
    if (!k || !keys.includes(k)) continue;
    const s = Number(t.durianScore);
    if (!Number.isFinite(s)) continue;
    (buckets[k] = buckets[k] || []).push(Math.max(0, Math.min(10, s)));
  }

  return keys.map(k => {
    const list = buckets[k] || [];
    const count = list.length;
    return {
      key: k,
      label: k.slice(5) + '月', // '08月'
      avg: count ? Math.round((list.reduce((a, b) => a + b, 0) / count) * 10) / 10 : null,
      count,
    };
  });
}

/** 月度张力 → 一句白话观察（疏离哲学，不评判） */
export function monthlyTensionNote(series) {
  const has = series.filter(s => s.avg !== null);
  if (!has.length) return '还没有记录，先抽一局，让月份慢慢长出形状。';
  const avgAll = has.reduce((a, s) => a + s.avg, 0) / has.length;
  const peak = has.reduce((a, s) => (s.avg > a.avg ? s : a), has[0]);
  const calm = has.reduce((a, s) => (s.avg < a.avg ? s : a), has[0]);
  if (has.length === 1) return `这个月你问了一次，张力 ${peak.avg} 分。一个点成不了曲线，多问几次，形状才会出来。`;
  const spread = peak.avg - calm.avg;
  if (spread <= 1) return `这 ${has.length} 个月的张力都很接近（${avgAll.toFixed(1)} 分上下）。日子稳，事情也稳。`;
  if (peak.avg >= 7) return `最紧的月份是${peak.label}（${peak.avg} 分）。那段时间你在拉扯里待过，现在回头看，它已经过去了。`;
  return `最松的是${calm.label}（${calm.avg} 分），最紧的是${peak.label}（${peak.avg} 分）。曲线有起伏，说明你一直在面对，不是躲着过。`;
}
