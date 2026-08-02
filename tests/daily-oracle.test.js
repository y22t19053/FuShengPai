import { describe, it, expect } from 'vitest';
import { buildDailyOracle, MOOD_BY_WX, JIANGCHU, CHONG, COMBO } from '../src/texts/daily-oracle.js';

describe('DAILY_ORACLE 日运能量池', () => {
  it('结构完整：五行5组×5条、建除12、冲煞12、组合20', () => {
    const wxKeys = Object.keys(MOOD_BY_WX);
    expect(wxKeys.sort()).toEqual(['土', '水', '火', '木', '金'].sort());
    wxKeys.forEach((k) => expect(MOOD_BY_WX[k].length).toBe(5));
    expect(JIANGCHU.length).toBe(12);
    expect(CHONG.length).toBe(12);
    expect(COMBO.length).toBe(20);
  });

  it('同一日期两次调用结果完全一致（一天之内不变，避免娱乐化）', () => {
    const a = buildDailyOracle({ wx: '水', dateStr: '2026-08-03' });
    const b = buildDailyOracle({ wx: '水', dateStr: '2026-08-03' });
    expect(a).toEqual(b);
  });

  it('不同日期结果不同（种子随日期变化）', () => {
    const a = buildDailyOracle({ wx: '火', dateStr: '2026-08-03' });
    const b = buildDailyOracle({ wx: '火', dateStr: '2026-08-04' });
    expect(a.seed).not.toBe(b.seed);
    expect(a.mood.title).not.toBe(b.mood.title);
    expect(a.combo.text).not.toBe(b.combo.text);
  });

  it('按五行筛选：水日必取水基调，组合短句优先 水×建除 精确匹配', () => {
    const r = buildDailyOracle({ wx: '水', dateStr: '2026-08-03' });
    expect(MOOD_BY_WX['水']).toContain(r.mood);
    // 组合：优先 水×建除，其次同五行
    const exact = COMBO.filter((c) => c.wx === '水' && c.jianchu === r.jianchu.name);
    const wxPool = COMBO.filter((c) => c.wx === '水');
    if (exact.length) expect(exact).toContain(r.combo);
    else expect(wxPool).toContain(r.combo);
  });

  it('四板块齐全：五行基调/建除/冲煞/宜忌标签', () => {
    const r = buildDailyOracle({ wx: '土', dateStr: '2026-08-03' });
    expect(r.mood.title).toBeTruthy();
    expect(r.mood.text.length).toBeGreaterThan(10);
    expect(r.jianchu.name).toBeTruthy();
    expect(r.chong.name).toBeTruthy();
    expect(r.chong.animal).toBeTruthy();
    expect(r.combo.text.length).toBeGreaterThan(5);
    expect(r.yi.length).toBeGreaterThan(0);
    expect(r.ji.length).toBeGreaterThan(0);
  });

  it('未知五行回退土池（大王/小王的天/人兼容）', () => {
    const r = buildDailyOracle({ wx: '天', dateStr: '2026-08-03' });
    expect(MOOD_BY_WX['土']).toContain(r.mood);
  });
});
