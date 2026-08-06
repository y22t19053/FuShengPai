import { describe, it, expect } from 'vitest';
import {
  equationOfTimeMinutes, toTrueSolarTime, hourZhiOf, hourGanOf, getTrueSolarHour, getLonForCity,
} from '../src/utils/solar-time.js';

describe('solar-time 真太阳时', () => {
  it('城市库：北京/上海/广州/乌鲁木齐/拉萨/台北可查', () => {
    expect(getLonForCity('北京')).toBe(116.41);
    expect(getLonForCity('上海')).toBe(121.47);
    expect(getLonForCity('拉萨')).toBe(91.11);
    expect(getLonForCity('不存在的城市')).toBeNull();
    expect(getLonForCity('')).toBeNull();
  });

  it('均时差范围在 ±17 分钟内（Meeus 公式全年边界）', () => {
    for (const d of [
      new Date(2026, 0, 15), new Date(2026, 3, 15), new Date(2026, 6, 15),
      new Date(2026, 9, 15), new Date(2026, 11, 25),
    ]) {
      const e = equationOfTimeMinutes(d);
      expect(Math.abs(e)).toBeLessThanOrEqual(17);
    }
  });

  it('真太阳时：东经 120 与钟表时差等于均时差（±0.1 分钟内）', () => {
    const base = new Date(2026, 7, 6, 12, 0, 0); // 2026-08-06 12:00
    const solar = toTrueSolarTime(base, 120);
    const eot = equationOfTimeMinutes(base);
    expect((solar - base) / 60000 - eot).toBeLessThan(0.1);
  });

  it('经度差每度 4 分钟：乌鲁木齐（87.62）比东八区慢约 2.1 小时', () => {
    const base = new Date(2026, 7, 6, 14, 0, 0);
    const solar = toTrueSolarTime(base, 87.62);
    const diffMin = (solar - base) / 60000;
    // (87.62 - 120) * 4 = -129.5 分钟，加上均时差 ±17
    expect(diffMin).toBeGreaterThan(-147);
    expect(diffMin).toBeLessThan(-112);
  });

  it('时辰划分：0-1 点子时、1-3 丑、3-5 寅、12-13 午、23 点归次日子时', () => {
    expect(hourZhiOf(new Date(2026, 7, 6, 0, 30)).zhi).toBe('子');
    expect(hourZhiOf(new Date(2026, 7, 6, 2, 30)).zhi).toBe('丑');
    expect(hourZhiOf(new Date(2026, 7, 6, 3, 0)).zhi).toBe('寅');
    expect(hourZhiOf(new Date(2026, 7, 6, 12, 59)).zhi).toBe('午');
    const late = hourZhiOf(new Date(2026, 7, 6, 23, 30));
    expect(late.zhi).toBe('子');
    expect(late.isNextDay).toBe(true);
  });

  it('五鼠遁：甲己日子时起甲子，丙辛日午时起甲午', () => {
    expect(hourGanOf('甲', 0)).toBe('甲'); // 甲子
    expect(hourGanOf('己', 0)).toBe('甲'); // 甲子
    expect(hourGanOf('丙', 0)).toBe('戊'); // 戊子
    expect(hourGanOf('辛', 0)).toBe('戊'); // 戊子
    expect(hourGanOf('丁', 0)).toBe('庚'); // 庚子
    expect(hourGanOf('壬', 0)).toBe('庚'); // 庚子
    expect(hourGanOf('戊', 0)).toBe('壬'); // 壬子
    expect(hourGanOf('癸', 0)).toBe('壬'); // 壬子
    expect(hourGanOf('丙', 6)).toBe('甲'); // 午时 = (4+6)%10 = 甲
    expect(hourGanOf('未知干', 0)).toBe('');
  });

  it('getTrueSolarHour：返回完整时辰快照（含干支/生肖/五行/跨天标记）', () => {
    const th = getTrueSolarHour(new Date(2026, 7, 6, 12, 0, 0), 120);
    expect(th).not.toBeNull();
    expect(th.zhi).toBe('午');
    expect(th.gan).toBeTruthy();
    expect(th.ganZhi.length).toBe(2);
    expect(th.shengXiao).toBe('马');
    expect(th.wuxing).toBe('火');
    expect(th.label).toBe('日中');
    expect(th.isNextDay).toBe(false);
  });
});
