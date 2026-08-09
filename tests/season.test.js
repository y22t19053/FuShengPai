import { describe, it, expect } from 'vitest';
import {
  getHourGreeting, getJieqiToday, seasonOf, getSeasonInfo,
} from '../src/season.js';

describe('getHourGreeting 时段迎客语', () => {
  it('凌晨 0-4 点归深夜档（不再误判）', () => {
    expect(getHourGreeting(new Date(2026, 7, 6, 0, 30))).toBe('这么晚还在想事，先抽一张安静一下。');
    expect(getHourGreeting(new Date(2026, 7, 6, 3, 0))).toBe('这么晚还在想事，先抽一张安静一下。');
  });

  it('白天任何时段都不再显示深夜语（回归：原 bug 全天误显）', () => {
    expect(getHourGreeting(new Date(2026, 7, 6, 6, 0))).toBe('天刚亮，来问点什么？');
    expect(getHourGreeting(new Date(2026, 7, 6, 9, 0))).toBe('今天来问点什么？');
    expect(getHourGreeting(new Date(2026, 7, 6, 12, 0))).toBe('午间小憩，抽一张歇一歇。');
    expect(getHourGreeting(new Date(2026, 7, 6, 15, 0))).toBe('下午好，来问点什么？');
    expect(getHourGreeting(new Date(2026, 7, 6, 19, 0))).toBe('收工了，抽一张听听它说什么。');
    expect(getHourGreeting(new Date(2026, 7, 6, 22, 0))).toBe('晚上好，今天想聊点什么？');
    expect(getHourGreeting(new Date(2026, 7, 6, 23, 30))).toBe('这么晚还在想事，先抽一张安静一下。');
  });
});

describe('season 季节与节气', () => {
  it('四季按月份划分', () => {
    expect(seasonOf(new Date(2026, 2, 15))).toBe('春');
    expect(seasonOf(new Date(2026, 6, 15))).toBe('夏');
    expect(seasonOf(new Date(2026, 9, 15))).toBe('秋');
    expect(seasonOf(new Date(2026, 0, 15))).toBe('冬');
  });

  it('节气当日识别', () => {
    expect(getJieqiToday(new Date(2026, 7, 8))).toEqual({ name: '立秋', ask: '宜收敛' });
    expect(getJieqiToday(new Date(2026, 4, 6))).toEqual({ name: '立夏', ask: '宜生长' });
    expect(getJieqiToday(new Date(2026, 7, 6))).toBeNull();
  });

  it('颜色源已收敛：season 模块不再导出 SEASON_ACCENTS（唯一调色板源在 palettes.js）', async () => {
    const m = await import('../src/season.js');
    expect(m.SEASON_ACCENTS).toBeUndefined();
  });

  it('getSeasonInfo 只返回季节与节气（颜色收敛到 palettes.js）', () => {
    const info = getSeasonInfo(new Date(2026, 6, 15));
    expect(info.season).toBe('夏');
    expect(info.jieqi).toBeNull();
  });
});
