import { describe, it, expect } from 'vitest';
import {
  calcYearPillar,
  calcMonthPillar,
  calcDayPillar,
  calcFullBaZi
} from '../src/engine.js';

describe('四柱算法 Golden Tests', () => {
  it('2000-01-01 12:00 → 年柱：己卯', () => {
    const yearPillar = calcYearPillar(2000, 1, 1);
    expect(yearPillar.full).toBe('己卯');
    expect(yearPillar.shengXiao).toBe('兔');
  });

  it('2000-02-03（立春前一天）→ 己卯', () => {
    expect(calcYearPillar(2000, 2, 3).full).toBe('己卯');
  });

  it('2000-02-04（立春当天）→ 庚辰', () => {
    expect(calcYearPillar(2000, 2, 4).full).toBe('庚辰');
    expect(calcYearPillar(2000, 2, 4).shengXiao).toBe('龙');
  });

  it('2000-03-10 → 己卯月（惊蛰后）', () => {
    expect(calcMonthPillar(2000, 3, 10).full).toBe('己卯');
  });

  it('2000-01-10 → 丁丑月（小寒后）', () => {
    expect(calcMonthPillar(2000, 1, 10).full).toBe('丁丑');
  });

  it('日柱锚点：1984-02-02 = 甲子日', () => {
    expect(calcDayPillar(1984, 2, 2).full).toBe('甲子');
  });

  it('日柱锚点：1985-02-02 = 庚午日（验证闰日累进）', () => {
    expect(calcDayPillar(1985, 2, 2).full).toBe('庚午');
  });

  it('完整八字结构', () => {
    const bazi = calcFullBaZi(2000, 1, 1, 12);
    expect(bazi).toHaveProperty('yearPillar');
    expect(bazi).toHaveProperty('monthPillar');
    expect(bazi).toHaveProperty('dayPillar');
    expect(bazi).toHaveProperty('hourPillar');
    expect(bazi).toHaveProperty('fullText');
    expect(bazi.fullText.split(' ')).toHaveLength(4);
  });
});