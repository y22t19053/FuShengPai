import { describe, it, expect } from 'vitest';
import { HOUR_POOL, getHourEntry, pickHourLine } from '../src/texts/hour-pools.js';

describe('hour-pools 十二时辰象义', () => {
  it('结构完整：12 时辰，每时辰 3 条', () => {
    expect(HOUR_POOL.length).toBe(12);
    const zhis = HOUR_POOL.map((h) => h.zhi);
    expect(zhis).toEqual(['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']);
    HOUR_POOL.forEach((h) => {
      expect(h.lines.length).toBe(3);
      expect(h.wuxing).toBeTruthy();
      expect(h.label).toBeTruthy();
    });
  });

  it('getHourEntry：命中返回条目，未命中返回 null', () => {
    expect(getHourEntry('午').zhi).toBe('午');
    expect(getHourEntry('')).toBeNull();
    expect(getHourEntry('XX')).toBeNull();
  });

  it('pickHourLine：同日同时辰固定；不同日期可换句', () => {
    const a = pickHourLine('2026-08-06', '子');
    const b = pickHourLine('2026-08-06', '子');
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(5);
  });

  it('pickHourLine：未知时支返回空串', () => {
    expect(pickHourLine('2026-08-06', 'ZZ')).toBe('');
  });
});
