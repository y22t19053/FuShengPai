import { describe, it, expect } from 'vitest';
import { buildMonthlyTension, monthKeyOf, monthlyTensionNote } from '../src/services/trend.js';

const now = Date.now();
const mk = (monthsAgo, day, score) => {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo, day);
  return { time: d.getTime(), durianScore: score };
};

describe('trend 月度张力聚合', () => {
  it('monthKeyOf：时间戳 → YYYY-MM；空值回退当月', () => {
    const d = new Date(2026, 7, 6); // 2026-08-06
    expect(monthKeyOf(d.getTime())).toBe('2026-08');
    const now = new Date();
    expect(monthKeyOf(NaN)).toBe(monthKeyOf(now.getTime()));
    expect(monthKeyOf(undefined)).toMatch(/^\d{4}-\d{2}$/);
    expect(monthKeyOf('invalid')).toBe('');
  });

  it('buildMonthlyTension：默认 12 个月，无数据月份 avg=null', () => {
    const series = buildMonthlyTension([], 12);
    expect(series.length).toBe(12);
    expect(series.every((s) => s.avg === null && s.count === 0)).toBe(true);
    // 标签形如 '08月'
    expect(series[0].label).toMatch(/^\d{2}月$/);
  });

  it('聚合正确：同月多次取均值，跨月各归其位', () => {
    const timeline = [
      mk(1, 5, 3), mk(1, 15, 5), mk(1, 25, 7), // 上个月 3 次 → avg 5
      mk(2, 10, 8), mk(2, 20, 4),              // 上上个月 2 次 → avg 6
    ];
    const series = buildMonthlyTension(timeline, 12);
    const m1 = series.find((s) => s.count === 3);
    const m2 = series.find((s) => s.count === 2);
    expect(m1.avg).toBe(5);
    expect(m2.avg).toBe(6);
  });

  it('超出范围的分数被钳制到 0-10', () => {
    const timeline = [mk(0, 1, 99), mk(0, 2, -5)];
    const series = buildMonthlyTension(timeline, 3);
    const cur = series.find((s) => s.count > 0);
    expect(cur.avg).toBeGreaterThanOrEqual(0);
    expect(cur.avg).toBeLessThanOrEqual(10);
  });

  it('monthlyTensionNote：无数据/单月/平稳/高张力各有白话', () => {
    expect(monthlyTensionNote(buildMonthlyTension([], 12))).toContain('还没有记录');
    const one = monthlyTensionNote(buildMonthlyTension([mk(1, 5, 4)], 12));
    expect(one).toContain('4');
    const flat = buildMonthlyTension([mk(1, 5, 5), mk(2, 5, 5.5), mk(3, 5, 5)], 12);
    expect(monthlyTensionNote(flat)).toContain('接近');
    const spike = buildMonthlyTension([mk(1, 5, 8.5), mk(2, 5, 2), mk(3, 5, 3)], 12);
    expect(monthlyTensionNote(spike)).toContain('8.5');
  });
});
